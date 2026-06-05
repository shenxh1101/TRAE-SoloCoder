from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from src.models.models import (
    Employee, TrainingPlan, Enrollment, LearningRecord,
    WarningNotification
)
from src.models.database import SessionLocal
from src.utils.common import generate_code
from src.utils.logger import log_operation, log_info, log_error


class LearningMonitor:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()
        self.MIN_STUDY_MINUTES_PER_SAMPLE = 15
        self.SAMPLE_INTERVAL_MINUTES = 30

    def record_study_time(self, employee_id: int, training_plan_id: int,
                          study_minutes: int, operator: str,
                          notes: str = '') -> Tuple[Optional[LearningRecord], str]:
        try:
            enrollment = self.db.query(Enrollment).filter(
                Enrollment.employee_id == employee_id,
                Enrollment.training_plan_id == training_plan_id,
                Enrollment.is_active == True
            ).first()

            if not enrollment:
                return None, "未找到有效的报名记录"

            record = LearningRecord(
                employee_id=employee_id,
                training_plan_id=training_plan_id,
                record_time=datetime.now(),
                study_duration_minutes=study_minutes,
                is_active=True,
                notes=notes
            )

            self.db.add(record)
            self.db.flush()

            enrollment.total_study_hours += study_minutes / 60.0

            self._check_engagement(employee_id, training_plan_id, operator)

            self.db.commit()
            log_operation(operator, '记录学习时长', 'LearningRecord', record.id,
                          f"员工ID: {employee_id}, 学习时长: {study_minutes}分钟")

            return record, "学习时长记录成功"

        except Exception as e:
            self.db.rollback()
            log_error("记录学习时长失败", e)
            return None, f"记录失败: {str(e)}"

    def _check_engagement(self, employee_id: int, training_plan_id: int, operator: str) -> None:
        try:
            cutoff_time = datetime.now() - timedelta(hours=2)
            recent_records = self.db.query(LearningRecord).filter(
                LearningRecord.employee_id == employee_id,
                LearningRecord.training_plan_id == training_plan_id,
                LearningRecord.record_time >= cutoff_time,
                LearningRecord.is_active == True
            ).order_by(LearningRecord.record_time.desc()).limit(2).all()

            if len(recent_records) < 2:
                return

            consecutive_low = all(
                r.study_duration_minutes < self.MIN_STUDY_MINUTES_PER_SAMPLE
                for r in recent_records
            )

            if consecutive_low:
                enrollment = self.db.query(Enrollment).filter(
                    Enrollment.employee_id == employee_id,
                    Enrollment.training_plan_id == training_plan_id,
                    Enrollment.is_active == True
                ).first()

                if enrollment:
                    enrollment.engagement_status = 'inactive'
                    enrollment.warning_count += 1
                    enrollment.last_warning_at = datetime.now()

                    employee = self.db.query(Employee).filter(Employee.id == employee_id).first()
                    if employee:
                        warning_msg = (
                            f"员工 {employee.name}（工号: {employee.employee_id}）在培训中连续两次"
                            f"学习时长采样不达标（每次不足{self.MIN_STUDY_MINUTES_PER_SAMPLE}分钟），"
                            f"已标记为学习不积极。请关注其学习状态。"
                        )

                        warning = WarningNotification(
                            employee_id=employee_id,
                            training_plan_id=training_plan_id,
                            warning_type='low_engagement',
                            message=warning_msg,
                            supervisor_id=employee.supervisor_id
                        )
                        self.db.add(warning)

                        log_operation(operator, '发送学习预警', 'WarningNotification', warning.id,
                                      f"员工: {employee.name}, 连续{len(recent_records)}次采样不达标")

        except Exception as e:
            log_error("检查学习积极性失败", e)

    def batch_collect_study_time(self, training_plan_id: int, operator: str) -> Tuple[List[Dict], str]:
        try:
            plan = self.db.query(TrainingPlan).filter(TrainingPlan.id == training_plan_id).first()
            if not plan:
                return [], "培训计划不存在"

            enrollments = self.db.query(Enrollment).filter(
                Enrollment.training_plan_id == training_plan_id,
                Enrollment.is_active == True,
                Enrollment.status.in_(['registered', 'in_progress'])
            ).all()

            results = []
            for enroll in enrollments:
                study_minutes = self._simulate_study_time()
                record, msg = self.record_study_time(
                    enroll.employee_id, training_plan_id, study_minutes, operator
                )
                employee = self.db.query(Employee).filter(Employee.id == enroll.employee_id).first()
                results.append({
                    'employee_id': enroll.employee_id,
                    'employee_name': employee.name if employee else '未知',
                    'study_minutes': study_minutes,
                    'success': record is not None,
                    'message': msg
                })

            return results, "批量采集完成"

        except Exception as e:
            log_error("批量采集学习时长失败", e)
            return [], f"采集失败: {str(e)}"

    def _simulate_study_time(self) -> int:
        import random
        if random.random() < 0.8:
            return random.randint(15, 30)
        else:
            return random.randint(0, 14)

    def get_active_training_plans(self) -> List[Dict]:
        try:
            now = datetime.now()
            plans = self.db.query(TrainingPlan).filter(
                TrainingPlan.status == 'in_progress',
                TrainingPlan.start_time <= now,
                TrainingPlan.end_time >= now
            ).all()

            result = []
            for plan in plans:
                result.append({
                    'plan_id': plan.id,
                    'plan_code': plan.plan_code,
                    'course_title': plan.course.title,
                    'start_time': plan.start_time,
                    'end_time': plan.end_time,
                    'participants': plan.current_participants
                })

            return result

        except Exception as e:
            log_error("获取进行中培训计划失败", e)
            return []

    def get_employee_learning_status(self, employee_id: int, training_plan_id: int) -> Dict:
        try:
            enrollment = self.db.query(Enrollment).filter(
                Enrollment.employee_id == employee_id,
                Enrollment.training_plan_id == training_plan_id,
                Enrollment.is_active == True
            ).first()

            if not enrollment:
                return {}

            cutoff_time = datetime.now() - timedelta(days=7)
            records = self.db.query(LearningRecord).filter(
                LearningRecord.employee_id == employee_id,
                LearningRecord.training_plan_id == training_plan_id,
                LearningRecord.record_time >= cutoff_time,
                LearningRecord.is_active == True
            ).order_by(LearningRecord.record_time.desc()).all()

            total_minutes = sum(r.study_duration_minutes for r in records)
            avg_minutes = total_minutes / len(records) if records else 0

            recent_consecutive_low = 0
            for r in records:
                if r.study_duration_minutes < self.MIN_STUDY_MINUTES_PER_SAMPLE:
                    recent_consecutive_low += 1
                else:
                    break

            return {
                'enrollment_id': enrollment.id,
                'engagement_status': enrollment.engagement_status,
                'warning_count': enrollment.warning_count,
                'last_warning_at': enrollment.last_warning_at,
                'total_study_hours': enrollment.total_study_hours,
                'weekly_records': len(records),
                'weekly_total_minutes': total_minutes,
                'weekly_avg_minutes': round(avg_minutes, 1),
                'consecutive_low_samples': recent_consecutive_low,
                'records': [
                    {
                        'record_time': r.record_time,
                        'study_minutes': r.study_duration_minutes,
                        'is_low': r.study_duration_minutes < self.MIN_STUDY_MINUTES_PER_SAMPLE
                    }
                    for r in records
                ]
            }

        except Exception as e:
            log_error("获取员工学习状态失败", e)
            return {}

    def get_inactive_employees(self, training_plan_id: Optional[int] = None) -> List[Dict]:
        try:
            query = self.db.query(Enrollment).filter(
                Enrollment.is_active == True,
                Enrollment.engagement_status == 'inactive'
            )

            if training_plan_id:
                query = query.filter(Enrollment.training_plan_id == training_plan_id)

            enrollments = query.all()

            result = []
            for enroll in enrollments:
                employee = self.db.query(Employee).filter(Employee.id == enroll.employee_id).first()
                plan = enroll.training_plan
                result.append({
                    'employee_id': enroll.employee_id,
                    'employee_code': employee.employee_id if employee else '',
                    'employee_name': employee.name if employee else '未知',
                    'department': employee.department if employee else '',
                    'supervisor_id': employee.supervisor_id if employee else '',
                    'plan_id': plan.id,
                    'plan_code': plan.plan_code,
                    'course_title': plan.course.title,
                    'warning_count': enroll.warning_count,
                    'last_warning_at': enroll.last_warning_at,
                    'total_study_hours': enroll.total_study_hours
                })

            return result

        except Exception as e:
            log_error("获取不积极员工列表失败", e)
            return []

    def mark_warning_read(self, warning_id: int, operator: str) -> Tuple[bool, str]:
        try:
            warning = self.db.query(WarningNotification).filter(WarningNotification.id == warning_id).first()
            if not warning:
                return False, "预警通知不存在"

            warning.is_read = True
            self.db.commit()

            log_operation(operator, '标记预警已读', 'WarningNotification', warning_id)
            return True, "标记成功"

        except Exception as e:
            self.db.rollback()
            log_error("标记预警失败", e)
            return False, f"标记失败: {str(e)}"

    def get_supervisor_warnings(self, supervisor_id: str, unread_only: bool = True) -> List[Dict]:
        try:
            query = self.db.query(WarningNotification).filter(
                WarningNotification.supervisor_id == supervisor_id
            )

            if unread_only:
                query = query.filter(WarningNotification.is_read == False)

            warnings = query.order_by(WarningNotification.sent_at.desc()).all()

            result = []
            for w in warnings:
                employee = self.db.query(Employee).filter(Employee.id == w.employee_id).first()
                plan = self.db.query(TrainingPlan).filter(TrainingPlan.id == w.training_plan_id).first()
                result.append({
                    'warning_id': w.id,
                    'warning_type': w.warning_type,
                    'message': w.message,
                    'sent_at': w.sent_at,
                    'is_read': w.is_read,
                    'employee_name': employee.name if employee else '未知',
                    'course_title': plan.course.title if plan else '未知课程'
                })

            return result

        except Exception as e:
            log_error("获取主管预警失败", e)
            return []

    def start_monitoring(self, training_plan_id: int, operator: str) -> Tuple[bool, str]:
        try:
            plan = self.db.query(TrainingPlan).filter(TrainingPlan.id == training_plan_id).first()
            if not plan:
                return False, "培训计划不存在"

            if plan.status not in ['pending', 'in_progress']:
                return False, f"培训计划状态不允许开始监控: {plan.status}"

            plan.status = 'in_progress'
            self.db.commit()

            log_operation(operator, '开始培训监控', 'TrainingPlan', training_plan_id,
                          f"课程: {plan.course.title}")

            return True, "培训监控已启动，将每30分钟自动采集学习时长"

        except Exception as e:
            self.db.rollback()
            log_error("启动监控失败", e)
            return False, f"启动失败: {str(e)}"

    def stop_monitoring(self, training_plan_id: int, operator: str) -> Tuple[bool, str]:
        try:
            plan = self.db.query(TrainingPlan).filter(TrainingPlan.id == training_plan_id).first()
            if not plan:
                return False, "培训计划不存在"

            plan.status = 'completed'
            self.db.commit()

            log_operation(operator, '结束培训监控', 'TrainingPlan', training_plan_id,
                          f"课程: {plan.course.title}")

            return True, "培训监控已结束"

        except Exception as e:
            self.db.rollback()
            log_error("结束监控失败", e)
            return False, f"结束失败: {str(e)}"

    def close(self):
        self.db.close()

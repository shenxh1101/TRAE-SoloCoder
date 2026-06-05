from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from src.models.models import (
    Employee, TrainingPlan, Enrollment, Waitlist
)
from src.models.database import SessionLocal
from src.utils.common import check_time_conflict, generate_code
from src.utils.logger import log_operation, log_info, log_error


class EnrollmentManager:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()

    def check_time_conflicts(self, employee_id: int, new_plan_start: datetime,
                             new_plan_end: datetime) -> List[Dict]:
        try:
            enrollments = self.db.query(Enrollment).filter(
                Enrollment.employee_id == employee_id,
                Enrollment.is_active == True,
                Enrollment.status.in_(['registered', 'in_progress'])
            ).all()

            conflicts = []
            for enroll in enrollments:
                plan = enroll.training_plan
                if check_time_conflict(new_plan_start, new_plan_end, plan.start_time, plan.end_time):
                    conflicts.append({
                        'enrollment_id': enroll.id,
                        'plan_id': plan.id,
                        'plan_code': plan.plan_code,
                        'course_title': plan.course.title,
                        'start_time': plan.start_time,
                        'end_time': plan.end_time,
                        'location': plan.location
                    })

            return conflicts

        except Exception as e:
            log_error("检查时间冲突失败", e)
            return []

    def find_alternative_slots(self, course_id: int, preferred_start: datetime,
                               preferred_end: datetime) -> List[Dict]:
        try:
            existing_plans = self.db.query(TrainingPlan).filter(
                TrainingPlan.course_id == course_id,
                TrainingPlan.status.in_(['pending', 'in_progress']),
                TrainingPlan.start_time > datetime.now()
            ).all()

            alternatives = []
            for plan in existing_plans:
                if not check_time_conflict(preferred_start, preferred_end, plan.start_time, plan.end_time):
                    available_slots = plan.max_participants - plan.current_participants
                    if available_slots > 0:
                        alternatives.append({
                            'plan_id': plan.id,
                            'plan_code': plan.plan_code,
                            'start_time': plan.start_time,
                            'end_time': plan.end_time,
                            'location': plan.location,
                            'available_slots': available_slots
                        })

            for days_ahead in [7, 14, 21]:
                alt_start = preferred_start + timedelta(days=days_ahead)
                alt_end = preferred_end + timedelta(days=days_ahead)
                has_conflict = False
                for plan in existing_plans:
                    if check_time_conflict(alt_start, alt_end, plan.start_time, plan.end_time):
                        has_conflict = True
                        break
                if not has_conflict:
                    alternatives.append({
                        'plan_id': None,
                        'plan_code': None,
                        'start_time': alt_start,
                        'end_time': alt_end,
                        'location': '待定',
                        'available_slots': 0,
                        'is_suggested': True
                    })

            return alternatives[:5]

        except Exception as e:
            log_error("查找替代时段失败", e)
            return []

    def enroll_employee(self, employee_id: int, training_plan_id: int,
                        operator: str, priority: int = 1) -> Tuple[Optional[Enrollment], Dict, str]:
        try:
            employee = self.db.query(Employee).filter(Employee.id == employee_id).first()
            plan = self.db.query(TrainingPlan).filter(TrainingPlan.id == training_plan_id).first()

            if not employee or not plan:
                return None, {}, "员工或培训计划不存在"

            existing = self.db.query(Enrollment).filter(
                Enrollment.employee_id == employee_id,
                Enrollment.training_plan_id == training_plan_id,
                Enrollment.is_active == True
            ).first()

            if existing:
                return None, {}, "已报名该培训计划"

            conflicts = self.check_time_conflicts(employee_id, plan.start_time, plan.end_time)
            if conflicts:
                alternatives = self.find_alternative_slots(plan.course_id, plan.start_time, plan.end_time)
                return None, {
                    'conflicts': conflicts,
                    'alternatives': alternatives
                }, "存在时间冲突"

            available_slots = plan.max_participants - plan.current_participants
            if available_slots <= 0:
                waitlist_entry = Waitlist(
                    employee_id=employee_id,
                    training_plan_id=training_plan_id,
                    priority=priority,
                    status='waiting'
                )
                self.db.add(waitlist_entry)
                self.db.commit()

                log_operation(operator, '加入等待队列', 'Waitlist', waitlist_entry.id,
                              f"员工: {employee.name}, 培训计划: {plan.plan_code}")

                position = self.db.query(Waitlist).filter(
                    Waitlist.training_plan_id == training_plan_id,
                    Waitlist.status == 'waiting',
                    Waitlist.added_at <= waitlist_entry.added_at
                ).count()

                return None, {
                    'waitlist_id': waitlist_entry.id,
                    'position': position,
                    'priority': priority
                }, "培训名额已满，已加入等待队列"

            enrollment = Enrollment(
                employee_id=employee_id,
                training_plan_id=training_plan_id,
                status='registered',
                is_active=True,
                engagement_status='normal',
                warning_count=0
            )

            self.db.add(enrollment)
            plan.current_participants += 1
            self.db.commit()

            log_operation(operator, '员工报名', 'Enrollment', enrollment.id,
                          f"员工: {employee.name}, 培训计划: {plan.plan_code}")

            return enrollment, {}, "报名成功"

        except Exception as e:
            self.db.rollback()
            log_error("员工报名失败", e)
            return None, {}, f"报名失败: {str(e)}"

    def cancel_enrollment(self, enrollment_id: int, operator: str, reason: str = '') -> Tuple[bool, str]:
        try:
            enrollment = self.db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
            if not enrollment:
                return False, "报名记录不存在"

            enrollment.status = 'cancelled'
            enrollment.is_active = False
            enrollment.cancelled_at = datetime.now()
            enrollment.cancel_reason = reason

            plan = enrollment.training_plan
            if plan and plan.current_participants > 0:
                plan.current_participants -= 1

            self._promote_from_waitlist(plan.id, operator)

            self.db.commit()
            log_operation(operator, '取消报名', 'Enrollment', enrollment_id,
                          f"原因: {reason}")

            return True, "取消成功，已自动递补等待队列成员"

        except Exception as e:
            self.db.rollback()
            log_error("取消报名失败", e)
            return False, f"取消失败: {str(e)}"

    def _promote_from_waitlist(self, training_plan_id: int, operator: str) -> Optional[Enrollment]:
        try:
            waitlist = self.db.query(Waitlist).filter(
                Waitlist.training_plan_id == training_plan_id,
                Waitlist.status == 'waiting'
            ).order_by(Waitlist.priority.desc(), Waitlist.added_at.asc()).first()

            if not waitlist:
                return None

            plan = self.db.query(TrainingPlan).filter(TrainingPlan.id == training_plan_id).first()
            if not plan or plan.current_participants >= plan.max_participants:
                return None

            enrollment = Enrollment(
                employee_id=waitlist.employee_id,
                training_plan_id=training_plan_id,
                status='registered',
                is_active=True,
                engagement_status='normal',
                warning_count=0
            )

            self.db.add(enrollment)
            plan.current_participants += 1

            waitlist.status = 'promoted'
            waitlist.promoted_at = datetime.now()

            self.db.flush()

            employee = self.db.query(Employee).filter(Employee.id == waitlist.employee_id).first()
            log_operation(operator, '从等待队列递补', 'Enrollment', enrollment.id,
                          f"员工: {employee.name if employee else '未知'}, 培训计划: {plan.plan_code}")

            return enrollment

        except Exception as e:
            self.db.rollback()
            log_error("递补等待队列失败", e)
            return None

    def get_waitlist_position(self, employee_id: int, training_plan_id: int) -> Dict:
        try:
            waitlist = self.db.query(Waitlist).filter(
                Waitlist.employee_id == employee_id,
                Waitlist.training_plan_id == training_plan_id,
                Waitlist.status == 'waiting'
            ).first()

            if not waitlist:
                return {'in_waitlist': False}

            position = self.db.query(Waitlist).filter(
                Waitlist.training_plan_id == training_plan_id,
                Waitlist.status == 'waiting',
                (Waitlist.priority > waitlist.priority) |
                (Waitlist.priority == waitlist.priority) & (Waitlist.added_at <= waitlist.added_at)
            ).count()

            return {
                'in_waitlist': True,
                'position': position,
                'priority': waitlist.priority,
                'added_at': waitlist.added_at
            }

        except Exception as e:
            log_error("查询等待队列位置失败", e)
            return {'in_waitlist': False}

    def update_waitlist_priority(self, waitlist_id: int, new_priority: int, operator: str) -> Tuple[bool, str]:
        try:
            waitlist = self.db.query(Waitlist).filter(Waitlist.id == waitlist_id).first()
            if not waitlist:
                return False, "等待队列记录不存在"

            waitlist.priority = new_priority
            self.db.commit()

            log_operation(operator, '更新等待队列优先级', 'Waitlist', waitlist_id,
                          f"新优先级: {new_priority}")

            return True, "优先级更新成功"

        except Exception as e:
            self.db.rollback()
            log_error("更新优先级失败", e)
            return False, f"更新失败: {str(e)}"

    def get_employee_enrollments(self, employee_id: int) -> List[Dict]:
        try:
            enrollments = self.db.query(Enrollment).filter(
                Enrollment.employee_id == employee_id,
                Enrollment.is_active == True
            ).all()

            result = []
            for enroll in enrollments:
                plan = enroll.training_plan
                result.append({
                    'enrollment_id': enroll.id,
                    'plan_id': plan.id,
                    'plan_code': plan.plan_code,
                    'course_title': plan.course.title,
                    'start_time': plan.start_time,
                    'end_time': plan.end_time,
                    'location': plan.location,
                    'status': enroll.status,
                    'registered_at': enroll.registered_at,
                    'total_study_hours': enroll.total_study_hours
                })

            return result

        except Exception as e:
            log_error("查询员工报名记录失败", e)
            return []

    def close(self):
        self.db.close()

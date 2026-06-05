import random
from datetime import datetime, timedelta, date
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from src.models.models import (
    Employee, TrainingPlan, Enrollment, Exam, ExamQuestion,
    ExamRecord, Question, Course
)
from src.models.database import SessionLocal
from src.utils.common import generate_code
from src.utils.logger import log_operation, log_info, log_error


class ExamManager:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()
        self.MAX_RETAKE_ATTEMPTS = 2
        self.RETAKE_WAIT_DAYS = 3

    def generate_exam(self, training_plan_id: int, operator: str,
                      num_questions: int = 10) -> Tuple[Optional[Exam], str]:
        try:
            plan = self.db.query(TrainingPlan).filter(TrainingPlan.id == training_plan_id).first()
            if not plan:
                return None, "培训计划不存在"

            course = self.db.query(Course).filter(Course.id == plan.course_id).first()
            if not course:
                return None, "关联课程不存在"

            questions = self.db.query(Question).filter(
                Question.course_id == course.id
            ).all()

            if len(questions) < num_questions:
                return None, f"题库题目不足，当前仅有{len(questions)}道题，需要{num_questions}道"

            selected_questions = random.sample(questions, num_questions)

            total_points = sum(q.points for q in selected_questions)

            exam_code = generate_code('EXAM_')
            exam = Exam(
                exam_code=exam_code,
                training_plan_id=training_plan_id,
                title=f"{course.title} - 结业考试",
                duration_minutes=60,
                passing_score=60,
                total_questions=num_questions,
                total_points=total_points,
                status='created'
            )

            self.db.add(exam)
            self.db.flush()

            for idx, question in enumerate(selected_questions):
                exam_question = ExamQuestion(
                    exam_id=exam.id,
                    question_id=question.id,
                    question_order=idx + 1
                )
                self.db.add(exam_question)

            self.db.commit()
            log_operation(operator, '生成考试', 'Exam', exam.id,
                          f"课程: {course.title}, 题目数: {num_questions}")

            return exam, "考试生成成功"

        except Exception as e:
            self.db.rollback()
            log_error("生成考试失败", e)
            return None, f"生成失败: {str(e)}"

    def get_exam_questions(self, exam_id: int) -> List[Dict]:
        try:
            exam_questions = self.db.query(ExamQuestion).filter(
                ExamQuestion.exam_id == exam_id
            ).order_by(ExamQuestion.question_order).all()

            result = []
            for eq in exam_questions:
                q = eq.question
                result.append({
                    'exam_question_id': eq.id,
                    'question_id': q.id,
                    'question_order': eq.question_order,
                    'question_type': q.question_type,
                    'question_text': q.question_text,
                    'options': q.get_options_list(),
                    'points': q.points
                })

            return result

        except Exception as e:
            log_error("获取考试题目失败", e)
            return []

    def start_exam(self, exam_id: int, employee_id: int, operator: str) -> Tuple[Optional[ExamRecord], str]:
        try:
            exam = self.db.query(Exam).filter(Exam.id == exam_id).first()
            if not exam:
                return None, "考试不存在"

            employee = self.db.query(Employee).filter(Employee.id == employee_id).first()
            if not employee:
                return None, "员工不存在"

            enrollment = self.db.query(Enrollment).filter(
                Enrollment.employee_id == employee_id,
                Enrollment.training_plan_id == exam.training_plan_id,
                Enrollment.is_active == True
            ).first()

            if not enrollment:
                return None, "未报名该培训，无法参加考试"

            previous_attempts = self.db.query(ExamRecord).filter(
                ExamRecord.exam_id == exam_id,
                ExamRecord.employee_id == employee_id
            ).count()

            if previous_attempts > 0:
                last_record = self.db.query(ExamRecord).filter(
                    ExamRecord.exam_id == exam_id,
                    ExamRecord.employee_id == employee_id
                ).order_by(ExamRecord.attempt_number.desc()).first()

                if last_record.attempt_number >= self.MAX_RETAKE_ATTEMPTS + 1:
                    return None, f"已达到最大补考次数（{self.MAX_RETAKE_ATTEMPTS}次）"

                if last_record.next_attempt_date and last_record.next_attempt_date > date.today():
                    return None, f"需等待至{last_record.next_attempt_date}后才能参加补考"

                if last_record.status == 'in_progress':
                    return None, "已有正在进行的考试"

            attempt_number = previous_attempts + 1

            if attempt_number > 1:
                existing_pending = self.db.query(ExamRecord).filter(
                    ExamRecord.exam_id == exam_id,
                    ExamRecord.employee_id == employee_id,
                    ExamRecord.status == 'pending'
                ).first()
                if existing_pending:
                    return existing_pending, "已有待完成的考试"

            record = ExamRecord(
                employee_id=employee_id,
                exam_id=exam_id,
                attempt_number=attempt_number,
                status='in_progress',
                started_at=datetime.now()
            )

            self.db.add(record)
            self.db.commit()

            log_operation(operator, '开始考试', 'ExamRecord', record.id,
                          f"员工: {employee.name}, 考试: {exam.title}, 第{attempt_number}次尝试")

            return record, "考试已开始"

        except Exception as e:
            self.db.rollback()
            log_error("开始考试失败", e)
            return None, f"开始失败: {str(e)}"

    def submit_exam(self, exam_record_id: int, answers: Dict[int, str], operator: str) -> Tuple[Optional[ExamRecord], Dict, str]:
        try:
            record = self.db.query(ExamRecord).filter(ExamRecord.id == exam_record_id).first()
            if not record:
                return None, {}, "考试记录不存在"

            if record.status != 'in_progress':
                return None, {}, f"考试状态不正确: {record.status}"

            exam = self.db.query(Exam).filter(Exam.id == record.exam_id).first()
            if not exam:
                return None, {}, "关联考试不存在"

            exam_questions = self.db.query(ExamQuestion).filter(
                ExamQuestion.exam_id == exam.id
            ).order_by(ExamQuestion.question_order).all()

            total_score = 0
            answer_details = []

            for eq in exam_questions:
                q = eq.question
                user_answer = answers.get(eq.id, '').strip().upper()
                is_correct = user_answer == q.correct_answer.upper()

                if is_correct:
                    total_score += q.points
                    score_for_question = q.points
                else:
                    score_for_question = 0

                answer_details.append({
                    'exam_question_id': eq.id,
                    'question_id': q.id,
                    'question_order': eq.question_order,
                    'question_text': q.question_text,
                    'user_answer': user_answer,
                    'correct_answer': q.correct_answer,
                    'is_correct': is_correct,
                    'points_earned': score_for_question,
                    'points_total': q.points
                })

            percentage_score = (total_score / exam.total_points) * 100
            is_passed = percentage_score >= exam.passing_score

            record.answers = str(answers)
            record.score = round(percentage_score, 2)
            record.is_passed = is_passed
            record.completed_at = datetime.now()
            record.status = 'completed'

            if not is_passed and record.attempt_number <= self.MAX_RETAKE_ATTEMPTS:
                record.next_attempt_date = (datetime.now() + timedelta(days=self.RETAKE_WAIT_DAYS)).date()
                record.feedback = f"考试不及格，需等待{self.RETAKE_WAIT_DAYS}天后参加补考，还剩{self.MAX_RETAKE_ATTEMPTS - record.attempt_number}次补考机会"
            elif not is_passed:
                record.feedback = "考试不及格，已达到最大补考次数"
            else:
                record.feedback = "考试通过，恭喜！"

            self.db.commit()

            employee = self.db.query(Employee).filter(Employee.id == record.employee_id).first()
            log_operation(operator, '提交考试', 'ExamRecord', record.id,
                          f"员工: {employee.name if employee else '未知'}, 得分: {percentage_score:.2f}, 通过: {is_passed}")

            result = {
                'total_score': total_score,
                'percentage_score': round(percentage_score, 2),
                'is_passed': is_passed,
                'passing_score': exam.passing_score,
                'total_points': exam.total_points,
                'correct_count': sum(1 for d in answer_details if d['is_correct']),
                'total_questions': len(answer_details),
                'next_attempt_date': record.next_attempt_date,
                'remaining_attempts': max(0, self.MAX_RETAKE_ATTEMPTS - record.attempt_number),
                'answer_details': answer_details
            }

            return record, result, "考试提交成功"

        except Exception as e:
            self.db.rollback()
            log_error("提交考试失败", e)
            return None, {}, f"提交失败: {str(e)}"

    def get_employee_exam_history(self, employee_id: int, course_id: Optional[int] = None) -> List[Dict]:
        try:
            query = self.db.query(ExamRecord).filter(ExamRecord.employee_id == employee_id)

            if course_id:
                query = query.join(Exam).filter(Exam.training_plan_id == TrainingPlan.id).join(TrainingPlan).filter(TrainingPlan.course_id == course_id)

            records = query.order_by(ExamRecord.completed_at.desc()).all()

            result = []
            for record in records:
                exam = record.exam
                plan = exam.training_plan
                course = plan.course
                result.append({
                    'exam_record_id': record.id,
                    'exam_id': exam.id,
                    'exam_code': exam.exam_code,
                    'exam_title': exam.title,
                    'course_title': course.title,
                    'course_id': course.id,
                    'attempt_number': record.attempt_number,
                    'score': record.score,
                    'is_passed': record.is_passed,
                    'status': record.status,
                    'started_at': record.started_at,
                    'completed_at': record.completed_at,
                    'next_attempt_date': record.next_attempt_date,
                    'feedback': record.feedback
                })

            return result

        except Exception as e:
            log_error("获取员工考试历史失败", e)
            return []

    def get_exam_results(self, exam_id: int) -> List[Dict]:
        try:
            records = self.db.query(ExamRecord).filter(
                ExamRecord.exam_id == exam_id,
                ExamRecord.status == 'completed'
            ).order_by(ExamRecord.score.desc()).all()

            result = []
            for record in records:
                employee = self.db.query(Employee).filter(Employee.id == record.employee_id).first()
                result.append({
                    'exam_record_id': record.id,
                    'employee_id': record.employee_id,
                    'employee_code': employee.employee_id if employee else '',
                    'employee_name': employee.name if employee else '未知',
                    'department': employee.department if employee else '',
                    'attempt_number': record.attempt_number,
                    'score': record.score,
                    'is_passed': record.is_passed,
                    'completed_at': record.completed_at
                })

            return result

        except Exception as e:
            log_error("获取考试结果失败", e)
            return []

    def get_exam_statistics(self, exam_id: int) -> Dict:
        try:
            records = self.db.query(ExamRecord).filter(
                ExamRecord.exam_id == exam_id,
                ExamRecord.status == 'completed'
            ).all()

            if not records:
                return {}

            scores = [r.score for r in records]
            passed_count = sum(1 for r in records if r.is_passed)

            return {
                'total_participants': len(records),
                'passed_count': passed_count,
                'failed_count': len(records) - passed_count,
                'pass_rate': round((passed_count / len(records)) * 100, 2),
                'average_score': round(sum(scores) / len(scores), 2),
                'max_score': max(scores),
                'min_score': min(scores),
                'score_distribution': self._calculate_score_distribution(scores)
            }

        except Exception as e:
            log_error("获取考试统计失败", e)
            return {}

    def _calculate_score_distribution(self, scores: List[float]) -> Dict:
        ranges = {
            '0-59': 0,
            '60-69': 0,
            '70-79': 0,
            '80-89': 0,
            '90-100': 0
        }

        for score in scores:
            if score < 60:
                ranges['0-59'] += 1
            elif score < 70:
                ranges['60-69'] += 1
            elif score < 80:
                ranges['70-79'] += 1
            elif score < 90:
                ranges['80-89'] += 1
            else:
                ranges['90-100'] += 1

        return ranges

    def auto_generate_exam_for_completed_training(self, operator: str) -> List[Dict]:
        try:
            completed_plans = self.db.query(TrainingPlan).filter(
                TrainingPlan.status == 'completed',
                TrainingPlan.end_time <= datetime.now()
            ).all()

            results = []
            for plan in completed_plans:
                existing_exam = self.db.query(Exam).filter(
                    Exam.training_plan_id == plan.id
                ).first()

                if not existing_exam:
                    exam, msg = self.generate_exam(plan.id, operator)
                    results.append({
                        'plan_id': plan.id,
                        'course_title': plan.course.title,
                        'exam_id': exam.id if exam else None,
                        'success': exam is not None,
                        'message': msg
                    })

            return results

        except Exception as e:
            log_error("自动生成考试失败", e)
            return []

    def close(self):
        self.db.close()

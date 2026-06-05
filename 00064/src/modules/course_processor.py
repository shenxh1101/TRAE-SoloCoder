import os
import shutil
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from src.models.models import (
    Course, Employee, CompetencyModel, TrainingPlan,
    Question
)
from src.models.database import SessionLocal
from src.utils.common import (
    parse_file_content, extract_keywords, generate_code,
    generate_questions_from_content, calculate_similarity, BASE_DIR
)
from src.utils.logger import log_operation, log_info, log_error


class CourseProcessor:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()
        self.upload_dir = os.path.join(BASE_DIR, 'uploads')
        os.makedirs(self.upload_dir, exist_ok=True)

    def upload_courseware(self, file_path: str, course_info: Dict, operator: str) -> Tuple[Optional[Course], str]:
        try:
            if not os.path.exists(file_path):
                return None, "文件不存在"

            file_name = os.path.basename(file_path)
            safe_file_name = f"{generate_code('FILE_')}_{file_name}"
            dest_path = os.path.join(self.upload_dir, safe_file_name)
            shutil.copy2(file_path, dest_path)

            content = parse_file_content(dest_path)
            if not content:
                return None, "文件解析失败"

            keywords = extract_keywords(content, top_n=30)
            target_skills = ','.join(keywords[:15])

            course_code = generate_code('COURSE_')
            course = Course(
                course_code=course_code,
                title=course_info.get('title', file_name),
                description=course_info.get('description', ''),
                category=course_info.get('category', ''),
                difficulty_level=course_info.get('difficulty_level', '中级'),
                target_skills=target_skills,
                duration_hours=course_info.get('duration_hours', 0),
                instructor=course_info.get('instructor', ''),
                content_path=dest_path,
                content_text=content,
                created_by=operator,
                is_active=True
            )

            self.db.add(course)
            self.db.flush()

            questions_data = generate_questions_from_content(content, course.id, num_questions=20)
            for q_data in questions_data:
                question = Question(**q_data)
                self.db.add(question)

            self.db.commit()
            log_operation(operator, '上传课件', 'Course', course.id,
                          f"课程: {course.title}, 生成题目: {len(questions_data)}道")

            return course, "课件上传成功，已自动解析内容并生成题库"

        except Exception as e:
            self.db.rollback()
            log_error("上传课件失败", e)
            return None, f"上传失败: {str(e)}"

    def match_employees_for_course(self, course_id: int) -> List[Dict]:
        try:
            course = self.db.query(Course).filter(Course.id == course_id).first()
            if not course:
                return []

            course_skills = set(course.get_target_skills_list())
            if not course_skills:
                return []

            employees = self.db.query(Employee).filter(Employee.skills != '').all()
            matched_results = []

            for employee in employees:
                emp_skills = set([s.strip() for s in employee.skills.split(',') if s.strip()])
                missing_skills = course_skills - emp_skills
                match_score = len(course_skills - missing_skills) / len(course_skills) if course_skills else 0

                competency = self.db.query(CompetencyModel).filter(
                    CompetencyModel.position == employee.position,
                    CompetencyModel.level == employee.level
                ).first()

                if competency:
                    comp_skills = set(competency.get_required_skills_list())
                    needed_skills = comp_skills & course_skills
                    if needed_skills:
                        match_score += 0.3
                        match_score = min(match_score, 1.0)

                if match_score > 0.1:
                    matched_results.append({
                        'employee_id': employee.id,
                        'employee_code': employee.employee_id,
                        'name': employee.name,
                        'department': employee.department,
                        'position': employee.position,
                        'match_score': round(match_score, 2),
                        'missing_skills': list(missing_skills),
                        'recommendation_level': '高' if match_score >= 0.7 else ('中' if match_score >= 0.4 else '低')
                    })

            matched_results.sort(key=lambda x: x['match_score'], reverse=True)
            return matched_results

        except Exception as e:
            log_error("匹配员工失败", e)
            return []

    def generate_training_plan(self, course_id: int, operator: str,
                               start_time: Optional[datetime] = None,
                               end_time: Optional[datetime] = None,
                               location: str = '',
                               max_participants: int = 30) -> Tuple[Optional[TrainingPlan], List[Dict], str]:
        try:
            course = self.db.query(Course).filter(Course.id == course_id).first()
            if not course:
                return None, [], "课程不存在"

            if not start_time:
                start_time = datetime.now() + timedelta(days=7)
                start_time = start_time.replace(hour=9, minute=0, second=0, microsecond=0)
            if not end_time:
                duration = max(course.duration_hours or 4, 1)
                end_time = start_time + timedelta(hours=duration)

            plan_code = generate_code('PLAN_')
            plan = TrainingPlan(
                plan_code=plan_code,
                course_id=course_id,
                start_time=start_time,
                end_time=end_time,
                location=location,
                max_participants=max_participants,
                current_participants=0,
                status='pending',
                generated_by=operator
            )

            self.db.add(plan)
            self.db.flush()

            matched_employees = self.match_employees_for_course(course_id)

            self.db.commit()
            log_operation(operator, '生成培训计划', 'TrainingPlan', plan.id,
                          f"课程: {course.title}, 计划时间: {start_time.strftime('%Y-%m-%d %H:%M')}")

            return plan, matched_employees, "培训计划生成成功，已匹配推荐员工"

        except Exception as e:
            self.db.rollback()
            log_error("生成培训计划失败", e)
            return None, [], f"生成失败: {str(e)}"

    def recommend_advanced_courses(self, employee_id: int, top_n: int = 5) -> List[Dict]:
        try:
            employee = self.db.query(Employee).filter(Employee.id == employee_id).first()
            if not employee:
                return []

            emp_skills = set([s.strip() for s in (employee.skills or '').split(',') if s.strip()])

            courses = self.db.query(Course).filter(
                Course.is_active == True,
                Course.difficulty_level.in_(['高级', '专家'])
            ).all()

            recommendations = []
            for course in courses:
                course_skills = set(course.get_target_skills_list())
                if not course_skills:
                    continue

                has_prerequisites = len(emp_skills & course_skills) >= len(course_skills) * 0.3
                if not has_prerequisites:
                    continue

                new_skills = course_skills - emp_skills
                score = len(new_skills) / len(course_skills) if course_skills else 0

                if score > 0:
                    recommendations.append({
                        'course_id': course.id,
                        'course_code': course.course_code,
                        'title': course.title,
                        'category': course.category,
                        'difficulty_level': course.difficulty_level,
                        'new_skills': list(new_skills),
                        'match_score': round(score, 2),
                        'instructor': course.instructor
                    })

            recommendations.sort(key=lambda x: x['match_score'], reverse=True)
            return recommendations[:top_n]

        except Exception as e:
            log_error("推荐进阶课程失败", e)
            return []

    def close(self):
        self.db.close()

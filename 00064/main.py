#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动化员工培训与考核管理系统
"""

import os
import sys
import argparse
from datetime import datetime, date, timedelta
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.models.database import init_db, SessionLocal
from src.models.models import Employee, CompetencyModel, Course, TrainingPlan, Exam, ExamRecord, Enrollment
from src.modules import (
    CourseProcessor, EnrollmentManager, LearningMonitor,
    ExamManager, CertificateManager, ReportGenerator, DataQueryManager
)
from src.utils.logger import log_operation, log_info, log_error
from src.utils.common import generate_code


class TrainingSystem:
    def __init__(self):
        init_db()
        self.db = SessionLocal()
        self.course_processor = CourseProcessor(self.db)
        self.enrollment_manager = EnrollmentManager(self.db)
        self.learning_monitor = LearningMonitor(self.db)
        self.exam_manager = ExamManager(self.db)
        self.certificate_manager = CertificateManager(self.db)
        self.report_generator = ReportGenerator(self.db)
        self.data_query = DataQueryManager(self.db)

    def init_sample_data(self):
        try:
            if self.db.query(Employee).count() > 0:
                print("已存在示例数据，跳过初始化")
                return

            print("正在初始化示例数据...")

            departments = ['技术部', '产品部', '运营部', '市场部', '人力资源部']
            positions = ['工程师', '高级工程师', '技术经理', '产品经理', '运营专员', '市场专员', 'HR专员']
            levels = ['初级', '中级', '高级', '专家']
            skills_pools = {
                '技术部': ['Python', 'Java', 'SQL', 'Docker', 'Kubernetes', '微服务', '设计模式', '算法', '数据结构'],
                '产品部': ['产品设计', '需求分析', '原型设计', '用户研究', '数据分析', '项目管理'],
                '运营部': ['内容运营', '用户运营', '活动策划', '数据分析', '社群运营', 'SEO'],
                '市场部': ['品牌营销', '市场调研', '广告投放', '公关传播', '活动策划', '数据分析'],
                '人力资源部': ['招聘', '培训', '绩效', '薪酬', '员工关系', '组织发展']
            }

            for i in range(1, 31):
                dept = departments[i % len(departments)]
                pos = positions[i % len(positions)]
                lvl = levels[i % len(levels)]
                dept_skills = skills_pools.get(dept, [])
                emp_skills = ','.join(dept_skills[:i % 5 + 2])

                employee = Employee(
                    employee_id=f'EMP{i:04d}',
                    name=f'员工{i}',
                    department=dept,
                    position=pos,
                    level=lvl,
                    email=f'emp{i}@company.com',
                    phone=f'138{i:08d}',
                    supervisor_id=f'EMP{(i % 5) + 1:04d}',
                    skills=emp_skills
                )
                self.db.add(employee)

            for pos in positions:
                for lvl in levels[:3]:
                    key = '技术部' if '工程师' in pos or '技术' in pos else (
                        '产品部' if '产品' in pos else
                        '运营部' if '运营' in pos else
                        '市场部' if '市场' in pos else '人力资源部'
                    )
                    skills = skills_pools.get(key, [])
                    if skills:
                        competency = CompetencyModel(
                            position=pos,
                            level=lvl,
                            required_skills=','.join(skills),
                            description=f'{lvl}{pos}岗位胜任力要求'
                        )
                        self.db.add(competency)

            sample_courses = [
                ('Python高级编程', '技术培训', '高级', 'Python,设计模式,算法', 16, '张讲师'),
                ('数据分析入门', '通用培训', '中级', '数据分析,SQL,统计', 8, '李讲师'),
                ('项目管理实战', '管理培训', '中级', '项目管理,沟通,风险管理', 12, '王讲师'),
                ('产品设计思维', '产品培训', '高级', '产品设计,用户研究,原型设计', 10, '赵讲师'),
                ('高效沟通技巧', '通用培训', '初级', '沟通,表达,演讲', 6, '刘讲师')
            ]

            for i, (title, category, diff, skills, hours, instructor) in enumerate(sample_courses, 1):
                content_text = f"""
                    这是{title}的培训内容。
                    课程包含{skills.split(',')[0]}的核心概念和实践方法。
                    通过本课程的学习，学员将掌握相关技能并能够应用于实际工作中。
                    课程分为理论讲解和实践练习两部分，强调动手能力的培养。
                    学员需要完成课后作业和项目实践，以确保掌握所学内容。
                    考核方式包括平时表现、作业完成情况和最终考试。
                    {skills}是本课程的核心技能点。
                    本课程适合{diff}水平的员工参加。
                    通过考试的学员将获得相应的培训证书。
                    课程注重实践能力的培养和实际问题的解决。
                    """
                course = Course(
                    course_code=f'COURSE{i:04d}',
                    title=title,
                    description=f'{title}培训课程',
                    category=category,
                    difficulty_level=diff,
                    target_skills=skills,
                    duration_hours=hours,
                    instructor=instructor,
                    content_text=content_text,
                    created_by='system',
                    is_active=True
                )
                self.db.add(course)
                self.db.flush()

                from src.utils.common import generate_questions_from_content
                questions_data = generate_questions_from_content(content_text, course.id, num_questions=15)
                for q_data in questions_data:
                    from src.models.models import Question
                    question = Question(**q_data)
                    self.db.add(question)

            self.db.commit()
            print("示例数据初始化完成")
            log_operation('system', '初始化示例数据', None, None, '创建30名员工、岗位胜任力模型和5门课程')

        except Exception as e:
            self.db.rollback()
            log_error("初始化示例数据失败", e)
            print(f"初始化失败: {e}")

    def upload_courseware(self, file_path: str, course_info: dict, operator: str = 'admin'):
        print(f"\n=== 上传课件: {course_info.get('title', file_path)} ===")
        course, msg = self.course_processor.upload_courseware(file_path, course_info, operator)
        print(msg)
        if course:
            print(f"课程ID: {course.id}, 课程编码: {course.course_code}")
            print(f"提取技能标签: {course.target_skills}")
            return course
        return None

    def generate_training_plan(self, course_id: int, operator: str = 'admin'):
        print(f"\n=== 生成培训计划 (课程ID: {course_id}) ===")
        plan, matched_employees, msg = self.course_processor.generate_training_plan(course_id, operator)
        print(msg)
        if plan:
            print(f"计划ID: {plan.id}, 计划编码: {plan.plan_code}")
            print(f"培训时间: {plan.start_time.strftime('%Y-%m-%d %H:%M')} - {plan.end_time.strftime('%Y-%m-%d %H:%M')}")
            print(f"\n推荐员工列表 (前10名):")
            for i, emp in enumerate(matched_employees[:10], 1):
                print(f"  {i}. {emp['name']} ({emp['department']}/{emp['position']}) - 匹配度: {emp['match_score']}, 推荐等级: {emp['recommendation_level']}")
        return plan

    def enroll_employee(self, employee_id: int, training_plan_id: int, operator: str = 'admin'):
        emp = self.db.query(Employee).filter(Employee.id == employee_id).first()
        plan = self.db.query(TrainingPlan).filter(TrainingPlan.id == training_plan_id).first()
        emp_name = emp.name if emp else '未知'
        plan_code = plan.plan_code if plan else '未知'
        print(f"\n=== 员工报名: {emp_name} -> {plan_code} ===")

        enrollment, extra, msg = self.enrollment_manager.enroll_employee(employee_id, training_plan_id, operator)
        print(msg)

        if extra.get('conflicts'):
            print("\n时间冲突详情:")
            for c in extra['conflicts']:
                print(f"  - {c['course_title']} ({c['start_time'].strftime('%Y-%m-%d %H:%M')} - {c['end_time'].strftime('%Y-%m-%d %H:%M')})")
            if extra.get('alternatives'):
                print("\n推荐替代时段:")
                for i, alt in enumerate(extra['alternatives'][:3], 1):
                    print(f"  {i}. {alt['start_time'].strftime('%Y-%m-%d %H:%M')} - {alt['end_time'].strftime('%Y-%m-%d %H:%M')}")

        if extra.get('waitlist_id'):
            print(f"等待队列位置: 第{extra['position']}位, 优先级: {extra['priority']}")

        return enrollment, extra

    def cancel_enrollment(self, enrollment_id: int, reason: str = '', operator: str = 'admin'):
        print(f"\n=== 取消报名 (报名ID: {enrollment_id}) ===")
        success, msg = self.enrollment_manager.cancel_enrollment(enrollment_id, operator, reason)
        print(msg)
        return success

    def start_training_monitoring(self, training_plan_id: int, operator: str = 'admin'):
        print(f"\n=== 启动培训监控 (计划ID: {training_plan_id}) ===")
        success, msg = self.learning_monitor.start_monitoring(training_plan_id, operator)
        print(msg)
        return success

    def simulate_training_process(self, training_plan_id: int, operator: str = 'admin'):
        print(f"\n=== 模拟培训过程 (计划ID: {training_plan_id}) ===")
        print("将模拟4次30分钟间隔的学习时长采集...")

        for i in range(4):
            print(f"\n第{i+1}次采集:")
            results, msg = self.learning_monitor.batch_collect_study_time(training_plan_id, operator)
            print(msg)
            for r in results[:5]:
                status = "✓" if r['success'] else "✗"
                print(f"  {status} {r['employee_name']}: {r['study_minutes']}分钟 - {r['message']}")

        inactive = self.learning_monitor.get_inactive_employees(training_plan_id)
        if inactive:
            print(f"\n⚠️  发现{len(inactive)}名学习不积极的员工:")
            for emp in inactive:
                print(f"  - {emp['employee_name']} ({emp['department']}): 预警次数 {emp['warning_count']}次")

    def stop_training_and_generate_exam(self, training_plan_id: int, operator: str = 'admin'):
        print(f"\n=== 结束培训并生成考试 (计划ID: {training_plan_id}) ===")

        success, msg = self.learning_monitor.stop_monitoring(training_plan_id, operator)
        print(msg)

        exam, msg = self.exam_manager.generate_exam(training_plan_id, operator, num_questions=10)
        print(msg)
        if exam:
            print(f"考试ID: {exam.id}, 考试编码: {exam.exam_code}")
            print(f"考试标题: {exam.title}")
            print(f"题目数量: {exam.total_questions}, 总分: {exam.total_points}, 及格线: {exam.passing_score}分")

            questions = self.exam_manager.get_exam_questions(exam.id)
            print(f"\n考试题目预览 (前3题):")
            for i, q in enumerate(questions[:3], 1):
                print(f"\n  第{i}题 ({q['points']}分): {q['question_text'][:50]}...")
                for opt in q['options']:
                    print(f"    {opt}")

        return exam

    def simulate_exam_process(self, exam_id: int, operator: str = 'admin'):
        print(f"\n=== 模拟考试过程 (考试ID: {exam_id}) ===")

        exam = self.db.query(Exam).filter(Exam.id == exam_id).first()
        plan = self.db.query(TrainingPlan).filter(TrainingPlan.id == exam.training_plan_id).first()
        enrollments = plan.enrollments if plan else []

        if not enrollments:
            print("没有报名员工可以参加考试")
            return

        print(f"共有{len(enrollments)}名员工需要参加考试")

        for i, enroll in enumerate(enrollments[:5], 1):
            emp = enroll.employee
            print(f"\n员工 {i}: {emp.name}")

            record, msg = self.exam_manager.start_exam(exam_id, emp.id, operator)
            print(f"  开始考试: {msg}")
            if not record:
                continue

            questions = self.exam_manager.get_exam_questions(exam_id)
            answers = {}
            import random
            for q in questions:
                options = q['options']
                if options:
                    selected = random.choice([opt.split('.')[0] for opt in options])
                    answers[q['exam_question_id']] = selected

            record, result, msg = self.exam_manager.submit_exam(record.id, answers, operator)
            print(f"  提交结果: {msg}")
            if result:
                pass_status = "✓ 通过" if result['is_passed'] else "✗ 未通过"
                print(f"  得分: {result['percentage_score']}分 / {result['passing_score']}分 {pass_status}")
                print(f"  正确: {result['correct_count']}/{result['total_questions']}题")
                if not result['is_passed'] and result['next_attempt_date']:
                    print(f"  下次补考时间: {result['next_attempt_date']}, 剩余补考次数: {result['remaining_attempts']}")

        stats = self.exam_manager.get_exam_statistics(exam_id)
        if stats:
            print(f"\n=== 考试统计 ===")
            print(f"总参与人数: {stats['total_participants']}")
            print(f"通过人数: {stats['passed_count']}, 未通过: {stats['failed_count']}")
            print(f"通过率: {stats['pass_rate']}%")
            print(f"平均分: {stats['average_score']} (最高{stats['max_score']}, 最低{stats['min_score']})")
            print(f"分数分布: {stats['score_distribution']}")

    def issue_certificates(self, operator: str = 'admin'):
        print(f"\n=== 自动颁发证书 ===")
        results = self.certificate_manager.auto_issue_certificates(operator)
        if results:
            for r in results:
                status = "✓" if r['success'] else "✗"
                print(f"  {status} {r['employee_name']} - {r['course_title']}: {r['message']}")
        else:
            print("没有需要颁发的证书")

        return results

    def generate_monthly_report(self, year: int = None, month: int = None, operator: str = 'admin'):
        if not year or not month:
            now = datetime.now()
            last_month = now.month - 1
            year = now.year
            if last_month == 0:
                last_month = 12
                year = now.year - 1
            month = last_month

        print(f"\n=== 生成月度报告: {year}年{month}月 ===")
        report, data, msg = self.report_generator.generate_monthly_report(year, month, operator)
        print(msg)
        if report:
            print(f"\n报告概览:")
            print(f"  培训计划数: {data['current_data']['total_training_plans']}")
            print(f"  报名人次: {data['current_data']['total_enrollments']}")
            print(f"  完成率: {data['current_data']['completion_rate']}%")
            print(f"  参与率: {data['current_data']['participation_rate']}%")
            print(f"  平均成绩: {data['current_data']['average_score']}分")
            print(f"  总培训学时: {data['current_data']['total_training_hours']}小时")

            print(f"\n环比变化:")
            for key, value in data['comparison'].items():
                if value is not None:
                    change = "↑" if value > 0 else ("↓" if value < 0 else "—")
                    print(f"  {key}: {change} {abs(value) if value else 0}%")

            print(f"\n报告文件:")
            print(f"  PDF: {data['pdf_path']}")
            print(f"  Excel: {data['excel_path']}")

        return report

    def query_and_export(self, export_type: str = 'training', operator: str = 'admin', **kwargs):
        print(f"\n=== 查询与导出: {export_type} ===")

        if export_type == 'training':
            records = self.data_query.query_training_records(**kwargs)
            print(f"查询到{len(records)}条培训记录")
            if records:
                filepath, msg = self.data_query.export_training_records(records, operator)
                print(msg)
                print(f"导出文件: {filepath}")

        elif export_type == 'exam':
            records = self.data_query.query_exam_scores(**kwargs)
            print(f"查询到{len(records)}条考试成绩记录")
            if records:
                filepath, msg = self.data_query.export_exam_scores(records, operator)
                print(msg)
                print(f"导出文件: {filepath}")

        elif export_type == 'logs':
            records = self.data_query.query_operation_logs(**kwargs)
            print(f"查询到{len(records)}条操作日志")
            if records:
                filepath, msg = self.data_query.export_operation_logs(records, operator)
                print(msg)
                print(f"导出文件: {filepath}")

    def run_full_demo(self):
        print("=" * 60)
        print("自动化员工培训与考核管理系统 - 完整演示")
        print("=" * 60)

        self.init_sample_data()

        course1 = self.db.query(Course).filter(Course.course_code == 'COURSE0001').first()
        course2 = self.db.query(Course).filter(Course.course_code == 'COURSE0002').first()

        if course1:
            plan1 = self.generate_training_plan(course1.id)

            if plan1:
                emp1 = self.db.query(Employee).filter(Employee.employee_id == 'EMP0001').first()
                emp2 = self.db.query(Employee).filter(Employee.employee_id == 'EMP0002').first()
                emp3 = self.db.query(Employee).filter(Employee.employee_id == 'EMP0003').first()

                if emp1:
                    self.enroll_employee(emp1.id, plan1.id)
                if emp2:
                    self.enroll_employee(emp2.id, plan1.id)
                if emp3:
                    self.enroll_employee(emp3.id, plan1.id)

                self.start_training_monitoring(plan1.id)
                self.simulate_training_process(plan1.id)

                exam = self.stop_training_and_generate_exam(plan1.id)
                if exam:
                    self.simulate_exam_process(exam.id)

        self.issue_certificates()
        self.generate_monthly_report()

        self.query_and_export('training')
        self.query_and_export('exam')
        self.query_and_export('logs')

        print("\n" + "=" * 60)
        print("演示完成！所有文件已保存在 exports 目录下")
        print("=" * 60)

    def close(self):
        self.course_processor.close()
        self.enrollment_manager.close()
        self.learning_monitor.close()
        self.exam_manager.close()
        self.certificate_manager.close()
        self.report_generator.close()
        self.data_query.close()
        self.db.close()


def main():
    parser = argparse.ArgumentParser(description='自动化员工培训与考核管理系统')
    parser.add_argument('--init', action='store_true', help='初始化示例数据')
    parser.add_argument('--demo', action='store_true', help='运行完整演示')
    parser.add_argument('--report', action='store_true', help='生成月度报告')
    parser.add_argument('--year', type=int, help='报告年份')
    parser.add_argument('--month', type=int, help='报告月份')
    parser.add_argument('--export', choices=['training', 'exam', 'logs'], help='导出数据类型')
    parser.add_argument('--department', help='按部门筛选')
    parser.add_argument('--course', help='按课程名称筛选')

    args = parser.parse_args()

    system = TrainingSystem()

    try:
        if args.init:
            system.init_sample_data()
        elif args.demo:
            system.run_full_demo()
        elif args.report:
            system.generate_monthly_report(args.year, args.month)
        elif args.export:
            kwargs = {}
            if args.department:
                kwargs['department'] = args.department
            if args.course:
                kwargs['course_name'] = args.course
            system.query_and_export(args.export, **kwargs)
        else:
            parser.print_help()
            print("\n提示: 使用 --demo 参数运行完整演示流程")

    except Exception as e:
        log_error("系统运行出错", e)
        print(f"系统出错: {e}")
    finally:
        system.close()


if __name__ == '__main__':
    main()

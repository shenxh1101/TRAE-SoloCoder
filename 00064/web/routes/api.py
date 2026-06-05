#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用API路由
"""

from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.utils import secure_filename
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.models.database import SessionLocal
from src.models.models import Course, TrainingPlan, Enrollment, Exam, ExamRecord, Certificate, LearningRecord
from src.utils.common import parse_file_content, generate_questions_from_content
from src.utils.logger import log_operation, log_error
from src.modules import CourseProcessor, EnrollmentManager, ExamManager, CertificateManager, LearningMonitor

api_bp = Blueprint('api', __name__)

def get_db():
    return SessionLocal()

def get_current_user():
    return {
        'id': session.get('user_id'),
        'name': session.get('user_name'),
        'role': session.get('user_role')
    }

@api_bp.route('/stats', methods=['GET'])
def get_stats():
    db = get_db()
    
    total_courses = db.query(Course).count()
    total_plans = db.query(TrainingPlan).count()
    total_exams = db.query(Exam).count()
    total_certificates = db.query(Certificate).count()
    
    return jsonify({
        'success': True,
        'data': {
            'total_courses': total_courses,
            'total_plans': total_plans,
            'total_exams': total_exams,
            'total_certificates': total_certificates
        }
    })

@api_bp.route('/courses', methods=['GET'])
def get_courses():
    db = get_db()
    courses = db.query(Course).order_by(Course.id.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': c.id,
            'course_code': c.course_code,
            'title': c.title,
            'category': c.category,
            'difficulty_level': c.difficulty_level,
            'target_skills': c.target_skills,
            'duration_hours': c.duration_hours,
            'instructor': c.instructor,
            'question_count': len(c.questions),
            'created_at': c.created_at.strftime('%Y-%m-%d %H:%M') if c.created_at else None
        } for c in courses]
    })

@api_bp.route('/courses/<int:course_id>', methods=['GET'])
def get_course(course_id):
    db = get_db()
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        return jsonify({'success': False, 'message': '课程不存在'}), 404
    
    return jsonify({
        'success': True,
        'data': {
            'id': course.id,
            'course_code': course.course_code,
            'title': course.title,
            'description': course.description,
            'category': course.category,
            'difficulty_level': course.difficulty_level,
            'target_skills': course.target_skills,
            'duration_hours': course.duration_hours,
            'instructor': course.instructor,
            'content_text': course.content_text,
            'created_at': course.created_at.strftime('%Y-%m-%d %H:%M') if course.created_at else None
        }
    })

@api_bp.route('/courses/upload', methods=['POST'])
def upload_courseware():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '没有上传文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': '没有选择文件'}), 400
    
    title = request.form.get('title', file.filename)
    category = request.form.get('category', '技术培训')
    difficulty = request.form.get('difficulty', '中级')
    instructor = request.form.get('instructor', '系统讲师')
    
    filename = secure_filename(file.filename)
    upload_folder = current_app.config['UPLOAD_FOLDER']
    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)
    
    content = parse_file_content(file_path)
    
    db = get_db()
    course_processor = CourseProcessor(db)
    user = get_current_user()
    
    course, msg = course_processor.upload_courseware(
        file_path=file_path,
        title=title,
        category=category,
        difficulty_level=difficulty,
        instructor=instructor,
        operator=user.get('name', 'admin')
    )
    
    if course:
        return jsonify({
            'success': True,
            'message': msg,
            'data': {
                'course_id': course.id,
                'course_code': course.course_code,
                'title': course.title,
                'keywords_count': len(course.target_skills.split(',')) if course.target_skills else 0
            }
        })
    
    return jsonify({'success': False, 'message': msg}), 400

@api_bp.route('/training-plans', methods=['GET'])
def get_training_plans():
    db = get_db()
    plans = db.query(TrainingPlan).order_by(TrainingPlan.id.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': p.id,
            'plan_code': p.plan_code,
            'course_title': p.course.title if p.course else None,
            'start_time': p.start_time.strftime('%Y-%m-%d %H:%M') if p.start_time else None,
            'end_time': p.end_time.strftime('%Y-%m-%d %H:%M') if p.end_time else None,
            'max_participants': p.max_participants,
            'enrolled_count': len(p.enrollments),
            'status': p.status,
            'monitoring_status': p.monitoring_status
        } for p in plans]
    })

@api_bp.route('/training-plans', methods=['POST'])
def create_training_plan():
    data = request.get_json()
    course_id = data.get('course_id')
    
    if not course_id:
        return jsonify({'success': False, 'message': '缺少课程ID'}), 400
    
    db = get_db()
    course_processor = CourseProcessor(db)
    user = get_current_user()
    
    plan, msg, recommended = course_processor.generate_training_plan(
        course_id=course_id,
        operator=user.get('name', 'admin')
    )
    
    if plan:
        return jsonify({
            'success': True,
            'message': msg,
            'data': {
                'plan_id': plan.id,
                'plan_code': plan.plan_code,
                'recommended_count': len(recommended)
            }
        })
    
    return jsonify({'success': False, 'message': msg}), 400

@api_bp.route('/training-plans/<int:plan_id>/match', methods=['GET'])
def get_matched_employees(plan_id):
    db = get_db()
    course_processor = CourseProcessor(db)
    
    plan = db.query(TrainingPlan).filter(TrainingPlan.id == plan_id).first()
    if not plan:
        return jsonify({'success': False, 'message': '培训计划不存在'}), 404
    
    matched = course_processor.match_employees_for_course(plan.course_id)
    
    return jsonify({
        'success': True,
        'data': matched
    })

@api_bp.route('/enrollments', methods=['POST'])
def enroll_employee():
    data = request.get_json()
    plan_id = data.get('plan_id')
    employee_id = data.get('employee_id')
    
    if not plan_id or not employee_id:
        return jsonify({'success': False, 'message': '缺少必要参数'}), 400
    
    db = get_db()
    enrollment_manager = EnrollmentManager(db)
    user = get_current_user()
    
    result, msg = enrollment_manager.enroll_employee(
        training_plan_id=plan_id,
        employee_id=employee_id,
        operator=user.get('name', 'admin')
    )
    
    if result:
        return jsonify({
            'success': True,
            'message': msg,
            'data': {
                'enrollment_id': result.id if hasattr(result, 'id') else None,
                'waitlist_id': result.id if hasattr(result, 'priority') else None
            }
        })
    
    return jsonify({'success': False, 'message': msg}), 400

@api_bp.route('/enrollments/<int:enrollment_id>/cancel', methods=['POST'])
def cancel_enrollment(enrollment_id):
    db = get_db()
    enrollment_manager = EnrollmentManager(db)
    user = get_current_user()
    
    success, msg, promoted = enrollment_manager.cancel_enrollment(
        enrollment_id=enrollment_id,
        operator=user.get('name', 'admin')
    )
    
    if success:
        return jsonify({
            'success': True,
            'message': msg,
            'data': {'promoted_count': len(promoted)}
        })
    
    return jsonify({'success': False, 'message': msg}), 400

@api_bp.route('/enrollments/check-conflict', methods=['POST'])
def check_conflict():
    data = request.get_json()
    employee_id = data.get('employee_id')
    plan_id = data.get('plan_id')
    
    db = get_db()
    enrollment_manager = EnrollmentManager(db)
    
    has_conflict, conflicts, alternatives = enrollment_manager.check_time_conflicts(employee_id, plan_id)
    
    return jsonify({
        'success': True,
        'data': {
            'has_conflict': has_conflict,
            'conflicts': conflicts,
            'alternatives': alternatives
        }
    })

@api_bp.route('/exams', methods=['GET'])
def get_exams():
    db = get_db()
    exams = db.query(Exam).order_by(Exam.id.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': e.id,
            'exam_code': e.exam_code,
            'title': e.title,
            'course_title': e.course.title if e.course else None,
            'question_count': e.question_count,
            'passing_score': e.passing_score,
            'total_score': e.total_score,
            'created_at': e.created_at.strftime('%Y-%m-%d %H:%M') if e.created_at else None
        } for e in exams]
    })

@api_bp.route('/exams/<int:exam_id>', methods=['GET'])
def get_exam(exam_id):
    db = get_db()
    exam_manager = ExamManager(db)
    
    questions = exam_manager.get_exam_questions(exam_id)
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    
    if not exam:
        return jsonify({'success': False, 'message': '考试不存在'}), 404
    
    return jsonify({
        'success': True,
        'data': {
            'exam': {
                'id': exam.id,
                'exam_code': exam.exam_code,
                'title': exam.title,
                'question_count': exam.question_count,
                'passing_score': exam.passing_score,
                'total_score': exam.total_score
            },
            'questions': questions
        }
    })

@api_bp.route('/exams/generate', methods=['POST'])
def generate_exam():
    data = request.get_json()
    training_plan_id = data.get('training_plan_id')
    
    if not training_plan_id:
        return jsonify({'success': False, 'message': '缺少培训计划ID'}), 400
    
    db = get_db()
    exam_manager = ExamManager(db)
    user = get_current_user()
    
    exam, msg = exam_manager.generate_exam(
        training_plan_id=training_plan_id,
        operator=user.get('name', 'admin')
    )
    
    if exam:
        return jsonify({
            'success': True,
            'message': msg,
            'data': {
                'exam_id': exam.id,
                'exam_code': exam.exam_code,
                'title': exam.title,
                'question_count': exam.question_count
            }
        })
    
    return jsonify({'success': False, 'message': msg}), 400

@api_bp.route('/exams/<int:exam_id>/start', methods=['POST'])
def start_exam(exam_id):
    data = request.get_json()
    employee_id = data.get('employee_id') or session.get('user_id')
    
    if not employee_id:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    db = get_db()
    exam_manager = ExamManager(db)
    user = get_current_user()
    
    record, msg = exam_manager.start_exam(
        exam_id=exam_id,
        employee_id=employee_id,
        operator=user.get('name', 'admin')
    )
    
    if record:
        return jsonify({
            'success': True,
            'message': msg,
            'data': {
                'record_id': record.id,
                'start_time': record.start_time.strftime('%Y-%m-%d %H:%M') if record.start_time else None
            }
        })
    
    return jsonify({'success': False, 'message': msg}), 400

@api_bp.route('/exams/<int:record_id>/submit', methods=['POST'])
def submit_exam(record_id):
    data = request.get_json()
    answers = data.get('answers', {})
    
    db = get_db()
    exam_manager = ExamManager(db)
    user = get_current_user()
    
    record, result, msg = exam_manager.submit_exam(
        exam_record_id=record_id,
        answers=answers,
        operator=user.get('name', 'admin')
    )
    
    if result:
        return jsonify({
            'success': True,
            'message': msg,
            'data': result
        })
    
    return jsonify({'success': False, 'message': msg}), 400

@api_bp.route('/exams/<int:exam_id>/statistics', methods=['GET'])
def get_exam_statistics(exam_id):
    db = get_db()
    exam_manager = ExamManager(db)
    
    stats = exam_manager.get_exam_statistics(exam_id)
    
    return jsonify({
        'success': True,
        'data': stats
    })

@api_bp.route('/certificates', methods=['GET'])
def get_certificates():
    db = get_db()
    certificates = db.query(Certificate).order_by(Certificate.id.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': c.id,
            'certificate_code': c.certificate_code,
            'employee_name': c.employee.name if c.employee else None,
            'course_title': c.course.title if c.course else None,
            'issue_date': c.issue_date.strftime('%Y-%m-%d') if c.issue_date else None,
            'expiry_date': c.expiry_date.strftime('%Y-%m-%d') if c.expiry_date else None,
            'is_valid': c.is_valid
        } for c in certificates]
    })

@api_bp.route('/certificates/auto-issue', methods=['POST'])
def auto_issue_certificates():
    db = get_db()
    certificate_manager = CertificateManager(db)
    user = get_current_user()
    
    results = certificate_manager.auto_issue_certificates(
        operator=user.get('name', 'admin')
    )
    
    return jsonify({
        'success': True,
        'data': results
    })

@api_bp.route('/learning/records', methods=['GET'])
def get_learning_records():
    plan_id = request.args.get('plan_id', type=int)
    employee_id = request.args.get('employee_id', type=int)
    
    db = get_db()
    query = db.query(LearningRecord)
    
    if plan_id:
        query = query.filter(LearningRecord.training_plan_id == plan_id)
    if employee_id:
        query = query.filter(LearningRecord.employee_id == employee_id)
    
    records = query.order_by(LearningRecord.record_time.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': r.id,
            'employee_name': r.employee.name if r.employee else None,
            'plan_id': r.training_plan_id,
            'study_minutes': r.study_minutes,
            'record_time': r.record_time.strftime('%Y-%m-%d %H:%M') if r.record_time else None,
            'is_meeting': r.is_meeting
        } for r in records]
    })

@api_bp.route('/learning/monitor/start', methods=['POST'])
def start_monitoring():
    data = request.get_json()
    plan_id = data.get('plan_id')
    
    if not plan_id:
        return jsonify({'success': False, 'message': '缺少培训计划ID'}), 400
    
    db = get_db()
    learning_monitor = LearningMonitor(db)
    user = get_current_user()
    
    success, msg = learning_monitor.start_monitoring(
        training_plan_id=plan_id,
        operator=user.get('name', 'admin')
    )
    
    if success:
        return jsonify({'success': True, 'message': msg})
    
    return jsonify({'success': False, 'message': msg}), 400

@api_bp.route('/learning/monitor/stop', methods=['POST'])
def stop_monitoring():
    data = request.get_json()
    plan_id = data.get('plan_id')
    
    if not plan_id:
        return jsonify({'success': False, 'message': '缺少培训计划ID'}), 400
    
    db = get_db()
    learning_monitor = LearningMonitor(db)
    user = get_current_user()
    
    success, msg = learning_monitor.stop_monitoring(
        training_plan_id=plan_id,
        operator=user.get('name', 'admin')
    )
    
    if success:
        return jsonify({'success': True, 'message': msg})
    
    return jsonify({'success': False, 'message': msg}), 400

@api_bp.route('/learning/monitor/collect', methods=['POST'])
def collect_study_time():
    data = request.get_json()
    plan_id = data.get('plan_id')
    
    if not plan_id:
        return jsonify({'success': False, 'message': '缺少培训计划ID'}), 400
    
    db = get_db()
    learning_monitor = LearningMonitor(db)
    user = get_current_user()
    
    results = learning_monitor.batch_collect_study_time(
        training_plan_id=plan_id,
        operator=user.get('name', 'admin')
    )
    
    return jsonify({
        'success': True,
        'data': results
    })

@api_bp.route('/learning/inactive-employees', methods=['GET'])
def get_inactive_employees():
    plan_id = request.args.get('plan_id', type=int)
    
    if not plan_id:
        return jsonify({'success': False, 'message': '缺少培训计划ID'}), 400
    
    db = get_db()
    learning_monitor = LearningMonitor(db)
    
    inactive = learning_monitor.get_inactive_employees(training_plan_id=plan_id)
    
    return jsonify({
        'success': True,
        'data': inactive
    })

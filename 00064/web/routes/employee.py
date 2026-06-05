#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
员工API路由
"""

from flask import Blueprint, request, jsonify, session
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.models.database import SessionLocal
from src.models.models import Enrollment, ExamRecord, Certificate, LearningRecord, Course, TrainingPlan, Employee
from src.modules import CourseProcessor
from src.utils.logger import log_operation

employee_bp = Blueprint('employee', __name__)

def get_db():
    return SessionLocal()

def get_current_user():
    return {
        'id': session.get('user_id'),
        'name': session.get('user_name'),
        'role': session.get('user_role')
    }

@employee_bp.route('/profile', methods=['GET'])
def get_profile():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    db = get_db()
    employee = db.query(Employee).filter(Employee.id == user_id).first()
    
    if not employee:
        return jsonify({'success': False, 'message': '员工不存在'}), 404
    
    return jsonify({
        'success': True,
        'data': {
            'id': employee.id,
            'name': employee.name,
            'employee_code': employee.employee_code,
            'department': employee.department,
            'position': employee.position,
            'skills': employee.skills,
            'join_date': employee.join_date.strftime('%Y-%m-%d') if employee.join_date else None,
            'email': employee.email
        }
    })

@employee_bp.route('/enrollments', methods=['GET'])
def my_enrollments():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    db = get_db()
    enrollments = db.query(Enrollment).filter(Enrollment.employee_id == user_id).order_by(Enrollment.id.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': e.id,
            'plan_code': e.training_plan.plan_code if e.training_plan else None,
            'course_title': e.training_plan.course.title if e.training_plan and e.training_plan.course else None,
            'course_instructor': e.training_plan.course.instructor if e.training_plan and e.training_plan.course else None,
            'start_time': e.training_plan.start_time.strftime('%Y-%m-%d %H:%M') if e.training_plan and e.training_plan.start_time else None,
            'end_time': e.training_plan.end_time.strftime('%Y-%m-%d %H:%M') if e.training_plan and e.training_plan.end_time else None,
            'status': e.status,
            'enrolled_at': e.enrolled_at.strftime('%Y-%m-%d %H:%M') if e.enrolled_at else None
        } for e in enrollments]
    })

@employee_bp.route('/exams', methods=['GET'])
def my_exams():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    db = get_db()
    exam_records = db.query(ExamRecord).filter(ExamRecord.employee_id == user_id).order_by(ExamRecord.id.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': r.id,
            'exam_title': r.exam.title if r.exam else None,
            'course_title': r.exam.course.title if r.exam and r.exam.course else None,
            'score': r.score,
            'total_score': r.exam.total_score if r.exam else 0,
            'passing_score': r.exam.passing_score if r.exam else 60,
            'is_passed': r.is_passed,
            'attempt_number': r.attempt_number,
            'start_time': r.start_time.strftime('%Y-%m-%d %H:%M') if r.start_time else None,
            'submit_time': r.submit_time.strftime('%Y-%m-%d %H:%M') if r.submit_time else None
        } for r in exam_records]
    })

@employee_bp.route('/certificates', methods=['GET'])
def my_certificates():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    db = get_db()
    certificates = db.query(Certificate).filter(Certificate.employee_id == user_id).order_by(Certificate.id.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': c.id,
            'certificate_code': c.certificate_code,
            'course_title': c.course.title if c.course else None,
            'issue_date': c.issue_date.strftime('%Y-%m-%d') if c.issue_date else None,
            'expiry_date': c.expiry_date.strftime('%Y-%m-%d') if c.expiry_date else None,
            'is_valid': c.is_valid,
            'certificate_url': f'/exports/{c.certificate_path}' if c.certificate_path else None
        } for c in certificates]
    })

@employee_bp.route('/learning-records', methods=['GET'])
def my_learning_records():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    plan_id = request.args.get('plan_id', type=int)
    
    db = get_db()
    query = db.query(LearningRecord).filter(LearningRecord.employee_id == user_id)
    
    if plan_id:
        query = query.filter(LearningRecord.training_plan_id == plan_id)
    
    records = query.order_by(LearningRecord.record_time.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': r.id,
            'plan_id': r.training_plan_id,
            'course_title': r.training_plan.course.title if r.training_plan and r.training_plan.course else None,
            'study_minutes': r.study_minutes,
            'record_time': r.record_time.strftime('%Y-%m-%d %H:%M') if r.record_time else None,
            'is_meeting': r.is_meeting
        } for r in records]
    })

@employee_bp.route('/recommended-courses', methods=['GET'])
def recommended_courses():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    db = get_db()
    course_processor = CourseProcessor(db)
    
    employee = db.query(Employee).filter(Employee.id == user_id).first()
    if not employee:
        return jsonify({'success': False, 'message': '员工不存在'}), 404
    
    certificates = db.query(Certificate).filter(Certificate.employee_id == user_id, Certificate.is_valid == True).all()
    completed_course_ids = [c.course_id for c in certificates if c.course_id]
    
    recommendations = course_processor.recommend_advanced_courses(user_id)
    
    return jsonify({
        'success': True,
        'data': {
            'current_skills': employee.skills.split(',') if employee.skills else [],
            'completed_courses_count': len(completed_course_ids),
            'recommendations': recommendations
        }
    })

@employee_bp.route('/available-plans', methods=['GET'])
def available_plans():
    db = get_db()
    plans = db.query(TrainingPlan).filter(TrainingPlan.status == 'active').order_by(TrainingPlan.start_time).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': p.id,
            'plan_code': p.plan_code,
            'course_title': p.course.title if p.course else None,
            'course_category': p.course.category if p.course else None,
            'course_difficulty': p.course.difficulty_level if p.course else None,
            'instructor': p.course.instructor if p.course else None,
            'start_time': p.start_time.strftime('%Y-%m-%d %H:%M') if p.start_time else None,
            'end_time': p.end_time.strftime('%Y-%m-%d %H:%M') if p.end_time else None,
            'enrolled_count': len(p.enrollments),
            'max_participants': p.max_participants,
            'has_waitlist': len(p.waitlists) > 0
        } for p in plans]
    })

@employee_bp.route('/dashboard/stats', methods=['GET'])
def dashboard_stats():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    db = get_db()
    
    enrollments_count = db.query(Enrollment).filter(Enrollment.employee_id == user_id).count()
    certs_count = db.query(Certificate).filter(Certificate.employee_id == user_id, Certificate.is_valid == True).count()
    exams_count = db.query(ExamRecord).filter(ExamRecord.employee_id == user_id).count()
    passed_exams = db.query(ExamRecord).filter(ExamRecord.employee_id == user_id, ExamRecord.is_passed == True).count()
    
    total_hours = 0
    learning_records = db.query(LearningRecord).filter(LearningRecord.employee_id == user_id).all()
    for r in learning_records:
        total_hours += r.study_minutes
    
    return jsonify({
        'success': True,
        'data': {
            'enrollments_count': enrollments_count,
            'certificates_count': certs_count,
            'exams_count': exams_count,
            'passed_exams': passed_exams,
            'total_study_hours': round(total_hours / 60, 1)
        }
    })

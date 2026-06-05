#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
管理员API路由
"""

from flask import Blueprint, request, jsonify, session
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.models.database import SessionLocal
from src.modules import ReportGenerator, DataQueryManager
from src.utils.logger import log_operation

admin_bp = Blueprint('admin', __name__)

def get_db():
    return SessionLocal()

def get_current_user():
    return {
        'id': session.get('user_id'),
        'name': session.get('user_name'),
        'role': session.get('user_role')
    }

@admin_bp.route('/reports/monthly', methods=['POST'])
def generate_monthly_report():
    data = request.get_json()
    year = data.get('year')
    month = data.get('month')
    
    if not year or not month:
        now = datetime.now()
        last_month = now.month - 1
        year = now.year
        if last_month == 0:
            last_month = 12
            year = now.year - 1
        month = last_month
    
    db = get_db()
    report_generator = ReportGenerator(db)
    user = get_current_user()
    
    report, report_data, msg = report_generator.generate_monthly_report(
        year=year,
        month=month,
        operator=user.get('name', 'admin')
    )
    
    if report:
        return jsonify({
            'success': True,
            'message': msg,
            'data': {
                'report_id': report.id,
                'report_code': report.report_code,
                'pdf_path': f'/exports/{report.pdf_path}' if report.pdf_path else None,
                'excel_path': f'/exports/{report.excel_path}' if report.excel_path else None,
                'metrics': report_data
            }
        })
    
    return jsonify({'success': False, 'message': msg}), 400

@admin_bp.route('/reports', methods=['GET'])
def get_reports():
    db = get_db()
    from src.models.models import Report
    reports = db.query(Report).order_by(Report.id.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': r.id,
            'report_code': r.report_code,
            'report_type': r.report_type,
            'start_date': r.start_date.strftime('%Y-%m-%d') if r.start_date else None,
            'end_date': r.end_date.strftime('%Y-%m-%d') if r.end_date else None,
            'completion_rate': r.completion_rate,
            'average_score': r.average_score,
            'participation_rate': r.participation_rate,
            'created_at': r.created_at.strftime('%Y-%m-%d %H:%M') if r.created_at else None
        } for r in reports]
    })

@admin_bp.route('/query/training', methods=['GET'])
def query_training_records():
    params = {
        'course_name': request.args.get('course_name'),
        'instructor': request.args.get('instructor'),
        'department': request.args.get('department'),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date')
    }
    
    db = get_db()
    data_query = DataQueryManager(db)
    
    records = data_query.query_training_records(**params)
    
    return jsonify({
        'success': True,
        'count': len(records),
        'data': records
    })

@admin_bp.route('/query/exam', methods=['GET'])
def query_exam_scores():
    params = {
        'course_name': request.args.get('course_name'),
        'employee_name': request.args.get('employee_name'),
        'department': request.args.get('department'),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'passed': request.args.get('passed')
    }
    
    db = get_db()
    data_query = DataQueryManager(db)
    
    records = data_query.query_exam_scores(**params)
    
    return jsonify({
        'success': True,
        'count': len(records),
        'data': records
    })

@admin_bp.route('/query/logs', methods=['GET'])
def query_operation_logs():
    params = {
        'operator': request.args.get('operator'),
        'operation': request.args.get('operation'),
        'target_type': request.args.get('target_type'),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date')
    }
    
    db = get_db()
    data_query = DataQueryManager(db)
    
    records = data_query.query_operation_logs(**params)
    
    return jsonify({
        'success': True,
        'count': len(records),
        'data': records
    })

@admin_bp.route('/export/training', methods=['POST'])
def export_training():
    data = request.get_json() or {}
    params = {
        'course_name': data.get('course_name'),
        'instructor': data.get('instructor'),
        'department': data.get('department'),
        'start_date': data.get('start_date'),
        'end_date': data.get('end_date')
    }
    
    db = get_db()
    data_query = DataQueryManager(db)
    user = get_current_user()
    
    file_path = data_query.export_training_records(
        operator=user.get('name', 'admin'),
        **params
    )
    
    if file_path:
        return jsonify({
            'success': True,
            'data': {'download_url': f'/exports/{os.path.basename(file_path)}'}
        })
    
    return jsonify({'success': False, 'message': '导出失败'}), 400

@admin_bp.route('/export/exam', methods=['POST'])
def export_exam():
    data = request.get_json() or {}
    params = {
        'course_name': data.get('course_name'),
        'employee_name': data.get('employee_name'),
        'department': data.get('department'),
        'start_date': data.get('start_date'),
        'end_date': data.get('end_date'),
        'passed': data.get('passed')
    }
    
    db = get_db()
    data_query = DataQueryManager(db)
    user = get_current_user()
    
    file_path = data_query.export_exam_scores(
        operator=user.get('name', 'admin'),
        **params
    )
    
    if file_path:
        return jsonify({
            'success': True,
            'data': {'download_url': f'/exports/{os.path.basename(file_path)}'}
        })
    
    return jsonify({'success': False, 'message': '导出失败'}), 400

@admin_bp.route('/export/logs', methods=['POST'])
def export_logs():
    data = request.get_json() or {}
    params = {
        'operator': data.get('operator'),
        'operation': data.get('operation'),
        'target_type': data.get('target_type'),
        'start_date': data.get('start_date'),
        'end_date': data.get('end_date')
    }
    
    db = get_db()
    data_query = DataQueryManager(db)
    user = get_current_user()
    
    file_path = data_query.export_operation_logs(
        operator=user.get('name', 'admin'),
        **params
    )
    
    if file_path:
        return jsonify({
            'success': True,
            'data': {'download_url': f'/exports/{os.path.basename(file_path)}'}
        })
    
    return jsonify({'success': False, 'message': '导出失败'}), 400

@admin_bp.route('/dashboard/stats', methods=['GET'])
def dashboard_stats():
    db = get_db()
    from src.models.models import Course, TrainingPlan, Exam, Certificate, Employee, Enrollment
    
    total_employees = db.query(Employee).count()
    total_courses = db.query(Course).count()
    total_plans = db.query(TrainingPlan).count()
    total_exams = db.query(Exam).count()
    total_certificates = db.query(Certificate).count()
    total_enrollments = db.query(Enrollment).count()
    
    active_plans = db.query(TrainingPlan).filter(TrainingPlan.status == 'active').count()
    
    return jsonify({
        'success': True,
        'data': {
            'total_employees': total_employees,
            'total_courses': total_courses,
            'total_plans': total_plans,
            'active_plans': active_plans,
            'total_exams': total_exams,
            'total_certificates': total_certificates,
            'total_enrollments': total_enrollments
        }
    })

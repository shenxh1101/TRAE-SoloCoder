#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
认证相关路由
"""

from flask import Blueprint, request, jsonify, session
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.models.database import SessionLocal
from src.models.models import Employee
from src.utils.logger import log_operation, log_info

auth_bp = Blueprint('auth', __name__)

def get_db():
    return SessionLocal()

def get_current_user():
    return {
        'id': session.get('user_id'),
        'name': session.get('user_name'),
        'role': session.get('user_role')
    }

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    employee_id = data.get('employee_id')
    password = data.get('password', '')
    
    db = get_db()
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    
    if employee:
        session['user_id'] = employee.id
        session['user_name'] = employee.name
        session['user_role'] = 'admin' if employee.position in ['技术经理', 'HR经理', '部门经理'] else 'employee'
        
        log_operation(employee.name, '登录系统', 'Employee', employee.id, f'角色: {session["user_role"]}')
        
        return jsonify({
            'success': True,
            'user': {
                'id': employee.id,
                'name': employee.name,
                'department': employee.department,
                'position': employee.position,
                'role': session['user_role']
            }
        })
    
    return jsonify({'success': False, 'message': '员工不存在，请重试'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    user_name = session.get('user_name', 'unknown')
    session.clear()
    log_info(f'用户 {user_name} 退出系统')
    return jsonify({'success': True, 'message': '已退出登录'})

@auth_bp.route('/current', methods=['GET'])
def current_user():
    if 'user_id' in session:
        return jsonify({
            'success': True,
            'user': {
                'id': session['user_id'],
                'name': session['user_name'],
                'role': session['user_role']
            }
        })
    return jsonify({'success': False}), 401

@auth_bp.route('/employees', methods=['GET'])
def get_employees_list():
    db = get_db()
    employees = db.query(Employee).all()
    return jsonify([{
        'id': e.id,
        'name': e.name,
        'department': e.department,
        'position': e.position
    } for e in employees])

def login_required(f):
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    def decorated_function(*args, **kwargs):
        if 'user_role' not in session or session['user_role'] != 'admin':
            return jsonify({'success': False, 'message': '需要管理员权限'}), 403
        return f(*args, **kwargs)
    return decorated_function

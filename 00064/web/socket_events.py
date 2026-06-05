#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebSocket事件处理
"""

import os
import sys
from flask_socketio import emit, join_room, leave_room
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .app import socketio

@socketio.on('connect', namespace='/learning')
def handle_learning_connect():
    print('客户端连接到学习监控命名空间')
    emit('connected', {'status': 'connected', 'timestamp': datetime.now().isoformat()})

@socketio.on('disconnect', namespace='/learning')
def handle_learning_disconnect():
    print('客户端从学习监控命名空间断开')

@socketio.on('join_plan', namespace='/learning')
def handle_join_plan(data):
    plan_id = data.get('plan_id')
    if plan_id:
        join_room(f'plan_{plan_id}')
        emit('joined', {'plan_id': plan_id, 'status': 'success'})

@socketio.on('leave_plan', namespace='/learning')
def handle_leave_plan(data):
    plan_id = data.get('plan_id')
    if plan_id:
        leave_room(f'plan_{plan_id}')
        emit('left', {'plan_id': plan_id, 'status': 'success'})

@socketio.on('heartbeat', namespace='/learning')
def handle_heartbeat(data):
    """处理客户端心跳，用于更新学习状态"""
    employee_id = data.get('employee_id')
    plan_id = data.get('plan_id')
    study_minutes = data.get('study_minutes', 0)
    
    from src.models.database import SessionLocal
    from src.modules import LearningMonitor
    
    db = SessionLocal()
    learning_monitor = LearningMonitor(db)
    
    record = learning_monitor.record_study_time(
        training_plan_id=plan_id,
        employee_id=employee_id,
        study_minutes=study_minutes,
        operator='websocket'
    )
    
    db.close()
    
    if record:
        emit('status_update', {
            'employee_id': employee_id,
            'plan_id': plan_id,
            'study_minutes': study_minutes,
            'is_meeting': record.is_meeting,
            'timestamp': datetime.now().isoformat()
        }, room=f'plan_{plan_id}')

@socketio.on('get_status', namespace='/learning')
def handle_get_status(data):
    plan_id = data.get('plan_id')
    
    from src.models.database import SessionLocal
    from src.modules import LearningMonitor
    
    db = SessionLocal()
    learning_monitor = LearningMonitor(db)
    
    inactive = learning_monitor.get_inactive_employees(training_plan_id=plan_id)
    
    from src.models.models import LearningRecord
    from sqlalchemy import func
    
    recent_records = db.query(LearningRecord).filter(
        LearningRecord.training_plan_id == plan_id
    ).order_by(LearningRecord.record_time.desc()).limit(20).all()
    
    db.close()
    
    emit('status_data', {
        'plan_id': plan_id,
        'inactive_count': len(inactive),
        'inactive_employees': inactive,
        'recent_records': [{
            'employee_name': r.employee.name if r.employee else None,
            'study_minutes': r.study_minutes,
            'is_meeting': r.is_meeting,
            'record_time': r.record_time.isoformat() if r.record_time else None
        } for r in recent_records]
    })

@socketio.on('connect', namespace='/admin')
def handle_admin_connect():
    print('管理员客户端连接')
    emit('connected', {'status': 'connected'})

@socketio.on('disconnect', namespace='/admin')
def handle_admin_disconnect():
    print('管理员客户端断开')

def notify_warning(plan_id, employee_name, warning_count):
    """向管理员推送预警通知"""
    socketio.emit('warning', {
        'plan_id': plan_id,
        'employee_name': employee_name,
        'warning_count': warning_count,
        'timestamp': datetime.now().isoformat(),
        'type': 'learning_inactive'
    }, namespace='/admin')

def notify_certificate_issued(employee_id, certificate_info):
    """向员工推送证书颁发通知"""
    socketio.emit('certificate_issued', {
        'employee_id': employee_id,
        'certificate': certificate_info,
        'timestamp': datetime.now().isoformat()
    }, namespace='/learning')

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask Web应用主入口
"""

import os
import sys
from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.database import init_db, SessionLocal
from src.utils.logger import log_info, log_error

socketio = SocketIO(cors_allowed_origins="*")

def create_app():
    app = Flask(__name__, 
                template_folder='templates',
                static_folder='static')
    
    app.config['SECRET_KEY'] = 'training-system-secret-key-2024'
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
    app.config['EXPORTS_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'exports')
    
    CORS(app)
    socketio.init_app(app)
    
    init_db()
    
    from .routes import api_bp, auth_bp, admin_bp, employee_bp
    from . import socket_events
    from .scheduler import start_scheduler
    
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(employee_bp, url_prefix='/employee')
    
    start_scheduler()
    
    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.route('/admin')
    def admin_dashboard():
        return render_template('admin/dashboard.html')
    
    @app.route('/employee')
    def employee_dashboard():
        return render_template('employee/dashboard.html')
    
    @app.route('/exports/<path:filename>')
    def download_file(filename):
        return send_from_directory(app.config['EXPORTS_FOLDER'], filename, as_attachment=True)
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': str(error)}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        log_error('Internal server error', error)
        return jsonify({'error': 'Internal server error', 'message': str(error)}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)

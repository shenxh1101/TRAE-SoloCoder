#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask Web应用 - 财务报表上传接口
"""
import sys
import os
import warnings
warnings.filterwarnings('ignore')

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename
from datetime import datetime
import uuid
import traceback

from config.settings import WEB_CONFIG
from models.database import init_db, SessionLocal
from models.models import Customer, FileUploadRecord, FinancialRecord
from modules.financial_parser import FinancialStatementParser
from utils.helpers import format_currency


def create_app():
    app = Flask(__name__, template_folder='templates', static_folder='static')

    app.config['SECRET_KEY'] = WEB_CONFIG['secret_key']
    app.config['UPLOAD_FOLDER'] = WEB_CONFIG['upload_folder']
    app.config['MAX_CONTENT_LENGTH'] = WEB_CONFIG['max_content_length']
    app.config['JSON_AS_ASCII'] = False

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    init_db()

    def allowed_file(filename):
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in WEB_CONFIG['allowed_extensions']

    def get_client_ip():
        if request.headers.getlist("X-Forwarded-For"):
            return request.headers.getlist("X-Forwarded-For")[0]
        return request.remote_addr

    @app.route('/')
    def index():
        db = SessionLocal()
        try:
            customers = db.query(Customer).order_by(Customer.name).all()
            customer_list = [{
                'id': c.id,
                'customer_code': c.customer_code,
                'name': c.name,
                'credit_level': c.credit_level,
                'credit_limit': format_currency(c.credit_limit),
                'available_credit': format_currency(c.available_credit)
            } for c in customers]
            return render_template('upload.html', customers=customer_list)
        finally:
            db.close()

    @app.route('/api/customers', methods=['GET'])
    def get_customers():
        db = SessionLocal()
        try:
            customers = db.query(Customer).order_by(Customer.name).all()
            customer_list = [{
                'id': c.id,
                'customer_code': c.customer_code,
                'name': c.name,
                'credit_level': c.credit_level,
                'credit_limit': c.credit_limit,
                'available_credit': c.available_credit,
                'current_balance': c.current_balance
            } for c in customers]
            return jsonify({
                'success': True,
                'data': customer_list,
                'total': len(customer_list)
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        finally:
            db.close()

    @app.route('/api/upload', methods=['POST'])
    def upload_file():
        db = SessionLocal()
        try:
            if 'file' not in request.files:
                return jsonify({
                    'success': False,
                    'error': '未找到上传文件'
                }), 400

            file = request.files['file']
            customer_id = request.form.get('customer_id')
            report_period = request.form.get('report_period', datetime.now().strftime('%Y-Q%m'))
            uploader = request.form.get('uploader', 'web_user')

            if not customer_id:
                return jsonify({
                    'success': False,
                    'error': '请选择客户'
                }), 400

            if file.filename == '':
                return jsonify({
                    'success': False,
                    'error': '请选择要上传的文件'
                }), 400

            customer = db.query(Customer).filter(Customer.id == int(customer_id)).first()
            if not customer:
                return jsonify({
                    'success': False,
                    'error': '客户不存在'
                }), 404

            if file and allowed_file(file.filename):
                file_ext = file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)

                file_size = os.path.getsize(file_path)

                upload_record = FileUploadRecord(
                    customer_id=customer.id,
                    customer_name=customer.name,
                    file_name=file.filename,
                    file_path=file_path,
                    file_size=file_size,
                    file_type=file_ext,
                    uploader=uploader,
                    upload_ip=get_client_ip(),
                    parse_status='parsing'
                )
                db.add(upload_record)
                db.commit()
                db.refresh(upload_record)

                try:
                    parser = FinancialStatementParser()
                    try:
                        result = parser.upload_financial_statement(
                            customer.id, file_path, uploader
                        )
                        financial_record = result['record']
                        ratios = result['ratios']
                        health_score = result['health_score']

                        upload_record.parse_status = 'success'
                        upload_record.parse_message = '解析成功'
                        upload_record.financial_record_id = financial_record.id

                        db.commit()
                        db.refresh(upload_record)

                        return jsonify({
                            'success': True,
                            'message': '文件上传并解析成功',
                            'data': {
                                'upload_id': upload_record.id,
                                'file_name': file.filename,
                                'file_size': file_size,
                                'customer': {
                                    'id': customer.id,
                                    'name': customer.name,
                                    'code': customer.customer_code
                                },
                                'report_period': financial_record.report_period,
                                'financial_indicators': {
                                    'asset_liability_ratio': f"{ratios.get('asset_liability_ratio', 0) * 100:.2f}%",
                                    'current_ratio': f"{ratios.get('current_ratio', 0):.2f}",
                                    'quick_ratio': f"{ratios.get('quick_ratio', 0):.2f}",
                                    'cash_flow_ratio': f"{ratios.get('cash_flow_ratio', 0):.2f}",
                                    'financial_health_score': f"{health_score:.2f}"
                                }
                            }
                        })
                    finally:
                        parser.close()

                except Exception as e:
                    upload_record.parse_status = 'failed'
                    upload_record.parse_message = f'解析错误: {str(e)}'
                    db.commit()

                    return jsonify({
                        'success': False,
                        'error': f'文件解析失败: {str(e)}'
                    }), 500

            else:
                return jsonify({
                    'success': False,
                    'error': f'不支持的文件格式，仅支持: {", ".join(WEB_CONFIG["allowed_extensions"])}'
                }), 400

        except Exception as e:
            db.rollback()
            return jsonify({
                'success': False,
                'error': f'上传失败: {str(e)}',
                'traceback': traceback.format_exc()
            }), 500
        finally:
            db.close()

    @app.route('/api/uploads', methods=['GET'])
    def get_upload_records():
        db = SessionLocal()
        try:
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 20))
            customer_id = request.args.get('customer_id')
            parse_status = request.args.get('parse_status')

            query = db.query(FileUploadRecord).order_by(FileUploadRecord.upload_time.desc())

            if customer_id:
                query = query.filter(FileUploadRecord.customer_id == int(customer_id))
            if parse_status:
                query = query.filter(FileUploadRecord.parse_status == parse_status)

            total = query.count()
            records = query.offset((page - 1) * per_page).limit(per_page).all()

            record_list = [{
                'id': r.id,
                'customer_id': r.customer_id,
                'customer_name': r.customer_name,
                'file_name': r.file_name,
                'file_size': r.file_size,
                'file_type': r.file_type,
                'uploader': r.uploader,
                'upload_ip': r.upload_ip,
                'upload_time': r.upload_time.strftime('%Y-%m-%d %H:%M:%S') if r.upload_time else None,
                'parse_status': r.parse_status,
                'parse_message': r.parse_message,
                'financial_record_id': r.financial_record_id
            } for r in records]

            return jsonify({
                'success': True,
                'data': record_list,
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        finally:
            db.close()

    @app.route('/api/uploads/<int:upload_id>', methods=['GET'])
    def get_upload_detail(upload_id):
        db = SessionLocal()
        try:
            upload = db.query(FileUploadRecord).filter(FileUploadRecord.id == upload_id).first()
            if not upload:
                return jsonify({
                    'success': False,
                    'error': '上传记录不存在'
                }), 404

            financial_record = None
            if upload.financial_record_id:
                fr = db.query(FinancialRecord).filter(
                    FinancialRecord.id == upload.financial_record_id
                ).first()
                if fr:
                    financial_record = {
                        'id': fr.id,
                        'report_period': fr.report_period,
                        'total_assets': fr.total_assets,
                        'total_liabilities': fr.total_liabilities,
                        'current_assets': fr.current_assets,
                        'current_liabilities': fr.current_liabilities,
                        'inventory': fr.inventory,
                        'cash_and_equivalents': fr.cash_and_equivalents,
                        'operating_cash_flow': fr.operating_cash_flow,
                        'revenue': fr.revenue,
                        'net_profit': fr.net_profit,
                        'asset_liability_ratio': f"{fr.asset_liability_ratio * 100:.2f}%" if fr.asset_liability_ratio else None,
                        'current_ratio': f"{fr.current_ratio:.2f}" if fr.current_ratio else None,
                        'quick_ratio': f"{fr.quick_ratio:.2f}" if fr.quick_ratio else None,
                        'cash_flow_ratio': f"{fr.cash_flow_ratio:.2f}" if fr.cash_flow_ratio else None,
                        'financial_health_score': f"{fr.financial_health_score:.2f}" if fr.financial_health_score else None
                    }

            return jsonify({
                'success': True,
                'data': {
                    'upload': {
                        'id': upload.id,
                        'customer_id': upload.customer_id,
                        'customer_name': upload.customer_name,
                        'file_name': upload.file_name,
                        'file_size': upload.file_size,
                        'file_type': upload.file_type,
                        'uploader': upload.uploader,
                        'upload_ip': upload.upload_ip,
                        'upload_time': upload.upload_time.strftime('%Y-%m-%d %H:%M:%S') if upload.upload_time else None,
                        'parse_status': upload.parse_status,
                        'parse_message': upload.parse_message,
                        'financial_record_id': upload.financial_record_id
                    },
                    'financial_record': financial_record
                }
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        finally:
            db.close()

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'success': True,
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'services': {
                'database': 'connected',
                'upload_service': 'running',
                'parse_service': 'running'
            }
        })

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': '请求的资源不存在'
        }), 404

    @app.errorhandler(413)
    def too_large(error):
        return jsonify({
            'success': False,
            'error': f'文件大小超过限制，最大允许 {WEB_CONFIG["max_content_length"] // 1024 // 1024}MB'
        }), 413

    return app


def main():
    app = create_app()
    print(f"\n{'='*60}")
    print(f"  信用风险管理系统 - Web文件上传服务")
    print(f"{'='*60}")
    print(f"\n服务地址: http://{WEB_CONFIG['host']}:{WEB_CONFIG['port']}")
    print(f"上传页面: http://{WEB_CONFIG['host']}:{WEB_CONFIG['port']}/")
    print(f"API接口:")
    print(f"  - GET  /api/customers          - 获取客户列表")
    print(f"  - POST /api/upload             - 上传财务报表")
    print(f"  - GET  /api/uploads            - 获取上传记录列表")
    print(f"  - GET  /api/uploads/<id>       - 获取上传记录详情")
    print(f"  - GET  /api/health             - 健康检查")
    print(f"\n支持的文件格式: {', '.join(WEB_CONFIG['allowed_extensions'])}")
    print(f"最大文件大小: {WEB_CONFIG['max_content_length'] // 1024 // 1024}MB")
    print(f"\n{'='*60}\n")
    app.run(
        host=WEB_CONFIG['host'],
        port=WEB_CONFIG['port'],
        debug=WEB_CONFIG['debug']
    )


if __name__ == '__main__':
    main()

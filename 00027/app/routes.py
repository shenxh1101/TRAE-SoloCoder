from flask import request, jsonify, send_file, abort
from app import app
from app.converters.converter_factory import ConverterFactory
from app.utils.conversion_manager import ConversionManager
from app.utils.validator import SyntaxValidator
from app.utils.mapping_engine import MappingEngine
from app.utils.batch_converter import BatchConverter
from app.utils.template_manager import TemplateManager
import os
import uuid
import werkzeug

template_manager = TemplateManager(app.config['TEMPLATE_FOLDER'])


@app.route('/api/formats', methods=['GET'])
def get_supported_formats():
    formats = ConverterFactory.get_supported_formats()
    return jsonify({
        'success': True,
        'formats': formats
    })


@app.route('/api/conversion-matrix', methods=['GET'])
def get_conversion_matrix():
    matrix = ConversionManager.get_conversion_matrix()
    return jsonify({
        'success': True,
        'matrix': matrix
    })


@app.route('/api/convert', methods=['POST'])
def convert_file():
    target_format = request.form.get('target_format')
    source_format = request.form.get('source_format')
    template_id = request.form.get('template_id')
    
    if not target_format:
        return jsonify({
            'success': False,
            'error': '缺少目标格式参数'
        }), 400

    if 'file' not in request.files and 'content' not in request.form:
        return jsonify({
            'success': False,
            'error': '请上传文件或提供内容'
        }), 400

    options = _parse_conversion_options(request.form)

    if template_id:
        try:
            template_config = template_manager.apply_template(
                template_id, source_format, target_format
            )
            source_format = template_config['source_format']
            target_format = template_config['target_format']
            options.update(template_config['options'])
            if template_config.get('mapping_script'):
                options['mapping_script'] = template_config['mapping_script']
            if template_config.get('field_mappings'):
                options['field_mappings'] = template_config['field_mappings']
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400

    content = None
    filename = None

    if 'file' in request.files:
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': '未选择文件'
            }), 400
        
        filename = file.filename
        content = file.read().decode('utf-8')
        
        if not source_format:
            source_format = ConversionManager.detect_format(filename, content)
            if not source_format:
                return jsonify({
                    'success': False,
                    'error': '无法自动检测文件格式，请手动指定'
                }), 400
    else:
        content = request.form.get('content', '')
        if not source_format:
            return jsonify({
                'success': False,
                'error': '缺少源格式参数'
            }), 400

    result = ConversionManager.convert(content, source_format, target_format, options)

    if not result['success']:
        return jsonify(result), 400

    output_filename = None
    download_url = None
    
    if filename:
        base_name = os.path.splitext(filename)[0]
        target_ext = ConversionManager.get_format_extension(target_format)
        output_filename = f"{base_name}.{target_ext}"
    else:
        target_ext = ConversionManager.get_format_extension(target_format)
        output_filename = f"converted_{uuid.uuid4().hex[:8]}.{target_ext}"

    saved_path = ConversionManager.save_to_file(
        result['result'], app.config['OUTPUT_FOLDER'], output_filename
    )
    
    file_id = os.path.basename(saved_path)
    download_url = f"/api/download/{file_id}"

    response = {
        'success': True,
        'source_format': source_format,
        'target_format': target_format,
        'result': result['result'] if request.form.get('include_content', 'true').lower() == 'true' else None,
        'download_url': download_url,
        'filename': output_filename,
        'structure_changes': result.get('structure_changes'),
        'validation': result.get('validation')
    }

    if not request.form.get('include_structure', 'false').lower() == 'true':
        response.pop('structure_changes', None)
    if not request.form.get('include_validation', 'true').lower() == 'true':
        response.pop('validation', None)

    return jsonify(response)


@app.route('/api/batch-convert', methods=['POST'])
def batch_convert():
    target_format = request.form.get('target_format')
    template_id = request.form.get('template_id')

    if not target_format:
        return jsonify({
            'success': False,
            'error': '缺少目标格式参数'
        }), 400

    if 'file' not in request.files:
        return jsonify({
            'success': False,
            'error': '请上传ZIP文件'
        }), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({
            'success': False,
            'error': '未选择文件'
        }), 400

    if not file.filename.lower().endswith('.zip'):
        return jsonify({
            'success': False,
            'error': '请上传ZIP格式文件'
        }), 400

    options = _parse_conversion_options(request.form)

    if template_id:
        try:
            template_config = template_manager.apply_template(template_id, None, target_format)
            target_format = template_config['target_format']
            options.update(template_config['options'])
            if template_config.get('mapping_script'):
                options['mapping_script'] = template_config['mapping_script']
            if template_config.get('field_mappings'):
                options['field_mappings'] = template_config['field_mappings']
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400

    zip_filename = f"upload_{uuid.uuid4().hex}.zip"
    zip_path = os.path.join(app.config['UPLOAD_FOLDER'], zip_filename)
    file.save(zip_path)

    result = BatchConverter.convert_zip(
        zip_path, target_format, app.config['OUTPUT_FOLDER'], options
    )

    os.remove(zip_path)

    if not result['success']:
        return jsonify(result), 400

    output_zip_name = os.path.basename(result['output_zip_path'])
    result['download_url'] = f"/api/download/{output_zip_name}"

    return jsonify(result)


@app.route('/api/validate', methods=['POST'])
def validate_content():
    content = request.form.get('content', '')
    format_name = request.form.get('format')

    if not format_name:
        return jsonify({
            'success': False,
            'error': '缺少格式参数'
        }), 400

    if 'file' in request.files:
        file = request.files['file']
        content = file.read().decode('utf-8')

    valid, errors = SyntaxValidator.validate(content, format_name)

    return jsonify({
        'success': True,
        'valid': valid,
        'errors': errors,
        'error_message': SyntaxValidator.format_errors(errors) if errors else None
    })


@app.route('/api/validate-script', methods=['POST'])
def validate_script():
    script = request.form.get('script', '')
    valid, error = MappingEngine.validate_script(script)

    return jsonify({
        'success': True,
        'valid': valid,
        'error': error
    })


@app.route('/api/mapping-functions', methods=['GET'])
def get_mapping_functions():
    functions = MappingEngine.get_available_functions()
    return jsonify({
        'success': True,
        'functions': functions
    })


@app.route('/api/templates', methods=['GET'])
def list_templates():
    source_format = request.args.get('source_format')
    target_format = request.args.get('target_format')
    
    templates = template_manager.list_templates(source_format, target_format)
    return jsonify({
        'success': True,
        'templates': templates
    })


@app.route('/api/templates/<template_id>', methods=['GET'])
def get_template(template_id):
    template = template_manager.get_template(template_id)
    if not template:
        return jsonify({
            'success': False,
            'error': '模板不存在'
        }), 404
    
    return jsonify({
        'success': True,
        'template': template
    })


@app.route('/api/templates', methods=['POST'])
def create_template():
    data = request.get_json() or request.form.to_dict()
    
    if 'options' in data and isinstance(data['options'], str):
        import json
        data['options'] = json.loads(data['options'])
    if 'field_mappings' in data and isinstance(data['field_mappings'], str):
        import json
        data['field_mappings'] = json.loads(data['field_mappings'])
    
    try:
        template = template_manager.create_template(data)
        return jsonify({
            'success': True,
            'template': template
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400


@app.route('/api/templates/<template_id>', methods=['PUT'])
def update_template(template_id):
    data = request.get_json() or request.form.to_dict()
    
    if 'options' in data and isinstance(data['options'], str):
        import json
        data['options'] = json.loads(data['options'])
    if 'field_mappings' in data and isinstance(data['field_mappings'], str):
        import json
        data['field_mappings'] = json.loads(data['field_mappings'])
    
    try:
        template = template_manager.update_template(template_id, data)
        if not template:
            return jsonify({
                'success': False,
                'error': '模板不存在'
            }), 404
        return jsonify({
            'success': True,
            'template': template
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400


@app.route('/api/templates/<template_id>', methods=['DELETE'])
def delete_template(template_id):
    try:
        result = template_manager.delete_template(template_id)
        if not result:
            return jsonify({
                'success': False,
                'error': '模板不存在'
            }), 404
        return jsonify({
            'success': True,
            'message': '模板已删除'
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400


@app.route('/api/download/<file_id>', methods=['GET'])
def download_file(file_id):
    try:
        file_path = os.path.join(app.config['OUTPUT_FOLDER'], file_id)
        if not os.path.exists(file_path):
            abort(404)
        
        as_attachment = request.args.get('download', 'true').lower() == 'true'
        return send_file(file_path, as_attachment=as_attachment, 
                        download_name=file_id, conditional=True)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'status': 'running',
        'service': 'Config Converter Service'
    })


def _parse_conversion_options(form_data):
    options = {}
    
    bool_fields = [
        'preserve_comments', 'remove_null', 'remove_empty',
        'pretty_print', 'sort_keys', 'ensure_ascii'
    ]
    
    for field in bool_fields:
        if field in form_data:
            options[field] = form_data[field].lower() == 'true'
    
    int_fields = ['indent']
    for field in int_fields:
        if field in form_data and form_data[field]:
            try:
                options[field] = int(form_data[field])
            except ValueError:
                pass
    
    str_fields = ['root_name', 'mapping_script']
    for field in str_fields:
        if field in form_data and form_data[field]:
            options[field] = form_data[field]
    
    if 'field_mappings' in form_data and form_data['field_mappings']:
        try:
            import json
            options['field_mappings'] = json.loads(form_data['field_mappings'])
        except (json.JSONDecodeError, TypeError):
            pass
    
    return options


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': '接口不存在'
    }), 404


@app.errorhandler(413)
def too_large(error):
    return jsonify({
        'success': False,
        'error': '文件过大，最大支持100MB'
    }), 413


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': '服务器内部错误'
    }), 500

import os
import json
import zipfile
import io
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, make_response, session
from werkzeug.utils import secure_filename

from utils.validator import (
    I18nValidator,
    extract_zip_file,
    generate_markdown_report,
    generate_html_report
)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'i18n-validator-secret-key-2024'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['DEFAULT_CONFIG_PATH'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_config.json')

ALLOWED_EXTENSIONS = {'json', 'zip'}


def load_default_config():
    config_path = app.config.get('DEFAULT_CONFIG_PATH', '')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}


DEFAULT_CONFIG = load_default_config()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/default-config')
def get_default_config():
    return jsonify({
        'success': True,
        'config': DEFAULT_CONFIG
    })


@app.route('/api/upload', methods=['POST'])
def upload_files():
    try:
        if 'files[]' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400

        files = request.files.getlist('files[]')
        language_files = {}
        base_language = request.form.get('base_language', 'en')
        config_str = request.form.get('config', '')

        config = {}
        if config_str:
            try:
                config = json.loads(config_str)
            except json.JSONDecodeError:
                return jsonify({'error': '配置文件格式错误，必须是有效的JSON'}), 400
        else:
            config = DEFAULT_CONFIG

        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)

                if filename.endswith('.zip'):
                    zip_content = file.read()
                    extracted_files = extract_zip_file(zip_content)
                    language_files.update(extracted_files)

                elif filename.endswith('.json'):
                    try:
                        content = file.read().decode('utf-8')
                        data = json.loads(content)
                        lang_code = os.path.splitext(filename)[0]
                        language_files[lang_code] = data
                    except (json.JSONDecodeError, UnicodeDecodeError) as e:
                        return jsonify({'error': f'文件 {filename} 解析错误: {str(e)}'}), 400

        if not language_files:
            return jsonify({'error': '没有有效的JSON语言文件'}), 400

        validator = I18nValidator(base_language=base_language, config=config)
        validation_result = validator.validate(language_files)
        suggestions = validator.generate_fix_suggestions(language_files, validation_result)

        session['language_files'] = language_files
        session['validation_result'] = validation_result
        session['suggestions'] = suggestions
        session['config'] = config
        session['base_language'] = base_language

        return jsonify({
            'success': True,
            'validation': validation_result,
            'suggestions': suggestions
        })

    except Exception as e:
        return jsonify({'error': f'处理错误: {str(e)}'}), 500


@app.route('/api/fix', methods=['POST'])
def apply_fixes():
    try:
        language_files = session.get('language_files')
        if not language_files:
            return jsonify({'error': '没有可用的文件数据，请先上传文件'}), 400

        base_language = session.get('base_language', 'en')
        config = session.get('config', {})

        selected_fixes = request.json.get('fixes', {})

        validator = I18nValidator(base_language=base_language, config=config)
        fixed_files = validator.apply_fixes(language_files, selected_fixes)

        new_validation = validator.validate(fixed_files)
        new_suggestions = validator.generate_fix_suggestions(fixed_files, new_validation)

        session['language_files'] = fixed_files
        session['validation_result'] = new_validation
        session['suggestions'] = new_suggestions

        return jsonify({
            'success': True,
            'validation': new_validation,
            'suggestions': new_suggestions,
            'fixed_files': fixed_files
        })

    except Exception as e:
        return jsonify({'error': f'修复错误: {str(e)}'}), 500


@app.route('/api/report/<format_type>')
def download_report(format_type):
    try:
        validation_result = session.get('validation_result')
        suggestions = session.get('suggestions')

        if not validation_result:
            return jsonify({'error': '没有校验结果，请先上传文件'}), 400

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        if format_type == 'markdown':
            report_content = generate_markdown_report(validation_result, suggestions)
            filename = f'i18n_validation_report_{timestamp}.md'
            response = make_response(report_content)
            response.headers['Content-Type'] = 'text/markdown; charset=utf-8'
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        elif format_type == 'html':
            report_content = generate_html_report(validation_result, suggestions)
            filename = f'i18n_validation_report_{timestamp}.html'
            response = make_response(report_content)
            response.headers['Content-Type'] = 'text/html; charset=utf-8'
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        else:
            return jsonify({'error': '不支持的报告格式'}), 400

    except Exception as e:
        return jsonify({'error': f'生成报告错误: {str(e)}'}), 500


@app.route('/api/download-fixed')
def download_fixed_files():
    try:
        fixed_files = session.get('language_files')
        if not fixed_files:
            return jsonify({'error': '没有可用的文件数据'}), 400

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for lang, data in fixed_files.items():
                filename = f'{lang}.json'
                content = json.dumps(data, ensure_ascii=False, indent=2)
                zf.writestr(filename, content)

        zip_buffer.seek(0)
        filename = f'i18n_fixed_{timestamp}.zip'

        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        return jsonify({'error': f'下载文件错误: {str(e)}'}), 500


@app.route('/api/preview/<lang>')
def preview_file(lang):
    try:
        language_files = session.get('language_files')
        if not language_files or lang not in language_files:
            return jsonify({'error': '文件不存在'}), 404

        return jsonify({
            'lang': lang,
            'data': language_files[lang]
        })

    except Exception as e:
        return jsonify({'error': f'预览错误: {str(e)}'}), 500


if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True, host='0.0.0.0', port=5001)

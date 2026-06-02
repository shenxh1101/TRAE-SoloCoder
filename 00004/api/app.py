from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import uuid
from datetime import datetime
from generators import generate_all_styles
from utils.zipper import create_zip_package

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, 'storage')
RATINGS_FILE = os.path.join(STORAGE_DIR, 'ratings.json')
TEMP_DIR = os.path.join(STORAGE_DIR, 'temp')

os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

def init_ratings_file():
    if not os.path.exists(RATINGS_FILE):
        with open(RATINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump({'ratings': []}, f, ensure_ascii=False, indent=2)

init_ratings_file()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'success': True, 'message': 'Server is running'})

def get_rating_for_poem(original, result, style):
    with open(RATINGS_FILE, 'r', encoding='utf-8') as f:
        ratings_data = json.load(f)
    
    for r in ratings_data['ratings']:
        if r['original'] == original and r['result'] == result and r['style'] == style:
            return r['rating']
    return 0

@app.route('/api/generate', methods=['POST'])
def generate():
    try:
        data = request.get_json()
        lyrics = data.get('lyrics', '').strip()
        line_index = data.get('lineIndex')

        if not lyrics:
            return jsonify({'success': False, 'message': 'Lyrics cannot be empty'}), 400

        target_text = lyrics
        if line_index is not None:
            lines = [l.strip() for l in lyrics.split('\n') if l.strip()]
            if 0 <= line_index < len(lines):
                target_text = lines[line_index]

        results = generate_all_styles(target_text)

        return jsonify({
            'success': True,
            'data': {
                'original': target_text,
                'folk': {
                    'text': results['folk'],
                    'rating': get_rating_for_poem(target_text, results['folk'], 'folk')
                },
                'ancient': {
                    'text': results['ancient'],
                    'rating': get_rating_for_poem(target_text, results['ancient'], 'ancient')
                },
                'cyberpunk': {
                    'text': results['cyberpunk'],
                    'rating': get_rating_for_poem(target_text, results['cyberpunk'], 'cyberpunk')
                }
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/generate_single', methods=['POST'])
def generate_single():
    try:
        data = request.get_json()
        lyrics = data.get('lyrics', '').strip()

        if not lyrics:
            return jsonify({'success': False, 'message': 'Lyrics cannot be empty'}), 400

        results = generate_all_styles(lyrics)

        return jsonify({
            'success': True,
            'data': {
                'original': lyrics,
                'folk': {
                    'text': results['folk'],
                    'rating': get_rating_for_poem(lyrics, results['folk'], 'folk')
                },
                'ancient': {
                    'text': results['ancient'],
                    'rating': get_rating_for_poem(lyrics, results['ancient'], 'ancient')
                },
                'cyberpunk': {
                    'text': results['cyberpunk'],
                    'rating': get_rating_for_poem(lyrics, results['cyberpunk'], 'cyberpunk')
                }
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/rate', methods=['POST'])
def rate():
    try:
        data = request.get_json()
        style = data.get('style')
        original = data.get('original')
        result = data.get('result')
        rating = data.get('rating')

        if not all([style, original, result, rating]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        if style not in ['folk', 'ancient', 'cyberpunk']:
            return jsonify({'success': False, 'message': 'Invalid style'}), 400

        if not (1 <= rating <= 5):
            return jsonify({'success': False, 'message': 'Rating must be 1-5'}), 400

        with open(RATINGS_FILE, 'r', encoding='utf-8') as f:
            ratings_data = json.load(f)

        new_rating = {
            'id': str(uuid.uuid4()),
            'style': style,
            'original': original,
            'result': result,
            'rating': rating,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        ratings_data['ratings'].append(new_rating)

        with open(RATINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(ratings_data, f, ensure_ascii=False, indent=2)

        return jsonify({'success': True, 'message': 'Rating saved successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/batch', methods=['POST'])
def batch_process():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400

        content = file.read().decode('utf-8')
        lines = [l.strip() for l in content.split('\n') if l.strip()]

        if len(lines) == 0:
            return jsonify({'success': False, 'message': 'File is empty'}), 400

        results = []
        for line in lines:
            styles = generate_all_styles(line)
            results.append({
                'line': line,
                'folk': {
                    'text': styles['folk'],
                    'rating': get_rating_for_poem(line, styles['folk'], 'folk')
                },
                'ancient': {
                    'text': styles['ancient'],
                    'rating': get_rating_for_poem(line, styles['ancient'], 'ancient')
                },
                'cyberpunk': {
                    'text': styles['cyberpunk'],
                    'rating': get_rating_for_poem(line, styles['cyberpunk'], 'cyberpunk')
                }
            })

        zip_filename = f"batch_{uuid.uuid4().hex[:8]}.zip"
        zip_path = os.path.join(TEMP_DIR, zip_filename)
        create_zip_package(results, zip_path)

        return jsonify({
            'success': True,
            'downloadUrl': zip_filename,
            'results': results
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/download/<filename>', methods=['GET'])
def download(filename):
    try:
        file_path = os.path.join(TEMP_DIR, filename)
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'message': 'File not found'}), 404

        return send_file(file_path, as_attachment=True, download_name='lyrics_poems.zip')
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

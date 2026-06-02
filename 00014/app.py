import json
import os
import random
import re
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

DATA_FILE = 'museum.json'
INITIAL_DATA_FILE = 'initial_artifacts.json'

name_prefixes = ["神秘的", "传说中的", "失落的", "被诅咒的", "神奇的", "古老的", "隐秘的", "传说中的"]
name_suffixes = ["秘宝", "神器", "遗物", "奇物", "瑰宝", "灵物", "异宝", "珍品"]
locations = ["敦煌莫高窟", "玛雅金字塔", "亚特兰蒂斯", "楼兰古城", "复活节岛", "吴哥窟", "佩特拉古城", "马丘比丘", "秦始皇陵", "巨石阵"]
eras = ["公元前3000年", "公元前1500年", "公元前500年", "公元元年", "公元200年", "公元800年", "公元1200年", "公元1500年", "公元1700年", "公元1900年"]
effects = ["可以预知未来", "能够召唤神龙", "让人隐身", "穿越时空", "点石成金", "长生不老", "读心术", "控制天气", "治愈百病", "拥有神力"]

def load_initial_data():
    if os.path.exists(INITIAL_DATA_FILE):
        with open(INITIAL_DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"artifacts": []}

def load_data():
    def initialize_from_initial():
        initial_data = load_initial_data()
        default_data = {"artifacts": []}
        for i, template in enumerate(initial_data.get('artifacts', [])):
            artifact = template.copy()
            artifact["id"] = i + 1
            artifact["likes"] = 0
            artifact["is_original"] = True
            default_data["artifacts"].append(artifact)
        save_data(default_data)
        return default_data

    if not os.path.exists(DATA_FILE):
        return initialize_from_initial()

    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                return initialize_from_initial()
            data = json.loads(content)
            if not isinstance(data, dict) or 'artifacts' not in data or len(data.get('artifacts', [])) == 0:
                return initialize_from_initial()
            return data
    except (json.JSONDecodeError, IOError):
        return initialize_from_initial()

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def extract_keywords(text, count=3):
    stopwords = ['这件', '文物', '一个', '一些', '可以', '能够', '会', '的', '了', '在', '是', '有', '和', '与', '被', '用', '于', '曾', '经过', '帮助']
    words = re.findall(r'[\u4e00-\u9fa5]{2,4}', text)
    filtered = [w for w in words if w not in stopwords]
    if not filtered:
        filtered = words
    if len(filtered) >= count:
        return random.sample(filtered, count)
    return filtered

def rewrite_description(artifact, user_story):
    keywords = extract_keywords(user_story)
    keyword_str = "、".join(keywords) if keywords else ""
    
    story_keyword = keywords[0] if keywords else "神秘力量"
    
    new_name = f"{random.choice(name_prefixes)}{story_keyword}{random.choice(name_suffixes)}"
    new_era = random.choice(eras)
    new_location = random.choice(locations)
    new_effect = f"{random.choice(effects)}，尤其对{story_keyword}有奇效"
    new_story = f"据传说，这件文物{user_story}。此后经过多位历史学家考证，其真实性存疑，但故事本身已成为传奇。"
    
    return {
        "name": new_name,
        "era": new_era,
        "location": new_location,
        "effect": new_effect,
        "story": new_story
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/random')
def get_random_artifact():
    data = load_data()
    artifacts = data['artifacts']
    
    if not artifacts:
        return jsonify({"error": "展品库为空"}), 404
    
    total_likes = sum(a.get('likes', 0) + 1 for a in artifacts)
    weights = [(a.get('likes', 0) + 1) / total_likes for a in artifacts]
    
    selected = random.choices(artifacts, weights=weights, k=1)[0]
    
    return jsonify(selected)

@app.route('/api/like/<int:artifact_id>', methods=['POST'])
def like_artifact(artifact_id):
    data = load_data()
    for artifact in data['artifacts']:
        if artifact['id'] == artifact_id:
            artifact['likes'] = artifact.get('likes', 0) + 1
            save_data(data)
            return jsonify({"success": True, "likes": artifact['likes']})
    return jsonify({"error": "未找到该文物"}), 404

@app.route('/api/rewrite', methods=['POST'])
def rewrite_artifact():
    req_data = request.json
    artifact_id = req_data.get('id')
    user_story = req_data.get('story', '')
    
    if not user_story:
        return jsonify({"error": "请提供故事内容"}), 400
    
    all_data = load_data()
    original_artifact = None
    for artifact in all_data['artifacts']:
        if artifact['id'] == artifact_id:
            original_artifact = artifact
            break
    
    if not original_artifact:
        return jsonify({"error": "未找到该文物"}), 404
    
    new_artifact_data = rewrite_description(original_artifact, user_story)
    new_id = max(a['id'] for a in all_data['artifacts']) + 1
    new_artifact = {
        "id": new_id,
        "name": new_artifact_data['name'],
        "era": new_artifact_data['era'],
        "location": new_artifact_data['location'],
        "effect": new_artifact_data['effect'],
        "story": new_artifact_data['story'],
        "likes": 0,
        "is_original": False,
        "parent_id": artifact_id,
        "user_story": user_story
    }
    
    all_data['artifacts'].append(new_artifact)
    save_data(all_data)
    
    return jsonify(new_artifact)

@app.route('/api/curate')
def get_all_artifacts():
    data = load_data()
    return jsonify(data['artifacts'])

@app.route('/api/delete/<int:artifact_id>', methods=['DELETE'])
def delete_artifact(artifact_id):
    data = load_data()
    original_count = len(data['artifacts'])
    data['artifacts'] = [a for a in data['artifacts'] if a['id'] != artifact_id]
    if len(data['artifacts']) < original_count:
        save_data(data)
        return jsonify({"success": True})
    return jsonify({"error": "未找到该文物"}), 404

if __name__ == '__main__':
    load_data()
    app.run(debug=True, port=8000)

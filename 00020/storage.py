import json
import os
import uuid
from datetime import datetime
from config import DREAMS_FILE, USERS_FILE, COMMENTS_FILE, INITIAL_COINS


def load_json(file_path, default):
    if not os.path.exists(file_path):
        return default
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return default


def save_json(file_path, data):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_dreams():
    return load_json(DREAMS_FILE, [])


def save_dreams(dreams):
    save_json(DREAMS_FILE, dreams)


def load_users():
    return load_json(USERS_FILE, {})


def save_users(users):
    save_json(USERS_FILE, users)


def load_comments():
    return load_json(COMMENTS_FILE, {})


def save_comments(comments):
    save_json(COMMENTS_FILE, comments)


def get_or_create_user(user_id):
    users = load_users()
    if user_id not in users:
        users[user_id] = {
            'id': user_id,
            'coins': INITIAL_COINS,
            'created_at': datetime.now().isoformat()
        }
        save_users(users)
    return users[user_id]


def update_user_coins(user_id, delta):
    users = load_users()
    if user_id in users:
        users[user_id]['coins'] += delta
        save_users(users)
        return users[user_id]
    return None


def create_dream(title, description, author_id, author_name):
    dreams = load_dreams()
    dream_id = str(uuid.uuid4())[:8]
    dream = {
        'id': dream_id,
        'title': title,
        'description': description,
        'author_id': author_id,
        'author_name': author_name,
        'investors': [],
        'total_investment': 0,
        'solution': None,
        'created_at': datetime.now().isoformat(),
        'hot_score': 0
    }
    dreams.append(dream)
    save_dreams(dreams)
    return dream


def get_dream(dream_id):
    dreams = load_dreams()
    for dream in dreams:
        if dream['id'] == dream_id:
            return dream
    return None


def invest_dream(dream_id, user_id, user_name, amount):
    dreams = load_dreams()
    for dream in dreams:
        if dream['id'] == dream_id:
            existing = next((i for i in dream['investors'] if i['user_id'] == user_id), None)
            if existing:
                existing['amount'] += amount
            else:
                dream['investors'].append({
                    'user_id': user_id,
                    'user_name': user_name,
                    'amount': amount
                })
            dream['total_investment'] += amount
            dream['hot_score'] = len(dream['investors']) + dream['total_investment'] / 100
            save_dreams(dreams)
            return dream
    return None


def update_dream_solution(dream_id, solution):
    dreams = load_dreams()
    for dream in dreams:
        if dream['id'] == dream_id:
            dream['solution'] = solution
            save_dreams(dreams)
            return dream
    return None


def delete_dream(dream_id):
    dreams = load_dreams()
    dreams = [d for d in dreams if d['id'] != dream_id]
    save_dreams(dreams)
    comments = load_comments()
    if dream_id in comments:
        del comments[dream_id]
        save_comments(comments)
    return True


def add_comment(dream_id, user_id, user_name, content):
    comments = load_comments()
    if dream_id not in comments:
        comments[dream_id] = []
    comment_id = str(uuid.uuid4())[:8]
    comment = {
        'id': comment_id,
        'user_id': user_id,
        'user_name': user_name,
        'content': content,
        'helpful': 0,
        'bullshit': 0,
        'voted_users': [],
        'created_at': datetime.now().isoformat()
    }
    comments[dream_id].append(comment)
    save_comments(comments)
    return comment


def vote_comment(dream_id, comment_id, vote_type, user_id):
    comments = load_comments()
    if dream_id not in comments:
        return None
    for comment in comments[dream_id]:
        if comment['id'] == comment_id:
            if user_id in comment['voted_users']:
                return None
            comment['voted_users'].append(user_id)
            if vote_type == 'helpful':
                comment['helpful'] += 1
            elif vote_type == 'bullshit':
                comment['bullshit'] += 1
            save_comments(comments)
            return comment
    return None


def delete_comment(dream_id, comment_id):
    comments = load_comments()
    if dream_id not in comments:
        return False
    comments[dream_id] = [c for c in comments[dream_id] if c['id'] != comment_id]
    save_comments(comments)
    return True


def get_sorted_dreams(sort_by='hot'):
    dreams = load_dreams()
    if sort_by == 'hot':
        dreams.sort(key=lambda x: x['hot_score'], reverse=True)
    elif sort_by == 'new':
        dreams.sort(key=lambda x: x['created_at'], reverse=True)
    elif sort_by == 'investment':
        dreams.sort(key=lambda x: x['total_investment'], reverse=True)
    return dreams

import uuid
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from config import ADMIN_PASSWORD, INCUBATE_COST, INVESTMENT_THRESHOLD
from storage import (
    get_or_create_user, update_user_coins, create_dream, get_dream,
    invest_dream, update_dream_solution, delete_dream, add_comment,
    vote_comment, delete_comment, get_sorted_dreams, load_comments, load_users
)
from ai_generator import generate_solution

app = Flask(__name__)
app.secret_key = 'daydream-market-secret-key-2024'


def get_current_user():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        session['user_name'] = f'梦想家{str(uuid.uuid4())[:4]}'
    user = get_or_create_user(session['user_id'])
    return user


@app.route('/')
def index():
    user = get_current_user()
    sort_by = request.args.get('sort', 'hot')
    dreams = get_sorted_dreams(sort_by)
    return render_template('index.html', user=user, dreams=dreams, sort_by=sort_by)


@app.route('/dream/<dream_id>')
def dream_detail(dream_id):
    user = get_current_user()
    dream = get_dream(dream_id)
    if not dream:
        return redirect(url_for('index'))
    comments = load_comments().get(dream_id, [])
    return render_template('dream.html', user=user, dream=dream, comments=comments)


@app.route('/admin', methods=['GET', 'POST'])
def admin():
    if request.method == 'POST':
        password = request.form.get('password')
        if password == ADMIN_PASSWORD:
            session['is_admin'] = True
        else:
            return render_template('admin.html', is_admin=False)
    if not session.get('is_admin'):
        return render_template('admin.html', is_admin=False)
    dreams = get_sorted_dreams('new')
    comments = load_comments()
    users = load_users()
    total_coins = sum(u.get('coins', 0) for u in users.values())
    return render_template('admin.html', is_admin=True, dreams=dreams, comments=comments, users=users, total_coins=total_coins)


@app.route('/api/dream', methods=['POST'])
def api_create_dream():
    user = get_current_user()
    data = request.json
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    if not title:
        return jsonify({'success': False, 'error': '标题不能为空'})
    dream = create_dream(title, description, user['id'], session['user_name'])
    return jsonify({'success': True, 'dream': dream})


@app.route('/api/dream/<dream_id>/invest', methods=['POST'])
def api_invest(dream_id):
    user = get_current_user()
    data = request.json
    amount = int(data.get('amount', 10))
    if user['coins'] < amount:
        return jsonify({'success': False, 'error': f'虚拟币不足，当前余额：{user["coins"]} 币'})
    dream = invest_dream(dream_id, user['id'], session['user_name'], amount)
    if not dream:
        return jsonify({'success': False, 'error': '梦想不存在'})
    updated_user = update_user_coins(user['id'], -amount)
    investor_count = len(dream['investors'])
    need_generate = investor_count >= INVESTMENT_THRESHOLD and not dream['solution']
    if need_generate:
        solution = generate_solution(dream['title'], dream['description'])
        dream = update_dream_solution(dream_id, solution)
    return jsonify({
        'success': True,
        'dream': dream,
        'user_coins': updated_user['coins'] if updated_user else user['coins'] - amount,
        'solution_generated': need_generate
    })


@app.route('/api/dream/<dream_id>/incubate', methods=['POST'])
def api_incubate(dream_id):
    user = get_current_user()
    dream = get_dream(dream_id)
    if not dream:
        return jsonify({'success': False, 'error': '梦想不存在'})
    if dream['author_id'] != user['id']:
        return jsonify({'success': False, 'error': '只能孵化自己的梦想'})
    if dream['solution']:
        return jsonify({'success': False, 'error': '该梦想已有方案'})
    if user['coins'] < INCUBATE_COST:
        return jsonify({'success': False, 'error': f'需要 {INCUBATE_COST} 虚拟币，当前余额：{user["coins"]} 币'})
    updated_user = update_user_coins(user['id'], -INCUBATE_COST)
    solution = generate_solution(dream['title'], dream['description'])
    dream = update_dream_solution(dream_id, solution)
    return jsonify({
        'success': True,
        'dream': dream,
        'user_coins': updated_user['coins'] if updated_user else user['coins'] - INCUBATE_COST
    })


@app.route('/api/dream/<dream_id>/comment', methods=['POST'])
def api_comment(dream_id):
    user = get_current_user()
    data = request.json
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'success': False, 'error': '评论内容不能为空'})
    comment = add_comment(dream_id, user['id'], session['user_name'], content)
    return jsonify({'success': True, 'comment': comment})


@app.route('/api/comment/<dream_id>/<comment_id>/vote', methods=['POST'])
def api_vote_comment(dream_id, comment_id):
    user = get_current_user()
    data = request.json
    vote_type = data.get('type')
    if vote_type not in ['helpful', 'bullshit']:
        return jsonify({'success': False, 'error': '无效的投票类型'})
    comment = vote_comment(dream_id, comment_id, vote_type, user['id'])
    if not comment:
        return jsonify({'success': False, 'error': '投票失败或已投票'})
    return jsonify({'success': True, 'comment': comment})


@app.route('/api/admin/dream/<dream_id>/delete', methods=['POST'])
def api_delete_dream(dream_id):
    if not session.get('is_admin'):
        return jsonify({'success': False, 'error': '无权限'})
    delete_dream(dream_id)
    return jsonify({'success': True})


@app.route('/api/admin/comment/<dream_id>/<comment_id>/delete', methods=['POST'])
def api_delete_comment(dream_id, comment_id):
    if not session.get('is_admin'):
        return jsonify({'success': False, 'error': '无权限'})
    delete_comment(dream_id, comment_id)
    return jsonify({'success': True})


@app.route('/api/admin/logout', methods=['POST'])
def api_admin_logout():
    session['is_admin'] = False
    return jsonify({'success': True})


@app.route('/api/user/rename', methods=['POST'])
def api_rename_user():
    user = get_current_user()
    data = request.json
    new_name = data.get('name', '').strip()
    if not new_name:
        return jsonify({'success': False, 'error': '昵称不能为空'})
    session['user_name'] = new_name
    return jsonify({'success': True, 'name': new_name})


if __name__ == '__main__':
    app.run(debug=True, port=5000)

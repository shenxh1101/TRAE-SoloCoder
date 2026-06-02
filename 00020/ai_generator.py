import random
from datetime import datetime


STEPS_TEMPLATES = {
    '学习类': [
        '寻找专业导师或报名在线课程，系统学习基础知识',
        '每天坚持练习30分钟，建立专属的学习笔记',
        '加入相关社群，与志同道合的人交流经验'
    ],
    '技能类': [
        '分析目标技能的核心要素，制定拆解式学习计划',
        '寻找实战机会，在应用中巩固技能',
        '定期复盘总结，持续优化提升方法'
    ],
    '创意类': [
        '收集灵感素材，建立创意灵感库',
        '设定每日创作目标，保持输出习惯',
        '寻求反馈迭代，让作品逐步完善'
    ],
    '探索类': [
        '深入研究相关领域的前沿信息',
        '从小规模实验开始，验证可行性',
        '拓展人脉资源，寻找合作伙伴'
    ],
    '通用类': [
        '明确具体目标，设定可衡量的里程碑',
        '制定详细执行计划，按步骤推进',
        '保持积极心态，定期评估调整策略'
    ]
}


RESOURCES_TEMPLATES = {
    '资金': ['启动资金约 5,000-20,000 虚拟币', '用于购买学习资料或工具'],
    '时间': ['预计需要 3-6 个月的持续投入', '每周至少投入 10 小时'],
    '工具': ['专业软件或设备', '相关书籍和教程'],
    '人脉': ['行业导师指导', '同好交流社群'],
    '环境': ['安静的学习空间', '实践操作场所']
}


def categorize_dream(title, description):
    text = (title + description).lower()
    if any(keyword in text for keyword in ['学', '习', '课', '读', '考', 'learn', 'study', 'read']):
        return '学习类'
    elif any(keyword in text for keyword in ['技能', '技术', '编程', '画', '唱', '跳', 'skill', 'code', 'program']):
        return '技能类'
    elif any(keyword in text for keyword in ['创作', '写', '设计', '创意', 'create', 'design', 'write']):
        return '创意类'
    elif any(keyword in text for keyword in ['探索', '旅行', '发现', '冒险', 'explore', 'travel', 'adventure']):
        return '探索类'
    else:
        return '通用类'


def generate_steps(category):
    templates = STEPS_TEMPLATES.get(category, STEPS_TEMPLATES['通用类'])
    return [f"第{i+1}步：{step}" for i, step in enumerate(templates)]


def generate_resources():
    resource_keys = list(RESOURCES_TEMPLATES.keys())
    selected = random.sample(resource_keys, 3)
    resources = []
    for key in selected:
        resources.extend(RESOURCES_TEMPLATES[key])
    return resources


def generate_solution(dream_title, dream_description):
    category = categorize_dream(dream_title, dream_description)
    steps = generate_steps(category)
    resources = generate_resources()
    
    intro_templates = [
        f"基于您的白日梦「{dream_title}」，AI 为您制定了以下圆梦方案：",
        f"经过深度分析「{dream_title}」，以下是 AI 精心设计的圆梦路径：",
        f"针对「{dream_title}」这个梦想，AI 规划了三步实现策略："
    ]
    
    solution = {
        'title': f'圆梦方案：{dream_title}',
        'introduction': random.choice(intro_templates),
        'category': category,
        'steps': steps,
        'resources': resources,
        'success_rate': random.randint(60, 95),
        'generated_at': datetime.now().isoformat(),
        'ai_note': '本方案由 AI 白日梦系统智能生成，仅供娱乐参考～'
    }
    
    return solution

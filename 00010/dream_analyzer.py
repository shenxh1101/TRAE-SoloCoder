#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
import random

DATA_DIR = Path.home() / ".dream_analyzer"
LIKES_FILE = DATA_DIR / "likes.json"
HISTORY_FILE = DATA_DIR / "history.json"


COLORS = {
    '红色': ['red', 'crimson', 'scarlet', 'ruby', 'vermilion'],
    '蓝色': ['blue', 'azure', 'cobalt', 'navy', 'sapphire'],
    '绿色': ['green', 'emerald', 'jade', 'olive', 'mint'],
    '黄色': ['yellow', 'gold', 'amber', 'lemon', 'mustard'],
    '紫色': ['purple', 'violet', 'lavender', 'lilac', 'plum'],
    '橙色': ['orange', 'tangerine', 'peach', 'coral'],
    '粉色': ['pink', 'rose', 'blush', 'fuchsia'],
    '黑色': ['black', 'dark', 'ebony', 'jet', 'obsidian'],
    '白色': ['white', 'ivory', 'snow', 'pearl', 'alabaster'],
    '灰色': ['gray', 'grey', 'silver', 'ash', 'slate'],
    '棕色': ['brown', 'tan', 'chocolate', 'coffee', 'auburn'],
}

EMOTIONS = {
    '恐惧': ['fear', 'afraid', 'scared', 'terrified', 'panic', 'horror', 'dread',
           '害怕', '恐惧', '惊恐', '恐慌', '畏惧', '胆战心惊'],
    '快乐': ['joy', 'happy', 'happiness', 'delight', 'pleasure', 'bliss', 'elation',
           '快乐', '高兴', '幸福', '愉悦', '欢乐', '欣喜'],
    '悲伤': ['sad', 'sadness', 'sorrow', 'grief', 'melancholy', 'depression',
           '悲伤', '难过', '悲哀', '忧郁', '伤心', '沮丧'],
    '愤怒': ['anger', 'angry', 'rage', 'fury', 'wrath', 'indignation',
           '愤怒', '生气', '恼怒', '愤慨', '暴怒', '气愤'],
    '焦虑': ['anxiety', 'anxious', 'worry', 'worried', 'stress', 'tension',
           '焦虑', '担心', '忧虑', '紧张', '不安', '烦躁'],
    '平静': ['calm', 'peaceful', 'serene', 'tranquil', 'relaxed', 'content',
           '平静', '安宁', '宁静', '祥和', '放松', '满足'],
    '困惑': ['confused', 'confusion', 'puzzled', 'bewildered', 'perplexed',
           '困惑', '迷茫', '迷惑', '不解', '茫然', '疑惑'],
    '兴奋': ['excited', 'excitement', 'thrilled', 'energetic', 'enthusiastic',
           '兴奋', '激动', '热情', '精力充沛', '亢奋'],
    '羞耻': ['shame', 'ashamed', 'embarrassed', 'humiliated', 'guilty',
           '羞耻', '羞愧', '尴尬', '内疚', '惭愧'],
    '惊奇': ['surprise', 'surprised', 'amazed', 'astonished', 'wonder',
           '惊奇', '惊讶', '诧异', '惊叹', '奇怪'],
}

OBJECTS = {
    '水': ['water', 'ocean', 'sea', 'river', 'lake', 'pool', 'rain', 'wave', 'stream',
          '水', '海洋', '大海', '河流', '湖泊', '池塘', '雨', '波浪', '溪流'],
    '动物': ['animal', 'dog', 'cat', 'bird', 'fish', 'snake', 'horse', 'lion', 'tiger',
            'bear', 'wolf', 'eagle', 'butterfly', 'spider',
            '动物', '狗', '猫', '鸟', '鱼', '蛇', '马', '狮子', '老虎', '熊', '狼',
            '鹰', '蝴蝶', '蜘蛛'],
    '家人': ['family', 'mother', 'father', 'parent', 'sister', 'brother', 'child',
            'baby', 'grandparent', 'uncle', 'aunt', 'cousin',
            '家人', '母亲', '父亲', '父母', '姐妹', '兄弟', '孩子', '婴儿',
            '祖父母', '叔叔', '阿姨', '表亲'],
    '朋友': ['friend', 'companion', 'partner', 'colleague', 'neighbor',
             '朋友', '伙伴', '伴侣', '同事', '邻居'],
    '陌生人': ['stranger', 'unknown', 'mysterious', 'foreigner',
               '陌生人', '未知的人', '神秘人', '外国人'],
    '房屋': ['house', 'home', 'building', 'room', 'apartment', 'mansion', 'cabin',
             '房屋', '房子', '家', '建筑', '房间', '公寓', '大厦', '小屋'],
    '交通工具': ['car', 'vehicle', 'plane', 'airplane', 'train', 'boat', 'ship',
                 'bus', 'bicycle', 'motorcycle',
                 '汽车', '交通工具', '飞机', '火车', '船', '公交车', '自行车', '摩托车'],
    '学校': ['school', 'classroom', 'teacher', 'student', 'exam', 'test', 'college',
             'university',
             '学校', '教室', '老师', '学生', '考试', '测验', '大学', '学院'],
    '食物': ['food', 'bread', 'cake', 'fruit', 'vegetable', 'meat', 'drink', 'meal',
             '食物', '面包', '蛋糕', '水果', '蔬菜', '肉', '饮料', '餐'],
    '金钱': ['money', 'cash', 'gold', 'silver', 'coin', 'bill', 'treasure', 'wealth',
             '金钱', '钱', '现金', '黄金', '白银', '硬币', '钞票', '宝藏', '财富'],
    '死亡': ['death', 'dead', 'die', 'dying', 'grave', 'funeral', 'corpse', 'skeleton',
            '死亡', '死', '死去', '垂死', '坟墓', '葬礼', '尸体', '骷髅'],
    '飞行': ['fly', 'flying', 'soar', 'glide', 'hover',
             '飞', '飞行', '飞翔', '翱翔', '滑翔', '盘旋'],
    '坠落': ['fall', 'falling', 'drop', 'plunge', 'tumble',
             '坠落', '掉落', '跌落', '跳下', '倒下'],
    '追逐': ['chase', 'chasing', 'pursue', 'run away', 'escape', 'flee',
             '追逐', '追赶', '追求', '逃跑', '逃脱', '逃离'],
    '裸体': ['naked', 'nude', 'undressed', 'exposed',
             '裸体', '赤裸', '没穿衣服', '暴露'],
    '牙齿': ['teeth', 'tooth', 'mouth', 'dentist',
             '牙齿', '牙', '嘴', '牙医'],
}

ACTIONS = {
    '奔跑': ['run', 'running', 'sprint', 'dash', 'race',
             '跑', '奔跑', '冲刺', '赛跑'],
    '飞翔': ['fly', 'flying', 'soar', 'glide',
             '飞', '飞翔', '翱翔', '滑翔'],
    '坠落': ['fall', 'falling', 'drop', 'plunge', 'tumble',
             '坠落', '掉落', '跌落', '跳下'],
    '游泳': ['swim', 'swimming', 'dive', 'float',
             '游泳', '游', '潜水', '漂浮'],
    '战斗': ['fight', 'fighting', 'battle', 'combat', 'attack', 'defend',
             '战斗', '打斗', '搏斗', '攻击', '防御'],
    '说话': ['talk', 'talking', 'speak', 'conversation', 'discuss', 'argue',
             '说话', '谈话', '讲话', '对话', '讨论', '争论'],
    '哭泣': ['cry', 'crying', 'weep', 'sob', 'tears',
             '哭泣', '哭', '流泪', '抽泣'],
    '大笑': ['laugh', 'laughing', 'giggle', 'chuckle',
             '大笑', '笑', '傻笑', '咯咯笑'],
    '寻找': ['search', 'searching', 'look for', 'find', 'seek',
             '寻找', '找寻', '搜索', '找到', '寻求'],
    '隐藏': ['hide', 'hiding', 'conceal', 'cover', 'escape',
             '隐藏', '躲藏', '掩盖', '覆盖', '逃避'],
    '吃东西': ['eat', 'eating', 'drink', 'drinking', 'taste', 'bite',
               '吃', '吃东西', '喝', '喝东西', '品尝', '咬'],
    '建设': ['build', 'building', 'create', 'make', 'construct',
             '建造', '建筑', '创造', '制作', '建设'],
    '破坏': ['destroy', 'destroying', 'break', 'smash', 'ruin', 'demolish',
             '破坏', '毁灭', '打破', '打碎', '毁坏'],
    '旅行': ['travel', 'traveling', 'journey', 'trip', 'explore', 'wander',
             '旅行', '旅游', '旅程', '探索', '漫步'],
}


FREUDIAN_TEMPLATES = {
    'default': [
        "这个梦境反映了你潜意识中被压抑的欲望和本能冲动。梦中的意象可能象征着你在清醒生活中无法满足的愿望。",
        "从精神分析的角度来看，这个梦揭示了你内心深处的冲突和焦虑。梦是通往潜意识的捷径，你需要关注这些被压抑的内容。",
        "梦是愿望的达成。你的潜意识通过这个梦境来满足某种被压抑的渴望，可能与童年经历或早期创伤有关。",
    ],
    '恐惧': [
        "恐惧的梦境通常与童年时期的创伤经历或被压抑的焦虑有关。你梦中的恐惧对象可能象征着你在现实中害怕面对的某种内在冲突。",
        "这种恐惧梦可能反映了你对某种本能冲动的压抑。你的自我防御机制在梦中被激活，试图控制那些不被接受的欲望。",
    ],
    '水': [
        "水在梦中常常象征着母亲的子宫、情感的深处或潜意识本身。你与水的互动方式反映了你与母亲关系的某些方面。",
        "水的梦可以联系到出生的体验、对母亲的依赖，或者对回归安全状态的渴望。也可能象征着情感的宣泄或性的能量。",
    ],
    '飞行': [
        "飞翔的梦通常与性满足的欲望、超越限制的渴望有关，也可能表示你想要逃避生活中的某些困难或责任。",
        "飞行象征着对自由的渴望和对掌控感的追求。这可能也反映了潜在的性幻想或想要超越日常束缚的冲动。",
    ],
    '坠落': [
        "坠落的梦常常与对失去控制、失败或地位下降的恐惧有关。这可能反映了你在现实生活中感到无助或被压制的处境。",
        '从精神分析角度看，坠落的梦可能与被压抑的性冲动有关，或者象征着从道德或社会规范的"堕落"。',
    ],
    '家人': [
        "梦中的家人形象通常与俄狄浦斯情结或伊莱克特拉情结有关。你需要审视你与父母关系中被压抑的情感。",
        "家人出现在梦中往往反映了童年时期的冲突和欲望。这些人物可能被伪装，以避免你在梦中感到过度焦虑。",
    ],
    '牙齿': [
        "牙齿脱落的梦是一种典型的阉割焦虑的表现。这可能与你对性能力或男子气概的担忧有关。",
        "牙齿的梦也可能象征着言语攻击的压抑，或者对自我形象和社会地位的关注。",
    ],
    '裸体': [
        "裸体的梦通常与暴露焦虑、脆弱感，或者对真实自我被他人审视的恐惧有关。",
        "裸体梦也可能表示你想要摆脱社会约束、展现真实自我的愿望，或者与暴露欲相关的潜意识冲动。",
    ],
}

JUNGIAN_TEMPLATES = {
    'default': [
        "这个梦境是无意识自我调节的表现，反映了你心灵深处正在发生的某种变化过程。注意梦中出现的原型意象。",
        "从分析心理学的角度来看，梦是自性化过程的信使。你的无意识正试图通过这个梦境传达关于你心灵发展的重要信息。",
        "梦是集体无意识的显现。注意梦中出现的普遍象征，它们可能指向人类共通的心理经验。",
    ],
    '阴影': [
        "梦中的阴暗或恐怖形象可能是你人格阴影的投射。这些被你拒绝和压抑的特质需要被整合，以实现心灵的完整。",
        "阴影的出现标志着你需要面对自己不接纳的部分。只有承认和整合阴影，自我才能得到充分发展。",
    ],
    '阿尼玛_阿尼姆斯': [
        "梦中出现的异性形象可能是阿尼玛（男性内在的女性意象）或阿尼姆斯（女性内在的男性意象）的显现。",
        "这些内在异性形象的出现，标志着你的无意识正试图整合心灵中被忽视的一面，促进心理的平衡与完整。",
    ],
    '水': [
        "水是无意识的重要象征，代表着心灵的深层、情感的源泉，以及生命的奥秘。水的状态反映了你与无意识的关系。",
        "清澈的水象征着清明的直觉和情感的纯净，而浑浊的水可能表示无意识内容的混乱或需要被清理的情感问题。",
    ],
    '动物': [
        "梦中的动物是本能和直觉的象征，也可能代表原型能量。注意动物的种类和行为，它们揭示了你内在的某种特质。",
        "动物形象可能是智慧老人或大母神等原型的变形。它们的出现往往带有重要的启示，指导你的自性化进程。",
    ],
    '飞行': [
        "飞翔的梦象征着精神的超越、视角的提升，以及脱离物质束缚的自由。这是一个积极的自性化迹象。",
        "飞行表示你的意识正在扩展，你能够从更高的角度看待问题。这也可能与灵性追求或超越个人的体验有关。",
    ],
    '死亡': [
        "死亡的梦很少预示肉体的死亡，更多是象征着某种心理状态、关系或生活阶段的终结，以及新生的可能。",
        "死亡与重生是自性化过程的核心主题。旧的自我必须死去，新的、更完整的自我才能诞生。这是一个充满希望的转变之梦。",
    ],
    '快乐': [
        "愉悦的梦境通常表示心灵的和谐状态，或者预示着自性化过程的顺利进展。这是无意识给予你的积极反馈。",
        "梦中的快乐体验是自性（Self）的显现，表示你正在接近心灵的中心，体验到完整性带来的喜悦。",
    ],
}

COGNITIVE_TEMPLATES = {
    'default': [
        "从认知心理学的角度来看，这个梦是大脑在睡眠期间整合记忆、处理情绪和解决问题的副产品。注意梦境与你近期经历的关联。",
        "现代认知科学认为，梦是大脑默认模式网络的活动产物，其功能可能包括情绪调节、记忆巩固和创造力激发。",
        "这个梦境反映了你的大脑正在处理近期的经历、情绪和认知冲突。梦的荒诞性源于大脑在低激活状态下的松散联想。",
    ],
    '恐惧': [
        "恐惧的梦可能与大脑的威胁模拟系统有关。梦通过模拟危险情境来训练我们在现实生活中的应对能力。",
        "从认知角度看，焦虑梦反映了你的大脑正在处理未解决的威胁或压力。这是一种情绪调节机制，帮助你在安全的环境中体验恐惧。",
    ],
    '记忆巩固': [
        "梦中出现的熟悉场景和人物与近期记忆的巩固有关。快速眼动睡眠期间，大脑正在将短时记忆转化为长时记忆。",
        "这个梦可能是你大脑正在整合最近学习或经历的信息。梦境的怪异内容反映了记忆重组过程中的随机激活。",
    ],
    '问题解决': [
        "这个梦可能是你的潜意识在尝试解决你清醒时困扰的某个问题。睡眠中的发散性思维常常能带来创造性的洞察。",
        "认知研究表明，梦能促进顿悟和问题解决。梦中看似无关的元素组合，可能正是大脑在寻找新的问题解决路径。",
    ],
    '情绪调节': [
        "充满情绪的梦境表明你的大脑正在进行情绪调节。通过在梦中重新体验和处理情绪，你可以减轻现实中的情绪负担。",
        "梦的一个重要功能是情绪的去激活。通过在安全的睡眠环境中重新激活情绪记忆，大脑能够减弱这些记忆的情感强度。",
    ],
    '追逐': [
        "被追逐的梦反映了你的大脑正在处理逃避或回避的心理模式。这可能与你现实生活中未面对的问题有关。",
        "从认知角度看，追逐梦是大脑在演练战斗或逃跑反应。这种模拟有助于你在现实中更好地应对压力情境。",
    ],
    '困惑': [
        "困惑的梦反映了你的大脑正在试图理解不完整或矛盾的信息。这可能表示你在清醒生活中面临某种认知失调。",
        "梦中的困惑感与前额叶皮层在睡眠中的低激活有关。这使得我们无法进行批判性思考，只能被动接受梦境的荒诞。",
    ],
}

HAIKU_STRUCTURES = {
    '恐惧': [
        ['暗夜寒风起', '暗影悄然随步移', '心跳震山溪'],
        ['迷雾笼深林', '未知之物暗中窥', '寒意透衣襟'],
        ['雷声破夜空', '孤影狂奔无归处', '惊觉一身寒'],
    ],
    '快乐': [
        ['春风拂柳丝', '繁花似锦满目春', '心醉鸟鸣时'],
        ['暖阳照山川', '欢声笑语满庭园', '幸福在眼前'],
        ['蝶舞百花间', '馨香浮动晚风柔', '喜乐满心头'],
    ],
    '悲伤': [
        ['冷雨滴梧桐', '残花落尽水流东', '无语对西风'],
        ['孤灯照夜长', '往事如烟泪两行', '寂寞断人肠'],
        ['秋风扫落叶', '寒蝉凄切声悲切', '独自对明月'],
    ],
    '平静': [
        ['明月照松间', '清泉石上自流淌', '心定万籁寂'],
        ['空山新雨后', '独坐幽篁听鸟鸣', '心远地自偏'],
        ['湖光映秋月', '一叶扁舟任飘零', '心静自然凉'],
    ],
    '兴奋': [
        ['骏马驰原野', '风驰电掣心潮涌', '壮志凌云霄'],
        ['星火正燎原', '热血沸腾意飞扬', '逐梦正当时'],
        ['春雷震大地', '万物复苏生机勃', '心潮逐浪高'],
    ],
    '困惑': [
        ['雾锁千山暗', '迷途不知归路远', '云深何处是'],
        ['梦里身是客', '真假虚实难分辨', '醒时空怅惘'],
        ['歧路亡羊处', '四顾茫然心踌躇', '何方才是路'],
    ],
    'default': [
        ['梦魂夜归来', '奇境异象逐一展', '醒后意悠悠'],
        ['夜深入梦境', '奇幻世界任遨游', '觉来费思量'],
        ['睡乡寻秘语', '潜意识里藏真相', '解语在其中'],
    ],
}

HAIKU_EN = {
    '恐惧': [
        ['Dark wind rises high', 'Shadow follows silently', 'Heart beats like thunder'],
        ['Mist shrouds the deep wood', 'Unknown eyes watch from darkness', 'Cold pierces the bone'],
        ['Thunder breaks the night', 'Running wild, no place to hide', 'Awake in cold sweat'],
    ],
    '快乐': [
        ['Spring breeze caresses', 'Flowers bloom in splendor', 'Birdsong fills the heart'],
        ['Warm sun on mountains', 'Laughter echoes through the house', 'Joy is here and now'],
        ['Butterflies dance', 'Fragrance fills the evening air', 'Happiness abounds'],
    ],
    '悲伤': [
        ['Cold rain on梧桐', 'Fallen flowers drift downstream', 'Silent tears flow free'],
        ['Lonely lamp burns late', 'Memories bring bitter tears', 'Grief breaks the heart'],
        ['Autumn wind sweeps leaves', 'Cicada cries sadly', 'Alone with the moon'],
    ],
    '平静': [
        ['Bright moon through pine trees', 'Clear stream flows over stones', 'Peace in every breath'],
        ['Empty mountain rain', 'Sitting alone, birds sing soft', 'Mind is far from strife'],
        ['Lake reflects moon glow', 'A lone boat drifts freely', 'Calmness in the soul'],
    ],
    '兴奋': [
        ['Stallion runs wild', 'Heart surges like the wind', 'Aspire to the clouds'],
        ['Sparks start a great fire', 'Blood boils with energy', 'Dreams are within reach'],
        ['Spring thunder rumbles', 'All things awaken with life', 'Ride the rising tide'],
    ],
    '困惑': [
        ['Fog hides the mountains', 'Lost, not knowing the way home', 'Where lies the true path'],
        ['Dreamer is a guest', 'Real and false blend as one', 'Waking with confusion'],
        ['At the crossroads lost', 'Looking around, uncertain', 'Which way to go now'],
    ],
    'default': [
        ['Soul returns at night', 'Visions strange and wondrous', 'Waking, thoughts linger'],
        ['Deep in sleep we roam', 'Worlds of wonder unfold', 'Awake, we ponder'],
        ['In dreams seek secrets', 'Subconscious hides the truth', 'The answer is near'],
    ],
}


def init_data_dir():
    if not DATA_DIR.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not LIKES_FILE.exists():
        with open(LIKES_FILE, 'w', encoding='utf-8') as f:
            json.dump({}, f, ensure_ascii=False, indent=2)
    if not HISTORY_FILE.exists():
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)


def load_likes():
    if LIKES_FILE.exists():
        with open(LIKES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_likes(likes_data):
    with open(LIKES_FILE, 'w', encoding='utf-8') as f:
        json.dump(likes_data, f, ensure_ascii=False, indent=2)


def load_history():
    if HISTORY_FILE.exists():
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def save_history(history_data):
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history_data, f, ensure_ascii=False, indent=2)


def is_chinese_word(text):
    return bool(re.search(r'[\u4e00-\u9fff]', text))

def match_keyword(keyword, text, text_clean):
    kw_lower = keyword.lower()
    
    if is_chinese_word(keyword):
        if len(keyword) == 1:
            neg_chars = r'[\u4e00-\u9fff]'
            pattern = '(?<!' + neg_chars + ')' + re.escape(keyword) + '(?!' + neg_chars + ')'
            if re.search(pattern, text):
                return True
            if len(text) == 1 and text == keyword:
                return True
            return False
        return keyword in text
    
    pattern = r'\b' + re.escape(kw_lower) + r'\b'
    return re.search(pattern, text_clean) is not None

def extract_elements(dream_text):
    text_lower = dream_text.lower()
    text_clean = re.sub(r'[^\w\s]', ' ', text_lower)
    
    elements = {
        'objects': [],
        'emotions': [],
        'colors': [],
        'actions': [],
    }
    
    for name, keywords in COLORS.items():
        if name in dream_text:
            if name not in elements['colors']:
                elements['colors'].append(name)
            continue
        for kw in keywords:
            if match_keyword(kw, dream_text, text_clean):
                if name not in elements['colors']:
                    elements['colors'].append(name)
                break
    
    for name, keywords in EMOTIONS.items():
        if name in dream_text:
            if name not in elements['emotions']:
                elements['emotions'].append(name)
            continue
        for kw in keywords:
            if match_keyword(kw, dream_text, text_clean):
                if name not in elements['emotions']:
                    elements['emotions'].append(name)
                break
    
    for name, keywords in OBJECTS.items():
        if name in dream_text:
            if name not in elements['objects']:
                elements['objects'].append(name)
            continue
        for kw in keywords:
            if match_keyword(kw, dream_text, text_clean):
                if name not in elements['objects']:
                    elements['objects'].append(name)
                break
    
    for name, keywords in ACTIONS.items():
        if name in dream_text:
            if name not in elements['actions']:
                elements['actions'].append(name)
            continue
        for kw in keywords:
            if match_keyword(kw, dream_text, text_clean):
                if name not in elements['actions']:
                    elements['actions'].append(name)
                break
    
    return elements


def get_dominant_emotion(elements):
    if elements['emotions']:
        return elements['emotions'][0]
    return 'default'


def generate_haiku(elements, language='zh'):
    dominant = get_dominant_emotion(elements)
    
    if language == 'en':
        haiku_set = HAIKU_EN
    else:
        haiku_set = HAIKU_STRUCTURES
    
    if dominant in haiku_set:
        candidates = haiku_set[dominant]
    else:
        candidates = haiku_set['default']
    
    return random.choice(candidates)


def generate_freudian(elements, dream_text):
    interpretations = []
    
    interpretations.append(random.choice(FREUDIAN_TEMPLATES['default']))
    
    for obj in elements['objects']:
        if obj in FREUDIAN_TEMPLATES:
            interpretations.append(random.choice(FREUDIAN_TEMPLATES[obj]))
    
    for emotion in elements['emotions']:
        if emotion in FREUDIAN_TEMPLATES:
            interpretations.append(random.choice(FREUDIAN_TEMPLATES[emotion]))
    
    if not interpretations:
        interpretations = [random.choice(FREUDIAN_TEMPLATES['default'])]
    
    return "\n\n".join(interpretations)


def generate_jungian(elements, dream_text):
    interpretations = []
    
    interpretations.append(random.choice(JUNGIAN_TEMPLATES['default']))
    
    if '动物' in elements['objects']:
        interpretations.append(random.choice(JUNGIAN_TEMPLATES['动物']))
    
    if '死亡' in elements['objects']:
        interpretations.append(random.choice(JUNGIAN_TEMPLATES['死亡']))
    
    if '水' in elements['objects']:
        interpretations.append(random.choice(JUNGIAN_TEMPLATES['水']))
    
    if '飞行' in elements['actions'] or '飞行' in elements['objects']:
        interpretations.append(random.choice(JUNGIAN_TEMPLATES['飞行']))
    
    for emotion in elements['emotions']:
        if emotion in JUNGIAN_TEMPLATES:
            interpretations.append(random.choice(JUNGIAN_TEMPLATES[emotion]))
    
    if not interpretations:
        interpretations = [random.choice(JUNGIAN_TEMPLATES['default'])]
    
    return "\n\n".join(interpretations)


def generate_cognitive(elements, dream_text):
    interpretations = []
    
    interpretations.append(random.choice(COGNITIVE_TEMPLATES['default']))
    
    if '恐惧' in elements['emotions'] or '焦虑' in elements['emotions']:
        interpretations.append(random.choice(COGNITIVE_TEMPLATES['恐惧']))
    
    if '追逐' in elements['actions'] or '追逐' in elements['objects']:
        interpretations.append(random.choice(COGNITIVE_TEMPLATES['追逐']))
    
    if '困惑' in elements['emotions']:
        interpretations.append(random.choice(COGNITIVE_TEMPLATES['困惑']))
    
    if elements['emotions']:
        interpretations.append(random.choice(COGNITIVE_TEMPLATES['情绪调节']))
    
    if not interpretations:
        interpretations = [random.choice(COGNITIVE_TEMPLATES['default'])]
    
    return "\n\n".join(interpretations)


def generate_interpretations(elements, dream_text, likes_data=None):
    interpretations = {
        'freudian': {
            'name': '弗洛伊德式解析',
            'name_en': 'Freudian Interpretation',
            'content': generate_freudian(elements, dream_text),
            'likes': 0,
        },
        'jungian': {
            'name': '荣格式解析',
            'name_en': 'Jungian Interpretation',
            'content': generate_jungian(elements, dream_text),
            'likes': 0,
        },
        'cognitive': {
            'name': '现代认知心理学式解析',
            'name_en': 'Cognitive Psychology Interpretation',
            'content': generate_cognitive(elements, dream_text),
            'likes': 0,
        },
    }
    
    dream_id = generate_dream_id(dream_text)
    if likes_data and dream_id in likes_data:
        for key in interpretations:
            if key in likes_data[dream_id]:
                interpretations[key]['likes'] = likes_data[dream_id][key]
    
    return interpretations


def generate_dream_id(dream_text):
    import hashlib
    return hashlib.md5(dream_text.encode('utf-8')).hexdigest()[:16]


def sort_interpretations(interpretations):
    items = list(interpretations.items())
    items.sort(key=lambda x: x[1]['likes'], reverse=True)
    return dict(items)


def record_like(dream_id, school, likes_data):
    if dream_id not in likes_data:
        likes_data[dream_id] = {'freudian': 0, 'jungian': 0, 'cognitive': 0}
    
    if school in likes_data[dream_id]:
        likes_data[dream_id][school] += 1
    
    return likes_data


def detect_language(text):
    chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
    if len(chinese_chars) >= 1:
        return 'zh'
    return 'en'


def format_output(dream_text, elements, interpretations, haiku, haiku_en):
    lang = detect_language(dream_text)
    
    output = []
    output.append("=" * 60)
    output.append("🌙 AI 梦境记录与解析器 🌙")
    output.append("AI Dream Recorder and Analyzer")
    output.append("=" * 60)
    output.append("")
    output.append("📝 你的梦境 / Your Dream:")
    output.append("-" * 40)
    output.append(dream_text)
    output.append("")
    output.append("🔍 提取的梦境元素 / Extracted Dream Elements:")
    output.append("-" * 40)
    
    if lang == 'zh':
        output.append(f"  物体 (Objects): {', '.join(elements['objects']) if elements['objects'] else '无'}")
        output.append(f"  情绪 (Emotions): {', '.join(elements['emotions']) if elements['emotions'] else '无'}")
        output.append(f"  颜色 (Colors): {', '.join(elements['colors']) if elements['colors'] else '无'}")
        output.append(f"  动作 (Actions): {', '.join(elements['actions']) if elements['actions'] else '无'}")
    else:
        output.append(f"  Objects: {', '.join(elements['objects']) if elements['objects'] else 'None'}")
        output.append(f"  Emotions: {', '.join(elements['emotions']) if elements['emotions'] else 'None'}")
        output.append(f"  Colors: {', '.join(elements['colors']) if elements['colors'] else 'None'}")
        output.append(f"  Actions: {', '.join(elements['actions']) if elements['actions'] else 'None'}")
    
    output.append("")
    output.append("🎎 俳句 / Haiku (中文):")
    output.append("-" * 40)
    for line in haiku:
        output.append(f"  {line}")
    output.append("")
    output.append("🎎 Haiku (English):")
    output.append("-" * 40)
    for line in haiku_en:
        output.append(f"  {line}")
    output.append("")
    
    for key, value in interpretations.items():
        output.append("=" * 60)
        output.append(f"📚 {value['name']}")
        output.append(f"    {value['name_en']}")
        output.append(f"    👍 点赞数 / Likes: {value['likes']}")
        output.append("-" * 40)
        output.append(value['content'])
        output.append("")
    
    output.append("=" * 60)
    
    return "\n".join(output)


def process_single_dream(dream_text, interactive=True, export_json=False, output_file=None, batch_mode=False):
    init_data_dir()
    likes_data = load_likes()
    
    elements = extract_elements(dream_text)
    dream_id = generate_dream_id(dream_text)
    
    interpretations = generate_interpretations(elements, dream_text, likes_data)
    interpretations = sort_interpretations(interpretations)
    
    lang = detect_language(dream_text)
    haiku = generate_haiku(elements, language='zh')
    haiku_en = generate_haiku(elements, language='en')
    
    def refresh_output():
        nonlocal interpretations
        interpretations = sort_interpretations(interpretations)
        formatted = format_output(dream_text, elements, interpretations, haiku, haiku_en)
        print("\n" + "=" * 60)
        print("🔄 已更新解析结果 / Updated Analysis Results")
        print("=" * 60)
        print(formatted)
    
    result = {
        'id': dream_id,
        'timestamp': datetime.now().isoformat(),
        'dream_text': dream_text,
        'language': lang,
        'elements': elements,
        'haiku': {
            'chinese': haiku,
            'english': haiku_en,
        },
        'interpretations': interpretations,
    }
    
    formatted = format_output(dream_text, elements, interpretations, haiku, haiku_en)
    print(formatted)
    
    if interactive and not batch_mode:
        while True:
            print("\n请选择操作 / Please select an action:")
            print("1. 👍 点赞弗洛伊德式解析 / Like Freudian")
            print("2. 👍 点赞荣格式解析 / Like Jungian")
            print("3. 👍 点赞现代认知心理学式解析 / Like Cognitive")
            print("4. 💾 导出为JSON / Export to JSON")
            print("5. 🔄 保存到历史记录 / Save to history")
            print("6. 🚪 退出 / Exit")
            
            choice = input("\n请输入选项 / Enter choice (1-6): ").strip()
            
            if choice == '1':
                likes_data = record_like(dream_id, 'freudian', likes_data)
                save_likes(likes_data)
                interpretations['freudian']['likes'] += 1
                result['interpretations'] = interpretations
                print("\n✅ 已点赞弗洛伊德式解析 / Liked Freudian!")
                refresh_output()
            elif choice == '2':
                likes_data = record_like(dream_id, 'jungian', likes_data)
                save_likes(likes_data)
                interpretations['jungian']['likes'] += 1
                result['interpretations'] = interpretations
                print("\n✅ 已点赞荣格式解析 / Liked Jungian!")
                refresh_output()
            elif choice == '3':
                likes_data = record_like(dream_id, 'cognitive', likes_data)
                save_likes(likes_data)
                interpretations['cognitive']['likes'] += 1
                result['interpretations'] = interpretations
                print("\n✅ 已点赞现代认知心理学式解析 / Liked Cognitive!")
                refresh_output()
            elif choice == '4':
                json_file = output_file or f"dream_analysis_{dream_id}.json"
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)
                print(f"\n✅ 已导出到 / Exported to: {json_file}")
            elif choice == '5':
                history = load_history()
                history.append(result)
                save_history(history)
                print("\n✅ 已保存到历史记录 / Saved to history!")
            elif choice == '6':
                break
            else:
                print("\n❌ 无效选项 / Invalid choice, please try again.")
    
    elif export_json and output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
    
    return result


def process_batch_file(input_file, output_file=None, interactive=False):
    init_data_dir()
    likes_data = load_likes()
    
    if not Path(input_file).exists():
        print(f"❌ 文件不存在 / File not found: {input_file}")
        return None
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    dreams = re.split(r'\n\s*\n', content.strip())
    dreams = [d.strip() for d in dreams if d.strip()]
    
    if not dreams:
        print("❌ 未找到梦境记录 / No dream records found")
        return None
    
    print("╔" + "═" * 58 + "╗")
    print("║" + " " * 10 + "🌙 批量梦境解析 / Batch Dream Analysis" + " " * 10 + "║")
    print("╚" + "═" * 58 + "╝")
    print(f"\n📂 找到 {len(dreams)} 个梦境记录 / Found {len(dreams)} dream records")
    print("=" * 60)
    
    results = []
    for i, dream in enumerate(dreams, 1):
        print(f"\n{'═' * 60}")
        print(f"🔄 处理第 {i}/{len(dreams)} 个梦境 / Processing dream {i}/{len(dreams)}")
        print('═' * 60)
        result = process_single_dream(dream, interactive=False, batch_mode=True)
        results.append(result)
    
    overview = generate_batch_overview(results, likes_data)
    print(overview)
    
    if output_file:
        batch_result = {
            'timestamp': datetime.now().isoformat(),
            'total_dreams': len(results),
            'overview': overview,
            'results': results,
        }
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(batch_result, f, ensure_ascii=False, indent=2)
        print(f"\n✅ 已导出批量结果到 / Exported batch results to: {output_file}")
    
    if interactive:
        while True:
            print("\n" + "=" * 60)
            print("� 批量解析交互菜单 / Batch Analysis Menu")
            print("=" * 60)
            print("请选择操作 / Please select an action:")
            print("1. 👍 批量点赞 - 选择梦境和学派 / Batch like - select dream and school")
            print("2. 📄 查看单个梦境详情 / View single dream details")
            print("3. 💾 导出所有结果为JSON / Export all results to JSON")
            print("4. 🔄 保存所有到历史记录 / Save all to history")
            print("5. 🚪 退出 / Exit")
            
            choice = input("\n请输入选项 / Enter choice (1-5): ").strip()
            
            if choice == '1':
                print(f"\n📋 梦境列表 / Dream list (1-{len(results)}):")
                for idx, res in enumerate(results, 1):
                    preview = res['dream_text'][:50] + "..." if len(res['dream_text']) > 50 else res['dream_text']
                    print(f"  {idx}. {preview}")
                
                try:
                    dream_choice = int(input(f"\n选择梦境编号 / Select dream number (1-{len(results)}): ").strip())
                    if 1 <= dream_choice <= len(results):
                        selected_result = results[dream_choice - 1]
                        print(f"\n📚 选择学派 / Select school:")
                        print("  1. 弗洛伊德式 / Freudian")
                        print("  2. 荣格式 / Jungian")
                        print("  3. 认知心理学式 / Cognitive")
                        
                        school_choice = input("\n请输入选项 / Enter choice (1-3): ").strip()
                        school_map = {'1': 'freudian', '2': 'jungian', '3': 'cognitive'}
                        school_name_map = {'1': '弗洛伊德式', '2': '荣格式', '3': '认知心理学式'}
                        
                        if school_choice in school_map:
                            school = school_map[school_choice]
                            dream_id = selected_result['id']
                            likes_data = record_like(dream_id, school, likes_data)
                            save_likes(likes_data)
                            selected_result['interpretations'][school]['likes'] += 1
                            print(f"\n✅ 已点赞 {school_name_map[school_choice]} 解析！/ Liked {school_name_map[school_choice]}!")
                            
                            overview = generate_batch_overview(results, likes_data)
                            print(overview)
                    else:
                        print("\n❌ 无效的梦境编号 / Invalid dream number")
                except ValueError:
                    print("\n❌ 请输入有效数字 / Please enter a valid number")
            
            elif choice == '2':
                print(f"\n📋 梦境列表 / Dream list (1-{len(results)}):")
                for idx, res in enumerate(results, 1):
                    preview = res['dream_text'][:50] + "..." if len(res['dream_text']) > 50 else res['dream_text']
                    print(f"  {idx}. {preview}")
                
                try:
                    dream_choice = int(input(f"\n选择梦境编号 / Select dream number (1-{len(results)}): ").strip())
                    if 1 <= dream_choice <= len(results):
                        selected_result = results[dream_choice - 1]
                        print("\n" + "=" * 60)
                        print(f"📖 梦境 {dream_choice} 详情 / Dream {dream_choice} Details")
                        print("=" * 60)
                        formatted = format_output(
                            selected_result['dream_text'],
                            selected_result['elements'],
                            selected_result['interpretations'],
                            selected_result['haiku']['chinese'],
                            selected_result['haiku']['english']
                        )
                        print(formatted)
                    else:
                        print("\n❌ 无效的梦境编号 / Invalid dream number")
                except ValueError:
                    print("\n❌ 请输入有效数字 / Please enter a valid number")
            
            elif choice == '3':
                json_file = output_file or f"batch_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                batch_result = {
                    'timestamp': datetime.now().isoformat(),
                    'total_dreams': len(results),
                    'overview': overview,
                    'results': results,
                }
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(batch_result, f, ensure_ascii=False, indent=2)
                print(f"\n✅ 已导出到 / Exported to: {json_file}")
            
            elif choice == '4':
                history = load_history()
                for res in results:
                    history.append(res)
                save_history(history)
                print(f"\n✅ 已保存 {len(results)} 条记录到历史 / Saved {len(results)} records to history!")
            
            elif choice == '5':
                print("\n👋 再见！/ Goodbye!")
                break
            
            else:
                print("\n❌ 无效选项 / Invalid choice, please try again.")
    
    return results


def generate_batch_overview(results, likes_data=None):
    all_emotions = {}
    all_objects = {}
    all_colors = {}
    all_actions = {}
    
    for result in results:
        for emotion in result['elements']['emotions']:
            all_emotions[emotion] = all_emotions.get(emotion, 0) + 1
        for obj in result['elements']['objects']:
            all_objects[obj] = all_objects.get(obj, 0) + 1
        for color in result['elements']['colors']:
            all_colors[color] = all_colors.get(color, 0) + 1
        for action in result['elements']['actions']:
            all_actions[action] = all_actions.get(action, 0) + 1
    
    total_likes = {'freudian': 0, 'jungian': 0, 'cognitive': 0}
    
    if likes_data:
        for dream_id, schools in likes_data.items():
            for key in total_likes:
                if key in schools:
                    total_likes[key] += schools[key]
    else:
        for result in results:
            for key in total_likes:
                if key in result['interpretations']:
                    total_likes[key] += result['interpretations'][key]['likes']
    
    overview = []
    
    overview.append("")
    overview.append("╔" + "═" * 58 + "╗")
    overview.append("║" + " " * 15 + "📊 批量解析总览 / Batch Overview" + " " * 15 + "║")
    overview.append("╚" + "═" * 58 + "╝")
    
    overview.append(f"\n📈 基本统计 / Basic Statistics")
    overview.append("-" * 40)
    overview.append(f"  总梦境数 / Total dreams analyzed: {len(results)}")
    
    if all_emotions:
        sorted_emotions = sorted(all_emotions.items(), key=lambda x: x[1], reverse=True)
        overview.append(f"\n😀 情绪分布 / Emotion Distribution:")
        overview.append("-" * 40)
        for emo, count in sorted_emotions[:5]:
            bar = "█" * int(count / max(all_emotions.values()) * 20)
            overview.append(f"  {emo:<8} │ {bar} {count}次 / times")
    
    if all_objects:
        sorted_objects = sorted(all_objects.items(), key=lambda x: x[1], reverse=True)
        overview.append(f"\n🏠 物体分布 / Object Distribution:")
        overview.append("-" * 40)
        for obj, count in sorted_objects[:5]:
            bar = "█" * int(count / max(all_objects.values()) * 20)
            overview.append(f"  {obj:<8} │ {bar} {count}次 / times")
    
    if all_actions:
        sorted_actions = sorted(all_actions.items(), key=lambda x: x[1], reverse=True)
        overview.append(f"\n🏃 动作分布 / Action Distribution:")
        overview.append("-" * 40)
        for act, count in sorted_actions[:5]:
            bar = "█" * int(count / max(all_actions.values()) * 20)
            overview.append(f"  {act:<8} │ {bar} {count}次 / times")
    
    if all_colors:
        sorted_colors = sorted(all_colors.items(), key=lambda x: x[1], reverse=True)
        overview.append(f"\n🎨 颜色分布 / Color Distribution:")
        overview.append("-" * 40)
        for col, count in sorted_colors[:5]:
            bar = "█" * int(count / max(all_colors.values()) * 20)
            overview.append(f"  {col:<8} │ {bar} {count}次 / times")
    
    overview.append(f"\n👍 各学派点赞统计 / School Likes Statistics:")
    overview.append("-" * 40)
    max_likes = max(total_likes.values()) if max(total_likes.values()) > 0 else 1
    overview.append(f"  弗洛伊德式 / Freudian:      {'█' * int(total_likes['freudian'] / max_likes * 20)} {total_likes['freudian']}")
    overview.append(f"  荣格式 / Jungian:          {'█' * int(total_likes['jungian'] / max_likes * 20)} {total_likes['jungian']}")
    overview.append(f"  认知心理学式 / Cognitive:  {'█' * int(total_likes['cognitive'] / max_likes * 20)} {total_likes['cognitive']}")
    
    overview.append("\n" + "=" * 60)
    
    return "\n".join(overview)


def show_history():
    init_data_dir()
    history = load_history()
    
    if not history:
        print("📭 暂无历史记录 / No history records yet")
        return
    
    print(f"📜 历史记录 / History Records ({len(history)}条)")
    print("=" * 60)
    
    for i, record in enumerate(history, 1):
        print(f"\n{i}. [{record['timestamp']}]")
        preview = record['dream_text'][:80] + "..." if len(record['dream_text']) > 80 else record['dream_text']
        print(f"   {preview}")
        print(f"   情绪 / Emotions: {', '.join(record['elements']['emotions']) if record['elements']['emotions'] else '无'}")
    
    print("\n" + "=" * 60)


def show_stats():
    init_data_dir()
    likes_data = load_likes()
    history = load_history()
    
    print("📊 系统统计 / System Statistics")
    print("=" * 60)
    
    print(f"\n📜 历史记录总数 / Total history records: {len(history)}")
    print(f"❤️ 点赞记录总数 / Total like records: {len(likes_data)}")
    
    if likes_data:
        total_likes = {'freudian': 0, 'jungian': 0, 'cognitive': 0}
        for dream_id, schools in likes_data.items():
            for key in total_likes:
                if key in schools:
                    total_likes[key] += schools[key]
        
        print(f"\n👍 各学派总点赞 / Total likes by school:")
        print(f"   弗洛伊德式 / Freudian: {total_likes['freudian']}")
        print(f"   荣格式 / Jungian: {total_likes['jungian']}")
        print(f"   认知心理学式 / Cognitive: {total_likes['cognitive']}")
    
    print("\n" + "=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description='AI 梦境记录与解析器 / AI Dream Recorder and Analyzer',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法 / Examples:
  %(prog)s -t "我梦见自己在天空中飞翔"
  %(prog)s --text "I dreamed I was flying in the sky"
  %(prog)s -f dreams.txt -o output.json
  %(prog)s -f dreams.txt --non-interactive
  %(prog)s --history
  %(prog)s --stats
        """
    )
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('-t', '--text', type=str, help='梦境描述文本 / Dream description text')
    group.add_argument('-f', '--file', type=str, help='包含多个梦境的文本文件 / Text file with multiple dreams')
    group.add_argument('--history', action='store_true', help='显示历史记录 / Show history')
    group.add_argument('--stats', action='store_true', help='显示系统统计 / Show statistics')
    
    parser.add_argument('-o', '--output', type=str, help='输出JSON文件路径 / Output JSON file path')
    parser.add_argument('--non-interactive', action='store_true', help='非交互模式 / Non-interactive mode')
    
    args = parser.parse_args()
    
    if args.history:
        show_history()
        return
    
    if args.stats:
        show_stats()
        return
    
    if args.text:
        process_single_dream(
            args.text,
            interactive=not args.non_interactive,
            export_json=bool(args.output),
            output_file=args.output
        )
    
    if args.file:
        process_batch_file(
            args.file,
            output_file=args.output,
            interactive=not args.non_interactive
        )


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 再见！/ Goodbye!")
        sys.exit(0)

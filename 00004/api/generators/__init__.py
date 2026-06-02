import os
import json
import random
import re

RULES_PATH = os.path.join(os.path.dirname(__file__), 'rules', 'rules.json')

with open(RULES_PATH, 'r', encoding='utf-8') as f:
    RULES = json.load(f)

def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return text.strip()

def apply_word_replacements(text, replacements):
    words = clean_text(text).split()
    result = []
    for word in words:
        if word in replacements:
            replacement = replacements[word]
            if replacement:
                result.append(replacement)
        else:
            result.append(word)
    return ''.join(result)

def generate_folk_style(text):
    folk_rules = RULES['folk']
    base_text = apply_word_replacements(text, folk_rules['word_replacements'])
    
    if not base_text:
        base_text = "风儿轻轻吹，月儿挂天边"
    
    prefix = random.choice(folk_rules['prefixes'])
    suffix = random.choice(folk_rules['suffixes'])
    imagery = random.choice(folk_rules['natural_imagery'])
    
    lines = []
    if prefix:
        lines.append(prefix + base_text)
    else:
        lines.append(base_text)
    
    lines.append(imagery)
    lines.append(base_text + suffix)
    
    return '\n'.join(lines)

def generate_ancient_style(text):
    ancient_rules = RULES['ancient']
    base_text = apply_word_replacements(text, ancient_rules['word_replacements'])
    
    if not base_text:
        base_text = "明月几时有"
    
    imagery = random.choice(ancient_rules['imagery'])
    phrase = random.choice(ancient_rules['classical_phrases'])
    
    line1 = base_text[:7] if len(base_text) >= 7 else base_text.ljust(7, '之')
    line2 = imagery + '照无眠'
    line3 = phrase[:7]
    
    return f'{line1}\n{line2}\n{line3}'

def generate_cyberpunk_style(text):
    cyber_rules = RULES['cyberpunk']
    base_text = apply_word_replacements(text, cyber_rules['word_replacements'])
    
    if not base_text:
        base_text = "霓虹闪烁数据流"
    
    tech_term = random.choice(cyber_rules['tech_terms'])
    glitch = random.choice(cyber_rules['glitch_effects'])
    
    lines = [
        f'[{tech_term}] {base_text}',
        f'{glitch} 系统加载中...',
        f'>>>{base_text}<<<'
    ]
    
    return '\n'.join(lines)

def generate_all_styles(text):
    return {
        'folk': generate_folk_style(text),
        'ancient': generate_ancient_style(text),
        'cyberpunk': generate_cyberpunk_style(text)
    }

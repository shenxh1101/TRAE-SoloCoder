import os
import uuid
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from PyPDF2 import PdfReader
from docx import Document
import pytz


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def generate_code(prefix: str) -> str:
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    unique = str(uuid.uuid4().hex)[:8].upper()
    return f"{prefix}{timestamp}{unique}"


def parse_file_content(file_path: str) -> Optional[str]:
    if not os.path.exists(file_path):
        return None

    ext = os.path.splitext(file_path)[1].lower()
    content = ""

    try:
        if ext == '.pdf':
            reader = PdfReader(file_path)
            for page in reader.pages:
                content += page.extract_text() or ""
        elif ext in ['.docx', '.doc']:
            doc = Document(file_path)
            for para in doc.paragraphs:
                content += para.text + "\n"
        elif ext in ['.txt', '.md']:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        else:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
    except Exception as e:
        from src.utils.logger import log_error
        log_error(f"Error parsing file {file_path}", e)
        return None

    return content.strip()


def extract_keywords(text: str, top_n: int = 20) -> List[str]:
    text = text.lower()
    text = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', text)

    stopwords = {'的', '是', '在', '了', '和', '与', '或', '及', '等', '也', '都', '就', '要', '会', '可以',
                 'this', 'that', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
                 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
                 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
                 'through', 'during', 'before', 'after', 'above', 'below', 'between',
                 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'although',
                 'though', 'even', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there'}

    words = re.findall(r'[\u4e00-\u9fff]+|[a-zA-Z]+', text)
    words = [w for w in words if len(w) >= 2 and w not in stopwords]

    freq = {}
    for word in words:
        freq[word] = freq.get(word, 0) + 1

    sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, count in sorted_words[:top_n]]


def calculate_similarity(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0

    words1 = set(extract_keywords(text1, top_n=50))
    words2 = set(extract_keywords(text2, top_n=50))

    if not words1 or not words2:
        return 0.0

    intersection = words1.intersection(words2)
    union = words1.union(words2)

    return len(intersection) / len(union) if union else 0.0


def check_time_conflict(start1: datetime, end1: datetime,
                        start2: datetime, end2: datetime) -> bool:
    return start1 < end2 and start2 < end1


def get_beijing_time() -> datetime:
    tz = pytz.timezone('Asia/Shanghai')
    return datetime.now(tz)


def generate_questions_from_content(content: str, course_id: int, num_questions: int = 10) -> List[Dict[str, Any]]:
    sentences = re.split(r'[。！？.!?\n]', content)
    sentences = [s.strip() for s in sentences if len(s.strip()) >= 10]

    questions = []
    used_sentences = set()

    for i, sentence in enumerate(sentences):
        if len(questions) >= num_questions:
            break
        if i in used_sentences:
            continue

        keywords = extract_keywords(sentence, top_n=5)
        if not keywords:
            continue

        keyword = keywords[0]
        if len(keyword) < 2:
            continue

        question_text = sentence.replace(keyword, '______', 1)

        all_words = extract_keywords(content, top_n=30)
        distractors = [w for w in all_words if w != keyword and w not in keywords[:2]]
        distractors = distractors[:3]

        if len(distractors) < 3:
            distractors.extend(['其他选项', '以上都不对', '以上都对'][:3 - len(distractors)])

        options = distractors + [keyword]
        import random
        random.shuffle(options)

        correct_idx = options.index(keyword)
        correct_answer = chr(65 + correct_idx)

        options_str = '|||'.join([f"{chr(65 + j)}. {opt}" for j, opt in enumerate(options)])

        questions.append({
            'course_id': course_id,
            'question_type': 'single_choice',
            'question_text': f"请填空：{question_text}",
            'options': options_str,
            'correct_answer': correct_answer,
            'points': 10,
            'difficulty': 'medium'
        })

        used_sentences.add(i)

    return questions


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

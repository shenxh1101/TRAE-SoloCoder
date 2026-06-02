#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import json
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dream_analyzer import (
    extract_elements,
    generate_interpretations,
    generate_haiku,
    generate_dream_id,
    detect_language,
    init_data_dir,
    load_likes,
    save_likes,
    record_like,
    sort_interpretations,
)


def test_extract_elements():
    print("🧪 测试1: 梦境元素提取 / Test 1: Dream Element Extraction")
    print("-" * 60)
    
    test_cases = [
        ("我梦见自己在蓝色的海洋上飞翔，感到非常快乐。", 
         {'objects': ['水', '飞行'], 'emotions': ['快乐'], 'colors': ['蓝色'], 'actions': ['飞翔']}),
        ("I was running through a dark forest, scared and confused.",
         {'objects': [], 'emotions': ['恐惧', '困惑'], 'colors': ['黑色'], 'actions': ['奔跑']}),
        ("我的牙齿掉了，感到非常羞耻和害怕。",
         {'objects': ['牙齿'], 'emotions': ['羞耻', '恐惧'], 'colors': [], 'actions': []}),
        ("我在考试，非常焦虑和害怕，想逃跑但跑不动。",
         {'objects': ['学校', '追逐'], 'emotions': ['焦虑', '恐惧'], 'colors': [], 'actions': []}),
    ]
    
    all_passed = True
    for i, (text, expected) in enumerate(test_cases, 1):
        result = extract_elements(text)
        passed = True
        for key in expected:
            if not all(item in result[key] for item in expected[key]):
                passed = False
                all_passed = False
        status = "✅ 通过 / PASSED" if passed else "❌ 失败 / FAILED"
        print(f"  {i}. {status}")
        print(f"     输入: {text[:50]}...")
        if not passed:
            print(f"     期望: {expected}")
            print(f"     实际: {result}")
    
    return all_passed


def test_language_detection():
    print("\n🧪 测试2: 语言检测 / Test 2: Language Detection")
    print("-" * 60)
    
    test_cases = [
        ("这是一段中文梦境描述。", 'zh'),
        ("This is an English dream description.", 'en'),
        ("I had a dream about 飞翔 in the sky.", 'zh'),
    ]
    
    all_passed = True
    for text, expected in test_cases:
        result = detect_language(text)
        passed = result == expected
        all_passed = all_passed and passed
        status = "✅ 通过 / PASSED" if passed else "❌ 失败 / FAILED"
        print(f"  {status}: '{text[:40]}...' -> {result}")
    
    return all_passed


def test_haiku_generation():
    print("\n🧪 测试3: 俳句生成 / Test 3: Haiku Generation")
    print("-" * 60)
    
    test_elements = [
        {'emotions': ['快乐']},
        {'emotions': ['恐惧']},
        {'emotions': []},
    ]
    
    all_passed = True
    for i, elements in enumerate(test_elements, 1):
        haiku_zh = generate_haiku(elements, 'zh')
        haiku_en = generate_haiku(elements, 'en')
        passed = len(haiku_zh) == 3 and len(haiku_en) == 3
        all_passed = all_passed and passed
        status = "✅ 通过 / PASSED" if passed else "❌ 失败 / FAILED"
        print(f"  {i}. {status}")
        print(f"     情绪 / Emotion: {elements['emotions']}")
        print(f"     中文俳句: {haiku_zh}")
        print(f"     English Haiku: {haiku_en}")
    
    return all_passed


def test_interpretation_generation():
    print("\n🧪 测试4: 解析生成 / Test 4: Interpretation Generation")
    print("-" * 60)
    
    test_dreams = [
        "我梦见自己在飞翔，下面是蓝色的大海，我感到非常快乐。",
        "我被一个陌生人追逐，非常害怕，想跑但跑不动。",
        "I dreamed I was flying through a peaceful green forest, feeling calm and happy.",
    ]
    
    all_passed = True
    for i, dream_text in enumerate(test_dreams, 1):
        elements = extract_elements(dream_text)
        interpretations = generate_interpretations(elements, dream_text)
        passed = (
            'freudian' in interpretations and
            'jungian' in interpretations and
            'cognitive' in interpretations and
            len(interpretations['freudian']['content']) > 0 and
            len(interpretations['jungian']['content']) > 0 and
            len(interpretations['cognitive']['content']) > 0
        )
        all_passed = all_passed and passed
        status = "✅ 通过 / PASSED" if passed else "❌ 失败 / FAILED"
        print(f"  {i}. {status}")
        print(f"     梦境: {dream_text[:60]}...")
        print(f"     弗洛伊德式解析长度: {len(interpretations['freudian']['content'])} 字")
        print(f"     荣格式解析长度: {len(interpretations['jungian']['content'])} 字")
        print(f"     认知心理学式解析长度: {len(interpretations['cognitive']['content'])} 字")
    
    return all_passed


def test_like_system():
    print("\n🧪 测试5: 点赞系统 / Test 5: Like System")
    print("-" * 60)
    
    init_data_dir()
    
    dream_text = "测试梦境：我在飞翔"
    dream_id = generate_dream_id(dream_text)
    
    likes_data = load_likes()
    
    if dream_id in likes_data:
        del likes_data[dream_id]
        save_likes(likes_data)
    
    likes_data = record_like(dream_id, 'freudian', likes_data)
    likes_data = record_like(dream_id, 'freudian', likes_data)
    likes_data = record_like(dream_id, 'jungian', likes_data)
    save_likes(likes_data)
    
    likes_data = load_likes()
    
    passed = (
        dream_id in likes_data and
        likes_data[dream_id]['freudian'] == 2 and
        likes_data[dream_id]['jungian'] == 1 and
        likes_data[dream_id]['cognitive'] == 0
    )
    
    status = "✅ 通过 / PASSED" if passed else "❌ 失败 / FAILED"
    print(f"  {status}")
    if passed:
        print(f"  Dream ID: {dream_id}")
        print(f"  弗洛伊德式点赞数: {likes_data[dream_id]['freudian']}")
        print(f"  荣格式点赞数: {likes_data[dream_id]['jungian']}")
        print(f"  认知心理学式点赞数: {likes_data[dream_id]['cognitive']}")
    else:
        print(f"  期望: freudian=2, jungian=1, cognitive=0")
        print(f"  实际: {likes_data.get(dream_id, {})}")
    
    if dream_id in likes_data:
        del likes_data[dream_id]
        save_likes(likes_data)
    
    return passed


def test_sorting():
    print("\n🧪 测试6: 解析排序 / Test 6: Interpretation Sorting")
    print("-" * 60)
    
    interpretations = {
        'freudian': {'name': '弗洛伊德式', 'content': '...', 'likes': 5},
        'jungian': {'name': '荣格式', 'content': '...', 'likes': 10},
        'cognitive': {'name': '认知心理学式', 'content': '...', 'likes': 3},
    }
    
    sorted_interpretations = sort_interpretations(interpretations)
    keys = list(sorted_interpretations.keys())
    
    passed = keys == ['jungian', 'freudian', 'cognitive']
    status = "✅ 通过 / PASSED" if passed else "❌ 失败 / FAILED"
    print(f"  {status}")
    print(f"  点赞数: jungian=10, freudian=5, cognitive=3")
    print(f"  排序后顺序: {keys}")
    print(f"  期望顺序: ['jungian', 'freudian', 'cognitive']")
    
    return passed


def test_json_export():
    print("\n🧪 测试7: JSON导出 / Test 7: JSON Export")
    print("-" * 60)
    
    dream_text = "测试JSON导出梦境"
    elements = extract_elements(dream_text)
    interpretations = generate_interpretations(elements, dream_text)
    haiku_zh = generate_haiku(elements, 'zh')
    haiku_en = generate_haiku(elements, 'en')
    
    result = {
        'id': generate_dream_id(dream_text),
        'timestamp': '2024-01-01T00:00:00',
        'dream_text': dream_text,
        'language': 'zh',
        'elements': elements,
        'haiku': {
            'chinese': haiku_zh,
            'english': haiku_en,
        },
        'interpretations': interpretations,
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        temp_path = f.name
    
    try:
        with open(temp_path, 'r', encoding='utf-8') as f:
            loaded = json.load(f)
        
        passed = (
            loaded['id'] == result['id'] and
            loaded['dream_text'] == result['dream_text'] and
            'elements' in loaded and
            'haiku' in loaded and
            'interpretations' in loaded
        )
        
        status = "✅ 通过 / PASSED" if passed else "❌ 失败 / FAILED"
        print(f"  {status}")
        print(f"  临时文件: {temp_path}")
        print(f"  数据完整性: {'完整' if passed else '不完整'}")
    finally:
        os.unlink(temp_path)
    
    return passed


def main():
    print("=" * 60)
    print("🧪 AI 梦境解析器 测试套件 / AI Dream Analyzer Test Suite")
    print("=" * 60)
    
    tests = [
        test_extract_elements,
        test_language_detection,
        test_haiku_generation,
        test_interpretation_generation,
        test_like_system,
        test_sorting,
        test_json_export,
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"\n❌ 测试异常 / Test Exception: {e}")
            import traceback
            traceback.print_exc()
            results.append(False)
    
    print("\n" + "=" * 60)
    print("📊 测试结果汇总 / Test Results Summary")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    print(f"\n通过 / Passed: {passed}/{total}")
    print(f"失败 / Failed: {total - passed}/{total}")
    
    if passed == total:
        print("\n🎉 所有测试通过！/ All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} 个测试失败 / {total - passed} tests failed")
        return 1


if __name__ == '__main__':
    sys.exit(main())

import sys
from utils.validator import generate_html_report

validation_result = {
    'key_validation': {
        'base_language': 'en',
        'missing_keys': {
            'zh-CN': ['buttons.save']
        },
        'extra_keys': {
            'zh-CN': ['extra_key']
        },
        'key_summary': {
            'zh-CN': {
                'total_keys': 5,
                'missing_count': 1,
                'extra_count': 1
            }
        }
    },
    'content_validation': {
        'html_errors': {'en': [], 'zh-CN': []},
        'placeholder_errors': {'en': [], 'zh-CN': []},
        'regex_errors': {'en': [], 'zh-CN': []}
    },
    'languages': ['en', 'zh-CN'],
    'total_files': 2
}

suggestions = {
    'zh-CN': {
        'missing_keys_to_add': [
            {'key': 'buttons.save', 'value': 'Save', 'suggested_value': '[TODO: TRANSLATE] Save'}
        ],
        'extra_keys_to_remove': ['extra_key']
    }
}

try:
    print("测试HTML报告生成...")
    html = generate_html_report(validation_result, suggestions)
    print(f"成功生成HTML，长度: {len(html)}")
    print(f"前500字符:\n{html[:500]}")
except Exception as e:
    print(f"错误: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

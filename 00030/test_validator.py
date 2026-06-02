import json
from utils.validator import I18nValidator, generate_markdown_report, generate_html_report

en_data = {
    "greeting": "Hello {name}!",
    "welcome": "Welcome to our application",
    "buttons": {
        "submit": "Submit",
        "cancel": "Cancel",
        "save": "Save"
    },
    "messages": {
        "success": "Operation completed successfully"
    }
}

zh_data = {
    "greeting": "你好 {name}！",
    "welcome": "欢迎使用我们的应用",
    "buttons": {
        "submit": "提交",
        "cancel": "取消"
    },
    "extra_key": "这是多余的"
}

language_files = {
    "en": en_data,
    "zh-CN": zh_data
}

config = {
    "allowed_missing_keys": ["buttons.save"],
    "regex_rules": {
        "greeting": ".*Hello.*"
    }
}

validator = I18nValidator(base_language="en", config=config)
result = validator.validate(language_files)
suggestions = validator.generate_fix_suggestions(language_files, result)

print("=== 键一致性校验结果 ===")
print(json.dumps(result["key_validation"], indent=2, ensure_ascii=False))
print()

print("=== 内容格式校验结果 ===")
print(json.dumps(result["content_validation"], indent=2, ensure_ascii=False))
print()

print("=== 自动修复建议 ===")
print(json.dumps(suggestions, indent=2, ensure_ascii=False))
print()

print("=== Markdown 报告预览 ===")
md_report = generate_markdown_report(result, suggestions)
print(md_report[:500] + "...")
print()

print("✅ 校验器核心功能测试通过！")

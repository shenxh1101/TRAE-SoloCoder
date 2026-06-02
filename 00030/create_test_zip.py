import json
import zipfile
import os

test_files_dir = "test_files"
output_zip = "test_files/i18n_test_files.zip"

en_data = {
    "greeting": "Hello {name}!",
    "welcome": "Welcome to our application",
    "buttons": {
        "submit": "Submit",
        "cancel": "Cancel",
        "save": "Save"
    },
    "messages": {
        "success": "Operation completed successfully",
        "error": "An error occurred",
        "loading": "Loading..."
    },
    "html_content": "<strong>Important</strong> message",
    "email": "contact@example.com",
    "homepage_url": "https://example.com"
}

zh_data = {
    "greeting": "你好 {name}！",
    "welcome": "欢迎使用我们的应用",
    "buttons": {
        "submit": "提交",
        "cancel": "取消"
    },
    "messages": {
        "success": "操作成功完成",
        "error": "发生错误",
        "loading": "加载中..."
    },
    "html_content": "<strong>重要</strong> 消息",
    "extra_key": "这是一个多余的键",
    "homepage_url": "not-a-url"
}

ja_data = {
    "greeting": "こんにちは {wrong_var}！",
    "welcome": "アプリケーションへようこそ",
    "buttons": {
        "submit": "送信",
        "cancel": "キャンセル",
        "save": "保存"
    },
    "messages": {
        "success": "操作が正常に完了しました",
        "error": "エラーが発生しました"
    },
    "broken_html": "<div>未闭合的标签"
}

os.makedirs(test_files_dir, exist_ok=True)

with open(os.path.join(test_files_dir, "en.json"), "w", encoding="utf-8") as f:
    json.dump(en_data, f, ensure_ascii=False, indent=2)

with open(os.path.join(test_files_dir, "zh-CN.json"), "w", encoding="utf-8") as f:
    json.dump(zh_data, f, ensure_ascii=False, indent=2)

with open(os.path.join(test_files_dir, "ja.json"), "w", encoding="utf-8") as f:
    json.dump(ja_data, f, ensure_ascii=False, indent=2)

with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(test_files_dir, "en.json"), "en.json")
    zf.write(os.path.join(test_files_dir, "zh-CN.json"), "zh-CN.json")
    zf.write(os.path.join(test_files_dir, "ja.json"), "ja.json")

print(f"✅ ZIP测试包已创建: {output_zip}")
print(f"包含文件: en.json, zh-CN.json, ja.json")

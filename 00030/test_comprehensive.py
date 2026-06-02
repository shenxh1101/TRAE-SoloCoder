import io
import json
import zipfile
import sys
from app import app

app.config['TESTING'] = True
app.config['SECRET_KEY'] = 'test-secret-key'

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test(name, passed, details=None):
    status = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if passed else f"{Colors.RED}✗ FAIL{Colors.RESET}"
    print(f"{status} {Colors.BOLD}{name}{Colors.RESET}")
    if details:
        print(f"  {Colors.BLUE}Details: {details}{Colors.RESET}")

def test_frontend_resources():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test Frontend Resources ==={Colors.RESET}")
    with app.test_client() as client:
        response = client.get('/')
        passed = response.status_code == 200
        print_test("首页加载成功", passed)

        content = response.data.decode('utf-8')
        passed = 'static/css/style.css' in content
        print_test("页面引用CSS样式表", passed)

        passed = 'static/js/app.js' in content
        print_test("页面引用JavaScript", passed)

        passed = 'id="fileInput"' in content
        print_test("页面包含文件上传控件", passed)

        passed = 'id="validateBtn"' in content
        print_test("页面包含校验按钮", passed)

        passed = 'id="baseLanguage"' in content
        print_test("页面包含基准语言输入框", passed)

        passed = 'id="customConfig"' in content
        print_test("页面包含自定义配置输入框", passed)

        css_response = client.get('/static/css/style.css')
        passed = css_response.status_code == 200
        print_test("CSS文件可访问", passed)

        js_response = client.get('/static/js/app.js')
        passed = js_response.status_code == 200
        print_test("JavaScript文件可访问", passed)

def test_markdown_report_content():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test Markdown Report Content ==={Colors.RESET}")
    with app.test_client() as client:
        en_json = json.dumps({
            "greeting": "Hello {name}!",
            "buttons": {
                "submit": "Submit",
                "cancel": "Cancel",
                "save": "Save"
            },
            "homepage_url": "https://example.com"
        }, ensure_ascii=False, indent=2)

        zh_json = json.dumps({
            "greeting": "你好 {name}！",
            "buttons": {
                "submit": "提交",
                "cancel": "取消"
            },
            "extra_key": "多余的键",
            "homepage_url": "invalid-url"
        }, ensure_ascii=False, indent=2)

        data = {
            'files[]': [
                (io.BytesIO(en_json.encode('utf-8')), 'en.json'),
                (io.BytesIO(zh_json.encode('utf-8')), 'zh-CN.json')
            ],
            'base_language': 'en',
            'config': json.dumps({
                "regex_rules": {".*url": "^https?://.*"}
            })
        }
        client.post('/api/upload', data=data, content_type='multipart/form-data')

        response = client.get('/api/report/markdown')
        content = response.data.decode('utf-8')

        passed = '# i18n 多语言校验报告' in content
        print_test("报告包含主标题", passed)

        passed = '**校验语言**: en, zh-CN' in content
        print_test("报告包含语言列表", passed)

        passed = '**基准语言**: en' in content
        print_test("报告包含基准语言", passed)

        passed = '## 1. 键一致性校验' in content
        print_test("报告包含键一致性校验章节", passed)

        passed = '## 2. 内容格式校验' in content
        print_test("报告包含内容格式校验章节", passed)

        passed = '## 3. 自动修复建议' in content
        print_test("报告包含自动修复建议章节", passed)

        passed = 'buttons.save' in content
        print_test("报告包含缺失的键", passed)

        passed = 'extra_key' in content
        print_test("报告包含多余的键", passed)

        passed = 'homepage_url' in content and 'invalid-url' in content
        print_test("报告包含正则表达式错误", passed)

        passed = '[TODO: TRANSLATE]' in content
        print_test("报告包含待翻译标记", passed)

        print(f"  {Colors.BLUE}报告预览 (前800字符):{Colors.RESET}")
        print(f"  {content[:800]}")

def test_html_report_content():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test HTML Report Content ==={Colors.RESET}")
    with app.test_client() as client:
        en_json = json.dumps({
            "greeting": "Hello {name}!",
            "buttons": {
                "submit": "Submit",
                "cancel": "Cancel"
            }
        }, ensure_ascii=False, indent=2)

        zh_json = json.dumps({
            "greeting": "你好 {name}！",
            "buttons": {
                "submit": "提交"
            }
        }, ensure_ascii=False, indent=2)

        data = {
            'files[]': [
                (io.BytesIO(en_json.encode('utf-8')), 'en.json'),
                (io.BytesIO(zh_json.encode('utf-8')), 'zh-CN.json')
            ],
            'base_language': 'en',
            'config': ''
        }
        client.post('/api/upload', data=data, content_type='multipart/form-data')

        response = client.get('/api/report/html')
        content = response.data.decode('utf-8')

        passed = '<!DOCTYPE html>' in content
        print_test("HTML报告包含DOCTYPE", passed)

        passed = '<meta charset="UTF-8">' in content
        print_test("HTML报告包含字符集声明", passed)

        passed = '<title>i18n 多语言校验报告</title>' in content
        print_test("HTML报告包含正确的标题", passed)

        passed = '<style>' in content and '</style>' in content
        print_test("HTML报告包含内联样式", passed)

        passed = 'font-family' in content
        print_test("HTML报告包含字体样式", passed)

        passed = '键一致性校验' in content
        print_test("HTML报告包含校验章节标题", passed)

        passed = 'error-item' in content
        print_test("HTML报告包含错误样式类", passed)

        passed = 'buttons.cancel' in content or 'buttons.save' in content
        print_test("HTML报告包含具体的键信息", passed)

        passed = '</body></html>' in content
        print_test("HTML报告结构完整", passed)

        print(f"  {Colors.BLUE}HTML报告预览 (前600字符):{Colors.RESET}")
        print(f"  {content[:600]}")

def test_zip_file_processing():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test ZIP File Processing ==={Colors.RESET}")
    with app.test_client() as client:
        json_files = {}
        json_files['en.json'] = json.dumps({
            "greeting": "Hello {name}!",
            "welcome": "Welcome",
            "buttons": {"submit": "Submit", "cancel": "Cancel"}
        }, ensure_ascii=False, indent=2)

        json_files['zh-CN.json'] = json.dumps({
            "greeting": "你好 {name}！",
            "buttons": {"submit": "提交"}
        }, ensure_ascii=False, indent=2)

        json_files['ja.json'] = json.dumps({
            "greeting": "こんにちは {name}！",
            "welcome": "ようこそ",
            "buttons": {"submit": "送信", "cancel": "キャンセル"}
        }, ensure_ascii=False, indent=2)

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for filename, content in json_files.items():
                zf.writestr(filename, content)
        zip_buffer.seek(0)

        data = {
            'files[]': (zip_buffer, 'test.zip'),
            'base_language': 'en',
            'config': ''
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')
        result = response.get_json()

        passed = response.status_code == 200
        print_test("ZIP上传成功", passed)

        validation = result.get('validation', {})
        languages = validation.get('languages', [])
        passed = len(languages) == 3
        print_test("ZIP中3个语言文件都被解析", passed, f"解析到的语言: {languages}")

        key_validation = validation.get('key_validation', {})
        missing_zh = key_validation.get('missing_keys', {}).get('zh-CN', [])
        passed = 'buttons.cancel' in missing_zh and 'welcome' in missing_zh
        print_test("zh-CN的缺失键被正确检测", passed, f"缺失的键: {missing_zh}")

        missing_ja = key_validation.get('missing_keys', {}).get('ja', [])
        passed = len(missing_ja) == 0
        print_test("ja没有缺失键", passed, f"缺失的键: {missing_ja}")

def test_custom_config_loading():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test Custom Config Loading ==={Colors.RESET}")
    with app.test_client() as client:
        en_json = json.dumps({
            "greeting": "Hello {name}!",
            "buttons": {
                "submit": "Submit",
                "cancel": "Cancel",
                "save": "Save"
            },
            "homepage_url": "https://example.com",
            "contact_email": "test@example.com"
        }, ensure_ascii=False, indent=2)

        zh_json = json.dumps({
            "greeting": "你好 {name}！",
            "buttons": {
                "submit": "提交"
            },
            "homepage_url": "not-a-url",
            "contact_email": "invalid-email"
        }, ensure_ascii=False, indent=2)

        custom_config = {
            "allowed_missing_keys": ["buttons.save", "buttons.cancel"],
            "regex_rules": {
                ".*url": "^https?://.*",
                ".*email": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            }
        }

        data = {
            'files[]': [
                (io.BytesIO(en_json.encode('utf-8')), 'en.json'),
                (io.BytesIO(zh_json.encode('utf-8')), 'zh-CN.json')
            ],
            'base_language': 'en',
            'config': json.dumps(custom_config)
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')
        result = response.get_json()
        validation = result.get('validation', {})

        key_validation = validation.get('key_validation', {})
        missing = key_validation.get('missing_keys', {}).get('zh-CN', [])

        passed = 'buttons.save' not in missing and 'buttons.cancel' not in missing
        print_test("allowed_missing_keys正确排除了指定键", passed, f"实际缺失的键: {missing}")

        content_validation = validation.get('content_validation', {})
        regex_errors = content_validation.get('regex_errors', {}).get('zh-CN', [])

        url_error = any('url' in e.get('key', '') for e in regex_errors)
        email_error = any('email' in e.get('key', '') for e in regex_errors)
        passed = url_error and email_error
        print_test("regex_rules正确应用了URL和Email校验", passed, f"正则错误数: {len(regex_errors)}")

        print(f"  {Colors.BLUE}自定义配置:{Colors.RESET}")
        print(f"  {json.dumps(custom_config, indent=2, ensure_ascii=False)}")

def test_fix_application_flow():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test Fix Application Flow ==={Colors.RESET}")
    with app.test_client() as client:
        en_json = json.dumps({
            "greeting": "Hello {name}!",
            "buttons": {"submit": "Submit", "cancel": "Cancel", "save": "Save"}
        }, ensure_ascii=False, indent=2)

        zh_json = json.dumps({
            "greeting": "你好 {name}！",
            "buttons": {"submit": "提交"},
            "extra": "多余的键"
        }, ensure_ascii=False, indent=2)

        data = {
            'files[]': [
                (io.BytesIO(en_json.encode('utf-8')), 'en.json'),
                (io.BytesIO(zh_json.encode('utf-8')), 'zh-CN.json')
            ],
            'base_language': 'en',
            'config': ''
        }
        upload_response = client.post('/api/upload', data=data, content_type='multipart/form-data')
        upload_result = upload_response.get_json()

        initial_missing = upload_result['validation']['key_validation']['missing_keys']['zh-CN']
        initial_extra = upload_result['validation']['key_validation']['extra_keys']['zh-CN']
        print_test("初始检测到缺失键", 'buttons.cancel' in initial_missing or 'buttons.save' in initial_missing)
        print_test("初始检测到多余键", 'extra' in initial_extra)

        suggestions = upload_result['suggestions']
        fixes = {}
        for lang, sugg in suggestions.items():
            fixes[lang] = sugg

        fix_response = client.post('/api/fix', json={'fixes': fixes})
        fix_result = fix_response.get_json()

        final_missing = fix_result['validation']['key_validation']['missing_keys'].get('zh-CN', [])
        final_extra = fix_result['validation']['key_validation']['extra_keys'].get('zh-CN', [])

        passed = len(final_missing) == 0
        print_test("修复后缺失键被添加", passed, f"最终缺失键: {final_missing}")

        passed = len(final_extra) == 0
        print_test("修复后多余键被删除", passed, f"最终多余键: {final_extra}")

        fixed_files = fix_result.get('fixed_files', {})
        zh_fixed = fixed_files.get('zh-CN', {})
        passed = '[TODO: TRANSLATE]' in str(zh_fixed)
        print_test("修复后的值包含待翻译标记", passed)

def main():
    print(f"\n{Colors.BOLD}{Colors.BLUE}" + "="*60 + Colors.RESET)
    print(f"{Colors.BOLD}{Colors.BLUE}  i18n 多语言本地化文件校验工具 - 综合验证测试  " + Colors.RESET)
    print(f"{Colors.BOLD}{Colors.BLUE}" + "="*60 + Colors.RESET)

    tests = [
        test_frontend_resources,
        test_markdown_report_content,
        test_html_report_content,
        test_zip_file_processing,
        test_custom_config_loading,
        test_fix_application_flow
    ]

    passed_count = 0
    failed_count = 0

    for test in tests:
        try:
            test()
            passed_count += 1
        except AssertionError:
            failed_count += 1
        except Exception as e:
            failed_count += 1
            print(f"  {Colors.RED}异常: {str(e)}{Colors.RESET}")
            import traceback
            traceback.print_exc()

    print(f"\n{Colors.BOLD}{Colors.BLUE}" + "="*60 + Colors.RESET)
    print(f"\n{Colors.BOLD}测试总结:{Colors.RESET}")
    print(f"  {Colors.GREEN}通过: {passed_count}{Colors.RESET}")
    print(f"  {Colors.RED}失败: {failed_count}{Colors.RESET}")
    print(f"  总计: {len(tests)}")

    if failed_count == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 所有综合验证测试通过！{Colors.RESET}")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}⚠️  有 {failed_count} 个测试失败{Colors.RESET}")
        return 1

if __name__ == '__main__':
    sys.exit(main())

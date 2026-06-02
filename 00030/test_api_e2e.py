import os
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

def create_test_json_files():
    files = {}
    files['en.json'] = json.dumps({
        "greeting": "Hello {name}!",
        "welcome": "Welcome to our application",
        "buttons": {
            "submit": "Submit",
            "cancel": "Cancel",
            "save": "Save"
        },
        "messages": {
            "success": "Operation completed successfully",
            "error": "An error occurred"
        },
        "html_content": "<strong>Important</strong> message",
        "email": "contact@example.com",
        "homepage_url": "https://example.com"
    }, ensure_ascii=False, indent=2)

    files['zh-CN.json'] = json.dumps({
        "greeting": "你好 {name}！",
        "welcome": "欢迎使用我们的应用",
        "buttons": {
            "submit": "提交",
            "cancel": "取消"
        },
        "messages": {
            "success": "操作成功完成"
        },
        "html_content": "<strong>重要</strong> 消息",
        "extra_key": "这是一个多余的键",
        "homepage_url": "not-a-url"
    }, ensure_ascii=False, indent=2)

    files['ja.json'] = json.dumps({
        "greeting": "こんにちは {wrong_var}！",
        "welcome": "アプリケーションへようこそ",
        "buttons": {
            "submit": "送信",
            "cancel": "キャンセル",
            "save": "保存"
        },
        "messages": {
            "success": "操作が正常に完了しました"
        },
        "broken_html": "<div>未闭合的标签"
    }, ensure_ascii=False, indent=2)

    return files

def create_zip_file(json_files):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for filename, content in json_files.items():
            zf.writestr(filename, content)
    zip_buffer.seek(0)
    return zip_buffer

def test_1_homepage():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 1: 首页访问 ==={Colors.RESET}")
    with app.test_client() as client:
        response = client.get('/')
        passed = response.status_code == 200
        print_test("首页状态码200", passed)
        passed = b'i18n' in response.data.lower()
        print_test("页面包含i18n内容", passed)

def test_2_upload_single_json():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 2: 单个JSON文件上传 ==={Colors.RESET}")
    with app.test_client() as client:
        json_files = create_test_json_files()

        data = {
            'files[]': (io.BytesIO(json_files['en.json'].encode('utf-8')), 'en.json'),
            'base_language': 'en',
            'config': ''
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')

        passed = response.status_code == 200
        print_test("上传成功返回200", passed)

        data = response.get_json()
        passed = data.get('success') == True
        print_test("响应包含success字段", passed)

def test_3_upload_multiple_jsons():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 3: 多个JSON文件上传与校验 ==={Colors.RESET}")
    with app.test_client() as client:
        json_files = create_test_json_files()

        data = {
            'files[]': [
                (io.BytesIO(json_files['en.json'].encode('utf-8')), 'en.json'),
                (io.BytesIO(json_files['zh-CN.json'].encode('utf-8')), 'zh-CN.json'),
                (io.BytesIO(json_files['ja.json'].encode('utf-8')), 'ja.json')
            ],
            'base_language': 'en',
            'config': ''
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')

        passed = response.status_code == 200
        print_test("多文件上传成功", passed)

        result = response.get_json()
        validation = result.get('validation', {})

        key_validation = validation.get('key_validation', {})
        passed = key_validation.get('base_language') == 'en'
        print_test("基准语言设置正确", passed)

        missing_keys = key_validation.get('missing_keys', {})
        zh_missing = missing_keys.get('zh-CN', [])
        passed = 'buttons.save' in zh_missing or 'messages.error' in zh_missing or 'email' in zh_missing
        print_test("zh-CN检测到缺失键", passed, f"缺失的键: {zh_missing}")

        extra_keys = key_validation.get('extra_keys', {})
        zh_extra = extra_keys.get('zh-CN', [])
        passed = 'extra_key' in zh_extra
        print_test("zh-CN检测到多余键", passed, f"多余的键: {zh_extra}")

        content_validation = validation.get('content_validation', {})
        placeholder_errors = content_validation.get('placeholder_errors', {})
        ja_placeholder_errors = placeholder_errors.get('ja', [])
        passed = len(ja_placeholder_errors) > 0
        print_test("ja检测到占位符错误", passed, f"错误数: {len(ja_placeholder_errors)}")

        html_errors = content_validation.get('html_errors', {})
        ja_html_errors = html_errors.get('ja', [])
        passed = len(ja_html_errors) > 0
        print_test("ja检测到HTML标签错误", passed, f"错误数: {len(ja_html_errors)}")

        suggestions = result.get('suggestions', {})
        passed = 'zh-CN' in suggestions
        print_test("生成修复建议", passed)

        return result

def test_4_zip_upload():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 4: ZIP批量文件上传 ==={Colors.RESET}")
    with app.test_client() as client:
        json_files = create_test_json_files()
        zip_content = create_zip_file(json_files)

        data = {
            'files[]': (zip_content, 'i18n_files.zip'),
            'base_language': 'en',
            'config': ''
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')

        passed = response.status_code == 200
        print_test("ZIP上传成功", passed)

        result = response.get_json()
        validation = result.get('validation', {})
        passed = len(validation.get('languages', [])) >= 2
        print_test("ZIP中至少2种语言被解析", passed, f"解析到的语言: {validation.get('languages', [])}")

        key_validation = validation.get('key_validation', {})
        missing_keys = key_validation.get('missing_keys', {})
        passed = 'zh-CN' in missing_keys or 'ja' in missing_keys
        print_test("ZIP中的文件键一致性校验生效", passed)

        return result

def test_5_custom_validation_rules():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 5: 自定义校验规则 ==={Colors.RESET}")
    with app.test_client() as client:
        json_files = create_test_json_files()

        custom_config = {
            "allowed_missing_keys": ["buttons.save", "messages.error"],
            "regex_rules": {
                ".*url": "^https?://.*",
                "email": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            }
        }

        data = {
            'files[]': [
                (io.BytesIO(json_files['en.json'].encode('utf-8')), 'en.json'),
                (io.BytesIO(json_files['zh-CN.json'].encode('utf-8')), 'zh-CN.json')
            ],
            'base_language': 'en',
            'config': json.dumps(custom_config)
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')

        passed = response.status_code == 200
        print_test("带自定义配置的上传成功", passed)

        result = response.get_json()
        validation = result.get('validation', {})
        key_validation = validation.get('key_validation', {})
        missing_keys = key_validation.get('missing_keys', {}).get('zh-CN', [])

        passed = 'buttons.save' not in missing_keys and 'messages.error' not in missing_keys
        print_test("allowed_missing_keys生效", passed, f"实际缺失的键: {missing_keys}")

        content_validation = validation.get('content_validation', {})
        regex_errors = content_validation.get('regex_errors', {}).get('zh-CN', [])
        url_errors = [e for e in regex_errors if 'url' in e.get('key', '')]
        passed = len(url_errors) > 0
        print_test("regex_rules生效（URL校验）", passed, f"URL错误数: {len(url_errors)}")

def test_6_invalid_config():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 6: 无效配置处理 ==={Colors.RESET}")
    with app.test_client() as client:
        json_files = create_test_json_files()

        data = {
            'files[]': (io.BytesIO(json_files['en.json'].encode('utf-8')), 'en.json'),
            'base_language': 'en',
            'config': '{invalid json}'
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')

        passed = response.status_code == 400
        print_test("无效配置返回400", passed)

        result = response.get_json()
        passed = 'error' in result
        print_test("响应包含错误信息", passed, f"错误: {result.get('error', '')}")

def test_7_markdown_report():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 7: Markdown报告导出 ==={Colors.RESET}")
    with app.test_client() as client:
        json_files = create_test_json_files()
        data = {
            'files[]': [
                (io.BytesIO(json_files['en.json'].encode('utf-8')), 'en.json'),
                (io.BytesIO(json_files['zh-CN.json'].encode('utf-8')), 'zh-CN.json')
            ],
            'base_language': 'en',
            'config': ''
        }
        client.post('/api/upload', data=data, content_type='multipart/form-data')

        response = client.get('/api/report/markdown')
        passed = response.status_code == 200
        print_test("Markdown报告下载成功", passed)

        content = response.data.decode('utf-8')
        passed = '# i18n 多语言校验报告' in content
        print_test("报告包含标题", passed)

        passed = '基准语言' in content and '键一致性校验' in content
        print_test("报告包含校验章节", passed)

        passed = 'zh-CN' in content
        print_test("报告包含语言信息", passed)

        content_type = response.headers.get('Content-Type', '')
        passed = 'markdown' in content_type
        print_test("Content-Type正确", passed, f"Content-Type: {content_type}")

        disposition = response.headers.get('Content-Disposition', '')
        passed = '.md' in disposition
        print_test("文件扩展名正确", passed, f"Disposition: {disposition}")

def test_8_html_report():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 8: HTML报告导出 ==={Colors.RESET}")
    with app.test_client() as client:
        json_files = create_test_json_files()
        data = {
            'files[]': [
                (io.BytesIO(json_files['en.json'].encode('utf-8')), 'en.json'),
                (io.BytesIO(json_files['zh-CN.json'].encode('utf-8')), 'zh-CN.json')
            ],
            'base_language': 'en',
            'config': ''
        }
        client.post('/api/upload', data=data, content_type='multipart/form-data')

        response = client.get('/api/report/html')
        passed = response.status_code == 200
        print_test("HTML报告下载成功", passed)

        content = response.data.decode('utf-8')
        passed = '<!DOCTYPE html>' in content
        print_test("报告包含DOCTYPE", passed)

        passed = 'i18n 多语言校验报告' in content
        print_test("报告包含标题", passed)

        passed = '键一致性校验' in content and '内容格式校验' in content
        print_test("报告包含校验章节", passed)

        content_type = response.headers.get('Content-Type', '')
        passed = 'text/html' in content_type
        print_test("Content-Type正确", passed, f"Content-Type: {content_type}")

        disposition = response.headers.get('Content-Disposition', '')
        passed = '.html' in disposition
        print_test("文件扩展名正确", passed, f"Disposition: {disposition}")

def test_9_apply_fixes():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 9: 应用自动修复 ==={Colors.RESET}")
    with app.test_client() as client:
        json_files = create_test_json_files()
        data = {
            'files[]': [
                (io.BytesIO(json_files['en.json'].encode('utf-8')), 'en.json'),
                (io.BytesIO(json_files['zh-CN.json'].encode('utf-8')), 'zh-CN.json')
            ],
            'base_language': 'en',
            'config': ''
        }
        upload_response = client.post('/api/upload', data=data, content_type='multipart/form-data')
        upload_result = upload_response.get_json()
        suggestions = upload_result.get('suggestions', {})

        fixes = {}
        for lang, sugg in suggestions.items():
            fixes[lang] = {
                'missing_keys_to_add': sugg.get('missing_keys_to_add', [])[:1],
                'extra_keys_to_remove': sugg.get('extra_keys_to_remove', [])[:1]
            }

        fix_data = {'fixes': fixes}
        response = client.post('/api/fix', json=fix_data)

        passed = response.status_code == 200
        print_test("应用修复成功", passed)

        result = response.get_json()
        passed = result.get('success') == True
        print_test("修复成功标记", passed)

        new_validation = result.get('validation', {})
        new_missing = new_validation.get('key_validation', {}).get('missing_keys', {}).get('zh-CN', [])
        added_keys = [item['key'] for item in fixes['zh-CN']['missing_keys_to_add']]
        passed = not any(k in new_missing for k in added_keys)
        print_test("缺失键已添加", passed, f"添加的键: {added_keys}")

        new_extra = new_validation.get('key_validation', {}).get('extra_keys', {}).get('zh-CN', [])
        removed_keys = fixes['zh-CN']['extra_keys_to_remove']
        passed = not any(k in new_extra for k in removed_keys)
        print_test("多余键已删除", passed, f"删除的键: {removed_keys}")

def test_10_download_fixed_files():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 10: 下载修复后的文件 ==={Colors.RESET}")
    with app.test_client() as client:
        json_files = create_test_json_files()
        data = {
            'files[]': [
                (io.BytesIO(json_files['en.json'].encode('utf-8')), 'en.json'),
                (io.BytesIO(json_files['zh-CN.json'].encode('utf-8')), 'zh-CN.json')
            ],
            'base_language': 'en',
            'config': ''
        }
        client.post('/api/upload', data=data, content_type='multipart/form-data')

        response = client.get('/api/download-fixed')
        passed = response.status_code == 200
        print_test("下载修复文件成功", passed)

        content_type = response.headers.get('Content-Type', '')
        passed = 'zip' in content_type
        print_test("Content-Type是ZIP", passed, f"Content-Type: {content_type}")

        disposition = response.headers.get('Content-Disposition', '')
        passed = '.zip' in disposition
        print_test("文件扩展名正确", passed, f"Disposition: {disposition}")

        zip_content = io.BytesIO(response.data)
        with zipfile.ZipFile(zip_content, 'r') as zf:
            file_list = zf.namelist()
            passed = 'en.json' in file_list and 'zh-CN.json' in file_list
            print_test("ZIP包含语言文件", passed, f"文件列表: {file_list}")

            with zf.open('zh-CN.json') as f:
                content = json.loads(f.read().decode('utf-8'))
                passed = isinstance(content, dict)
                print_test("zh-CN.json是有效的JSON", passed)

def test_11_invalid_json_upload():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 11: 无效JSON文件处理 ==={Colors.RESET}")
    with app.test_client() as client:
        invalid_json = '{"key": "value", invalid}'
        data = {
            'files[]': (io.BytesIO(invalid_json.encode('utf-8')), 'invalid.json'),
            'base_language': 'en',
            'config': ''
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')

        passed = response.status_code == 400
        print_test("无效JSON返回400", passed)

def test_12_no_files_upload():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 12: 无文件上传处理 ==={Colors.RESET}")
    with app.test_client() as client:
        data = {
            'base_language': 'en',
            'config': ''
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')

        passed = response.status_code == 400
        print_test("无文件上传返回400", passed)

def test_13_report_without_validation():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 13: 未校验时请求报告 ==={Colors.RESET}")
    with app.test_client() as client:
        response = client.get('/api/report/markdown')
        passed = response.status_code == 400
        print_test("未校验时返回400", passed)

def test_14_preview_file():
    print(f"\n{Colors.YELLOW}{Colors.BOLD}=== Test 14: 预览文件内容 ==={Colors.RESET}")
    with app.test_client() as client:
        json_files = create_test_json_files()
        data = {
            'files[]': [
                (io.BytesIO(json_files['en.json'].encode('utf-8')), 'en.json'),
            ],
            'base_language': 'en',
            'config': ''
        }
        client.post('/api/upload', data=data, content_type='multipart/form-data')

        response = client.get('/api/preview/en')
        passed = response.status_code == 200
        print_test("预览en.json成功", passed)

        result = response.get_json()
        passed = result.get('lang') == 'en' and isinstance(result.get('data'), dict)
        print_test("预览数据正确", passed)

        response = client.get('/api/preview/nonexistent')
        passed = response.status_code == 404
        print_test("不存在的语言返回404", passed)

def main():
    print(f"\n{Colors.BOLD}{Colors.BLUE}" + "="*60 + Colors.RESET)
    print(f"{Colors.BOLD}{Colors.BLUE}  i18n 多语言本地化文件校验工具 - 端到端API测试  " + Colors.RESET)
    print(f"{Colors.BOLD}{Colors.BLUE}" + "="*60 + Colors.RESET)

    tests = [
        test_1_homepage,
        test_2_upload_single_json,
        test_3_upload_multiple_jsons,
        test_4_zip_upload,
        test_5_custom_validation_rules,
        test_6_invalid_config,
        test_7_markdown_report,
        test_8_html_report,
        test_9_apply_fixes,
        test_10_download_fixed_files,
        test_11_invalid_json_upload,
        test_12_no_files_upload,
        test_13_report_without_validation,
        test_14_preview_file
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

    print(f"\n{Colors.BOLD}{Colors.BLUE}" + "="*60 + Colors.RESET)
    print(f"\n{Colors.BOLD}测试总结:{Colors.RESET}")
    print(f"  {Colors.GREEN}通过: {passed_count}{Colors.RESET}")
    print(f"  {Colors.RED}失败: {failed_count}{Colors.RESET}")
    print(f"  总计: {len(tests)}")

    if failed_count == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 所有测试通过！{Colors.RESET}")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}⚠️  有 {failed_count} 个测试失败{Colors.RESET}")
        return 1

if __name__ == '__main__':
    sys.exit(main())

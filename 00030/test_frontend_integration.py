import io
import json
import zipfile
import os
import re
import sys
from html.parser import HTMLParser
from app import app, DEFAULT_CONFIG

app.config['TESTING'] = True
app.config['SECRET_KEY'] = 'test-secret-key'


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


total_checks = 0
passed_checks = 0
failed_checks = 0


def check(name, condition, detail=None):
    global total_checks, passed_checks, failed_checks
    total_checks += 1
    if condition:
        passed_checks += 1
        status = f"{Colors.GREEN}✓ PASS{Colors.RESET}"
    else:
        failed_checks += 1
        status = f"{Colors.RED}✗ FAIL{Colors.RESET}"
    print(f"  {status} {Colors.BOLD}{name}{Colors.RESET}")
    if detail:
        print(f"    {Colors.BLUE}→ {detail}{Colors.RESET}")


class HTMLStructureParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.classes = []
        self.scripts = []
        self.stylesheets = []
        self.text_content = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if 'id' in attrs_dict:
            self.ids.append(attrs_dict['id'])
        if 'class' in attrs_dict:
            self.classes.extend(attrs_dict['class'].split())
        if tag == 'script' and 'src' in attrs_dict:
            self.scripts.append(attrs_dict['src'])
        if tag == 'link' and attrs_dict.get('rel') == 'stylesheet':
            self.stylesheets.append(attrs_dict.get('href', ''))

    def handle_data(self, data):
        text = data.strip()
        if text:
            self.text_content.append(text)


def parse_html(html_str):
    parser = HTMLStructureParser()
    parser.feed(html_str)
    return parser


def make_test_files():
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
            "error": "An error occurred",
            "loading": "Loading..."
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
            "success": "操作成功完成",
            "error": "发生错误",
            "loading": "加载中..."
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


def make_zip(json_files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for name, content in json_files.items():
            zf.writestr(name, content)
    buf.seek(0)
    return buf


# ============================================================
# Step 1: 用户打开首页
# ============================================================
def step1_open_homepage(client):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 1: 用户打开首页 ━━━{Colors.RESET}")
    resp = client.get('/')
    check("首页HTTP 200", resp.status_code == 200)

    html = resp.data.decode('utf-8')
    parsed = parse_html(html)

    check("页面包含标题 i18n",
          any('i18n' in t for t in parsed.text_content))

    check("存在文件上传区域 #dropZone",
          'dropZone' in parsed.ids)

    check("存在文件列表 #fileList",
          'fileList' in parsed.ids)

    check("存在校验按钮 #validateBtn",
          'validateBtn' in parsed.ids)

    check("存在基准语言输入 #baseLanguage",
          'baseLanguage' in parsed.ids)

    check("存在自定义配置输入 #customConfig",
          'customConfig' in parsed.ids)

    check("存在结果区域 #resultsSection",
          'resultsSection' in parsed.ids)

    check("存在修复区域 #fixSection",
          'fixSection' in parsed.ids)

    check("存在加载动画 #loading",
          'loading' in parsed.ids)

    check("存在错误消息 #errorMessage",
          'errorMessage' in parsed.ids)

    check("引用了CSS样式表",
          len(parsed.stylesheets) > 0,
          f"样式表: {parsed.stylesheets}")

    check("引用了JavaScript",
          len(parsed.scripts) > 0,
          f"脚本: {parsed.scripts}")

    check("CSS样式类 upload-area",
          'upload-area' in parsed.classes)

    check("CSS样式类 btn",
          'btn' in parsed.classes)

    check("CSS样式类 btn-primary",
          'btn-primary' in parsed.classes)

    check("CSS样式类 btn-secondary",
          'btn-secondary' in parsed.classes)

    check("CSS样式类 btn-success",
          'btn-success' in parsed.classes)

    check("页面包含 footer",
          'footer' in parsed.classes)

    check("结果区域默认隐藏",
          'display: none' in html and 'resultsSection' in html)

    return html


# ============================================================
# Step 2: 获取默认配置
# ============================================================
def step2_get_default_config(client):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 2: 获取默认配置 ━━━{Colors.RESET}")
    resp = client.get('/api/default-config')
    check("默认配置API返回200", resp.status_code == 200)

    data = resp.get_json()
    check("返回success=true", data.get('success') is True)

    config = data.get('config', {})
    check("配置中包含allowed_missing_keys",
          'allowed_missing_keys' in config,
          f"allowed_missing_keys: {config.get('allowed_missing_keys', [])}")

    check("配置中包含regex_rules",
          'regex_rules' in config,
          f"regex_rules keys: {list(config.get('regex_rules', {}).keys())}")

    check("allowed_missing_keys非空",
          len(config.get('allowed_missing_keys', [])) > 0)

    check("regex_rules非空",
          len(config.get('regex_rules', {})) > 0)

    check("DEFAULT_CONFIG与test_config.json一致",
          config == DEFAULT_CONFIG)

    return config


# ============================================================
# Step 3: 用户上传JSON文件
# ============================================================
def step3_upload_json_files(client, test_files, use_config=None):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 3: 用户上传多个JSON文件并点击校验 ━━━{Colors.RESET}")

    data = {
        'files[]': [
            (io.BytesIO(test_files['en.json'].encode('utf-8')), 'en.json'),
            (io.BytesIO(test_files['zh-CN.json'].encode('utf-8')), 'zh-CN.json'),
            (io.BytesIO(test_files['ja.json'].encode('utf-8')), 'ja.json')
        ],
        'base_language': 'en',
    }

    if use_config is not None:
        data['config'] = json.dumps(use_config)
    else:
        data['config'] = json.dumps({})

    resp = client.post('/api/upload', data=data, content_type='multipart/form-data')

    check("上传API返回200", resp.status_code == 200)

    result = resp.get_json()
    check("返回success=true", result.get('success') is True)

    validation = result.get('validation', {})
    check("返回validation对象", validation is not None)

    key_validation = validation.get('key_validation', {})
    check("基准语言为en",
          key_validation.get('base_language') == 'en')

    return result


# ============================================================
# Step 4: 验证键一致性差异结果
# ============================================================
def step4_verify_key_consistency(result):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 4: 验证键一致性差异结果 ━━━{Colors.RESET}")

    key_validation = result['validation']['key_validation']

    zh_missing = key_validation.get('missing_keys', {}).get('zh-CN', [])
    zh_extra = key_validation.get('extra_keys', {}).get('zh-CN', [])
    zh_summary = key_validation.get('key_summary', {}).get('zh-CN', {})

    check("zh-CN缺失键包含 email",
          'email' in zh_missing,
          f"缺失键: {zh_missing}")

    check("zh-CN缺失键包含 buttons.save",
          'buttons.save' in zh_missing)

    check("zh-CN多余键包含 extra_key",
          'extra_key' in zh_extra,
          f"多余键: {zh_extra}")

    check("zh-CN summary中missing_count > 0",
          zh_summary.get('missing_count', 0) > 0,
          f"missing_count: {zh_summary.get('missing_count')}")

    check("zh-CN summary中extra_count > 0",
          zh_summary.get('extra_count', 0) > 0,
          f"extra_count: {zh_summary.get('extra_count')}")

    ja_missing = key_validation.get('missing_keys', {}).get('ja', [])
    ja_extra = key_validation.get('extra_keys', {}).get('ja', [])

    check("ja缺失键包含 messages.error",
          'messages.error' in ja_missing,
          f"缺失键: {ja_missing}")

    check("ja多余键包含 broken_html",
          'broken_html' in ja_extra,
          f"多余键: {ja_extra}")


# ============================================================
# Step 5: 验证内容格式校验结果
# ============================================================
def step5_verify_content_validation(result):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 5: 验证内容格式校验结果 ━━━{Colors.RESET}")

    cv = result['validation']['content_validation']

    ja_html_errors = cv.get('html_errors', {}).get('ja', [])
    check("ja检测到HTML标签错误",
          len(ja_html_errors) > 0,
          f"错误数: {len(ja_html_errors)}")

    if ja_html_errors:
        first_err = ja_html_errors[0]
        check("HTML错误包含key字段",
              'key' in first_err)
        check("HTML错误包含errors字段",
              'errors' in first_err)
        check("HTML错误的key为broken_html",
              first_err.get('key') == 'broken_html',
              f"key: {first_err.get('key')}")

    ja_placeholder_errors = cv.get('placeholder_errors', {}).get('ja', [])
    check("ja检测到占位符错误",
          len(ja_placeholder_errors) > 0,
          f"错误数: {len(ja_placeholder_errors)}")

    if ja_placeholder_errors:
        first_err = ja_placeholder_errors[0]
        check("占位符错误包含key字段",
              'key' in first_err)
        check("占位符错误包含base_value和target_value",
              'base_value' in first_err and 'target_value' in first_err)
        check("占位符错误的key为greeting",
              first_err.get('key') == 'greeting',
              f"key: {first_err.get('key')}")


# ============================================================
# Step 6: 验证自动修复建议
# ============================================================
def step6_verify_fix_suggestions(result):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 6: 验证自动修复建议 ━━━{Colors.RESET}")

    suggestions = result.get('suggestions', {})

    check("生成了zh-CN的修复建议",
          'zh-CN' in suggestions)

    zh_sugg = suggestions.get('zh-CN', {})
    missing_to_add = zh_sugg.get('missing_keys_to_add', [])
    extra_to_remove = zh_sugg.get('extra_keys_to_remove', [])

    check("zh-CN有缺失键添加建议",
          len(missing_to_add) > 0,
          f"数量: {len(missing_to_add)}")

    check("zh-CN有多余键删除建议",
          len(extra_to_remove) > 0,
          f"数量: {len(extra_to_remove)}")

    if missing_to_add:
        first_item = missing_to_add[0]
        check("添加建议包含key",
              'key' in first_item)
        check("添加建议包含suggested_value",
              'suggested_value' in first_item)
        check("建议值包含[TODO: TRANSLATE]标记",
              '[TODO: TRANSLATE]' in first_item.get('suggested_value', ''),
              f"值: {first_item.get('suggested_value', '')}")

    return suggestions


# ============================================================
# Step 7: 模拟前端渲染校验结果（解析HTML内容）
# ============================================================
def step7_simulate_frontend_render(result):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 7: 模拟前端渲染校验结果HTML ━━━{Colors.RESET}")

    key_validation = result['validation']['key_validation']
    content_validation = result['validation']['content_validation']
    suggestions = result.get('suggestions', {})

    rendered_parts = []

    rendered_parts.append('<div class="result-card">')
    rendered_parts.append('<h3>📋 键一致性校验</h3>')
    for lang, summary in key_validation.get('key_summary', {}).items():
        rendered_parts.append(f'<div class="lang-result">')
        rendered_parts.append(f'<h4>🌐 {lang}</h4>')
        missing = key_validation.get('missing_keys', {}).get(lang, [])
        extra = key_validation.get('extra_keys', {}).get(lang, [])
        if missing:
            for key in missing:
                rendered_parts.append(f'<div class="key-item missing">❌ {key}</div>')
        if extra:
            for key in extra:
                rendered_parts.append(f'<div class="key-item extra">⚠️ {key}</div>')
        rendered_parts.append('</div>')
    rendered_parts.append('</div>')

    rendered_parts.append('<div class="result-card">')
    rendered_parts.append('<h3>🔍 内容格式校验</h3>')
    for lang in result['validation']['languages']:
        html_errors = content_validation.get('html_errors', {}).get(lang, [])
        placeholder_errors = content_validation.get('placeholder_errors', {}).get(lang, [])
        regex_errors = content_validation.get('regex_errors', {}).get(lang, [])
        if html_errors or placeholder_errors or regex_errors:
            rendered_parts.append(f'<div class="lang-result">')
            for err in html_errors:
                rendered_parts.append(f'<div class="error-detail">')
                rendered_parts.append(f'<div class="error-key">{err["key"]}</div>')
                rendered_parts.append('</div>')
            for err in placeholder_errors:
                rendered_parts.append(f'<div class="error-detail">')
                rendered_parts.append(f'<div class="error-key">{err["key"]}</div>')
                rendered_parts.append('</div>')
            for err in regex_errors:
                rendered_parts.append(f'<div class="error-detail">')
                rendered_parts.append(f'<div class="error-key">{err["key"]}</div>')
                rendered_parts.append('</div>')
            rendered_parts.append('</div>')
    rendered_parts.append('</div>')

    rendered_parts.append('<div class="fix-suggestion">')
    for lang, sugg in suggestions.items():
        rendered_parts.append(f'<h4>🌐 {lang}</h4>')
        for item in sugg.get('missing_keys_to_add', []):
            rendered_parts.append(
                f'<input type="checkbox" class="fix-checkbox" data-lang="{lang}" data-type="add" data-key="{item["key"]}">'
            )
        for key in sugg.get('extra_keys_to_remove', []):
            rendered_parts.append(
                f'<input type="checkbox" class="fix-checkbox" data-lang="{lang}" data-type="remove" data-key="{key}">'
            )
    rendered_parts.append('</div>')

    rendered_html = '\n'.join(rendered_parts)
    parsed = parse_html(rendered_html)

    check("渲染结果包含 result-card 样式类",
          'result-card' in parsed.classes)

    check("渲染结果包含 lang-result 样式类",
          'lang-result' in parsed.classes)

    check("渲染结果包含 key-item 样式类（缺失键高亮）",
          'key-item' in parsed.classes)

    check("渲染结果包含 missing 样式类",
          'missing' in parsed.classes)

    check("渲染结果包含 extra 样式类",
          'extra' in parsed.classes)

    check("渲染结果包含 error-detail 样式类",
          'error-detail' in parsed.classes)

    check("渲染结果包含 error-key 样式类",
          'error-key' in parsed.classes)

    check("渲染结果包含 fix-suggestion 样式类",
          'fix-suggestion' in parsed.classes)

    check("渲染结果包含 fix-checkbox 样式类",
          'fix-checkbox' in parsed.classes)

    check("渲染结果中存在缺失键标记 ❌",
          any('❌' in t for t in parsed.text_content))

    check("渲染结果中存在多余键标记 ⚠️",
          any('⚠️' in t for t in parsed.text_content))


# ============================================================
# Step 8: 应用自动修复
# ============================================================
def step8_apply_fixes(client, result):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 8: 用户点击应用自动修复 ━━━{Colors.RESET}")

    suggestions = result.get('suggestions', {})
    fixes = {}
    for lang, sugg in suggestions.items():
        fixes[lang] = {
            'missing_keys_to_add': sugg.get('missing_keys_to_add', []),
            'extra_keys_to_remove': sugg.get('extra_keys_to_remove', [])
        }

    resp = client.post('/api/fix', json={'fixes': fixes})
    check("修复API返回200", resp.status_code == 200)

    fix_result = resp.get_json()
    check("返回success=true", fix_result.get('success') is True)

    new_validation = fix_result.get('validation', {})
    new_key_val = new_validation.get('key_validation', {})

    zh_missing_after = new_key_val.get('missing_keys', {}).get('zh-CN', [])
    zh_extra_after = new_key_val.get('extra_keys', {}).get('zh-CN', [])

    check("修复后zh-CN缺失键为空",
          len(zh_missing_after) == 0,
          f"剩余缺失键: {zh_missing_after}")

    check("修复后zh-CN多余键为空",
          len(zh_extra_after) == 0,
          f"剩余多余键: {zh_extra_after}")

    ja_missing_after = new_key_val.get('missing_keys', {}).get('ja', [])
    ja_extra_after = new_key_val.get('extra_keys', {}).get('ja', [])

    check("修复后ja缺失键为空",
          len(ja_missing_after) == 0,
          f"剩余缺失键: {ja_missing_after}")

    check("修复后ja多余键为空",
          len(ja_extra_after) == 0,
          f"剩余多余键: {ja_extra_after}")

    fixed_files = fix_result.get('fixed_files', {})
    check("返回修复后的文件数据",
          fixed_files is not None and len(fixed_files) > 0)

    zh_fixed = fixed_files.get('zh-CN', {})
    check("修复后的zh-CN文件包含[TODO: TRANSLATE]",
          '[TODO: TRANSLATE]' in json.dumps(zh_fixed, ensure_ascii=False))

    return fix_result


# ============================================================
# Step 9: 导出Markdown报告
# ============================================================
def step9_export_markdown(client):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 9: 用户点击导出Markdown报告 ━━━{Colors.RESET}")

    resp = client.get('/api/report/markdown')
    check("Markdown报告返回200", resp.status_code == 200)

    content = resp.data.decode('utf-8')

    check("报告包含 # i18n 多语言校验报告",
          '# i18n 多语言校验报告' in content)

    check("报告包含 **校验语言**",
          '**校验语言**' in content)

    check("报告包含 **基准语言**",
          '**基准语言**' in content)

    check("报告包含 ## 1. 键一致性校验",
          '## 1. 键一致性校验' in content)

    check("报告包含 ## 2. 内容格式校验",
          '## 2. 内容格式校验' in content)

    check("报告包含语言 zh-CN",
          'zh-CN' in content)

    check("报告包含语言 ja",
          'ja' in content)

    check("Content-Type为text/markdown",
          'text/markdown' in resp.headers.get('Content-Type', ''))

    check("Content-Disposition包含.md",
          '.md' in resp.headers.get('Content-Disposition', ''))

    check("报告包含 ❌ 缺失标记",
          '❌' in content)

    check("报告包含 ⚠️ 多余标记",
          '⚠️' in content)


# ============================================================
# Step 10: 导出HTML报告并解析样式类
# ============================================================
def step10_export_html(client):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 10: 用户点击导出HTML报告 ━━━{Colors.RESET}")

    resp = client.get('/api/report/html')
    check("HTML报告返回200", resp.status_code == 200)

    content = resp.data.decode('utf-8')
    parsed = parse_html(content)

    check("HTML报告包含 DOCTYPE",
          '<!DOCTYPE html>' in content)

    check("HTML报告包含 title",
          any('i18n' in t for t in parsed.text_content))

    check("HTML报告包含 error-item 样式类",
          'error-item' in parsed.classes)

    check("HTML报告包含 warning-item 样式类",
          'warning-item' in parsed.classes)

    check("HTML报告包含 success-item 样式类",
          'success-item' in parsed.classes)

    check("HTML报告包含 lang-section 样式类",
          'lang-section' in parsed.classes)

    check("HTML报告包含 container 样式类",
          'container' in parsed.classes)

    check("HTML报告包含 key 样式类",
          'key' in parsed.classes)

    check("HTML报告包含 <style> 内联样式",
          '<style>' in content and '</style>' in content)

    check("CSS中包含 font-family",
          'font-family' in content)

    check("Content-Type为text/html",
          'text/html' in resp.headers.get('Content-Type', ''))

    check("Content-Disposition包含.html",
          '.html' in resp.headers.get('Content-Disposition', ''))


# ============================================================
# Step 11: 下载修复后的文件
# ============================================================
def step11_download_fixed(client):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 11: 用户下载修复后的文件 ━━━{Colors.RESET}")

    resp = client.get('/api/download-fixed')
    check("下载返回200", resp.status_code == 200)

    check("Content-Type为application/zip",
          'zip' in resp.headers.get('Content-Type', ''))

    zip_buf = io.BytesIO(resp.data)
    try:
        with zipfile.ZipFile(zip_buf, 'r') as zf:
            names = zf.namelist()
            check("ZIP包含en.json",
                  'en.json' in names,
                  f"文件列表: {names}")
            check("ZIP包含zh-CN.json",
                  'zh-CN.json' in names)
            check("ZIP包含ja.json",
                  'ja.json' in names)

            with zf.open('zh-CN.json') as f:
                zh_data = json.loads(f.read().decode('utf-8'))
                check("zh-CN.json是有效JSON",
                      isinstance(zh_data, dict))
                check("zh-CN.json包含修复后的键",
                      '[TODO: TRANSLATE]' in json.dumps(zh_data, ensure_ascii=False))
    except zipfile.BadZipFile:
        check("ZIP文件有效", False, "BadZipFile异常")


# ============================================================
# Step 12: 使用默认配置上传（验证test_config.json自动加载）
# ============================================================
def step12_upload_with_default_config(client, test_files):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 12: 使用默认配置上传（验证test_config.json自动加载） ━━━{Colors.RESET}")

    check("DEFAULT_CONFIG非空",
          len(DEFAULT_CONFIG) > 0,
          f"配置: {json.dumps(DEFAULT_CONFIG, ensure_ascii=False)}")

    check("DEFAULT_CONFIG包含allowed_missing_keys",
          'allowed_missing_keys' in DEFAULT_CONFIG)

    check("DEFAULT_CONFIG包含regex_rules",
          'regex_rules' in DEFAULT_CONFIG)

    data = {
        'files[]': [
            (io.BytesIO(test_files['en.json'].encode('utf-8')), 'en.json'),
            (io.BytesIO(test_files['zh-CN.json'].encode('utf-8')), 'zh-CN.json')
        ],
        'base_language': 'en',
    }

    resp = client.post('/api/upload', data=data, content_type='multipart/form-data')
    check("使用默认配置上传返回200",
          resp.status_code == 200)

    result = resp.get_json()
    validation = result.get('validation', {})

    missing = validation.get('key_validation', {}).get('missing_keys', {}).get('zh-CN', [])
    allowed = set(DEFAULT_CONFIG.get('allowed_missing_keys', []))

    allowed_missing_filtered = [k for k in missing if k in allowed]
    check("allowed_missing_keys中的键不出现在缺失列表中",
          len(allowed_missing_filtered) == 0,
          f"被过滤的键: {allowed_missing_filtered}, 实际缺失: {missing}")

    regex_errors = validation.get('content_validation', {}).get('regex_errors', {}).get('zh-CN', [])
    url_errors = [e for e in regex_errors if 'url' in e.get('key', '')]
    check("regex_rules检测到URL格式错误",
          len(url_errors) > 0,
          f"URL错误数: {len(url_errors)}")


# ============================================================
# Step 13: ZIP批量上传
# ============================================================
def step13_upload_zip(client, test_files):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 13: 用户上传ZIP批量文件 ━━━{Colors.RESET}")

    zip_buf = make_zip(test_files)
    data = {
        'files[]': (zip_buf, 'i18n_batch.zip'),
        'base_language': 'en',
        'config': json.dumps({})
    }
    resp = client.post('/api/upload', data=data, content_type='multipart/form-data')
    check("ZIP上传返回200", resp.status_code == 200)

    result = resp.get_json()
    langs = result.get('validation', {}).get('languages', [])
    check("ZIP中解析到3种语言",
          len(langs) == 3,
          f"解析到的语言: {langs}")

    check("ZIP中包含en",
          'en' in langs)
    check("ZIP中包含zh-CN",
          'zh-CN' in langs)
    check("ZIP中包含ja",
          'ja' in langs)


# ============================================================
# Step 14: 错误场景处理
# ============================================================
def step14_error_scenarios(client):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 14: 错误场景处理 ━━━{Colors.RESET}")

    resp = client.post('/api/upload', data={}, content_type='multipart/form-data')
    check("无文件上传返回400",
          resp.status_code == 400)

    invalid_json = io.BytesIO(b'{invalid json content}')
    data = {
        'files[]': (invalid_json, 'bad.json'),
        'base_language': 'en',
        'config': ''
    }
    resp = client.post('/api/upload', data=data, content_type='multipart/form-data')
    check("无效JSON返回400",
          resp.status_code == 400)

    data = {
        'files[]': (io.BytesIO(b'{"key": "val"}'), 'good.json'),
        'base_language': 'en',
        'config': '{bad config}'
    }
    resp = client.post('/api/upload', data=data, content_type='multipart/form-data')
    check("无效配置返回400",
          resp.status_code == 400)

    new_client = app.test_client()
    resp = new_client.get('/api/report/markdown')
    check("未上传时请求报告返回400",
          resp.status_code == 400)

    resp = new_client.get('/api/preview/nonexistent')
    check("预览不存在的语言返回404",
          resp.status_code == 404)


# ============================================================
# Step 15: 预览文件
# ============================================================
def step15_preview_file(client, test_files):
    print(f"\n{Colors.CYAN}{Colors.BOLD}━━━ Step 15: 预览文件内容 ━━━{Colors.RESET}")

    data = {
        'files[]': (io.BytesIO(test_files['en.json'].encode('utf-8')), 'en.json'),
        'base_language': 'en',
        'config': json.dumps({})
    }
    client.post('/api/upload', data=data, content_type='multipart/form-data')

    resp = client.get('/api/preview/en')
    check("预览en返回200", resp.status_code == 200)

    result = resp.get_json()
    check("预览返回lang=en",
          result.get('lang') == 'en')
    check("预览返回data字典",
          isinstance(result.get('data'), dict))
    check("预览数据包含greeting键",
          'greeting' in result.get('data', {}))


# ============================================================
# 主流程
# ============================================================
def main():
    print(f"\n{Colors.BOLD}{Colors.BLUE}" + "═" * 60 + Colors.RESET)
    print(f"{Colors.BOLD}{Colors.BLUE}  i18n 前端集成测试 — 模拟用户完整操作流程  " + Colors.RESET)
    print(f"{Colors.BOLD}{Colors.BLUE}" + "═" * 60 + Colors.RESET)

    test_files = make_test_files()

    with app.test_client() as client:
        step1_open_homepage(client)
        step2_get_default_config(client)
        result = step3_upload_json_files(client, test_files)
        step4_verify_key_consistency(result)
        step5_verify_content_validation(result)
        suggestions = step6_verify_fix_suggestions(result)
        step7_simulate_frontend_render(result)
        step9_export_markdown(client)
        step10_export_html(client)
        fix_result = step8_apply_fixes(client, result)
        step11_download_fixed(client)
        step12_upload_with_default_config(client, test_files)
        step13_upload_zip(client, test_files)
        step14_error_scenarios(client)
        step15_preview_file(client, test_files)

    print(f"\n{Colors.BOLD}{Colors.BLUE}" + "═" * 60 + Colors.RESET)
    print(f"\n{Colors.BOLD}测试总结:{Colors.RESET}")
    print(f"  {Colors.GREEN}通过: {passed_checks}{Colors.RESET}")
    print(f"  {Colors.RED}失败: {failed_checks}{Colors.RESET}")
    print(f"  总计: {total_checks}")

    if failed_checks == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 所有前端集成测试通过！{Colors.RESET}")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}⚠️  有 {failed_checks} 个检查失败{Colors.RESET}")
        return 1


if __name__ == '__main__':
    sys.exit(main())

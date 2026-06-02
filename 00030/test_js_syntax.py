import subprocess
import sys
import os

def check_js_syntax(js_file_path):
    print(f"检查JavaScript文件: {js_file_path}")

    try:
        with open(js_file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        node_check = subprocess.run(
            ['node', '--check', js_file_path],
            capture_output=True,
            text=True
        )

        if node_check.returncode == 0:
            print("  ✓ Node.js语法检查通过")
            return True
        else:
            print(f"  ✗ Node.js语法检查失败:")
            print(f"    {node_check.stderr}")
            return False

    except FileNotFoundError:
        print("  ⚠️  未安装Node.js，跳过Node.js语法检查")

        basic_checks = [
            ('function removeFile', 'removeFile函数存在'),
            ('addEventListener', '事件监听器存在'),
            ('fetch(', 'fetch API调用存在'),
            ('FormData', 'FormData使用存在'),
            ('document.getElementById', 'DOM操作存在'),
            ('displayResults', 'displayResults函数存在'),
            ('displayFixSuggestions', 'displayFixSuggestions函数存在'),
            ('escapeHtml', 'escapeHtml函数存在')
        ]

        all_passed = True
        for check_str, description in basic_checks:
            if check_str in content:
                print(f"  ✓ {description}")
            else:
                print(f"  ✗ {description}")
                all_passed = False

        balanced = check_balanced_braces(content)
        if balanced:
            print("  ✓ 括号平衡检查通过")
        else:
            print("  ✗ 括号平衡检查失败")
            all_passed = False

        return all_passed

def check_balanced_braces(code):
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    in_string = False
    string_char = None
    escape_next = False

    for char in code:
        if escape_next:
            escape_next = False
            continue

        if char == '\\':
            escape_next = True
            continue

        if char in ['"', "'", '`']:
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None
            continue

        if in_string:
            continue

        if char in '([{':
            stack.append(char)
        elif char in ')]}':
            if not stack:
                return False
            if stack[-1] != pairs[char]:
                return False
            stack.pop()

    return len(stack) == 0

def check_html_integrity(html_file_path):
    print(f"\n检查HTML文件: {html_file_path}")

    with open(html_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    checks = [
        ('<!DOCTYPE html>', 'DOCTYPE声明'),
        ('<html', 'HTML根标签'),
        ('<head>', 'Head标签'),
        ('<body>', 'Body标签'),
        ('<meta charset="UTF-8">', '字符集声明'),
        ('{{ url_for', 'Jinja2模板语法'),
        ('id="dropZone"', '拖拽上传区域'),
        ('id="fileList"', '文件列表'),
        ('id="resultsSection"', '结果区域'),
        ('id="fixSection"', '修复区域')
    ]

    all_passed = True
    for check_str, description in checks:
        if check_str in content:
            print(f"  ✓ {description}")
        else:
            print(f"  ✗ {description}")
            all_passed = False

    return all_passed

def check_css_integrity(css_file_path):
    print(f"\n检查CSS文件: {css_file_path}")

    with open(css_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    checks = [
        ('.container', '容器样式'),
        ('.upload-area', '上传区域样式'),
        ('.btn', '按钮样式'),
        ('.error-item', '错误项样式'),
        ('.success-item', '成功项样式'),
        ('.warning-item', '警告项样式'),
        ('@media', '响应式设计'),
        ('@keyframes spin', '加载动画')
    ]

    all_passed = True
    for check_str, description in checks:
        if check_str in content:
            print(f"  ✓ {description}")
        else:
            print(f"  ✗ {description}")
            all_passed = False

    return all_passed

def main():
    print("=" * 60)
    print("  前端资源完整性检查")
    print("=" * 60)

    base_dir = os.path.dirname(os.path.abspath(__file__))

    js_file = os.path.join(base_dir, 'static', 'js', 'app.js')
    html_file = os.path.join(base_dir, 'templates', 'index.html')
    css_file = os.path.join(base_dir, 'static', 'css', 'style.css')

    js_ok = check_js_syntax(js_file)
    html_ok = check_html_integrity(html_file)
    css_ok = check_css_integrity(css_file)

    print("\n" + "=" * 60)
    print("检查结果:")
    print(f"  JavaScript: {'✓ 通过' if js_ok else '✗ 失败'}")
    print(f"  HTML:       {'✓ 通过' if html_ok else '✗ 失败'}")
    print(f"  CSS:        {'✓ 通过' if css_ok else '✗ 失败'}")

    if js_ok and html_ok and css_ok:
        print("\n🎉 所有前端资源检查通过！")
        return 0
    else:
        print("\n⚠️  部分检查失败，请查看上述详情")
        return 1

if __name__ == '__main__':
    sys.exit(main())

import json
import re
import os
from typing import Dict, List, Set, Tuple, Any
from collections import defaultdict
import zipfile
import io


class I18nValidator:
    def __init__(self, base_language: str = 'en', config: Dict = None):
        self.base_language = base_language
        self.config = config or {}
        self.validation_results = {}

    def load_json_file(self, file_content: str) -> Dict:
        try:
            return json.loads(file_content)
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON解析错误: {str(e)}")

    def extract_keys(self, data: Dict, prefix: str = '') -> Set[str]:
        keys = set()
        for key, value in data.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict):
                keys.update(self.extract_keys(value, full_key))
            else:
                keys.add(full_key)
        return keys

    def get_nested_value(self, data: Dict, key_path: str) -> Any:
        keys = key_path.split('.')
        value = data
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        return value

    def validate_keys_consistency(self, language_files: Dict[str, Dict]) -> Dict:
        all_keys = {}
        for lang, data in language_files.items():
            all_keys[lang] = self.extract_keys(data)

        base_lang = self.base_language if self.base_language in all_keys else list(all_keys.keys())[0]
        base_keys = all_keys[base_lang]

        allowed_missing = set(self.config.get('allowed_missing_keys', []))

        results = {
            'base_language': base_lang,
            'missing_keys': {},
            'extra_keys': {},
            'key_summary': {}
        }

        for lang, keys in all_keys.items():
            if lang == base_lang:
                continue

            missing = base_keys - keys - allowed_missing
            extra = keys - base_keys

            results['missing_keys'][lang] = list(missing)
            results['extra_keys'][lang] = list(extra)
            results['key_summary'][lang] = {
                'total_keys': len(keys),
                'missing_count': len(missing),
                'extra_count': len(extra)
            }

        return results

    def validate_html_tags(self, value: str) -> List[str]:
        if not isinstance(value, str):
            return []

        errors = []
        tag_pattern = r'<([a-zA-Z][a-zA-Z0-9]*\b[^>]*>(.*?)</\1>|<([a-zA-Z][a-zA-Z0-9]*\b[^>]*/>'
        open_tags = re.findall(r'<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*(?<!/)>', value)
        close_tags = re.findall(r'</([a-zA-Z][a-zA-Z0-9]*)>', value)

        tag_stack = []
        tag_only_pattern = r'<(/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>'
        for match in re.finditer(tag_only_pattern, value):
            is_closing = match.group(1) == '/'
            tag_name = match.group(2)

            if not is_closing and not match.group(0).endswith('/>'):
                tag_stack.append(tag_name)
            elif is_closing:
                if tag_stack and tag_stack[-1] == tag_name:
                    tag_stack.pop()
                else:
                    errors.append(f"不匹配的闭合标签: </{tag_name}>")

        for unclosed_tag in tag_stack:
            errors.append(f"未闭合的标签: <{unclosed_tag}>")

        return errors

    def validate_placeholders(self, base_value: str, target_value: str) -> List[str]:
        if not isinstance(base_value, str) or not isinstance(target_value, str):
            return []

        placeholder_pattern = r'\{(\w+)\}'
        base_placeholders = set(re.findall(placeholder_pattern, base_value))
        target_placeholders = set(re.findall(placeholder_pattern, target_value))

        errors = []
        missing = base_placeholders - target_placeholders
        extra = target_placeholders - base_placeholders

        if missing:
            errors.append(f"缺失的占位符: {', '.join(missing)}")
        if extra:
            errors.append(f"多余的占位符: {', '.join(extra)}")

        return errors

    def validate_content_format(self, language_files: Dict[str, Dict], key_results: Dict) -> Dict:
        results = {
            'html_errors': {},
            'placeholder_errors': {},
            'regex_errors': {}
        }

        base_lang = key_results['base_language']
        base_data = language_files[base_lang]

        regex_rules = self.config.get('regex_rules', {})

        for lang, data in language_files.items():
            results['html_errors'][lang] = []
            results['placeholder_errors'][lang] = []
            results['regex_errors'][lang] = []

            all_keys = self.extract_keys(data)

            for key in all_keys:
                value = self.get_nested_value(data, key)

                if isinstance(value, str):
                    html_errs = self.validate_html_tags(value)
                    if html_errs:
                        results['html_errors'][lang].append({
                            'key': key,
                            'value': value,
                            'errors': html_errs
                        })

                if lang != base_lang:
                    base_value = self.get_nested_value(base_data, key)
                    if base_value is not None and value is not None:
                        placeholder_errs = self.validate_placeholders(str(base_value), str(value))
                        if placeholder_errs:
                            results['placeholder_errors'][lang].append({
                                'key': key,
                                'base_value': str(base_value),
                                'target_value': str(value),
                                'errors': placeholder_errs
                            })

                for rule_key, pattern in regex_rules.items():
                    if re.match(rule_key, key):
                        if isinstance(value, str) and not re.match(pattern, value):
                            results['regex_errors'][lang].append({
                                'key': key,
                                'value': value,
                                'pattern': pattern
                            })

        return results

    def validate(self, language_files: Dict[str, Dict]) -> Dict:
        key_results = self.validate_keys_consistency(language_files)
        content_results = self.validate_content_format(language_files, key_results)

        return {
            'key_validation': key_results,
            'content_validation': content_results,
            'languages': list(language_files.keys()),
            'total_files': len(language_files)
        }

    def generate_fix_suggestions(self, language_files: Dict[str, Dict], validation_result: Dict) -> Dict:
        suggestions = {}
        base_lang = validation_result['key_validation']['base_language']
        base_data = language_files[base_lang]

        for lang, missing_keys in validation_result['key_validation']['missing_keys'].items():
            if lang == base_lang:
                continue

            suggestions[lang] = {
                'missing_keys_to_add': [],
                'extra_keys_to_remove': validation_result['key_validation']['extra_keys'].get(lang, [])
            }

            for key in missing_keys:
                value = self.get_nested_value(base_data, key)
                suggestions[lang]['missing_keys_to_add'].append({
                    'key': key,
                    'value': value,
                    'suggested_value': f"[TODO: TRANSLATE] {value}"
                })

        return suggestions

    def apply_fixes(self, language_files: Dict[str, Dict], fixes: Dict[str, Any]) -> Dict[str, Dict]:
        fixed_files = {lang: data.copy() for lang, data in language_files.items()}

        for lang, fix_data in fixes.items():
            if lang not in fixed_files:
                fixed_files[lang] = {}

            for item in fix_data.get('missing_keys_to_add', []):
                key_path = item['key']
                value = item['suggested_value']
                self.set_nested_value(fixed_files[lang], key_path, value)

            for key in fix_data.get('extra_keys_to_remove', []):
                self.remove_nested_value(fixed_files[lang], key)

        return fixed_files

    def set_nested_value(self, data: Dict, key_path: str, value: Any):
        keys = key_path.split('.')
        current = data
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        current[keys[-1]] = value

    def remove_nested_value(self, data: Dict, key_path: str):
        keys = key_path.split('.')
        current = data
        for key in keys[:-1]:
            if key not in current:
                return
            current = current[key]
        if keys[-1] in current:
            del current[keys[-1]]


def extract_zip_file(zip_content: bytes) -> Dict[str, Dict]:
    language_files = {}
    zip_buffer = io.BytesIO(zip_content)

    with zipfile.ZipFile(zip_buffer, 'r') as zf:
        for file_info in zf.infolist():
            if file_info.filename.endswith('.json') and not file_info.is_dir():
                try:
                    filename = os.path.basename(file_info.filename)
                    lang_code = os.path.splitext(filename)[0]
                    with zf.open(file_info) as f:
                        content = f.read().decode('utf-8')
                        language_files[lang_code] = json.loads(content)
                except (json.JSONDecodeError, UnicodeDecodeError):
                    pass

    return language_files


def generate_markdown_report(validation_result: Dict, suggestions: Dict = None) -> str:
    report = []
    report.append("# i18n 多语言校验报告")
    report.append("")
    report.append(f"**校验语言**: {', '.join(validation_result['languages'])}")
    report.append(f"**基准语言**: {validation_result['key_validation']['base_language']}")
    report.append("")

    report.append("## 1. 键一致性校验")
    report.append("")

    for lang, summary in validation_result['key_validation']['key_summary'].items():
        report.append(f"### {lang}")
        report.append(f"- 总键数: {summary['total_keys']}")
        report.append(f"- 缺失键数: {summary['missing_count']}")
        report.append(f"- 多余键数: {summary['extra_count']}")
        report.append("")

        missing = validation_result['key_validation']['missing_keys'].get(lang, [])
        if missing:
            report.append("**缺失的键:**")
            for key in missing:
                report.append(f"- ❌ {key}")
            report.append("")

        extra = validation_result['key_validation']['extra_keys'].get(lang, [])
        if extra:
            report.append("**多余的键:**")
            for key in extra:
                report.append(f"- ⚠️  {key}")
            report.append("")

    report.append("## 2. 内容格式校验")
    report.append("")

    for lang in validation_result['languages']:
        report.append(f"### {lang}")
        report.append("")

        html_errs = validation_result['content_validation']['html_errors'].get(lang, [])
        if html_errs:
            report.append("#### HTML标签错误:")
            for err in html_errs:
                report.append(f"- **{err['key']}**: `{err['value']}`")
                for e in err['errors']:
                    report.append(f"  - {e}")
            report.append("")

        placeholder_errs = validation_result['content_validation']['placeholder_errors'].get(lang, [])
        if placeholder_errs:
            report.append("#### 占位符错误:")
            for err in placeholder_errs:
                report.append(f"- **{err['key']}**:")
                report.append(f"  - 原文: `{err['base_value']}`")
                report.append(f"  - 译文: `{err['target_value']}`")
                for e in err['errors']:
                    report.append(f"  - {e}")
            report.append("")

        regex_errs = validation_result['content_validation']['regex_errors'].get(lang, [])
        if regex_errs:
            report.append("#### 正则表达式错误:")
            for err in regex_errs:
                report.append(f"- **{err['key']}**: `{err['value']}` 不匹配模式 `{err['pattern']}`")
            report.append("")

    if suggestions:
        report.append("## 3. 自动修复建议")
        report.append("")
        for lang, sugg in suggestions.items():
            report.append(f"### {lang}")
            report.append("")
            if sugg['missing_keys_to_add']:
                report.append("**需要添加的键:")
                for item in sugg['missing_keys_to_add']:
                    report.append(f"- `{item['key']}`: `{item['suggested_value']}`")
                report.append("")
            if sugg['extra_keys_to_remove']:
                report.append("**需要删除的键:**")
                for key in sugg['extra_keys_to_remove']:
                    report.append(f"- `{key}`")
                report.append("")

    return "\n".join(report)


def generate_html_report(validation_result: Dict, suggestions: Dict = None) -> str:
    languages_str = ', '.join(validation_result['languages'])
    base_lang = validation_result['key_validation']['base_language']

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>i18n 多语言校验报告</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }}
        h2 {{ color: #4CAF50; margin-top: 30px; }}
        h3 {{ color: #2196F3; }}
        .summary {{ background: #e3f2fd; padding: 15px; border-radius: 4px; margin-bottom: 20px; }}
        .lang-section {{ margin-bottom: 30px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 4px; }}
        .error-item {{ background: #ffebee; padding: 10px; margin: 5px 0; border-left: 4px solid #f44336; padding-left: 15px; }}
        .warning-item {{ background: #fff3e0; padding: 10px; margin: 5px 0; border-left: 4px solid #ff9800; padding-left: 15px; }}
        .success-item {{ background: #e8f5e9; padding: 10px; margin: 5px 0; border-left: 4px solid #4CAF50; padding-left: 15px; }}
        code {{ background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }}
        .key {{ font-weight: bold; color: #333; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>i18n 多语言校验报告</h1>
        <div class="summary">
            <p><strong>校验语言:</strong> {languages_str}</p>
            <p><strong>基准语言:</strong> {base_lang}</p>
        </div>
"""

    html += """
        <h2>1. 键一致性校验</h2>
    """

    for lang, summary in validation_result['key_validation']['key_summary'].items():
        html += f"""
        <div class="lang-section">
            <h3>{lang}</h3>
            <p>总键数: {summary['total_keys']} | 缺失: {summary['missing_count']} | 多余: {summary['extra_count']}</p>
        """

        missing = validation_result['key_validation']['missing_keys'].get(lang, [])
        if missing:
            html += "<p><strong>缺失的键:</strong></p>"
            for key in missing:
                html += f'<div class="error-item"><span class="key">{key}</span></div>'

        extra = validation_result['key_validation']['extra_keys'].get(lang, [])
        if extra:
            html += "<p><strong>多余的键:</strong></p>"
            for key in extra:
                html += f'<div class="warning-item"><span class="key">{key}</span></div>'

        html += "</div>"

    html += """
        <h2>2. 内容格式校验</h2>
    """

    for lang in validation_result['languages']:
        html += f'<div class="lang-section"><h3>{lang}</h3>'

        html_errs = validation_result['content_validation']['html_errors'].get(lang, [])
        if html_errs:
            html += "<p><strong>HTML标签错误:</strong></p>"
            for err in html_errs:
                html += f'<div class="error-item"><span class="key">{err["key"]}</span>: <code>{err["value"]}</code>'
                for e in err['errors']:
                    html += f"<br>&nbsp;&nbsp;- {e}"
                html += '</div>'

        placeholder_errs = validation_result['content_validation']['placeholder_errors'].get(lang, [])
        if placeholder_errs:
            html += "<p><strong>占位符错误:</strong></p>"
            for err in placeholder_errs:
                html += f'<div class="error-item"><span class="key">{err["key"]}</span>:'
                html += f'<br>&nbsp;&nbsp;原文: <code>{err["base_value"]}</code>'
                html += f'<br>&nbsp;&nbsp;译文: <code>{err["target_value"]}</code>'
                for e in err['errors']:
                    html += f"<br>&nbsp;&nbsp;- {e}"
                html += '</div>'

        regex_errs = validation_result['content_validation']['regex_errors'].get(lang, [])
        if regex_errs:
            html += "<p><strong>正则表达式错误:</strong></p>"
            for err in regex_errs:
                html += f'<div class="error-item"><span class="key">{err["key"]}</span>: <code>{err["value"]}</code> 不匹配模式 <code>{err["pattern"]}</code></div>'

        html += "</div>"

    if suggestions:
        html += """
        <h2>3. 自动修复建议</h2>
        """
        for lang, sugg in suggestions.items():
            html += f'<div class="lang-section"><h3>{lang}</h3>'

            if sugg['missing_keys_to_add']:
                html += "<p><strong>需要添加的键:</strong></p>"
                for item in sugg['missing_keys_to_add']:
                    html += f'<div class="success-item"><span class="key">{item["key"]}</span>: <code>{item["suggested_value"]}</code></div>'

            if sugg['extra_keys_to_remove']:
                html += "<p><strong>需要删除的键:</strong></p>"
                for key in sugg['extra_keys_to_remove']:
                    html += f'<div class="warning-item"><span class="key">{key}</span></div>'

            html += "</div>"

    html += """
    </div>
</body>
</html>
"""

    return html

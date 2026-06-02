import configobj
from typing import Any, Dict, Tuple, List
from .base_converter import BaseConverter
import re


class INIConverter(BaseConverter):
    format_name = "ini"
    file_extensions = ["ini"]
    supports_comments = True

    def load(self, content: str) -> Tuple[Any, List[Dict]]:
        comments = self._extract_comments(content)
        lines = content.split('\n')
        processed_lines = []
        for line in lines:
            stripped = line.lstrip()
            if stripped.startswith(';'):
                processed_lines.append('#' + line.lstrip()[1:])
            else:
                processed_lines.append(line)
        config = configobj.ConfigObj(processed_lines)
        data = self._config_to_dict(config)
        return data, comments

    def dump(self, data: Any, comments: List[Dict] = None, **kwargs) -> str:
        config = configobj.ConfigObj(encoding='utf-8')
        
        if isinstance(data, dict):
            self._dict_to_config(data, config)
        
        result = config.write()
        if isinstance(result, list):
            lines = []
            for line in result:
                if isinstance(line, bytes):
                    lines.append(line.decode('utf-8'))
                else:
                    lines.append(str(line))
            result_str = '\n'.join(lines)
        else:
            result_str = str(result)
            if isinstance(result, bytes):
                result_str = result.decode('utf-8')
        
        if kwargs.get('preserve_comments', False) and comments:
            result_str = self._reinsert_comments(result_str, comments)
            
        return result_str

    def validate(self, content: str) -> Tuple[bool, List[Dict]]:
        errors = []
        try:
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                if not stripped or stripped.startswith(';') or stripped.startswith('#'):
                    continue
                if stripped.startswith('[') and stripped.endswith(']'):
                    if len(stripped) < 3:
                        errors.append({
                            'line': i,
                            'column': 1,
                            'message': "INI节名不能为空",
                            'content': stripped
                        })
                elif '=' in line or ':' in line:
                    pass
                else:
                    errors.append({
                        'line': i,
                        'column': 1,
                        'message': "INI行格式错误，应为 key=value 或 [section]",
                        'content': stripped
                    })
            
            if not errors:
                configobj.ConfigObj(lines, encoding='utf-8')
                return True, []
            return False, errors
        except Exception as e:
            errors.append({
                'line': 1,
                'column': 1,
                'message': f"INI解析错误: {str(e)}",
                'content': ""
            })
            return False, errors

    def _config_to_dict(self, config) -> Dict:
        result = {}
        for key, value in config.items():
            if isinstance(value, (configobj.ConfigObj, configobj.Section)):
                result[key] = self._config_to_dict(value)
            else:
                result[key] = self._parse_value(value)
        return result

    def _dict_to_config(self, data: Dict, config: configobj.ConfigObj, parent_key: str = ""):
        for key, value in data.items():
            current_key = f"{parent_key}.{key}" if parent_key else key
            if isinstance(value, dict):
                if any(isinstance(v, (dict, list)) for v in value.values()):
                    config[key] = {}
                    self._dict_to_config(value, config[key], current_key)
                else:
                    config[key] = {k: str(v) if not isinstance(v, (dict, list)) else str(v) for k, v in value.items()}
            elif isinstance(value, list):
                config[key] = [str(v) for v in value]
            else:
                config[key] = str(value) if value is not None else ""

    def _parse_value(self, value: str) -> Any:
        if isinstance(value, list):
            return [self._parse_single_value(v) for v in value]
        return self._parse_single_value(value)

    def _parse_single_value(self, value: str) -> Any:
        if value is None:
            return None
        value_str = str(value).strip()
        if value_str.lower() == 'true':
            return True
        if value_str.lower() == 'false':
            return False
        if value_str.lower() in ('null', 'none', ''):
            return None
        try:
            if '.' in value_str:
                return float(value_str)
            return int(value_str)
        except (ValueError, TypeError):
            return value_str

    def _extract_comments(self, content: str) -> List[Dict]:
        comments = []
        lines = content.split('\n')
        current_section = None
        pending_comments = []
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith(';') or stripped.startswith('#'):
                comment_text = stripped.lstrip(';#').strip()
                pending_comments.append({
                    'line': i,
                    'type': 'line_comment',
                    'content': comment_text
                })
            elif stripped.startswith('[') and stripped.endswith(']'):
                section_name = stripped[1:-1].strip()
                
                for comment in pending_comments:
                    comment['path'] = f"[{section_name}]"
                    comments.append(comment)
                pending_comments = []
                
                current_section = section_name
            elif stripped and ('=' in line or ':' in line) and not stripped.startswith(';') and not stripped.startswith('#'):
                key = stripped.split('=', 1)[0].strip() if '=' in line else stripped.split(':', 1)[0].strip()
                
                full_path = f"{current_section}.{key}" if current_section else key
                for comment in pending_comments:
                    comment['path'] = full_path
                    comments.append(comment)
                pending_comments = []
            elif not stripped:
                for comment in pending_comments:
                    comment['path'] = None
                    comments.append(comment)
                pending_comments = []
        
        for comment in pending_comments:
            comment['path'] = None
            comments.append(comment)
        
        return comments

    def _reinsert_comments(self, content: str, comments: List[Dict]) -> str:
        if not comments:
            return content
            
        lines = content.split('\n')
        comment_map = {}
        header_comments = []
        
        for c in comments:
            path = c.get('path')
            comment_line = f"; {c['content']}"
            
            if path is None:
                header_comments.append(comment_line)
            else:
                if path not in comment_map:
                    comment_map[path] = []
                comment_map[path].append(comment_line)
        
        result = []
        current_section = None
        
        result.extend(header_comments)
        
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('[') and stripped.endswith(']'):
                section_name = stripped[1:-1].strip()
                section_path = f"[{section_name}]"
                if section_path in comment_map:
                    result.extend(comment_map[section_path])
                current_section = section_name
            elif stripped and ('=' in line or ':' in line) and not stripped.startswith(';') and not stripped.startswith('#'):
                key = stripped.split('=', 1)[0].strip() if '=' in line else stripped.split(':', 1)[0].strip()
                full_path = f"{current_section}.{key}" if current_section else key
                if full_path in comment_map:
                    result.extend(comment_map[full_path])
            result.append(line)
            
        return '\n'.join(result)

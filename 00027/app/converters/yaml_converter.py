import yaml
from yaml.parser import ParserError, ScannerError
from typing import Any, Dict, Tuple, List
from .base_converter import BaseConverter


class YAMLConverter(BaseConverter):
    format_name = "yaml"
    file_extensions = ["yaml", "yml"]
    supports_comments = True

    def load(self, content: str) -> Tuple[Any, List[Dict]]:
        comments = self._extract_comments(content)
        data = yaml.safe_load(content)
        return data, comments

    def dump(self, data: Any, comments: List[Dict] = None, **kwargs) -> str:
        indent = kwargs.get('indent', 2)
        sort_keys = kwargs.get('sort_keys', False)
        result = yaml.dump(data, default_flow_style=False, indent=indent, sort_keys=sort_keys, allow_unicode=True)
        if kwargs.get('preserve_comments', False) and comments:
            result = self._reinsert_comments(result, comments)
        return result

    def validate(self, content: str) -> Tuple[bool, List[Dict]]:
        errors = []
        try:
            yaml.safe_load(content)
            return True, []
        except ParserError as e:
            lines = content.split('\n')
            line_no = e.problem_mark.line + 1 if e.problem_mark else 1
            col_no = e.problem_mark.column + 1 if e.problem_mark else 1
            line_content = lines[line_no - 1] if line_no <= len(lines) else ""
            errors.append({
                'line': line_no,
                'column': col_no,
                'message': f"YAML解析错误: {e.problem}",
                'content': line_content.strip()
            })
            return False, errors
        except ScannerError as e:
            lines = content.split('\n')
            line_no = e.problem_mark.line + 1 if e.problem_mark else 1
            col_no = e.problem_mark.column + 1 if e.problem_mark else 1
            line_content = lines[line_no - 1] if line_no <= len(lines) else ""
            errors.append({
                'line': line_no,
                'column': col_no,
                'message': f"YAML扫描错误: {e.problem}",
                'content': line_content.strip()
            })
            return False, errors

    def _extract_comments(self, content: str) -> List[Dict]:
        comments = []
        lines = content.split('\n')
        current_path = []
        path_stack = []
        pending_comments = []
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#'):
                comment_text = stripped.lstrip('#').strip()
                indent_level = len(line) - len(line.lstrip())
                pending_comments.append({
                    'line': i,
                    'type': 'line_comment',
                    'content': comment_text,
                    'indent': indent_level
                })
            elif stripped and not stripped.startswith('#'):
                indent_level = len(line) - len(line.lstrip())
                while path_stack and path_stack[-1]['indent'] >= indent_level:
                    path_stack.pop()
                    if current_path:
                        current_path.pop()
                
                if ':' in stripped:
                    key = stripped.split(':', 1)[0].strip()
                    full_path = '.'.join(current_path + [key])
                    
                    for comment in pending_comments:
                        comment['path'] = full_path
                        comments.append(comment)
                    pending_comments = []
                    
                    path_stack.append({'indent': indent_level, 'key': key})
                    current_path.append(key)
                else:
                    pending_comments = []
            else:
                if not stripped and pending_comments:
                    for comment in pending_comments:
                        comment['path'] = None
                        comments.append(comment)
                    pending_comments = []
        
        for comment in pending_comments:
            comment['path'] = None
            comments.append(comment)
        
        return comments

    def _reinsert_comments(self, content: str, comments: List[Dict]) -> str:
        lines = content.split('\n')
        comment_map = {}
        header_comments = []
        
        for c in comments:
            path = c.get('path')
            indent = c.get('indent', 0)
            prefix = ' ' * indent
            comment_line = f"{prefix}# {c['content']}"
            
            if path is None:
                header_comments.append(comment_line)
            else:
                if path not in comment_map:
                    comment_map[path] = []
                comment_map[path].append(comment_line)
        
        result = []
        
        result.extend(header_comments)
        
        current_path = []
        path_stack = []
        
        for line in lines:
            stripped = line.strip()
            if stripped and ':' in stripped and not stripped.startswith('#'):
                indent_level = len(line) - len(line.lstrip())
                while path_stack and path_stack[-1]['indent'] >= indent_level:
                    path_stack.pop()
                    if current_path:
                        current_path.pop()
                key = stripped.split(':', 1)[0].strip()
                full_path = '.'.join(current_path + [key])
                if full_path in comment_map:
                    for comment_line in comment_map[full_path]:
                        result.append(comment_line)
                path_stack.append({'indent': indent_level, 'key': key})
                current_path.append(key)
            result.append(line)
        
        return '\n'.join(result)

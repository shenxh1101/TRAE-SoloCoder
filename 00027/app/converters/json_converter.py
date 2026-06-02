import json
import re
from typing import Any, Dict, Tuple, List
from .base_converter import BaseConverter


class JSONConverter(BaseConverter):
    format_name = "json"
    file_extensions = ["json"]
    supports_comments = False

    def load(self, content: str) -> Tuple[Any, List[Dict]]:
        content_clean = self._remove_trailing_commas(content)
        data = json.loads(content_clean)
        comments = self._extract_comments(content)
        return data, comments

    def dump(self, data: Any, comments: List[Dict] = None, **kwargs) -> str:
        indent = kwargs.get('indent', 2)
        ensure_ascii = kwargs.get('ensure_ascii', False)
        return json.dumps(data, indent=indent, ensure_ascii=ensure_ascii, default=str)

    def validate(self, content: str) -> Tuple[bool, List[Dict]]:
        errors = []
        try:
            content_clean = self._remove_trailing_commas(content)
            json.loads(content_clean)
            return True, []
        except json.JSONDecodeError as e:
            lines = content.split('\n')
            line_no = e.lineno
            col_no = e.colno
            error_msg = e.msg
            line_content = lines[line_no - 1] if line_no <= len(lines) else ""
            errors.append({
                'line': line_no,
                'column': col_no,
                'message': f"JSON解析错误: {error_msg}",
                'content': line_content.strip()
            })
            return False, errors

    def _remove_trailing_commas(self, content: str) -> str:
        content = re.sub(r',(\s*[}\]])', r'\1', content)
        return content

    def _extract_comments(self, content: str) -> List[Dict]:
        comments = []
        lines = content.split('\n')
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('#'):
                comments.append({
                    'line': i,
                    'type': 'line_comment',
                    'content': stripped.lstrip('/#').strip(),
                    'path': None
                })
        return comments

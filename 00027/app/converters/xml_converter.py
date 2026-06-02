import xmltodict
from lxml import etree
from typing import Any, Dict, Tuple, List
from .base_converter import BaseConverter
import re


class XMLConverter(BaseConverter):
    format_name = "xml"
    file_extensions = ["xml"]
    supports_comments = True

    def load(self, content: str) -> Tuple[Any, List[Dict]]:
        comments = self._extract_comments(content)
        data = xmltodict.parse(content, dict_constructor=dict, attr_prefix='@', cdata_key='#text')
        data = self._simplify_xml_dict(data)
        return data, comments

    def dump(self, data: Any, comments: List[Dict] = None, **kwargs) -> str:
        root_name = kwargs.get('root_name', 'root')
        pretty = kwargs.get('pretty', True)
        indent = kwargs.get('indent', 2)
        
        if not isinstance(data, dict) or not (len(data) == 1 and root_name in data):
            data = {root_name: data}
        
        result = xmltodict.unparse(data, pretty=pretty, full_document=True, encoding='utf-8')
        
        if pretty:
            result = self._format_xml(result, indent)
            
        if kwargs.get('preserve_comments', False) and comments:
            result = self._reinsert_comments(result, comments)
            
        return result

    def validate(self, content: str) -> Tuple[bool, List[Dict]]:
        errors = []
        try:
            parser = etree.XMLParser()
            etree.fromstring(content.encode('utf-8'), parser)
            return True, []
        except etree.XMLSyntaxError as e:
            lines = content.split('\n')
            for error in e.error_log:
                line_no = error.line
                col_no = error.column
                line_content = lines[line_no - 1] if line_no <= len(lines) else ""
                errors.append({
                    'line': line_no,
                    'column': col_no,
                    'message': f"XML语法错误: {error.message}",
                    'content': line_content.strip()
                })
            return False, errors

    def _simplify_xml_dict(self, data: Any) -> Any:
        if isinstance(data, dict):
            result = {}
            for k, v in data.items():
                if k == '@xmlns' or k.startswith('@xmlns:'):
                    continue
                new_key = k
                if new_key.startswith('@'):
                    new_key = new_key[1:]
                result[new_key] = self._simplify_xml_dict(v)
            return result
        elif isinstance(data, list):
            return [self._simplify_xml_dict(item) for item in data]
        else:
            return data

    def _extract_comments(self, content: str) -> List[Dict]:
        comments = []
        comment_pattern = r'<!--(.*?)-->'
        matches = re.finditer(comment_pattern, content, re.DOTALL)
        
        lines = content.split('\n')
        for match in matches:
            start_pos = match.start()
            comment_text = match.group(1).strip()
            
            line_no = 1
            char_count = 0
            for i, line in enumerate(lines, 1):
                line_len = len(line) + 1
                if char_count + line_len > start_pos:
                    line_no = i
                    break
                char_count += line_len
            
            comments.append({
                'line': line_no,
                'type': 'block_comment',
                'content': comment_text,
                'path': None
            })
        return comments

    def _reinsert_comments(self, content: str, comments: List[Dict]) -> str:
        if not comments:
            return content
            
        lines = content.split('\n')
        if len(lines) > 1:
            result_lines = [lines[0]]
            for c in comments:
                result_lines.append(f"<!-- {c['content']} -->")
            result_lines.extend(lines[1:])
            return '\n'.join(result_lines)
        return content

    def _format_xml(self, xml_str: str, indent: int = 2) -> str:
        try:
            root = etree.fromstring(xml_str.encode('utf-8'))
            etree.indent(root, space=' ' * indent)
            return etree.tostring(root, encoding='unicode', pretty_print=True, xml_declaration=True)
        except:
            return xml_str

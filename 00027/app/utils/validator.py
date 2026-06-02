from typing import Tuple, List, Dict, Any
from app.converters.converter_factory import ConverterFactory


class SyntaxValidator:
    @staticmethod
    def validate(content: str, format_name: str) -> Tuple[bool, List[Dict]]:
        converter = ConverterFactory.get_converter(format_name)
        if not converter:
            return False, [{
                'line': 0,
                'column': 0,
                'message': f"不支持的格式: {format_name}",
                'content': ""
            }]
        
        return converter.validate(content)

    @staticmethod
    def validate_all(content: str) -> Dict[str, Dict]:
        results = {}
        formats = ConverterFactory.get_supported_formats()
        
        for fmt in formats:
            try:
                valid, errors = SyntaxValidator.validate(content, fmt)
                results[fmt] = {
                    'valid': valid,
                    'errors': errors
                }
            except Exception as e:
                results[fmt] = {
                    'valid': False,
                    'errors': [{
                        'line': 0,
                        'column': 0,
                        'message': f"验证异常: {str(e)}",
                        'content': ""
                    }]
                }
        
        return results

    @staticmethod
    def validate_conversion(source_content: str, target_content: str,
                           source_format: str, target_format: str) -> Dict:
        source_valid, source_errors = SyntaxValidator.validate(source_content, source_format)
        target_valid, target_errors = SyntaxValidator.validate(target_content, target_format)
        
        return {
            'source': {
                'format': source_format,
                'valid': source_valid,
                'errors': source_errors
            },
            'target': {
                'format': target_format,
                'valid': target_valid,
                'errors': target_errors
            },
            'conversion_valid': source_valid and target_valid
        }

    @staticmethod
    def format_errors(errors: List[Dict]) -> str:
        if not errors:
            return "无错误"
        
        lines = []
        for err in errors:
            line_info = f"第{err.get('line', '?')}行"
            if err.get('column'):
                line_info += f", 第{err.get('column')}列"
            lines.append(f"{line_info}: {err.get('message', '未知错误')}")
            if err.get('content'):
                lines.append(f"  内容: {err.get('content')}")
        
        return '\n'.join(lines)

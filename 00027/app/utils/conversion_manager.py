from typing import Any, Dict, List, Tuple, Optional
import os
import uuid
from app.converters.converter_factory import ConverterFactory
from app.utils.structure_mapper import StructureMapper
from app.utils.validator import SyntaxValidator
from app.utils.mapping_engine import MappingEngine
import copy


class ConversionManager:
    @staticmethod
    def convert(content: str, source_format: str, target_format: str,
                options: Optional[Dict] = None) -> Dict:
        options = options or {}
        preserve_comments = options.get('preserve_comments', False)
        mapping_script = options.get('mapping_script')
        field_mappings = options.get('field_mappings')
        remove_null = options.get('remove_null', False)
        remove_empty = options.get('remove_empty', False)
        pretty_print = options.get('pretty_print', True)
        indent = options.get('indent', 2)
        root_name = options.get('root_name', 'root')

        source_converter = ConverterFactory.get_converter(source_format)
        target_converter = ConverterFactory.get_converter(target_format)

        if not source_converter:
            return {
                'success': False,
                'error': f"不支持的源格式: {source_format}",
                'result': None,
                'structure_changes': None,
                'validation': None
            }

        if not target_converter:
            return {
                'success': False,
                'error': f"不支持的目标格式: {target_format}",
                'result': None,
                'structure_changes': None,
                'validation': None
            }

        source_valid, source_errors = source_converter.validate(content)
        if not source_valid:
            return {
                'success': False,
                'error': "源文件语法错误",
                'result': None,
                'structure_changes': None,
                'validation': {
                    'source': {'valid': False, 'errors': source_errors},
                    'target': {'valid': False, 'errors': []},
                    'conversion_valid': False
                }
            }

        try:
            data, comments = source_converter.load(content)
            original_data = copy.deepcopy(data)

            if remove_null:
                data = ConversionManager._remove_null_values(data)

            if remove_empty:
                data = ConversionManager._remove_empty_values(data)

            if mapping_script:
                try:
                    data = MappingEngine.execute_script(data, mapping_script)
                except Exception as e:
                    return {
                        'success': False,
                        'error': f"映射脚本执行失败: {str(e)}",
                        'result': None,
                        'structure_changes': None,
                        'validation': None
                    }

            if field_mappings:
                data = MappingEngine.apply_field_mapping(data, field_mappings)

            dump_options = {
                'indent': indent,
                'pretty': pretty_print,
                'root_name': root_name,
                'preserve_comments': preserve_comments,
                'sort_keys': options.get('sort_keys', False),
                'ensure_ascii': options.get('ensure_ascii', False)
            }

            result_content = target_converter.dump(data, comments, **dump_options)

            target_valid, target_errors = target_converter.validate(result_content)

            structure_changes = StructureMapper.compare_structures(
                original_data, data, source_format, target_format
            )

            validation = SyntaxValidator.validate_conversion(
                content, result_content, source_format, target_format
            )

            return {
                'success': True,
                'error': None,
                'result': result_content,
                'data': data,
                'original_data': original_data,
                'structure_changes': structure_changes,
                'validation': validation,
                'source_format': source_format,
                'target_format': target_format
            }

        except Exception as e:
            return {
                'success': False,
                'error': f"转换失败: {str(e)}",
                'result': None,
                'structure_changes': None,
                'validation': None
            }

    @staticmethod
    def _remove_null_values(data: Any) -> Any:
        if isinstance(data, dict):
            return {k: ConversionManager._remove_null_values(v) 
                    for k, v in data.items() if v is not None}
        elif isinstance(data, list):
            return [ConversionManager._remove_null_values(item) 
                    for item in data if item is not None]
        else:
            return data

    @staticmethod
    def _remove_empty_values(data: Any) -> Any:
        if isinstance(data, dict):
            return {k: ConversionManager._remove_empty_values(v)
                    for k, v in data.items() 
                    if v not in (None, '', [], {})}
        elif isinstance(data, list):
            return [ConversionManager._remove_empty_values(item)
                    for item in data 
                    if item not in (None, '', [], {})]
        else:
            return data

    @staticmethod
    def detect_format(file_path: str, content: Optional[str] = None) -> Optional[str]:
        _, ext = os.path.splitext(file_path)
        ext = ext.lstrip('.').lower()
        
        if ext:
            format_name = ConverterFactory.get_format_by_extension(ext)
            if format_name:
                return format_name
        
        if content:
            validation_results = SyntaxValidator.validate_all(content)
            valid_formats = [fmt for fmt, res in validation_results.items() if res['valid']]
            if valid_formats:
                return valid_formats[0]
        
        return None

    @staticmethod
    def get_format_extension(format_name: str) -> Optional[str]:
        formats = ConverterFactory.get_supported_formats()
        fmt_info = formats.get(format_name)
        if fmt_info and fmt_info['extensions']:
            return fmt_info['extensions'][0]
        return None

    @staticmethod
    def save_to_file(content: str, output_folder: str, 
                     filename: Optional[str] = None) -> str:
        os.makedirs(output_folder, exist_ok=True)
        
        if not filename:
            filename = f"{uuid.uuid4().hex}.txt"
        
        file_path = os.path.join(output_folder, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return file_path

    @staticmethod
    def get_conversion_matrix() -> Dict[str, List[str]]:
        formats = list(ConverterFactory.get_supported_formats().keys())
        matrix = {}
        for src in formats:
            matrix[src] = [tgt for tgt in formats if tgt != src]
        return matrix

import os
import zipfile
import shutil
import uuid
from typing import Dict, List, Tuple, Optional
from app.utils.conversion_manager import ConversionManager
from app.converters.converter_factory import ConverterFactory


class BatchConverter:
    CONFIG_EXTENSIONS = {'json', 'yaml', 'yml', 'xml', 'ini'}

    @staticmethod
    def convert_zip(zip_path: str, target_format: str, 
                    output_folder: str, options: Optional[Dict] = None) -> Dict:
        options = options or {}
        results = {
            'success': False,
            'output_zip_path': None,
            'converted_files': [],
            'failed_files': [],
            'skipped_files': [],
            'total_files': 0,
            'converted_count': 0
        }

        if not os.path.exists(zip_path):
            results['error'] = f"ZIP文件不存在: {zip_path}"
            return results

        target_ext = ConversionManager.get_format_extension(target_format)
        if not target_ext:
            results['error'] = f"不支持的目标格式: {target_format}"
            return results

        job_id = uuid.uuid4().hex
        temp_extract = os.path.join(output_folder, f"extract_{job_id}")
        temp_output = os.path.join(output_folder, f"output_{job_id}")

        try:
            os.makedirs(temp_extract, exist_ok=True)
            os.makedirs(temp_output, exist_ok=True)

            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_extract)

            all_files = []
            for root, dirs, files in os.walk(temp_extract):
                for file in files:
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, temp_extract)
                    all_files.append((file_path, rel_path))

            results['total_files'] = len(all_files)

            for file_path, rel_path in all_files:
                file_result = BatchConverter._process_single_file(
                    file_path, rel_path, temp_extract, temp_output, 
                    target_format, target_ext, options
                )

                if file_result['status'] == 'converted':
                    results['converted_files'].append(file_result)
                    results['converted_count'] += 1
                elif file_result['status'] == 'failed':
                    results['failed_files'].append(file_result)
                else:
                    results['skipped_files'].append(file_result)

            output_zip_name = f"converted_{job_id}.zip"
            output_zip_path = os.path.join(output_folder, output_zip_name)
            
            with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(temp_output):
                    for file in files:
                        file_path = os.path.join(root, file)
                        rel_path = os.path.relpath(file_path, temp_output)
                        zipf.write(file_path, rel_path)

            results['success'] = True
            results['output_zip_path'] = output_zip_path

        except Exception as e:
            results['error'] = f"批量转换失败: {str(e)}"
        finally:
            shutil.rmtree(temp_extract, ignore_errors=True)
            shutil.rmtree(temp_output, ignore_errors=True)

        return results

    @staticmethod
    def _process_single_file(file_path: str, rel_path: str,
                             temp_extract: str, temp_output: str,
                             target_format: str, target_ext: str,
                             options: Dict) -> Dict:
        result = {
            'original_path': rel_path,
            'output_path': None,
            'status': 'skipped',
            'error': None,
            'source_format': None,
            'target_format': target_format
        }

        _, ext = os.path.splitext(file_path)
        ext = ext.lstrip('.').lower()

        if ext not in BatchConverter.CONFIG_EXTENSIONS:
            result['status'] = 'skipped'
            result['error'] = '不支持的文件类型'
            
            output_path = os.path.join(temp_output, rel_path)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            shutil.copy2(file_path, output_path)
            result['output_path'] = rel_path
            return result

        source_format = ConverterFactory.get_format_by_extension(ext)
        result['source_format'] = source_format

        if source_format == target_format:
            result['status'] = 'skipped'
            result['error'] = '源格式与目标格式相同'
            
            output_path = os.path.join(temp_output, rel_path)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            shutil.copy2(file_path, output_path)
            result['output_path'] = rel_path
            return result

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            conversion_result = ConversionManager.convert(
                content, source_format, target_format, options
            )

            if conversion_result['success']:
                new_rel_path = os.path.splitext(rel_path)[0] + '.' + target_ext
                output_path = os.path.join(temp_output, new_rel_path)
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(conversion_result['result'])
                
                result['status'] = 'converted'
                result['output_path'] = new_rel_path
            else:
                result['status'] = 'failed'
                result['error'] = conversion_result.get('error', '转换失败')
                
                output_path = os.path.join(temp_output, rel_path)
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                shutil.copy2(file_path, output_path)
                result['output_path'] = rel_path

        except Exception as e:
            result['status'] = 'failed'
            result['error'] = str(e)
            
            output_path = os.path.join(temp_output, rel_path)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            shutil.copy2(file_path, output_path)
            result['output_path'] = rel_path

        return result

    @staticmethod
    def get_supported_extensions() -> List[str]:
        return list(BatchConverter.CONFIG_EXTENSIONS)

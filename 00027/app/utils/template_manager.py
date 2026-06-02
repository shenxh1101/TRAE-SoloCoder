import os
import json
import uuid
from typing import Dict, List, Optional


class TemplateManager:
    def __init__(self, template_dir: str):
        self.template_dir = template_dir
        os.makedirs(self.template_dir, exist_ok=True)
        self._init_default_templates()

    def _init_default_templates(self):
        default_templates = [
            {
                'id': 'default_json_to_yaml_remove_null',
                'name': 'JSON转YAML且移除空字段',
                'description': '将JSON格式转换为YAML格式，同时移除所有值为null的字段',
                'source_format': 'json',
                'target_format': 'yaml',
                'options': {
                    'remove_null': True,
                    'preserve_comments': False,
                    'pretty_print': True,
                    'indent': 2
                },
                'mapping_script': None,
                'field_mappings': None,
                'is_default': True
            },
            {
                'id': 'default_json_to_yaml_clean',
                'name': 'JSON转YAML且清理空值',
                'description': '将JSON格式转换为YAML格式，移除空值、空字符串、空数组和空对象',
                'source_format': 'json',
                'target_format': 'yaml',
                'options': {
                    'remove_empty': True,
                    'preserve_comments': False,
                    'pretty_print': True,
                    'indent': 2
                },
                'mapping_script': None,
                'field_mappings': None,
                'is_default': True
            },
            {
                'id': 'default_yaml_to_json_strict',
                'name': 'YAML转JSON严格模式',
                'description': '将YAML格式转换为JSON格式，使用严格的JSON语法',
                'source_format': 'yaml',
                'target_format': 'json',
                'options': {
                    'preserve_comments': False,
                    'pretty_print': True,
                    'indent': 2,
                    'ensure_ascii': True,
                    'sort_keys': True
                },
                'mapping_script': None,
                'field_mappings': None,
                'is_default': True
            },
            {
                'id': 'default_xml_to_json_simple',
                'name': 'XML转JSON简化模式',
                'description': '将XML格式转换为JSON格式，简化属性前缀',
                'source_format': 'xml',
                'target_format': 'json',
                'options': {
                    'preserve_comments': False,
                    'pretty_print': True,
                    'indent': 2
                },
                'mapping_script': None,
                'field_mappings': None,
                'is_default': True
            },
            {
                'id': 'default_ini_to_json_typed',
                'name': 'INI转JSON类型转换',
                'description': '将INI格式转换为JSON格式，自动识别数值和布尔类型',
                'source_format': 'ini',
                'target_format': 'json',
                'options': {
                    'preserve_comments': False,
                    'pretty_print': True,
                    'indent': 2
                },
                'mapping_script': None,
                'field_mappings': None,
                'is_default': True
            },
            {
                'id': 'default_json_to_ini_flat',
                'name': 'JSON转INI扁平化',
                'description': '将嵌套的JSON结构扁平化为INI格式',
                'source_format': 'json',
                'target_format': 'ini',
                'options': {
                    'preserve_comments': False,
                    'pretty_print': True,
                    'indent': 2
                },
                'mapping_script': 'result = flatten_keys(data, ".")',
                'field_mappings': None,
                'is_default': True
            },
            {
                'id': 'default_yaml_to_xml_with_comments',
                'name': 'YAML转XML保留注释',
                'description': '将YAML格式转换为XML格式，保留原有的注释信息',
                'source_format': 'yaml',
                'target_format': 'xml',
                'options': {
                    'preserve_comments': True,
                    'pretty_print': True,
                    'indent': 2,
                    'root_name': 'config'
                },
                'mapping_script': None,
                'field_mappings': None,
                'is_default': True
            },
            {
                'id': 'default_all_remove_empty',
                'name': '通用清理空值模板',
                'description': '任意格式转换时移除所有空值',
                'source_format': None,
                'target_format': None,
                'options': {
                    'remove_empty': True,
                    'pretty_print': True,
                    'indent': 2
                },
                'mapping_script': None,
                'field_mappings': None,
                'is_default': True
            }
        ]

        for template in default_templates:
            template_path = os.path.join(self.template_dir, f"{template['id']}.json")
            if not os.path.exists(template_path):
                with open(template_path, 'w', encoding='utf-8') as f:
                    json.dump(template, f, indent=2, ensure_ascii=False)

    def create_template(self, template_data: Dict) -> Dict:
        template_id = template_data.get('id') or f"template_{uuid.uuid4().hex[:8]}"
        
        template = {
            'id': template_id,
            'name': template_data.get('name', '未命名模板'),
            'description': template_data.get('description', ''),
            'source_format': template_data.get('source_format'),
            'target_format': template_data.get('target_format'),
            'options': template_data.get('options', {}),
            'mapping_script': template_data.get('mapping_script'),
            'field_mappings': template_data.get('field_mappings'),
            'is_default': False,
            'created_at': self._get_timestamp()
        }

        template_path = os.path.join(self.template_dir, f"{template_id}.json")
        with open(template_path, 'w', encoding='utf-8') as f:
            json.dump(template, f, indent=2, ensure_ascii=False)

        return template

    def get_template(self, template_id: str) -> Optional[Dict]:
        template_path = os.path.join(self.template_dir, f"{template_id}.json")
        if not os.path.exists(template_path):
            return None
        
        with open(template_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def update_template(self, template_id: str, template_data: Dict) -> Optional[Dict]:
        template = self.get_template(template_id)
        if not template:
            return None

        if template.get('is_default'):
            raise ValueError("不能修改默认模板")

        template.update({
            'name': template_data.get('name', template['name']),
            'description': template_data.get('description', template['description']),
            'source_format': template_data.get('source_format', template['source_format']),
            'target_format': template_data.get('target_format', template['target_format']),
            'options': template_data.get('options', template['options']),
            'mapping_script': template_data.get('mapping_script', template['mapping_script']),
            'field_mappings': template_data.get('field_mappings', template['field_mappings']),
            'updated_at': self._get_timestamp()
        })

        template_path = os.path.join(self.template_dir, f"{template_id}.json")
        with open(template_path, 'w', encoding='utf-8') as f:
            json.dump(template, f, indent=2, ensure_ascii=False)

        return template

    def delete_template(self, template_id: str) -> bool:
        template = self.get_template(template_id)
        if not template:
            return False
        
        if template.get('is_default'):
            raise ValueError("不能删除默认模板")

        template_path = os.path.join(self.template_dir, f"{template_id}.json")
        os.remove(template_path)
        return True

    def list_templates(self, source_format: Optional[str] = None, 
                      target_format: Optional[str] = None) -> List[Dict]:
        templates = []
        
        for filename in os.listdir(self.template_dir):
            if not filename.endswith('.json'):
                continue
            
            template_id = filename[:-5]
            template = self.get_template(template_id)
            if not template:
                continue

            if source_format and template['source_format'] and template['source_format'] != source_format:
                continue
            if target_format and template['target_format'] and template['target_format'] != target_format:
                continue

            templates.append(template)

        templates.sort(key=lambda t: (not t.get('is_default', False), t['name']))
        return templates

    def apply_template(self, template_id: str, 
                      source_format: Optional[str] = None,
                      target_format: Optional[str] = None) -> Dict:
        template = self.get_template(template_id)
        if not template:
            raise ValueError(f"模板不存在: {template_id}")

        result = {
            'source_format': source_format or template['source_format'],
            'target_format': target_format or template['target_format'],
            'options': template.get('options', {}).copy(),
            'mapping_script': template.get('mapping_script'),
            'field_mappings': template.get('field_mappings')
        }

        if not result['source_format']:
            raise ValueError("需要指定源格式")
        if not result['target_format']:
            raise ValueError("需要指定目标格式")

        return result

    def _get_timestamp(self) -> str:
        from datetime import datetime
        return datetime.now().isoformat()

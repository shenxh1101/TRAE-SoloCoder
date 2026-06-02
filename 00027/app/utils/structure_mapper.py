from typing import Any, Dict, List, Tuple
from collections import OrderedDict
import copy


class StructureMapper:
    @staticmethod
    def analyze_structure(data: Any, path: str = "") -> List[Dict]:
        result = []
        StructureMapper._analyze_recursive(data, path, result)
        return result

    @staticmethod
    def _analyze_recursive(data: Any, path: str, result: List[Dict]):
        entry = {
            'path': path if path else 'root',
            'type': type(data).__name__,
            'has_children': isinstance(data, (dict, list)) and bool(data)
        }
        
        if isinstance(data, dict):
            entry['value_type'] = 'object'
            entry['child_count'] = len(data)
            result.append(entry)
            for key, value in data.items():
                new_path = f"{path}.{key}" if path else key
                StructureMapper._analyze_recursive(value, new_path, result)
        elif isinstance(data, list):
            entry['value_type'] = 'array'
            entry['child_count'] = len(data)
            result.append(entry)
            for i, item in enumerate(data):
                new_path = f"{path}[{i}]" if path else f"[{i}]"
                StructureMapper._analyze_recursive(item, new_path, result)
        else:
            entry['value_type'] = type(data).__name__
            entry['value'] = str(data) if data is not None else 'null'
            result.append(entry)

    @staticmethod
    def compare_structures(source_data: Any, target_data: Any, 
                          source_format: str, target_format: str) -> Dict:
        source_structure = StructureMapper.analyze_structure(source_data)
        target_structure = StructureMapper.analyze_structure(target_data)
        
        changes = StructureMapper._find_changes(source_data, target_data)
        format_notes = StructureMapper._get_format_specific_notes(source_format, target_format)
        
        return {
            'source_structure': source_structure,
            'target_structure': target_structure,
            'changes': changes,
            'format_notes': format_notes
        }

    @staticmethod
    def _find_changes(source_data: Any, target_data: Any, path: str = "") -> List[Dict]:
        changes = []
        
        if isinstance(source_data, dict) and isinstance(target_data, dict):
            source_keys = set(source_data.keys())
            target_keys = set(target_data.keys())
            
            for key in source_keys - target_keys:
                changes.append({
                    'type': 'removed',
                    'path': f"{path}.{key}" if path else key,
                    'description': f"字段 '{key}' 在转换中被移除"
                })
            
            for key in target_keys - source_keys:
                changes.append({
                    'type': 'added',
                    'path': f"{path}.{key}" if path else key,
                    'description': f"字段 '{key}' 是转换过程中新增的"
                })
            
            for key in source_keys & target_keys:
                new_path = f"{path}.{key}" if path else key
                changes.extend(StructureMapper._find_changes(
                    source_data[key], target_data[key], new_path
                ))
        elif isinstance(source_data, list) and isinstance(target_data, list):
            if len(source_data) != len(target_data):
                changes.append({
                    'type': 'array_resized',
                    'path': path if path else 'root',
                    'description': f"数组长度从 {len(source_data)} 变为 {len(target_data)}"
                })
            
            min_len = min(len(source_data), len(target_data))
            for i in range(min_len):
                new_path = f"{path}[{i}]" if path else f"[{i}]"
                changes.extend(StructureMapper._find_changes(
                    source_data[i], target_data[i], new_path
                ))
        else:
            source_type = type(source_data).__name__
            target_type = type(target_data).__name__
            if source_type != target_type:
                changes.append({
                    'type': 'type_changed',
                    'path': path if path else 'root',
                    'description': f"类型从 {source_type} 变为 {target_type}",
                    'source_type': source_type,
                    'target_type': target_type
                })
        
        return changes

    @staticmethod
    def _get_format_specific_notes(source_format: str, target_format: str) -> List[str]:
        notes = []
        
        conversions = {
            ('json', 'yaml'): [
                "JSON的严格语法在YAML中变得更宽松",
                "支持的注释在YAML中被保留（如果启用）",
                "数值类型保持一致"
            ],
            ('json', 'xml'): [
                "JSON对象转换为XML元素",
                "数组转换为重复的XML元素",
                "根节点名称默认为'root'",
                "属性前缀'@'被添加到属性字段"
            ],
            ('json', 'ini'): [
                "嵌套JSON对象转换为INI节",
                "超过2层的嵌套可能被扁平化处理",
                "数组转换为逗号分隔的值列表",
                "null值转换为空字符串"
            ],
            ('yaml', 'json'): [
                "YAML注释在JSON中丢失（JSON不支持注释）",
                "YAML的多行字符串转换为JSON单行字符串",
                "严格的JSON语法检查"
            ],
            ('yaml', 'xml'): [
                "YAML结构映射到XML元素",
                "注释可以保留在XML中（如果启用）"
            ],
            ('yaml', 'ini'): [
                "YAML映射转换为INI节",
                "深层嵌套可能被简化"
            ],
            ('xml', 'json'): [
                "XML属性转换为带'@'前缀的JSON字段",
                "XML CDATA转换为'#text'字段",
                "命名空间声明可能被移除"
            ],
            ('xml', 'yaml'): [
                "XML元素转换为YAML映射",
                "属性变为常规字段"
            ],
            ('xml', 'ini'): [
                "XML结构被扁平化为INI节和键值对",
                "多层嵌套可能丢失层次信息"
            ],
            ('ini', 'json'): [
                "INI节转换为JSON对象",
                "字符串值被解析为适当的类型（数字、布尔值）",
                "列表值保持为数组"
            ],
            ('ini', 'yaml'): [
                "INI节转换为YAML映射",
                "注释可以保留（如果启用）"
            ],
            ('ini', 'xml'): [
                "INI节转换为XML元素",
                "键值对转换为子元素或属性"
            ]
        }
        
        key = (source_format.lower(), target_format.lower())
        if key in conversions:
            notes.extend(conversions[key])
        
        return notes

    @staticmethod
    def apply_mapping(data: Any, mapping_rules: Dict[str, str]) -> Any:
        if not mapping_rules:
            return data
        
        result = copy.deepcopy(data)
        
        for source_path, target_path in mapping_rules.items():
            try:
                value = StructureMapper._get_value_by_path(data, source_path)
                if value is not None:
                    result = StructureMapper._set_value_by_path(result, target_path, value)
                    if source_path != target_path:
                        result = StructureMapper._delete_value_by_path(result, source_path)
            except (KeyError, IndexError):
                continue
        
        return result

    @staticmethod
    def _get_value_by_path(data: Any, path: str) -> Any:
        parts = StructureMapper._parse_path(path)
        current = data
        for part in parts:
            if isinstance(current, dict) and isinstance(part, str):
                current = current[part]
            elif isinstance(current, list) and isinstance(part, int):
                current = current[part]
            else:
                raise KeyError(f"路径 '{path}' 无效")
        return current

    @staticmethod
    def _set_value_by_path(data: Any, path: str, value: Any) -> Any:
        parts = StructureMapper._parse_path(path)
        if not parts:
            return value
        
        result = copy.deepcopy(data) if data is not None else {}
        current = result
        
        for i, part in enumerate(parts[:-1]):
            next_part = parts[i + 1]
            
            if isinstance(part, str):
                if part not in current or not isinstance(current[part], (dict, list)):
                    current[part] = [] if isinstance(next_part, int) else {}
                current = current[part]
            elif isinstance(part, int):
                while len(current) <= part:
                    current.append([] if isinstance(next_part, int) else {})
                current = current[part]
        
        last_part = parts[-1]
        if isinstance(last_part, int):
            while len(current) <= last_part:
                current.append(None)
            current[last_part] = value
        else:
            current[last_part] = value
        
        return result

    @staticmethod
    def _delete_value_by_path(data: Any, path: str) -> Any:
        parts = StructureMapper._parse_path(path)
        if not parts:
            return data
        
        result = copy.deepcopy(data)
        
        def _delete_recursive(obj, parts_list, depth):
            if depth == len(parts_list) - 1:
                part = parts_list[depth]
                if isinstance(obj, dict) and isinstance(part, str):
                    obj.pop(part, None)
                elif isinstance(obj, list) and isinstance(part, int) and part < len(obj):
                    del obj[part]
                return
            
            part = parts_list[depth]
            next_obj = None
            if isinstance(obj, dict) and isinstance(part, str):
                next_obj = obj.get(part)
            elif isinstance(obj, list) and isinstance(part, int) and part < len(obj):
                next_obj = obj[part]
            
            if next_obj is not None:
                _delete_recursive(next_obj, parts_list, depth + 1)
                
                if isinstance(next_obj, (dict, list)) and len(next_obj) == 0:
                    if isinstance(obj, dict) and isinstance(part, str):
                        obj.pop(part, None)
                    elif isinstance(obj, list) and isinstance(part, int) and part < len(obj):
                        del obj[part]
        
        _delete_recursive(result, parts, 0)
        return result

    @staticmethod
    def _parse_path(path: str) -> List:
        parts = []
        current = ""
        i = 0
        
        while i < len(path):
            char = path[i]
            if char == '.':
                if current:
                    parts.append(current)
                    current = ""
                i += 1
            elif char == '[':
                if current:
                    parts.append(current)
                    current = ""
                end_idx = path.find(']', i)
                if end_idx != -1:
                    index_str = path[i + 1:end_idx]
                    try:
                        parts.append(int(index_str))
                    except ValueError:
                        parts.append(index_str)
                    i = end_idx + 1
                else:
                    i += 1
            else:
                current += char
                i += 1
        
        if current:
            parts.append(current)
        
        return parts

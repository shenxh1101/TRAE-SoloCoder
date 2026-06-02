from typing import Any, Dict, List, Callable, Tuple
import ast
import copy
import re


class MappingEngine:
    BUILTIN_FUNCTIONS = {
        'upper': lambda s: s.upper() if isinstance(s, str) else s,
        'lower': lambda s: s.lower() if isinstance(s, str) else s,
        'strip': lambda s: s.strip() if isinstance(s, str) else s,
        'capitalize': lambda s: s.capitalize() if isinstance(s, str) else s,
        'title': lambda s: s.title() if isinstance(s, str) else s,
        'replace': lambda s, old, new: s.replace(old, new) if isinstance(s, str) else s,
        'split': lambda s, sep=None: s.split(sep) if isinstance(s, str) else s,
        'join': lambda lst, sep='': sep.join(str(x) for x in lst) if isinstance(lst, list) else lst,
        'to_int': lambda x: int(x) if x is not None else None,
        'to_float': lambda x: float(x) if x is not None else None,
        'to_str': lambda x: str(x) if x is not None else None,
        'to_bool': lambda x: bool(x) if x is not None else None,
        'len': lambda x: len(x) if x is not None else 0,
        'type': lambda x: type(x).__name__,
        'is_none': lambda x: x is None,
        'not_none': lambda x: x is not None,
        'is_empty': lambda x: not x if x is not None else True,
        'not_empty': lambda x: bool(x) if x is not None else False,
        'remove_null': lambda d: {k: v for k, v in d.items() if v is not None} if isinstance(d, dict) else d,
        'remove_empty': lambda d: {k: v for k, v in d.items() if v not in (None, '', [], {})} if isinstance(d, dict) else d,
        'flatten_keys': lambda d, sep='_': MappingEngine._flatten_keys(d, sep),
        'unflatten_keys': lambda d, sep='_': MappingEngine._unflatten_keys(d, sep),
    }

    @staticmethod
    def _flatten_keys(d: Dict, sep: str = '_', parent_key: str = '') -> Dict:
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(MappingEngine._flatten_keys(v, sep, new_key).items())
            else:
                items.append((new_key, v))
        return dict(items)

    @staticmethod
    def _unflatten_keys(d: Dict, sep: str = '_') -> Dict:
        result = {}
        for k, v in d.items():
            keys = k.split(sep)
            current = result
            for key in keys[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]
            current[keys[-1]] = v
        return result

    @staticmethod
    def execute_script(data: Any, script: str) -> Any:
        if not script or not script.strip():
            return data
        
        try:
            ast.parse(script)
        except SyntaxError as e:
            raise ValueError(f"脚本语法错误: {e.msg} (第{e.lineno}行)")
        
        allowed_names = set(MappingEngine.BUILTIN_FUNCTIONS.keys())
        allowed_names.update({'data', 'result', 'copy', 're'})
        
        tree = ast.parse(script)
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                if node.id not in allowed_names and not node.id.startswith('_'):
                    raise ValueError(f"不允许使用变量/函数: {node.id}")
        
        safe_globals = {
            '__builtins__': {
                'True': True,
                'False': False,
                'None': None,
                'str': str,
                'int': int,
                'float': float,
                'bool': bool,
                'list': list,
                'dict': dict,
                'tuple': tuple,
                'len': len,
                'range': range,
                'enumerate': enumerate,
                'isinstance': isinstance,
                'type': type,
            },
            **MappingEngine.BUILTIN_FUNCTIONS,
            'copy': copy,
            're': re,
        }
        
        safe_locals = {
            'data': copy.deepcopy(data),
            'result': copy.deepcopy(data)
        }
        
        try:
            exec(compile(script, '<mapping_script>', 'exec'), safe_globals, safe_locals)
            return safe_locals.get('result', safe_locals.get('data', data))
        except Exception as e:
            raise RuntimeError(f"脚本执行错误: {str(e)}")

    @staticmethod
    def apply_field_mapping(data: Any, mappings: List[Dict]) -> Any:
        result = copy.deepcopy(data)
        
        for mapping in mappings:
            action = mapping.get('action', 'rename')
            source = mapping.get('source')
            target = mapping.get('target')
            transform = mapping.get('transform')
            condition = mapping.get('condition')
            
            if condition and not MappingEngine._evaluate_condition(data, condition):
                continue
            
            try:
                if action == 'rename' and source and target:
                    value = MappingEngine._get_value(data, source)
                    if value is not None:
                        result = MappingEngine._set_value(result, target, value)
                        if source != target:
                            result = MappingEngine._delete_value(result, source)
                elif action == 'copy' and source and target:
                    value = MappingEngine._get_value(data, source)
                    if value is not None:
                        result = MappingEngine._set_value(result, target, value)
                elif action == 'delete' and source:
                    result = MappingEngine._delete_value(result, source)
                elif action == 'transform' and source and transform:
                    value = MappingEngine._get_value(data, source)
                    if value is not None:
                        transformed = MappingEngine._apply_transform(value, transform)
                        result = MappingEngine._set_value(result, source, transformed)
                elif action == 'add' and target:
                    value = mapping.get('value')
                    result = MappingEngine._set_value(result, target, value)
            except (KeyError, IndexError):
                continue
        
        return result

    @staticmethod
    def _evaluate_condition(data: Any, condition: str) -> bool:
        try:
            safe_globals = {
                '__builtins__': {},
                **MappingEngine.BUILTIN_FUNCTIONS,
            }
            safe_locals = {'data': data}
            return bool(eval(condition, safe_globals, safe_locals))
        except:
            return False

    @staticmethod
    def _apply_transform(value: Any, transform: str) -> Any:
        if transform in MappingEngine.BUILTIN_FUNCTIONS:
            return MappingEngine.BUILTIN_FUNCTIONS[transform](value)
        
        try:
            safe_globals = {
                '__builtins__': {},
                **MappingEngine.BUILTIN_FUNCTIONS,
            }
            safe_locals = {'value': value}
            return eval(transform, safe_globals, safe_locals)
        except:
            return value

    @staticmethod
    def _get_value(data: Any, path: str) -> Any:
        parts = MappingEngine._parse_path(path)
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
    def _set_value(data: Any, path: str, value: Any) -> Any:
        parts = MappingEngine._parse_path(path)
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
    def _delete_value(data: Any, path: str) -> Any:
        parts = MappingEngine._parse_path(path)
        if not parts:
            return data
        
        result = copy.deepcopy(data)
        current = result
        
        for part in parts[:-1]:
            if isinstance(current, dict) and isinstance(part, str):
                current = current.get(part, {})
            elif isinstance(current, list) and isinstance(part, int) and part < len(current):
                current = current[part]
            else:
                return result
        
        last_part = parts[-1]
        if isinstance(current, dict) and isinstance(last_part, str):
            current.pop(last_part, None)
        elif isinstance(current, list) and isinstance(last_part, int) and last_part < len(current):
            del current[last_part]
        
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

    @staticmethod
    def validate_script(script: str) -> Tuple[bool, str]:
        if not script or not script.strip():
            return True, ""
        
        try:
            ast.parse(script)
        except SyntaxError as e:
            return False, f"语法错误: {e.msg} (第{e.lineno}行)"
        
        allowed_names = set(MappingEngine.BUILTIN_FUNCTIONS.keys())
        allowed_names.update({'data', 'result', 'copy', 're'})
        
        tree = ast.parse(script)
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                if node.id not in allowed_names and not node.id.startswith('_'):
                    return False, f"不允许使用: {node.id}"
        
        return True, ""

    @staticmethod
    def get_available_functions() -> List[Dict]:
        functions = []
        for name, func in MappingEngine.BUILTIN_FUNCTIONS.items():
            functions.append({
                'name': name,
                'description': MappingEngine._get_function_description(name),
                'signature': MappingEngine._get_function_signature(name)
            })
        return functions

    @staticmethod
    def _get_function_description(name: str) -> str:
        descriptions = {
            'upper': '转换为大写',
            'lower': '转换为小写',
            'strip': '去除首尾空白',
            'capitalize': '首字母大写',
            'title': '每个单词首字母大写',
            'replace': '替换字符串',
            'split': '分割字符串',
            'join': '连接列表为字符串',
            'to_int': '转换为整数',
            'to_float': '转换为浮点数',
            'to_str': '转换为字符串',
            'to_bool': '转换为布尔值',
            'len': '获取长度',
            'type': '获取类型名称',
            'is_none': '检查是否为None',
            'not_none': '检查是否不为None',
            'is_empty': '检查是否为空',
            'not_empty': '检查是否不为空',
            'remove_null': '移除值为None的键',
            'remove_empty': '移除空值的键',
            'flatten_keys': '扁平化嵌套字典的键',
            'unflatten_keys': '反扁平化字典的键',
        }
        return descriptions.get(name, '')

    @staticmethod
    def _get_function_signature(name: str) -> str:
        signatures = {
            'upper': 'upper(s)',
            'lower': 'lower(s)',
            'strip': 'strip(s)',
            'capitalize': 'capitalize(s)',
            'title': 'title(s)',
            'replace': 'replace(s, old, new)',
            'split': 'split(s, sep=None)',
            'join': 'join(lst, sep="")',
            'to_int': 'to_int(x)',
            'to_float': 'to_float(x)',
            'to_str': 'to_str(x)',
            'to_bool': 'to_bool(x)',
            'len': 'len(x)',
            'type': 'type(x)',
            'is_none': 'is_none(x)',
            'not_none': 'not_none(x)',
            'is_empty': 'is_empty(x)',
            'not_empty': 'not_empty(x)',
            'remove_null': 'remove_null(d)',
            'remove_empty': 'remove_empty(d)',
            'flatten_keys': 'flatten_keys(d, sep="_")',
            'unflatten_keys': 'unflatten_keys(d, sep="_")',
        }
        return signatures.get(name, name + '(...)')

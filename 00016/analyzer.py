import re
from collections import defaultdict
from typing import Dict, List, Tuple, Any
from pathlib import Path


class CodeAnalyzer:
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.lines = []
        self.language = self._detect_language()
        self._load_file()

    def _detect_language(self) -> str:
        ext = self.file_path.suffix.lower()
        lang_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby'
        }
        return lang_map.get(ext, 'unknown')

    def _load_file(self):
        try:
            with open(self.file_path, 'r', encoding='utf-8', errors='ignore') as f:
                self.lines = f.readlines()
        except Exception as e:
            raise ValueError(f"无法读取文件: {e}")

    def analyze(self) -> Dict[str, Any]:
        result = {
            'file_path': str(self.file_path),
            'file_name': self.file_path.name,
            'language': self.language,
            'total_lines': len(self.lines),
            'metrics': self._calculate_metrics(),
            'bad_smells': self._detect_bad_smells()
        }
        return result

    def _calculate_metrics(self) -> Dict[str, Any]:
        return {
            'max_function_length': self._max_function_length(),
            'max_nesting_level': self._max_nesting_level(),
            'duplicate_code': self._find_duplicate_code(),
            'comment_ratio': self._comment_ratio(),
            'function_count': self._count_functions(),
            'line_length_violations': self._long_lines_count(),
            'todo_count': self._count_todos()
        }

    def _max_function_length(self) -> Tuple[int, str, int]:
        max_len = 0
        longest_func = ""
        start_line = 0
        
        func_patterns = {
            'python': [r'^\s*def\s+(\w+)', r'^\s*class\s+\w+'],
            'javascript': [r'^\s*(function|const|let|var)\s*(\w+)?\s*[=:(]'],
            'java': [r'^\s*(public|private|protected)?\s*\w+\s+(\w+)\s*\('],
            'cpp': [r'^\s*\w[\w\s:*&]+\s+(\w+)\s*\('],
            'csharp': [r'^\s*(public|private|protected)?\s*\w+\s+(\w+)\s*\('],
            'go': [r'^\s*func\s+(\w+)'],
            'rust': [r'^\s*fn\s+(\w+)'],
            'php': [r'^\s*(public|private|protected)?\s*function\s+(\w+)'],
            'ruby': [r'^\s*def\s+(\w+)']
        }

        patterns = func_patterns.get(self.language, [r'^\s*\w+\s+\w+\s*\('])
        in_function = False
        current_func_start = 0
        current_func_name = ""
        brace_count = 0

        for i, line in enumerate(self.lines, 1):
            stripped = line.strip()
            
            if not in_function:
                for pattern in patterns:
                    match = re.search(pattern, line)
                    if match:
                        in_function = True
                        current_func_start = i
                        if match.groups():
                            current_func_name = match.group(match.lastindex) or "anonymous"
                        else:
                            current_func_name = "unknown"
                        if self.language == 'python':
                            pass
                        else:
                            brace_count = line.count('{') - line.count('}')
                        break
            else:
                if self.language == 'python':
                    if stripped and not line.startswith(' ') and not line.startswith('\t'):
                        func_len = i - current_func_start
                        if func_len > max_len:
                            max_len = func_len
                            longest_func = current_func_name
                            start_line = current_func_start
                        in_function = False
                else:
                    brace_count += line.count('{') - line.count('}')
                    if brace_count <= 0:
                        func_len = i - current_func_start + 1
                        if func_len > max_len:
                            max_len = func_len
                            longest_func = current_func_name
                            start_line = current_func_start
                        in_function = False

        if in_function:
            func_len = len(self.lines) - current_func_start + 1
            if func_len > max_len:
                max_len = func_len
                longest_func = current_func_name
                start_line = current_func_start

        return (max_len, longest_func, start_line)

    def _max_nesting_level(self) -> Tuple[int, int]:
        if self.language == 'python':
            return self._max_nesting_level_python()
        else:
            return self._max_nesting_level_general()

    def _max_nesting_level_python(self) -> Tuple[int, int]:
        max_level = 0
        worst_line = 0
        indent_stack = []
        
        keywords = ['if', 'for', 'while', 'with', 'try', 'except', 'elif', 'else', 'finally', 'def', 'class']
        
        for i, line in enumerate(self.lines, 1):
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                continue
            
            indent = len(line) - len(line.lstrip())
            
            while indent_stack and indent <= indent_stack[-1][0]:
                indent_stack.pop()
            
            has_block_keyword = False
            for kw in keywords:
                if re.match(rf'^\s*{kw}\b', line) or (kw in ['else', 'elif', 'except', 'finally'] and re.match(rf'^\s*{kw}\s*:', line)):
                    has_block_keyword = True
                    break
            
            if stripped.endswith(':') and has_block_keyword:
                indent_stack.append((indent, i))
            
            current_level = len(indent_stack)
            if current_level > max_level:
                max_level = current_level
                worst_line = i
        
        return (max_level, worst_line)

    def _max_nesting_level_general(self) -> Tuple[int, int]:
        max_level = 0
        worst_line = 0
        current_level = 0
        
        open_chars = '({['
        close_chars = ')}]'
        
        in_string = False
        string_char = ''
        
        for i, line in enumerate(self.lines, 1):
            line_level = current_level
            j = 0
            while j < len(line):
                char = line[j]
                
                if char in '"\'' and (j == 0 or line[j-1] != '\\'):
                    if not in_string:
                        in_string = True
                        string_char = char
                    elif char == string_char:
                        in_string = False
                elif not in_string:
                    if char in open_chars:
                        current_level += 1
                        line_level = current_level
                    elif char in close_chars:
                        current_level = max(0, current_level - 1)
                j += 1
            
            if line_level > max_level:
                max_level = line_level
                worst_line = i
        
        return (max_level, worst_line)

    def _find_duplicate_code(self, min_lines: int = 5) -> Dict[str, List[int]]:
        line_groups = defaultdict(list)
        normalized_lines = []
        
        for i, line in enumerate(self.lines):
            normalized = re.sub(r'\s+', ' ', line.strip())
            if normalized and not normalized.startswith(('//', '#', '*', '/*')):
                normalized_lines.append((i, normalized))
        
        for i in range(len(normalized_lines) - min_lines + 1):
            signature = '|'.join(normalized_lines[j][1] for j in range(i, i + min_lines))
            line_groups[signature].append(normalized_lines[i][0] + 1)
        
        duplicates = {k: v for k, v in line_groups.items() if len(v) > 1}
        return duplicates

    def _comment_ratio(self) -> float:
        if not self.lines:
            return 0.0
        
        comment_patterns = {
            'python': [r'^\s*#', r'^\s*"""', r'^\s*"""'],
            'javascript': [r'^\s*//', r'^\s*/\*', r'^\s*\*'],
            'java': [r'^\s*//', r'^\s*/\*', r'^\s*\*'],
            'cpp': [r'^\s*//', r'^\s*/\*', r'^\s*\*'],
            'csharp': [r'^\s*//', r'^\s*/\*', r'^\s*\*'],
            'go': [r'^\s*//', r'^\s*/\*'],
            'rust': [r'^\s*//', r'^\s*/\*'],
            'php': [r'^\s*//', r'^\s*#', r'^\s*/\*'],
            'ruby': [r'^\s*#', r'^=begin']
        }
        
        patterns = comment_patterns.get(self.language, [r'^\s*//', r'^\s*#'])
        comment_lines = 0
        
        for line in self.lines:
            for pattern in patterns:
                if re.match(pattern, line):
                    comment_lines += 1
                    break
        
        return round(comment_lines / len(self.lines) * 100, 2)

    def _count_functions(self) -> int:
        func_patterns = {
            'python': r'^\s*def\s+\w+',
            'javascript': r'^\s*(function\s+\w+|\w+\s*[:=]\s*function|\w+\s*[:=]\s*\([^)]*\)\s*=>)',
            'java': r'^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(',
            'cpp': r'^\s*\w[\w\s:*&]+\s+\w+\s*\([^)]*\)\s*\{?',
            'csharp': r'^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(',
            'go': r'^\s*func\s+\w+',
            'rust': r'^\s*fn\s+\w+',
            'php': r'^\s*(public|private|protected)?\s*function\s+\w+',
            'ruby': r'^\s*def\s+\w+'
        }
        
        pattern = func_patterns.get(self.language, r'\w+\s*\([^)]*\)\s*\{')
        count = 0
        
        for line in self.lines:
            if re.search(pattern, line):
                count += 1
        
        return count

    def _long_lines_count(self, max_length: int = 100) -> int:
        return sum(1 for line in self.lines if len(line.rstrip()) > max_length)

    def _count_todos(self) -> int:
        count = 0
        for line in self.lines:
            if re.search(r'(TODO|FIXME|XXX|HACK|BUG)', line, re.IGNORECASE):
                count += 1
        return count

    def _detect_bad_smells(self) -> List[Dict[str, Any]]:
        smells = []
        metrics = self._calculate_metrics()
        
        max_func_len, func_name, func_line = metrics['max_function_length']
        if max_func_len > 50:
            smells.append({
                'type': 'long_function',
                'severity': 'high' if max_func_len > 100 else 'medium',
                'message': f'函数 "{func_name}" 长达 {max_func_len} 行',
                'line': func_line,
                'suggestion': '考虑拆分这个巨无霸函数'
            })
        
        max_nesting, nest_line = metrics['max_nesting_level']
        if max_nesting > 4:
            smells.append({
                'type': 'deep_nesting',
                'severity': 'high' if max_nesting > 6 else 'medium',
                'message': f'嵌套深度达到 {max_nesting} 层',
                'line': nest_line,
                'suggestion': '尝试提前返回或提取方法来减少嵌套'
            })
        
        dup_count = len(metrics['duplicate_code'])
        if dup_count > 0:
            smells.append({
                'type': 'duplicate_code',
                'severity': 'high' if dup_count > 5 else 'medium',
                'message': f'发现 {dup_count} 处重复代码片段',
                'line': list(metrics['duplicate_code'].values())[0][0] if metrics['duplicate_code'] else 0,
                'suggestion': '提取公共代码，DRY原则了解一下'
            })
        
        if metrics['line_length_violations'] > 10:
            smells.append({
                'type': 'long_lines',
                'severity': 'low',
                'message': f'有 {metrics["line_length_violations"]} 行超过100字符',
                'line': 0,
                'suggestion': '换行是免费的，别吝啬'
            })
        
        if metrics['todo_count'] > 5:
            smells.append({
                'type': 'many_todos',
                'severity': 'low',
                'message': f'积压了 {metrics["todo_count"]} 个待办事项',
                'line': 0,
                'suggestion': '是时候清理这些技术债务了'
            })
        
        return smells

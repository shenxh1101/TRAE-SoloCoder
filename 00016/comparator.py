from typing import Dict, Any, List
from analyzer import CodeAnalyzer
from roaster import RoastGenerator


class CodeComparator:
    def __init__(self):
        self.roaster = RoastGenerator()

    def compare(self, file1_path: str, file2_path: str) -> Dict[str, Any]:
        analyzer1 = CodeAnalyzer(file1_path)
        analyzer2 = CodeAnalyzer(file2_path)
        
        result1 = analyzer1.analyze()
        result2 = analyzer2.analyze()
        
        roast1 = self.roaster.generate_report(result1)
        roast2 = self.roaster.generate_report(result2)
        
        comparison = {
            'file1': {
                'path': file1_path,
                'analysis': result1,
                'roast': roast1
            },
            'file2': {
                'path': file2_path,
                'analysis': result2,
                'roast': roast2
            },
            'differences': self._calculate_differences(result1, result2),
            'focus_change': self._analyze_focus_change(result1, result2)
        }
        
        return comparison

    def _calculate_differences(self, r1: Dict, r2: Dict) -> Dict[str, Any]:
        m1 = r1['metrics']
        m2 = r2['metrics']
        
        return {
            'lines_change': r2['total_lines'] - r1['total_lines'],
            'lines_change_percent': self._percent_change(r1['total_lines'], r2['total_lines']),
            'max_function_length_change': m2['max_function_length'][0] - m1['max_function_length'][0],
            'max_nesting_change': m2['max_nesting_level'][0] - m1['max_nesting_level'][0],
            'duplicate_count_change': len(m2['duplicate_code']) - len(m1['duplicate_code']),
            'function_count_change': m2['function_count'] - m1['function_count'],
            'long_lines_change': m2['line_length_violations'] - m1['line_length_violations'],
            'todo_count_change': m2['todo_count'] - m1['todo_count'],
            'comment_ratio_change': round(m2['comment_ratio'] - m1['comment_ratio'], 2),
            'score_change': self.roaster._calculate_score(m2, r2['bad_smells']) - 
                           self.roaster._calculate_score(m1, r1['bad_smells'])
        }

    def _percent_change(self, old: int, new: int) -> float:
        if old == 0:
            return 100.0 if new > 0 else 0.0
        return round((new - old) / old * 100, 2)

    def _analyze_focus_change(self, r1: Dict, r2: Dict) -> Dict[str, Any]:
        smells1 = {s['type']: s['severity'] for s in r1['bad_smells']}
        smells2 = {s['type']: s['severity'] for s in r2['bad_smells']}
        
        all_types = set(smells1.keys()) | set(smells2.keys())
        
        improved = []
        worsened = []
        new_issues = []
        fixed = []
        
        severity_order = {'low': 1, 'medium': 2, 'high': 3}
        
        for smell_type in all_types:
            if smell_type in smells1 and smell_type in smells2:
                s1 = severity_order.get(smells1[smell_type], 0)
                s2 = severity_order.get(smells2[smell_type], 0)
                if s2 < s1:
                    improved.append(smell_type)
                elif s2 > s1:
                    worsened.append(smell_type)
            elif smell_type in smells2:
                new_issues.append(smell_type)
            else:
                fixed.append(smell_type)
        
        return {
            'improved': improved,
            'worsened': worsened,
            'new_issues': new_issues,
            'fixed': fixed,
            'summary': self._generate_comparison_summary(improved, worsened, new_issues, fixed)
        }

    def _generate_comparison_summary(self, improved: List[str], worsened: List[str], 
                                     new_issues: List[str], fixed: List[str]) -> str:
        parts = []
        
        if fixed:
            parts.append(f"🎉 修复了 {len(fixed)} 个问题：{', '.join(fixed)}")
        
        if improved:
            parts.append(f"👍 改善了 {len(improved)} 个问题的严重程度")
        
        if new_issues:
            parts.append(f"⚠️  新增了 {len(new_issues)} 个问题：{', '.join(new_issues)}")
        
        if worsened:
            parts.append(f"👎 有 {len(worsened)} 个问题恶化了：{', '.join(worsened)}")
        
        if not parts:
            parts.append("🤔 代码质量没有明显变化，可能是在摸鱼？")
        
        return '\n'.join(parts)

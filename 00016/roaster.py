import random
from typing import Dict, List, Any
from dataclasses import dataclass


@dataclass
class RoastStyle:
    name: str
    weight: float = 1.0


class RoastGenerator:
    def __init__(self, style_preferences: Dict[str, float] = None):
        self.style_preferences = style_preferences or {
            'kitchen': 1.0,
            'construction': 1.0,
            'war': 1.0,
            'nature': 1.0,
            'office': 1.0
        }
        
        self._init_roast_templates()
        self._init_metaphors()
        self._init_suggestions()

    def _init_roast_templates(self):
        self.long_function_roasts = {
            'kitchen': [
                "这个函数比我奶奶炖的排骨汤还要长！🍖 熬了三天三夜都没这么多料。",
                "这哪是函数啊，这是满汉全席吧？🍱 一个函数装下了整个菜系。",
                "这个函数的长度，足够厨师从切菜做到上菜了。👨‍🍳",
                "看来有人把整个厨房都塞进一个锅里了！🍳 不溢出来才怪。"
            ],
            'construction': [
                "这个函数比工地的脚手架还要长！🏗️ 估计得搭电梯才能看完。",
                "这是在写函数还是在建长城？🧱 一段代码横跨几个时区。",
                "这个函数的长度，足够包工头从一楼骂到十楼了。📢",
                "看来有人把整个工地都堆在一个坑里了！⛏️"
            ],
            'war': [
                "这个函数比二战的战线还要长！⚔️ 打了好几年都没到头。",
                "这是函数还是史诗级战役？🗡️ 光读一遍就得休战三次。",
                "这个函数的长度，足够将军从制定战术打到投降了。🎖️",
                "看来有人把整个战场都压缩到一个函数里了！💣"
            ],
            'nature': [
                "这个函数比亚马逊河还要长！🌊 游到一半就得歇口气。",
                "这是函数还是热带雨林？🌴 走进去就出不来了。",
                "这个函数的长度，足够蜗牛从山脚爬到山顶了。🐌",
                "看来有人把整个食物链都塞进一个函数了！🦎"
            ],
            'office': [
                "这个函数比我的加班时间还要长！⏰ 看到下班打卡都不激动了。",
                "这是函数还是年度总结报告？📊 光目录就得翻半天。",
                "这个函数的长度，足够老板从周一开会开到周五了。📋",
                "看来有人把整个部门的KPI都堆进一个函数了！💼"
            ]
        }

        self.nesting_roasts = {
            'kitchen': [
                "这嵌套层数比洋葱还多！🧅 剥到最后只剩眼泪。",
                "套娃都没你这么能套！🪆 建议申请吉尼斯世界纪录。",
                "这嵌套深得像俄罗斯套娃的亲戚！🎁 打开一层还有一层。",
                "我猜你是想做千层蛋糕吧？🍰 但这是代码不是烘焙！"
            ],
            'construction': [
                "这嵌套比地下室还深！🕳️ 再挖就到地心了。",
                "地基都没你打得深！🏗️ 建议去修地铁隧道。",
                "这嵌套深得可以当古墓发掘了！⛏️ 里面说不定有宝藏。",
                "你这是在挖地下室还是写代码？🔧 小心挖到地下水！"
            ],
            'war': [
                "这嵌套比战壕还深！🎖️ 躲进去原子弹都炸不到。",
                "包围圈都没你这么多层！⚔️ 敌人看了都头疼。",
                "这嵌套深得可以当防空洞了！💣 进去就不想出来。",
                "你这是在布防线还是写代码？🛡️ 一层接一层！"
            ],
            'nature': [
                "这嵌套比马里亚纳海沟还深！🌊 水压得有多大啊。",
                "树洞都没你藏得深！🌳 松鼠看了都佩服。",
                "这嵌套深得可以当鲸鱼的家了！🐋 游进去都迷路。",
                "你这是在探索地心还是写代码？🌋 当心岩浆！"
            ],
            'office': [
                "这嵌套比公司的审批流程还复杂！📋 签个字得走十层。",
                "职级体系都没你这么多层级！🏢 实习生到CEO才几级？",
                "这嵌套深得可以当保密室了！🔒 机密文件都藏这里。",
                "你这是在做组织架构还是写代码？📊 层层汇报！"
            ]
        }

        self.duplicate_roasts = {
            'kitchen': [
                "这代码复制粘贴得比饭店的菜单还勤快！📋 是不是Ctrl+C/V按坏了？",
                "你是在做克隆实验吗？🧬 建议去生物实验室上班。",
                "这重复率比回锅肉还香！🥩 但代码不是做菜啊！",
                "看来Ctrl+C和Ctrl+V是你的最佳拍档！⌨️ 键盘都快磨平了。"
            ],
            'construction': [
                "这代码复制得比工地的砖头还统一！🧱 要不要给你发个模板奖？",
                "你是在盖筒子楼吗？🏢 每一层都一模一样。",
                "这重复率比豆腐渣工程还敷衍！🏗️ 就不能换个花样？",
                "看来蓝图只有一张啊！📐 贴满了整个项目。"
            ],
            'war': [
                "这代码复制得比战场上的炮灰还多！💣 是不是只会复制粘贴？",
                "你是在玩人海战术吗？⚔️ 代码多就能赢？",
                "这重复率比阅兵式还整齐！🎖️ 正步走得真标准。",
                "看来战术只有一种啊！📋 全军覆没都不带改的。"
            ],
            'nature': [
                "这代码复制得比蒲公英的种子还多！🌼 一吹就到处都是。",
                "你是在搞无性繁殖吗？🧬 一个模子刻出来的。",
                "这重复率比候鸟迁徙还准时！🦅 每年都来一遍。",
                "看来基因突变在这里不存在啊！🧪 完美复制。"
            ],
            'office': [
                "这代码复制得比周报模板还准时！📅 每周一交都是一模一样。",
                "你是在做PPT复制粘贴大赛吗？📊 每页内容都一样。",
                "这重复率比晨会内容还单调！📢 老板讲的段子都没变。",
                "看来你的创意都用在复制上了！💡 Ctrl+C比谁都快。"
            ]
        }

        self.overall_roasts = {
            'kitchen': [
                "这份代码简直就是厨房灾难现场！🔥 油锅着火、面粉爆炸、食材遍地...",
                "看完你的代码，我觉得外卖还是挺香的。🍱 至少不用自己收拾烂摊子。",
                "这代码比我家厨房还乱！🍳 找个变量像找锅铲一样难。",
                "建议把这个文件改名为 '厨房惨案.py' 🔪 受害者是所有维护者。"
            ],
            'construction': [
                "这份代码就是个烂尾楼工程！🏚️ 钢筋外露、墙体开裂、随时会塌...",
                "看完你的代码，我觉得城中村还是挺规整的。🏗️ 至少还有规划。",
                "这代码比工地还乱！🔨 找个函数像找建材一样难。",
                "建议把这个项目改名为 '豆腐渣工程.exe' 💥 谁用谁倒霉。"
            ],
            'war': [
                "这份代码就是战后废墟！💥 弹坑遍地、残垣断壁、满目疮痍...",
                "看完你的代码，我觉得和平真好。🕊️ 至少不用面对这些。",
                "这代码比战场还乱！⚔️ 找个变量像找敌军一样难。",
                "建议把这个文件改名为 '代码启示录.txt' 🔥 看过的人都疯了。"
            ],
            'nature': [
                "这份代码就是原始丛林！🌴 杂草丛生、野兽出没、没有路...",
                "看完你的代码，我觉得沙漠也挺不错的。🏜️ 至少视野开阔。",
                "这代码比雨林还乱！🦜 找个函数像探险一样。",
                "建议把这个项目改名为 '迷失代码世界.zip' 🌍 进去就出不来了。"
            ],
            'office': [
                "这份代码就是周五下午的办公室！🍻 混乱不堪、没人负责、随时跑路...",
                "看完你的代码，我觉得996还是挺幸福的。💼 至少有明确的痛苦。",
                "这代码比公司组织架构还乱！📊 找个变量像走流程一样难。",
                "建议把这个文件改名为 '离职交接必备.doc' 📋 看完就想辞职。"
            ]
        }

    def _init_metaphors(self):
        self.quality_metaphors = {
            'excellent': [
                ("米其林三星厨房", "✨"),
                ("精品艺术馆", "🎨"),
                ("皇家园林", "🏰"),
                ("瑞士钟表", "⌚")
            ],
            'good': [
                ("家庭厨房", "🍳"),
                ("普通小区", "🏘️"),
                ("城市公园", "🌳"),
                ("整洁工位", "💻")
            ],
            'average': [
                ("大学食堂", "🍱"),
                ("城中村", "🏚️"),
                ("路边公园", "🌿"),
                ("加班后的工位", "☕")
            ],
            'poor': [
                ("灾难厨房", "🔥"),
                ("烂尾楼工地", "🏗️"),
                ("垃圾填埋场", "🗑️"),
                ("爆炸现场", "💥")
            ],
            'terrible': [
                ("厨房惨案现场", "☠️"),
                ("地震废墟", "🏚️"),
                ("核污染区", "☢️"),
                ("世界末日", "🌋")
            ]
        }

    def _init_suggestions(self):
        self.refactor_suggestions = {
            'long_function': [
                "把这个巨型函数拆分成几个小函数，每个只做一件事",
                "提取重复逻辑到单独的工具函数",
                "考虑使用策略模式或命令模式来减少分支",
                "按照功能模块拆分，每个模块一个文件"
            ],
            'deep_nesting': [
                "使用提前返回（guard clause）减少嵌套",
                "把深层逻辑提取成独立的函数",
                "考虑使用多态替代条件分支",
                "使用状态模式简化复杂的条件判断"
            ],
            'duplicate_code': [
                "提取公共代码到基类或工具模块",
                "使用模板方法模式消除重复",
                "考虑使用组合而非继承来复用代码",
                "创建统一的配置或常量管理"
            ],
            'long_lines': [
                "把长表达式拆分成多个有意义的中间变量",
                "使用字符串拼接或模板字符串替代长字符串",
                "考虑使用配置文件或常量替代魔法值"
            ],
            'many_todos': [
                "先修复标有 FIXME 和 BUG 的项",
                "制定一个每周清理TODO的计划",
                "把TODO分配给具体的人和截止日期",
                "考虑使用项目管理工具跟踪技术债务"
            ]
        }

    def _select_style(self) -> str:
        styles = list(self.style_preferences.keys())
        weights = list(self.style_preferences.values())
        total = sum(weights)
        if total == 0:
            return random.choice(styles)
        normalized = [w / total for w in weights]
        return random.choices(styles, weights=normalized, k=1)[0]

    def generate_report(self, analysis_result: Dict[str, Any]) -> Dict[str, Any]:
        metrics = analysis_result['metrics']
        bad_smells = analysis_result['bad_smells']
        style = self._select_style()
        
        score = self._calculate_score(metrics, bad_smells)
        quality_level = self._get_quality_level(score)
        metaphor, emoji = random.choice(self.quality_metaphors[quality_level])
        
        roasts = []
        for smell in bad_smells:
            roast = self._generate_smell_roast(smell, style)
            roasts.append(roast)
        
        if not roasts:
            roasts = ["🎉 恭喜！这份代码居然找不到明显的槽点...是我太菜了吗？"]
        
        overall_roast = random.choice(self.overall_roasts[style]) if score < 60 else \
            "✨ 这份代码质量还不错，继续保持！（但别骄傲，我下次会挑出毛病的）"
        
        top_suggestions = self._get_top_suggestions(bad_smells, metrics)
        
        return {
            'file_name': analysis_result['file_name'],
            'language': analysis_result['language'],
            'total_lines': analysis_result['total_lines'],
            'score': score,
            'quality_level': quality_level,
            'metaphor': metaphor,
            'metaphor_emoji': emoji,
            'style_used': style,
            'overall_roast': overall_roast,
            'individual_roasts': roasts,
            'top_suggestions': top_suggestions,
            'metrics_summary': self._format_metrics(metrics)
        }

    def _calculate_score(self, metrics: Dict[str, Any], bad_smells: List[Dict]) -> int:
        score = 100
        
        max_func_len = metrics['max_function_length'][0]
        if max_func_len > 200:
            score -= 30
        elif max_func_len > 100:
            score -= 20
        elif max_func_len > 50:
            score -= 10
        
        max_nesting = metrics['max_nesting_level'][0]
        if max_nesting > 8:
            score -= 25
        elif max_nesting > 6:
            score -= 15
        elif max_nesting > 4:
            score -= 8
        
        dup_count = len(metrics['duplicate_code'])
        if dup_count > 10:
            score -= 25
        elif dup_count > 5:
            score -= 15
        elif dup_count > 0:
            score -= 8
        
        line_violations = metrics['line_length_violations']
        if line_violations > 30:
            score -= 10
        elif line_violations > 10:
            score -= 5
        
        todo_count = metrics['todo_count']
        if todo_count > 20:
            score -= 10
        elif todo_count > 10:
            score -= 5
        
        return max(0, min(100, score))

    def _get_quality_level(self, score: int) -> str:
        if score >= 80:
            return 'excellent'
        elif score >= 60:
            return 'good'
        elif score >= 40:
            return 'average'
        elif score >= 20:
            return 'poor'
        else:
            return 'terrible'

    def _generate_smell_roast(self, smell: Dict[str, Any], style: str) -> str:
        smell_type = smell['type']
        
        roast_map = {
            'long_function': self.long_function_roasts,
            'deep_nesting': self.nesting_roasts,
            'duplicate_code': self.duplicate_roasts,
            'long_lines': self.duplicate_roasts,
            'many_todos': self.duplicate_roasts
        }
        
        roasts = roast_map.get(smell_type, self.duplicate_roasts)
        style_roasts = roasts.get(style, roasts['office'])
        base_roast = random.choice(style_roasts)
        
        severity_emoji = {
            'high': '🔴',
            'medium': '🟡',
            'low': '🟢'
        }.get(smell['severity'], '⚪')
        
        return f"{severity_emoji} {smell['message']} - {base_roast}"

    def _get_top_suggestions(self, bad_smells: List[Dict], metrics: Dict) -> List[Dict]:
        suggestions = []
        severity_order = {'high': 0, 'medium': 1, 'low': 2}
        
        sorted_smells = sorted(
            bad_smells,
            key=lambda x: (severity_order.get(x['severity'], 3), -x.get('line', 0))
        )
        
        for smell in sorted_smells[:3]:
            smell_type = smell['type']
            suggestion_list = self.refactor_suggestions.get(smell_type, [])
            if suggestion_list:
                suggestions.append({
                    'problem': smell['message'],
                    'severity': smell['severity'],
                    'suggestion': random.choice(suggestion_list),
                    'type': smell_type
                })
        
        if len(suggestions) < 3:
            suggestions.append({
                'problem': '代码整体需要优化',
                'severity': 'medium',
                'suggestion': '考虑使用静态分析工具定期检查代码质量',
                'type': 'general'
            })
        
        return suggestions[:3]

    def _format_metrics(self, metrics: Dict[str, Any]) -> Dict[str, str]:
        max_func_len, func_name, _ = metrics['max_function_length']
        max_nesting, _ = metrics['max_nesting_level']
        dup_count = len(metrics['duplicate_code'])
        
        return {
            'max_function_length': f"{max_func_len} 行 ({func_name})" if func_name else f"{max_func_len} 行",
            'max_nesting_level': f"{max_nesting} 层",
            'duplicate_code_count': f"{dup_count} 处",
            'comment_ratio': f"{metrics['comment_ratio']}%",
            'function_count': f"{metrics['function_count']} 个",
            'long_lines': f"{metrics['line_length_violations']} 行",
            'todo_count': f"{metrics['todo_count']} 个"
        }

    def update_style_preference(self, style: str, score: int):
        if style in self.style_preferences:
            adjustment = (score - 5) / 5.0
            self.style_preferences[style] = max(0.1, self.style_preferences[style] + adjustment)

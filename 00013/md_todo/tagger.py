import re
from typing import Dict, List, Optional

from .models import TodoItem

DEFAULT_TAG_RULES: Dict[str, List[str]] = {
    "工作": ["工作", "项目", "会议", "汇报", "需求", "开发", "上线", "迭代"],
    "学习": ["学习", "课程", "读书", "笔记", "练习", "考试", "论文"],
    "生活": ["生活", "家务", "购物", "健身", "旅行", "聚餐", "搬家"],
    "健康": ["健康", "体检", "医院", "吃药", "运动", "睡眠"],
}

HASHTAG_PATTERN = re.compile(r"#(\S+)")


class ProjectTagger:
    def __init__(
        self,
        custom_rules: Optional[Dict[str, List[str]]] = None,
    ):
        self.tag_rules: Dict[str, List[str]] = dict(DEFAULT_TAG_RULES)
        if custom_rules:
            self.tag_rules.update(custom_rules)

    def _extract_hashtags(self, text: str) -> List[str]:
        return HASHTAG_PATTERN.findall(text)

    def tag(self, item: TodoItem) -> List[str]:
        tags = list(item.tags)
        text = (item.content + " " + (item.heading or "")).lower()

        for tag_name, keywords in self.tag_rules.items():
            for kw in keywords:
                if kw.lower() in text:
                    if tag_name not in tags:
                        tags.append(tag_name)
                    break

        hashtags = self._extract_hashtags(item.content)
        for ht in hashtags:
            clean = ht.strip("#")
            if clean and clean not in tags:
                tags.append(clean)

        return tags

    def apply(self, items: List[TodoItem]) -> List[TodoItem]:
        for item in items:
            item.tags = self.tag(item)
        return items

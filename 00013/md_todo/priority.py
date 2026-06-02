from typing import Dict, List, Optional

from .models import Priority, TodoItem

DEFAULT_PRIORITY_KEYWORDS: Dict[Priority, List[str]] = {
    Priority.URGENT: ["紧急", "立刻", "马上", "立即", "今天"],
    Priority.HIGH: ["尽快", "明天", "明天之前", "本周", "重要", "抓紧"],
    Priority.LOW: ["有空", "再说", "不急", "以后", "长期", "慢慢"],
}


class PriorityEngine:
    def __init__(
        self,
        custom_keywords: Optional[Dict[str, str]] = None,
    ):
        self.keyword_map: Dict[Priority, List[str]] = {}
        for p, words in DEFAULT_PRIORITY_KEYWORDS.items():
            self.keyword_map[p] = list(words)

        if custom_keywords:
            for keyword, level_name in custom_keywords.items():
                level = self._parse_level(level_name)
                if level is not None:
                    self.keyword_map.setdefault(level, []).append(keyword)

    @staticmethod
    def _parse_level(name: str) -> Optional[Priority]:
        mapping = {
            "urgent": Priority.URGENT,
            "紧急": Priority.URGENT,
            "high": Priority.HIGH,
            "高": Priority.HIGH,
            "normal": Priority.NORMAL,
            "普通": Priority.NORMAL,
            "low": Priority.LOW,
            "低": Priority.LOW,
        }
        return mapping.get(name.lower().strip())

    def evaluate(self, item: TodoItem) -> Priority:
        text = (item.content + " " + (item.heading or "")).lower()

        for priority in [Priority.URGENT, Priority.HIGH, Priority.LOW]:
            keywords = self.keyword_map.get(priority, [])
            for kw in keywords:
                if kw.lower() in text:
                    return priority

        return Priority.NORMAL

    def apply(self, items: List[TodoItem]) -> List[TodoItem]:
        for item in items:
            item.priority = self.evaluate(item)
        return items

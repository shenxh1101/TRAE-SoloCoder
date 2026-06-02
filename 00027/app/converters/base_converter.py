from abc import ABC, abstractmethod
from typing import Any, Dict, Tuple, List


class BaseConverter(ABC):
    format_name = ""
    file_extensions = []
    supports_comments = False

    @abstractmethod
    def load(self, content: str) -> Tuple[Any, List[Dict]]:
        pass

    @abstractmethod
    def dump(self, data: Any, comments: List[Dict] = None, **kwargs) -> str:
        pass

    @abstractmethod
    def validate(self, content: str) -> Tuple[bool, List[Dict]]:
        pass

    def normalize_to_dict(self, data: Any) -> Dict:
        return data if isinstance(data, dict) else {"value": data}

    def denormalize_from_dict(self, data: Dict) -> Any:
        if "value" in data and len(data) == 1:
            return data["value"]
        return data

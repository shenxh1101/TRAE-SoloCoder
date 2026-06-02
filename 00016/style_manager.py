import json
from pathlib import Path
from typing import Dict, Optional


class StylePreferenceManager:
    def __init__(self, config_dir: Optional[str] = None):
        if config_dir:
            self.config_path = Path(config_dir) / "roast_preferences.json"
        else:
            self.config_path = Path.home() / ".code_roaster" / "roast_preferences.json"
        
        self.preferences = self._load_preferences()

    def _load_preferences(self) -> Dict:
        default_prefs = {
            'style_weights': {
                'kitchen': 1.0,
                'construction': 1.0,
                'war': 1.0,
                'nature': 1.0,
                'office': 1.0
            },
            'ratings': [],
            'total_ratings': 0,
            'average_score': 5.0
        }
        
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    loaded = json.load(f)
                    default_prefs.update(loaded)
            except Exception:
                pass
        
        return default_prefs

    def save_preferences(self):
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(self.preferences, f, indent=2, ensure_ascii=False)

    def get_style_weights(self) -> Dict[str, float]:
        return self.preferences['style_weights'].copy()

    def rate_roast(self, style_used: str, score: int):
        if score < 1 or score > 10:
            raise ValueError("评分必须在 1-10 之间")
        
        self.preferences['ratings'].append({
            'style': style_used,
            'score': score,
            'timestamp': self._get_timestamp()
        })
        
        self.preferences['total_ratings'] += 1
        
        total = sum(r['score'] for r in self.preferences['ratings'])
        self.preferences['average_score'] = round(total / len(self.preferences['ratings']), 2)
        
        self._update_style_weight(style_used, score)
        self.save_preferences()

    def _update_style_weight(self, style: str, score: int):
        adjustment = (score - 5) / 5.0
        current = self.preferences['style_weights'].get(style, 1.0)
        new_weight = max(0.1, min(5.0, current + adjustment))
        self.preferences['style_weights'][style] = round(new_weight, 2)

    def _get_timestamp(self) -> str:
        from datetime import datetime
        return datetime.now().isoformat()

    def get_statistics(self) -> Dict:
        stats = {
            'total_ratings': self.preferences['total_ratings'],
            'average_score': self.preferences['average_score'],
            'style_weights': self.preferences['style_weights'],
            'top_style': self._get_top_style(),
            'recent_ratings': self.preferences['ratings'][-10:]
        }
        return stats

    def _get_top_style(self) -> str:
        weights = self.preferences['style_weights']
        return max(weights.items(), key=lambda x: x[1])[0]

    def reset_preferences(self):
        self.preferences = {
            'style_weights': {
                'kitchen': 1.0,
                'construction': 1.0,
                'war': 1.0,
                'nature': 1.0,
                'office': 1.0
            },
            'ratings': [],
            'total_ratings': 0,
            'average_score': 5.0
        }
        self.save_preferences()

import os
import json
from datetime import datetime
from typing import Dict, List, Optional


class HistoryManager:
    def __init__(self, history_file: str = "output/history.json"):
        self.history_file = history_file
        os.makedirs(os.path.dirname(history_file), exist_ok=True)
        self._ensure_file()

    def _ensure_file(self):
        if not os.path.exists(self.history_file):
            with open(self.history_file, "w", encoding="utf-8") as f:
                json.dump({"records": []}, f, indent=2, ensure_ascii=False)

    def _read_all(self) -> Dict:
        try:
            with open(self.history_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {"records": []}

    def _write_all(self, data: Dict):
        with open(self.history_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def add_record(self, 
                   comparison_data: Dict,
                   ai_comment: Dict,
                   report_path: str) -> str:
        record_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        winner = comparison_data.get("winner")
        record = {
            "id": record_id,
            "timestamp": datetime.now().isoformat(),
            "stock1": comparison_data["stock1"]["code"],
            "stock2": comparison_data["stock2"]["code"],
            "period_days": comparison_data["period_days"],
            "winner": winner,
            "comparison": {
                "stock1": {
                    "change_percent": comparison_data["stock1"]["change_percent"],
                    "end_price": comparison_data["stock1"]["end_price"],
                    "pe_percentile": (comparison_data["stock1"].get("pe") or {}).get("percentile"),
                    "volatility": comparison_data["stock1"].get("volatility")
                },
                "stock2": {
                    "change_percent": comparison_data["stock2"]["change_percent"],
                    "end_price": comparison_data["stock2"]["end_price"],
                    "pe_percentile": (comparison_data["stock2"].get("pe") or {}).get("percentile"),
                    "volatility": comparison_data["stock2"].get("volatility")
                },
                "winner": winner
            },
            "ai_summary": ai_comment.get("summary"),
            "report_path": os.path.abspath(report_path)
        }

        data = self._read_all()
        data["records"].insert(0, record)
        self._write_all(data)
        
        return record_id

    def get_records(self, 
                    stock_code: Optional[str] = None,
                    limit: int = 20) -> List[Dict]:
        data = self._read_all()
        records = data.get("records", [])
        
        if stock_code:
            records = [
                r for r in records
                if r["stock1"] == stock_code or r["stock2"] == stock_code
            ]
        
        return records[:limit]

    def get_pairs(self) -> List[Dict]:
        data = self._read_all()
        records = data.get("records", [])
        
        pairs = {}
        for r in records:
            pair_key = tuple(sorted([r["stock1"], r["stock2"]]))
            if pair_key not in pairs:
                pairs[pair_key] = {
                    "stock1": pair_key[0],
                    "stock2": pair_key[1],
                    "count": 0,
                    "last_compare": r["timestamp"]
                }
            pairs[pair_key]["count"] += 1
            pairs[pair_key]["last_compare"] = r["timestamp"]
        
        return sorted(pairs.values(), key=lambda x: x["last_compare"], reverse=True)

    def get_trend(self, stock1: str, stock2: str, limit: int = 10) -> List[Dict]:
        records = self.get_records()
        
        trend = []
        for r in records:
            if (r["stock1"] == stock1 and r["stock2"] == stock2) or \
               (r["stock1"] == stock2 and r["stock2"] == stock1):
                trend.append(r)
                if len(trend) >= limit:
                    break
        
        return trend[::-1]

    def print_history(self, limit: int = 10):
        records = self.get_records(limit=limit)
        
        if not records:
            print("\n📭 暂无历史对比记录\n")
            return
        
        print(f"\n{'=' * 80}")
        print(f"  📋 历史对比记录 (最近{len(records)}条)")
        print(f"{'=' * 80}")
        print(f"{'序号':<6}{'股票组合':<25}{'周期':<8}{'胜方':<12}{'时间':<20}")
        print(f"{'-' * 80}")
        
        for i, r in enumerate(records, 1):
            pair = f"{r['stock1']} vs {r['stock2']}"
            period = f"{r['period_days']}天"
            winner = r.get("winner", "平局")
            time_str = r["timestamp"].replace("T", " ")[:19]
            
            print(f"{i:<6}{pair:<25}{period:<8}{winner:<12}{time_str:<20}")
        
        print(f"{'=' * 80}\n")

    def print_trend(self, stock1: str, stock2: str, limit: int = 10):
        trend = self.get_trend(stock1, stock2, limit)
        
        if not trend:
            print(f"\n📭 暂无 {stock1} vs {stock2} 的历史对比记录\n")
            return
        
        print(f"\n{'=' * 80}")
        print(f"  📈 {stock1} vs {stock2} 历史对比趋势")
        print(f"{'=' * 80}")
        print(f"{'序号':<6}{'时间':<20}{stock1 + ' 涨跌幅':<15}{stock2 + ' 涨跌幅':<15}{'胜方':<12}")
        print(f"{'-' * 80}")
        
        for i, r in enumerate(trend, 1):
            if r["stock1"] == stock1:
                c1 = r["comparison"]["stock1"]["change_percent"]
                c2 = r["comparison"]["stock2"]["change_percent"]
            else:
                c1 = r["comparison"]["stock2"]["change_percent"]
                c2 = r["comparison"]["stock1"]["change_percent"]
            
            time_str = r["timestamp"].replace("T", " ")[:19]
            c1_str = f"+{c1}%" if c1 and c1 > 0 else f"{c1}%" if c1 else "-"
            c2_str = f"+{c2}%" if c2 and c2 > 0 else f"{c2}%" if c2 else "-"
            winner = r.get("winner", "平局")
            
            print(f"{i:<6}{time_str:<20}{c1_str:<15}{c2_str:<15}{winner:<12}")
        
        print(f"{'=' * 80}\n")

    def clear(self) -> int:
        count = len(self._read_all().get("records", []))
        self._write_all({"records": []})
        return count

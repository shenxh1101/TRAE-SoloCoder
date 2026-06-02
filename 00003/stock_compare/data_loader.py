import os
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, Tuple


class DataLoader:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)

    def _get_csv_path(self, stock_code: str) -> str:
        return os.path.join(self.data_dir, f"{stock_code}.csv")

    def load_stock_data(self, stock_code: str, period_days: int = 7) -> Optional[pd.DataFrame]:
        csv_path = self._get_csv_path(stock_code)
        
        if not os.path.exists(csv_path):
            print(f"警告: 未找到股票 {stock_code} 的数据文件 {csv_path}")
            return None

        try:
            df = pd.read_csv(csv_path)
            
            required_columns = ["date", "close", "high", "low", "volume"]
            for col in required_columns:
                if col not in df.columns:
                    print(f"警告: {stock_code} 的CSV文件缺少必需列: {col}")
                    return None

            df["date"] = pd.to_datetime(df["date"])
            df = df.sort_values("date", ascending=True)
            
            if period_days and len(df) > period_days:
                df = df.tail(period_days).reset_index(drop=True)
            
            return df

        except Exception as e:
            print(f"读取股票 {stock_code} 数据时出错: {e}")
            return None

    def get_price_series(self, stock_code: str, period_days: int = 7) -> Optional[Tuple[list, list]]:
        df = self.load_stock_data(stock_code, period_days)
        if df is None or df.empty:
            return None
        
        dates = df["date"].dt.strftime("%Y-%m-%d").tolist()
        prices = df["close"].tolist()
        return dates, prices

    def get_stock_info(self, stock_code: str) -> Optional[dict]:
        csv_path = self._get_csv_path(stock_code)
        if not os.path.exists(csv_path):
            return None
        
        try:
            df = pd.read_csv(csv_path)
            if df.empty:
                return None
            
            latest = df.iloc[-1]
            return {
                "code": stock_code,
                "latest_price": latest.get("close", 0),
                "latest_date": latest.get("date", ""),
                "volume": latest.get("volume", 0),
                "high": latest.get("high", 0),
                "low": latest.get("low", 0)
            }
        except Exception as e:
            print(f"获取股票 {stock_code} 信息时出错: {e}")
            return None

    def list_available_stocks(self) -> list:
        stocks = []
        for filename in os.listdir(self.data_dir):
            if filename.endswith(".csv"):
                stock_code = filename[:-4]
                stocks.append(stock_code)
        return sorted(stocks)

import pandas as pd
import numpy as np
from typing import Dict, Optional, Tuple


class StockAnalyzer:
    @staticmethod
    def calculate_change_percent(df: pd.DataFrame) -> Optional[float]:
        if df is None or len(df) < 2:
            return None
        
        start_price = df.iloc[0]["close"]
        end_price = df.iloc[-1]["close"]
        
        if start_price == 0:
            return None
        
        change_pct = ((end_price - start_price) / start_price) * 100
        return round(change_pct, 2)

    @staticmethod
    def calculate_daily_returns(df: pd.DataFrame) -> Optional[pd.Series]:
        if df is None or len(df) < 2:
            return None
        
        returns = df["close"].pct_change() * 100
        return returns.round(2).dropna()

    @staticmethod
    def simulate_pe_percentile(df: pd.DataFrame, 
                                current_pe: Optional[float] = None,
                                history_days: int = 252) -> Optional[Dict]:
        if df is None or len(df) < 5:
            return None
        
        if current_pe is None:
            latest_price = df.iloc[-1]["close"]
            avg_earnings = np.random.uniform(0.5, 5.0)
            current_pe = latest_price / avg_earnings if avg_earnings > 0 else 20.0
        
        np.random.seed(hash(tuple(df["close"].tail(20).tolist())) % 10000)
        historical_pes = np.random.normal(loc=current_pe, scale=current_pe * 0.3, size=history_days)
        historical_pes = np.abs(historical_pes)
        historical_pes = np.clip(historical_pes, current_pe * 0.3, current_pe * 3.0)
        
        percentile = (np.sum(historical_pes <= current_pe) / len(historical_pes)) * 100
        
        min_pe = round(float(np.min(historical_pes)), 2)
        max_pe = round(float(np.max(historical_pes)), 2)
        mean_pe = round(float(np.mean(historical_pes)), 2)
        median_pe = round(float(np.median(historical_pes)), 2)
        current_pe_rounded = round(float(current_pe), 2)
        
        return {
            "current_pe": current_pe_rounded,
            "percentile": round(percentile, 1),
            "min_pe": min_pe,
            "max_pe": max_pe,
            "mean_pe": mean_pe,
            "median_pe": median_pe,
            "history_days": history_days,
            "valuation": _get_valuation_label(percentile)
        }

    @staticmethod
    def calculate_volatility(df: pd.DataFrame) -> Optional[float]:
        if df is None or len(df) < 5:
            return None
        
        daily_returns = df["close"].pct_change().dropna()
        volatility = daily_returns.std() * 100
        return round(volatility, 2)

    @staticmethod
    def calculate_max_drawdown(df: pd.DataFrame) -> Optional[float]:
        if df is None or len(df) < 2:
            return None
        
        cumulative = (1 + df["close"].pct_change().fillna(0)).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max * 100
        max_dd = drawdown.min()
        return round(max_dd, 2)

    @staticmethod
    def compare_stocks(df1: pd.DataFrame, df2: pd.DataFrame, 
                       stock1_code: str, stock2_code: str,
                       period_days: int) -> Dict:
        change1 = StockAnalyzer.calculate_change_percent(df1)
        change2 = StockAnalyzer.calculate_change_percent(df2)
        
        pe1 = StockAnalyzer.simulate_pe_percentile(df1)
        pe2 = StockAnalyzer.simulate_pe_percentile(df2)
        
        vol1 = StockAnalyzer.calculate_volatility(df1)
        vol2 = StockAnalyzer.calculate_volatility(df2)
        
        dd1 = StockAnalyzer.calculate_max_drawdown(df1)
        dd2 = StockAnalyzer.calculate_max_drawdown(df2)
        
        winner = None
        if change1 is not None and change2 is not None:
            if change1 > change2:
                winner = stock1_code
            elif change2 > change1:
                winner = stock2_code
        
        return {
            "period_days": period_days,
            "stock1": {
                "code": stock1_code,
                "change_percent": change1,
                "pe": pe1,
                "volatility": vol1,
                "max_drawdown": dd1,
                "start_price": df1.iloc[0]["close"] if len(df1) > 0 else None,
                "end_price": df1.iloc[-1]["close"] if len(df1) > 0 else None
            },
            "stock2": {
                "code": stock2_code,
                "change_percent": change2,
                "pe": pe2,
                "volatility": vol2,
                "max_drawdown": dd2,
                "start_price": df2.iloc[0]["close"] if len(df2) > 0 else None,
                "end_price": df2.iloc[-1]["close"] if len(df2) > 0 else None
            },
            "winner": winner
        }


def _get_valuation_label(percentile: float) -> str:
    if percentile < 20:
        return "严重低估"
    elif percentile < 40:
        return "相对低估"
    elif percentile < 60:
        return "估值合理"
    elif percentile < 80:
        return "相对高估"
    else:
        return "严重高估"

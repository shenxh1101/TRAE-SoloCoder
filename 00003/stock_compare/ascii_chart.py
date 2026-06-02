from typing import List, Tuple, Optional


class ASCIIChart:
    @staticmethod
    def plot_two_lines(data1: Tuple[List[str], List[float]], 
                       data2: Tuple[List[str], List[float]],
                       label1: str = "Stock1",
                       label2: str = "Stock2",
                       height: int = 15,
                       width: int = 80) -> str:
        dates1, prices1 = data1
        dates2, prices2 = data2
        
        if not prices1 or not prices2:
            return "数据不足，无法生成图表"
        
        n_points = min(len(prices1), len(prices2), len(dates1), len(dates2))
        prices1 = prices1[:n_points]
        prices2 = prices2[:n_points]
        dates = dates1[:n_points]
        
        norm_prices1 = _normalize_to_percent(prices1)
        norm_prices2 = _normalize_to_percent(prices2)
        
        all_values = norm_prices1 + norm_prices2
        min_val = min(all_values)
        max_val = max(all_values)
        
        val_range = max_val - min_val if max_val != min_val else 1
        
        chart_width = min(width, n_points * 3)
        step = max(1, n_points // (chart_width // 3))
        
        sampled_indices = list(range(0, n_points, step))
        
        p1_sampled = [norm_prices1[i] for i in sampled_indices]
        p2_sampled = [norm_prices2[i] for i in sampled_indices]
        dates_sampled = [dates[i] for i in sampled_indices]
        
        lines = []
        
        lines.append(f"\n{'=' * width}")
        lines.append(f"  走势对比图 (归一化涨跌幅, {label1} vs {label2})")
        lines.append(f"{'=' * width}")
        lines.append(f"  图例: * = {label1}, # = {label2}, @ = 重合")
        lines.append(f"{'-' * width}")
        
        for row in range(height):
            y_pos = height - 1 - row
            y_val = min_val + (y_pos / (height - 1)) * val_range
            
            if y_pos == 0:
                prefix = f"{min_val:>7.1f}% "
            elif y_pos == height - 1:
                prefix = f"{max_val:>7.1f}% "
            elif y_pos == height // 2:
                prefix = f"{(min_val + max_val) / 2:>7.1f}% "
            else:
                prefix = "         "
            
            line_chars = [" "] * (len(sampled_indices) * 3)
            
            for i, (p1, p2) in enumerate(zip(p1_sampled, p2_sampled)):
                y1_idx = round((p1 - min_val) / val_range * (height - 1))
                y2_idx = round((p2 - min_val) / val_range * (height - 1))
                
                pos = i * 3 + 1
                
                if y1_idx == y_pos and y2_idx == y_pos:
                    line_chars[pos] = "@"
                elif y1_idx == y_pos:
                    line_chars[pos] = "*"
                elif y2_idx == y_pos:
                    line_chars[pos] = "#"
                elif y1_idx > y_pos >= y2_idx or y2_idx > y_pos >= y1_idx:
                    if abs(y1_idx - y_pos) <= 1 or abs(y2_idx - y_pos) <= 1:
                        line_chars[pos] = "·"
            
            lines.append(prefix + "│" + "".join(line_chars))
        
        lines.append("         └" + "─" * (len(sampled_indices) * 3))
        
        date_label = ""
        for i, d in enumerate(dates_sampled):
            if i % max(1, len(dates_sampled) // 6) == 0:
                date_label += d[5:] + " "
        
        lines.append(f"           {date_label}")
        lines.append(f"{'-' * width}")
        
        lines.append(f"\n  统计信息:")
        lines.append(f"  {label1}: 起始 {prices1[0]:.2f} → 最终 {prices1[-1]:.2f}, "
                     f"涨幅 {norm_prices1[-1]:.2f}%")
        lines.append(f"  {label2}: 起始 {prices2[0]:.2f} → 最终 {prices2[-1]:.2f}, "
                     f"涨幅 {norm_prices2[-1]:.2f}%")
        lines.append(f"{'=' * width}\n")
        
        return "\n".join(lines)

    @staticmethod
    def plot_single_line(data: Tuple[List[str], List[float]], 
                         label: str = "Stock",
                         height: int = 10,
                         width: int = 60) -> str:
        dates, prices = data
        
        if not prices:
            return "数据不足"
        
        n_points = min(len(prices), len(dates))
        prices = prices[:n_points]
        dates = dates[:n_points]
        
        min_p, max_p = min(prices), max(prices)
        val_range = max_p - min_p if max_p != min_p else 1
        
        step = max(1, n_points // (width // 3))
        sampled_idx = list(range(0, n_points, step))
        p_sampled = [prices[i] for i in sampled_idx]
        d_sampled = [dates[i] for i in sampled_idx]
        
        lines = [f"\n  {label} 走势图", f"{'-' * width}"]
        
        for row in range(height):
            y_pos = height - 1 - row
            y_val = min_p + (y_pos / (height - 1)) * val_range
            
            if y_pos == 0:
                prefix = f"{min_p:>8.2f} "
            elif y_pos == height - 1:
                prefix = f"{max_p:>8.2f} "
            else:
                prefix = "         "
            
            chars = [" "] * (len(sampled_idx) * 3)
            for i, p in enumerate(p_sampled):
                y_idx = round((p - min_p) / val_range * (height - 1))
                if y_idx == y_pos:
                    chars[i * 3 + 1] = "*"
            
            lines.append(prefix + "│" + "".join(chars))
        
        lines.append("         └" + "─" * (len(sampled_idx) * 3))
        
        date_str = ""
        for i, d in enumerate(d_sampled):
            if i % max(1, len(d_sampled) // 5) == 0:
                date_str += d[5:] + "  "
        
        lines.append(f"           {date_str}\n")
        
        return "\n".join(lines)


def _normalize_to_percent(prices: List[float]) -> List[float]:
    if not prices or prices[0] == 0:
        return prices
    base = prices[0]
    return [(p - base) / base * 100 for p in prices]

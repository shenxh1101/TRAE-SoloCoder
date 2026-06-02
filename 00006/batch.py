import csv
import os
from typing import Optional

from generator import generate_script, Script
from exporter import export_scripts_batch


def read_products_from_csv(csv_path: str) -> list[dict]:
    products = []
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            product_name = row.get("商品名称", row.get("product_name", "")).strip()
            sp1 = row.get("卖点1", row.get("selling_point_1", "")).strip()
            sp2 = row.get("卖点2", row.get("selling_point_2", "")).strip()
            sp3 = row.get("卖点3", row.get("selling_point_3", "")).strip()
            style = row.get("风格偏好", row.get("style", "")).strip() or None

            if not product_name:
                continue
            selling_points = [sp for sp in [sp1, sp2, sp3] if sp]
            if not selling_points:
                continue

            products.append({
                "product_name": product_name,
                "selling_points": selling_points,
                "preferred_style": style,
            })
    return products


def batch_generate(csv_path: str, output_dir: str, fmt: str = "txt", include_tips: bool = True) -> list[str]:
    products = read_products_from_csv(csv_path)
    if not products:
        return []

    scripts: list[Script] = []
    for p in products:
        script = generate_script(
            product_name=p["product_name"],
            selling_points=p["selling_points"],
            preferred_style=p.get("preferred_style"),
        )
        scripts.append(script)

    return export_scripts_batch(scripts, output_dir, fmt=fmt, include_tips=include_tips)

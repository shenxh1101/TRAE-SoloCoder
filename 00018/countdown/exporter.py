import csv
import os


def export_to_csv(data: list, filepath: str) -> str:
    fieldnames = ["date", "days_remaining", "style", "copy"]

    file_exists = os.path.exists(filepath)

    with open(filepath, "a", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)

        if not file_exists or os.path.getsize(filepath) == 0:
            writer.writeheader()

        for row in data:
            writer.writerow(
                {
                    "date": row["date"],
                    "days_remaining": row["days_remaining"],
                    "style": row["style"],
                    "copy": row["copy"],
                }
            )

    return filepath


def export_all_styles(data_dict: dict, filepath: str) -> str:
    all_rows = []
    for style, entries in data_dict.items():
        all_rows.extend(entries)

    all_rows.sort(key=lambda x: (x["date"], x["style"]))

    fieldnames = ["date", "days_remaining", "style", "copy"]

    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in all_rows:
            writer.writerow(
                {
                    "date": row["date"],
                    "days_remaining": row["days_remaining"],
                    "style": row["style"],
                    "copy": row["copy"],
                }
            )

    return filepath

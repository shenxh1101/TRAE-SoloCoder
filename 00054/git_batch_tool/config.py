import json
import csv
import os
from pathlib import Path
from typing import List, Dict, Optional


class ConfigManager:
    def __init__(self, config_path: str = None):
        self.config_path = config_path or os.path.join(os.getcwd(), "repos.json")
        self.repos: List[Dict] = []
        self.load_config()

    def load_config(self) -> None:
        if os.path.exists(self.config_path):
            with open(self.config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.repos = data.get("repos", []) if isinstance(data, dict) else data
        else:
            self.repos = []

    def save_config(self) -> None:
        config_dir = os.path.dirname(self.config_path)
        if config_dir and not os.path.exists(config_dir):
            os.makedirs(config_dir)
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump({"repos": self.repos}, f, indent=2, ensure_ascii=False)

    def add_repo(self, name: str, path: str, tags: List[str] = None, enabled: bool = True) -> None:
        repo = {
            "name": name,
            "path": str(Path(path).expanduser().resolve()),
            "tags": tags or [],
            "enabled": enabled
        }
        self.repos.append(repo)

    def remove_repo(self, name: str) -> bool:
        original_count = len(self.repos)
        self.repos = [r for r in self.repos if r["name"] != name]
        return len(self.repos) < original_count

    def get_repos(self, exclude_tags: List[str] = None, include_tags: List[str] = None,
                  exclude_repos: List[str] = None) -> List[Dict]:
        repos = [r for r in self.repos if r.get("enabled", True)]
        if exclude_tags:
            repos = [r for r in repos if not any(t in exclude_tags for t in r.get("tags", []))]
        if include_tags:
            repos = [r for r in repos if any(t in include_tags for t in r.get("tags", []))]
        if exclude_repos:
            repos = [r for r in repos if r["name"] not in exclude_repos and r["path"] not in exclude_repos]
        return repos

    def import_from_csv(self, csv_path: str) -> int:
        count = 0
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get("name", row.get("repo_name", ""))
                path = row.get("path", row.get("repo_path", ""))
                tags = row.get("tags", "").split(";") if row.get("tags") else []
                enabled = row.get("enabled", "true").lower() != "false"
                if name and path:
                    self.add_repo(name, path, tags, enabled)
                    count += 1
        return count

    def export_to_csv(self, csv_path: str) -> None:
        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["name", "path", "tags", "enabled"])
            writer.writeheader()
            for repo in self.repos:
                writer.writerow({
                    "name": repo["name"],
                    "path": repo["path"],
                    "tags": ";".join(repo.get("tags", [])),
                    "enabled": repo.get("enabled", True)
                })

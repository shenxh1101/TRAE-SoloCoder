import json
import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import ATLAS_DIR
from .models import Species
from .storage import save_species, load_species, _sanitize_filename
from .html_generator import generate_html_gallery


class AtlasManager:
    def __init__(self, atlas_dir: Optional[Path] = None):
        self.atlas_dir = atlas_dir or ATLAS_DIR
        self.atlas_dir.mkdir(parents=True, exist_ok=True)
        self.species_dir = self.atlas_dir / "species"
        self.species_dir.mkdir(exist_ok=True)
        self.html_dir = self.atlas_dir / "html"
        self.html_dir.mkdir(exist_ok=True)
        self.index_file = self.atlas_dir / "atlas_index.json"

    def _load_index(self) -> Dict[str, Any]:
        if self.index_file.exists():
            with open(self.index_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"species": [], "metadata": {"count": 0, "created_at": None}}

    def _save_index(self, index: Dict[str, Any]) -> None:
        if index["metadata"]["created_at"] is None:
            from datetime import datetime
            index["metadata"]["created_at"] = datetime.now().isoformat()
        with open(self.index_file, "w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, indent=2)

    def add_species(self, species: Species) -> bool:
        index = self._load_index()

        if any(s["id"] == species.id for s in index["species"]):
            print(f"物种 {species.name} 已存在于图谱中")
            return False

        save_species(species, self.species_dir)

        index["species"].append({
            "id": species.id,
            "name": species.name,
            "scientific_name": species.scientific_name,
            "keywords": species.keywords,
            "primary_niche": species.niche_score.primary_niche if species.niche_score else None,
            "created_at": species.created_at.isoformat(),
            "filename": f"{_sanitize_filename(species.name)}_{species.id[:8]}.json",
        })
        index["metadata"]["count"] = len(index["species"])

        self._save_index(index)
        self._update_html()
        print(f"成功添加 {species.name} 到异世界生态图谱")
        return True

    def remove_species(self, species_id: str) -> bool:
        index = self._load_index()
        species_entry = next((s for s in index["species"] if s["id"] == species_id), None)

        if not species_entry:
            print(f"未找到ID为 {species_id} 的物种")
            return False

        json_file = self.species_dir / species_entry["filename"]
        if json_file.exists():
            json_file.unlink()

        html_file = self.html_dir / f"{_sanitize_filename(species_entry['name'])}_{species_id[:8]}.html"
        if html_file.exists():
            html_file.unlink()

        index["species"] = [s for s in index["species"] if s["id"] != species_id]
        index["metadata"]["count"] = len(index["species"])

        self._save_index(index)
        self._update_html()
        print(f"已从图谱中移除 {species_entry['name']}")
        return True

    def list_species(self) -> List[Dict[str, Any]]:
        index = self._load_index()
        return sorted(index["species"], key=lambda x: x["created_at"], reverse=True)

    def get_species(self, species_id: str) -> Optional[Species]:
        index = self._load_index()
        species_entry = next((s for s in index["species"] if s["id"] == species_id), None)
        if not species_entry:
            return None
        json_file = self.species_dir / species_entry["filename"]
        return load_species(json_file)

    def search_species(self, keyword: str) -> List[Dict[str, Any]]:
        index = self._load_index()
        keyword_lower = keyword.lower()
        results = []
        for s in index["species"]:
            if (keyword_lower in s["name"].lower() or
                keyword_lower in [k.lower() for k in s["keywords"]] or
                keyword_lower in s["scientific_name"].lower()):
                results.append(s)
        return results

    def filter_by_niche(self, niche: str) -> List[Dict[str, Any]]:
        index = self._load_index()
        return [s for s in index["species"] if s.get("primary_niche") == niche]

    def _update_html(self) -> None:
        species_list = []
        for entry in self.list_species():
            species = self.get_species(entry["id"])
            if species:
                species_list.append(species)
        if species_list:
            generate_html_gallery(species_list, self.html_dir)

    def export_atlas(self, output_path: Path) -> Path:
        output_path = Path(output_path)
        if output_path.exists():
            shutil.rmtree(output_path)
        shutil.copytree(self.atlas_dir, output_path)
        return output_path

    def get_stats(self) -> Dict[str, Any]:
        index = self._load_index()
        niche_counts: Dict[str, int] = {}
        for s in index["species"]:
            niche = s.get("primary_niche") or "unknown"
            niche_counts[niche] = niche_counts.get(niche, 0) + 1

        all_keywords: Dict[str, int] = {}
        for s in index["species"]:
            for kw in s["keywords"]:
                all_keywords[kw] = all_keywords.get(kw, 0) + 1

        return {
            "total_species": index["metadata"]["count"],
            "niche_distribution": niche_counts,
            "top_keywords": sorted(all_keywords.items(), key=lambda x: x[1], reverse=True)[:10],
            "created_at": index["metadata"]["created_at"],
        }

    def print_stats(self) -> None:
        stats = self.get_stats()
        print("\n=== 异世界生态图谱 统计 ===")
        print(f"物种总数: {stats['total_species']}")
        print(f"创建时间: {stats['created_at']}")
        print("\n生态位分布:")
        for niche, count in stats["niche_distribution"].items():
            print(f"  {niche}: {count} ({count/max(stats['total_species'],1)*100:.1f}%)")
        print("\n热门关键词:")
        for kw, count in stats["top_keywords"]:
            print(f"  {kw}: {count}次")

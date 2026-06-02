import json
import re
from pathlib import Path
from typing import List, Optional
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import GENERATIONS_DIR
from .models import Species


def _sanitize_filename(name: str) -> str:
    name = re.sub(r"[^\w\s-]", "", name)
    name = re.sub(r"[\s_-]+", "_", name)
    return name.strip("_").lower()


def save_species(species: Species, output_dir: Optional[Path] = None) -> Path:
    output_dir = output_dir or GENERATIONS_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    safe_name = _sanitize_filename(species.name)
    short_id = species.id[:8]
    filename = f"{safe_name}_{short_id}.json"
    filepath = output_dir / filename

    data = species.model_dump(mode="json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return filepath


def update_species(species: Species, filepath: Path) -> Path:
    data = species.model_dump(mode="json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return filepath


def load_species(filepath: Path) -> Species:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return Species(**data)


def list_species(directory: Optional[Path] = None) -> List[Path]:
    directory = directory or GENERATIONS_DIR
    if not directory.exists():
        return []
    return sorted(directory.glob("*.json"))


def find_species_by_keyword(keyword: str, directory: Optional[Path] = None) -> List[Species]:
    directory = directory or GENERATIONS_DIR
    results = []
    for filepath in list_species(directory):
        species = load_species(filepath)
        if keyword.lower() in [k.lower() for k in species.keywords]:
            results.append(species)
        elif keyword.lower() in species.name.lower():
            results.append(species)
    return results


def regenerate_species(
    species: Species, generator, use_same_seed: bool = True
) -> Species:
    params = species.generation_params
    if not use_same_seed:
        params = params.model_copy(update={"seed": None})
    return generator.generate(params)

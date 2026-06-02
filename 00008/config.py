import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
ATLAS_DIR = BASE_DIR / os.getenv("ATLAS_DIR", "atlas")
GENERATIONS_DIR = BASE_DIR / os.getenv("GENERATIONS_DIR", "generations")
HTML_OUTPUT_DIR = BASE_DIR / os.getenv("HTML_OUTPUT_DIR", "html_output")

for directory in [ATLAS_DIR, GENERATIONS_DIR, HTML_OUTPUT_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

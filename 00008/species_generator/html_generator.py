from pathlib import Path
from typing import List, Optional
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import HTML_OUTPUT_DIR
from .models import Species
from .storage import _sanitize_filename


CARD_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ species.name }} - 物种卡片</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .card {
            background: linear-gradient(145deg, #f5f0e6 0%, #e8dfd0 100%);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            max-width: 600px;
            width: 100%;
            overflow: hidden;
            border: 3px solid #8b7355;
        }
        .card-header {
            background: linear-gradient(135deg, #2d5016 0%, #4a7c23 100%);
            color: #f5f0e6;
            padding: 30px;
            text-align: center;
        }
        .species-name {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .scientific-name {
            font-style: italic;
            font-size: 1.2em;
            opacity: 0.9;
        }
        .keywords {
            margin-top: 15px;
            font-size: 0.9em;
            opacity: 0.8;
        }
        .keyword-tag {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 4px 12px;
            border-radius: 15px;
            margin: 0 5px;
        }
        .card-body {
            padding: 30px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 1.2em;
            color: #2d5016;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 2px solid #8b7355;
            padding-bottom: 5px;
        }
        .section-content {
            color: #3d3d3d;
            line-height: 1.8;
            font-size: 1em;
        }
        .niche-score {
            display: flex;
            justify-content: space-around;
            margin-top: 10px;
        }
        .niche-item {
            text-align: center;
            flex: 1;
            padding: 10px;
        }
        .niche-bar {
            height: 8px;
            background: #ddd;
            border-radius: 4px;
            margin-top: 5px;
            overflow: hidden;
        }
        .niche-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s;
        }
        .predator .niche-fill { background: #c0392b; }
        .herbivore .niche-fill { background: #27ae60; }
        .parasite .niche-fill { background: #8e44ad; }
        .footer {
            text-align: center;
            padding: 15px;
            background: #8b7355;
            color: #f5f0e6;
            font-size: 0.85em;
        }
        .id {
            font-family: monospace;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="card-header">
            <div class="species-name">{{ species.name }}</div>
            <div class="scientific-name">{{ species.scientific_name }}</div>
            <div class="keywords">
                {% for kw in species.keywords %}
                <span class="keyword-tag">{{ kw }}</span>
                {% endfor %}
            </div>
        </div>
        <div class="card-body">
            <div class="section">
                <div class="section-title">栖息地</div>
                <div class="section-content">{{ species.habitat }}</div>
            </div>
            <div class="section">
                <div class="section-title">外形描述</div>
                <div class="section-content">{{ species.appearance }}</div>
            </div>
            <div class="section">
                <div class="section-title">独特习性</div>
                <div class="section-content">{{ species.unique_behavior }}</div>
            </div>
            {% if species.niche_score %}
            <div class="section">
                <div class="section-title">生态位分布</div>
                <div class="niche-score">
                    <div class="niche-item predator">
                        <div>捕食者</div>
                        <div>{{ "%.0f%%"|format(species.niche_score.predator * 100) }}</div>
                        <div class="niche-bar"><div class="niche-fill" style="width: {{ "%.0f%%"|format(species.niche_score.predator * 100) }}"></div></div>
                    </div>
                    <div class="niche-item herbivore">
                        <div>食草动物</div>
                        <div>{{ "%.0f%%"|format(species.niche_score.herbivore * 100) }}</div>
                        <div class="niche-bar"><div class="niche-fill" style="width: {{ "%.0f%%"|format(species.niche_score.herbivore * 100) }}"></div></div>
                    </div>
                    <div class="niche-item parasite">
                        <div>寄生者</div>
                        <div>{{ "%.0f%%"|format(species.niche_score.parasite * 100) }}</div>
                        <div class="niche-bar"><div class="niche-fill" style="width: {{ "%.0f%%"|format(species.niche_score.parasite * 100) }}"></div></div>
                    </div>
                </div>
            </div>
            {% endif %}
        </div>
        <div class="footer">
            <div class="id">ID: {{ species.id }}</div>
            <div>生成时间: {{ species.created_at }}</div>
        </div>
    </div>
</body>
</html>
"""


GALLERY_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>异世界生态图谱 - 物种图鉴</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .header {
            text-align: center;
            color: #f5f0e6;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 3em;
            margin-bottom: 10px;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.5);
        }
        .header p {
            font-size: 1.1em;
            opacity: 0.8;
        }
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 30px;
            max-width: 1400px;
            margin: 0 auto;
        }
        .card {
            background: linear-gradient(145deg, #f5f0e6 0%, #e8dfd0 100%);
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4);
            overflow: hidden;
            border: 2px solid #8b7355;
            transition: transform 0.3s, box-shadow 0.3s;
            cursor: pointer;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.6);
        }
        .card-header {
            background: linear-gradient(135deg, #2d5016 0%, #4a7c23 100%);
            color: #f5f0e6;
            padding: 20px;
        }
        .species-name {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 3px;
        }
        .scientific-name {
            font-style: italic;
            font-size: 0.95em;
            opacity: 0.9;
        }
        .keywords {
            margin-top: 10px;
            font-size: 0.8em;
        }
        .keyword-tag {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 3px 10px;
            border-radius: 12px;
            margin-right: 5px;
        }
        .card-body {
            padding: 20px;
        }
        .section {
            margin-bottom: 15px;
        }
        .section-title {
            font-size: 0.95em;
            color: #2d5016;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .section-content {
            color: #3d3d3d;
            line-height: 1.6;
            font-size: 0.9em;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .footer {
            padding: 10px 20px;
            background: #8b7355;
            color: #f5f0e6;
            font-size: 0.75em;
            display: flex;
            justify-content: space-between;
        }
        .niche-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.75em;
            text-transform: uppercase;
        }
        .niche-predator { background: #c0392b; }
        .niche-herbivore { background: #27ae60; }
        .niche-parasite { background: #8e44ad; }
        .niche-unknown { background: #7f8c8d; }
        .stats {
            text-align: center;
            color: #f5f0e6;
            margin-bottom: 30px;
            font-size: 1.1em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>异世界生态图谱</h1>
        <p>Another World Ecology Atlas</p>
    </div>
    <div class="stats">
        共收录 {{ species_list|length }} 种神奇生物
    </div>
    <div class="gallery">
        {% for species in species_list %}
        <div class="card" onclick="window.location.href='{{ species.filename }}'">
            <div class="card-header">
                <div class="species-name">{{ species.name }}</div>
                <div class="scientific-name">{{ species.scientific_name }}</div>
                <div class="keywords">
                    {% for kw in species.keywords %}
                    <span class="keyword-tag">{{ kw }}</span>
                    {% endfor %}
                </div>
            </div>
            <div class="card-body">
                <div class="section">
                    <div class="section-title">栖息地</div>
                    <div class="section-content">{{ species.habitat }}</div>
                </div>
                <div class="section">
                    <div class="section-title">独特习性</div>
                    <div class="section-content">{{ species.unique_behavior }}</div>
                </div>
            </div>
            <div class="footer">
                <span>
                    {% if species.niche_score %}
                    <span class="niche-badge niche-{{ species.niche_score.primary_niche }}">
                        {{ species.niche_score.primary_niche }}
                    </span>
                    {% else %}
                    <span class="niche-badge niche-unknown">未分类</span>
                    {% endif %}
                </span>
                <span>{{ species.created_at.strftime('%Y-%m-%d') }}</span>
            </div>
        </div>
        {% endfor %}
    </div>
</body>
</html>
"""


def _render(template: str, context: dict) -> str:
    from jinja2 import Template
    return Template(template).render(context)


def generate_html_card(species: Species, output_dir: Optional[Path] = None) -> Path:
    output_dir = output_dir or HTML_OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    safe_name = _sanitize_filename(species.name)
    short_id = species.id[:8]
    filename = f"{safe_name}_{short_id}.html"
    filepath = output_dir / filename

    html = _render(CARD_TEMPLATE, {"species": species})
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

    return filepath


def generate_html_gallery(species_list: List[Species], output_dir: Optional[Path] = None) -> Path:
    output_dir = output_dir or HTML_OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    gallery_data = []
    for species in species_list:
        safe_name = _sanitize_filename(species.name)
        short_id = species.id[:8]
        filename = f"{safe_name}_{short_id}.html"
        species_dict = species.model_dump()
        species_dict["filename"] = filename
        species_dict["niche_score"] = species.niche_score
        species_dict["created_at"] = species.created_at
        gallery_data.append(species_dict)

    gallery_html = _render(GALLERY_TEMPLATE, {"species_list": gallery_data})

    gallery_path = output_dir / "index.html"
    with open(gallery_path, "w", encoding="utf-8") as f:
        f.write(gallery_html)

    for species in species_list:
        generate_html_card(species, output_dir)

    return gallery_path

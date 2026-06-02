import json
import random
import os
from dataclasses import dataclass, field
from typing import Optional

from filming_tips import FilmingTip, get_tips_for_segment


@dataclass
class ScriptSegment:
    segment_type: str
    versions: list[str] = field(default_factory=list)
    filming_tips: list[FilmingTip] = field(default_factory=list)
    matched_hook_style: Optional[str] = None


@dataclass
class Script:
    product_name: str
    selling_points: list[str]
    segments: dict[str, ScriptSegment] = field(default_factory=dict)
    selected_versions: dict[str, int] = field(default_factory=dict)

    def select_version(self, segment_type: str, version_index: int):
        self.selected_versions[segment_type] = version_index

    def get_full_script(self) -> list[dict]:
        result = []
        order = ["hook", "pain_point", "solution", "cta"]
        for seg_type in order:
            seg = self.segments[seg_type]
            idx = self.selected_versions.get(seg_type, 0)
            idx = min(idx, len(seg.versions) - 1)
            tip = seg.filming_tips[idx] if idx < len(seg.filming_tips) else seg.filming_tips[0] if seg.filming_tips else None
            result.append({
                "segment_type": seg.segment_type,
                "content": seg.versions[idx],
                "filming_tip": tip,
            })
        return result


_HOOK_TEMPLATES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hook_templates.json")

_hook_cache = None


def _load_hook_templates() -> dict:
    global _hook_cache
    if _hook_cache is None:
        with open(_HOOK_TEMPLATES_PATH, "r", encoding="utf-8") as f:
            _hook_cache = json.load(f)
    return _hook_cache


def _derive_pain_keywords(selling_points: list[str]) -> list[str]:
    pain_map = {
        "美白": "皮肤暗沉发黄",
        "保湿": "皮肤干燥起皮",
        "控油": "出油脱妆",
        "祛痘": "反复长痘",
        "抗老": "细纹松弛",
        "防晒": "晒黑晒伤",
        "清洁": "毛孔堵塞",
        "修护": "皮肤敏感泛红",
        "瘦身": "身材走样发福",
        "增肌": "练不出肌肉",
        "提神": "疲劳犯困没精神",
        "助眠": "失眠睡不着",
        "止痛": "疼痛难忍",
        "保暖": "寒冷受冻",
        "便携": "笨重不方便",
        "省时": "浪费时间效率低",
        "省钱": "花钱太多负担重",
        "高效": "效率低下",
        "安全": "安全隐患",
        "舒适": "不舒服体验差",
        "降噪": "噪音扰人",
        "保鲜": "食物变质浪费",
        "去味": "异味难闻",
        "除菌": "细菌滋生不卫生",
        "防水": "受潮损坏",
        "耐磨": "容易磨损",
        "轻便": "太重太累",
        "智能": "操作复杂麻烦",
        "快充": "充电太慢等不起",
    }
    pains = []
    for sp in selling_points:
        found = False
        for keyword, pain in pain_map.items():
            if keyword in sp:
                pains.append(pain)
                found = True
                break
        if not found:
            pains.append(f"{sp}带来的困扰")
    return pains


def generate_hook_versions(product_name: str, selling_points: list[str], preferred_style: Optional[str] = None) -> ScriptSegment:
    data = _load_hook_templates()
    pains = _derive_pain_keywords(selling_points)
    primary_pain = pains[0] if pains else "日常烦恼"

    if preferred_style:
        style_ids = data.get("style_keywords", {}).get(preferred_style, [])
        candidates = [t for t in data["templates"] if t["id"] in style_ids]
        if not candidates:
            candidates = data["templates"]
    else:
        candidates = data["templates"]

    chosen_group = random.choice(candidates)
    defaults = data.get("default_fill", {})

    versions = []
    for tpl in chosen_group["templates"]:
        filled = tpl.format(
            product=product_name,
            pain=primary_pain,
            count=defaults.get("count", "50"),
            rate=defaults.get("rate", "97"),
            years=defaults.get("years", "5"),
            limit=defaults.get("limit", "500"),
            hours=defaults.get("hours", "24"),
        )
        versions.append(filled)

    tips = get_tips_for_segment("hook", len(versions))

    return ScriptSegment(
        segment_type="开头钩子",
        versions=versions,
        filming_tips=tips,
        matched_hook_style=chosen_group.get("style"),
    )


def generate_pain_point_versions(product_name: str, selling_points: list[str]) -> ScriptSegment:
    pains = _derive_pain_keywords(selling_points)

    templates_pool = [
        "你是不是也经常{pain}？试过各种方法，效果总是差强人意...",
        "每次{pain}都让人抓狂，到处找解决办法，结果全是踩坑！",
        "{pain}这个问题，困扰了我好久，直到我发现了真相...",
        "说实话，{pain}真的太影响生活质量了，谁懂啊！",
        "{pain}的人看过来！你是不是也踩过这些雷？",
        "又{pain}了！这已经是这个月第N次了，真的要崩溃...",
        "天天被{pain}折磨，身边人都看不下去了...",
        "{pain}不解决，干啥都没心情，你有没有这种感觉？",
    ]

    versions = []
    for i in range(3):
        tpl = templates_pool[i % len(templates_pool)]
        pain = pains[i % len(pains)]
        versions.append(tpl.format(pain=pain))

    tips = get_tips_for_segment("pain_point", len(versions))

    return ScriptSegment(
        segment_type="痛点展示",
        versions=versions,
        filming_tips=tips,
    )


def generate_solution_versions(product_name: str, selling_points: list[str]) -> ScriptSegment:
    sp = selling_points

    def _make_versions():
        v1_parts = [f"直到我遇到了{product_name}！"]
        for i, s in enumerate(sp):
            v1_parts.append(f"第{i+1}大卖点：{s}，真的太绝了！")
        v1 = "".join(v1_parts)

        v2 = f"{product_name}，三大核心实力直接拉满！" + "、".join(sp) + "，一次解决所有问题！"

        v3_parts = [f"用了{product_name}才知道什么叫真香！"]
        for i, s in enumerate(sp):
            v3_parts.append(f"它家{['独家','核心','黑科技'][i%3]}的{s}，用一次就爱上！")
        v3 = "".join(v3_parts)

        return [v1, v2, v3]

    versions = _make_versions()
    tips = get_tips_for_segment("solution", len(versions))

    return ScriptSegment(
        segment_type="产品解决方案",
        versions=versions,
        filming_tips=tips,
    )


def generate_cta_versions(product_name: str, selling_points: list[str]) -> ScriptSegment:
    templates_pool = [
        f"还在犹豫什么？现在就下单{product_name}，让你彻底告别烦恼！点击下方链接，限时优惠马上抢！",
        f"{product_name}真的值得入手！我亲身实测，效果绝对不踩雷！左下角小黄车，冲就完了！",
        f"姐妹们{product_name}闭眼入！早买早享受，下方链接直接带走！",
        f"想要和我说的一样好效果？{product_name}安排上！下方链接一键下单！",
        f"别再等了！{product_name}的优惠随时可能结束，赶紧点击下方链接入手！",
        f"信我，{product_name}用了就回不去！链接放下面了，手快有手慢无！",
    ]

    versions = random.sample(templates_pool, 3)
    tips = get_tips_for_segment("cta", len(versions))

    return ScriptSegment(
        segment_type="结尾引导",
        versions=versions,
        filming_tips=tips,
    )


def generate_script(product_name: str, selling_points: list[str], preferred_style: Optional[str] = None) -> Script:
    script = Script(product_name=product_name, selling_points=selling_points)

    script.segments["hook"] = generate_hook_versions(product_name, selling_points, preferred_style)
    script.segments["pain_point"] = generate_pain_point_versions(product_name, selling_points)
    script.segments["solution"] = generate_solution_versions(product_name, selling_points)
    script.segments["cta"] = generate_cta_versions(product_name, selling_points)

    for seg_type in ["hook", "pain_point", "solution", "cta"]:
        script.selected_versions[seg_type] = 0

    return script


def get_available_styles() -> list[dict]:
    data = _load_hook_templates()
    result = []
    for style_name, ids in data.get("style_keywords", {}).items():
        matched = [t for t in data["templates"] if t["id"] in ids]
        result.append({
            "style_name": style_name,
            "description": matched[0]["description"] if matched else "",
        })
    return result

from dataclasses import dataclass


@dataclass
class FilmingTip:
    shot_type: str
    detail: str
    subtitle_position: str


_SEGMENT_TIPS = {
    "hook": [
        FilmingTip("近景", "主播正面对镜头，表情夸张有冲击力，3秒内抓住注意力", "居中上方"),
        FilmingTip("中景", "半身入镜，配合手势强调关键词，节奏要快", "居中下方"),
        FilmingTip("特写", "主播眼部或嘴部特写，低语或反问式开头，制造悬念", "居中"),
    ],
    "pain_point": [
        FilmingTip("近景", "表情痛苦无奈，可配合道具展示痛点场景", "左侧下方"),
        FilmingTip("中景", "演绎日常受困扰的场景，肢体语言表达不适", "居中下方"),
        FilmingTip("特写", "展示痛点细节（如皮肤问题、使用差产品等），增强代入感", "右侧下方"),
    ],
    "solution": [
        FilmingTip("近景", "手持产品对镜展示，强调包装和质感", "居中上方"),
        FilmingTip("特写", "产品使用过程特写，展示质地、颜色、效果", "居中"),
        FilmingTip("中景", "使用前后对比画面，配合文字标注卖点", "底部居中"),
    ],
    "cta": [
        FilmingTip("近景", "主播指向下方链接位置，表情自信热情", "居中下方+底部横幅"),
        FilmingTip("中景", "手持产品+手指下方，口播节奏加快制造紧迫感", "居中"),
        FilmingTip("近景", "竖屏底部展示产品+价格标签，口播收尾", "底部全幅横幅"),
    ],
}


def get_tips_for_segment(segment_type: str, count: int = 3) -> list[FilmingTip]:
    key = segment_type
    if key not in _SEGMENT_TIPS:
        key = "hook"
    tips = _SEGMENT_TIPS[key]
    while len(tips) < count:
        tips = tips + tips
    return tips[:count]


def format_tip(tip: FilmingTip) -> str:
    return f"[拍摄建议] 镜头：{tip.shot_type} | {tip.detail} | 字幕位置：{tip.subtitle_position}"

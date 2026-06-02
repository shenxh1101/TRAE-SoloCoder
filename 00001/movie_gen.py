#!/usr/bin/env python3
import json
import os
import random
import re
import hashlib
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent
MOVIES_DB = BASE_DIR / "movies.json"
INSPIRATION_DB = BASE_DIR / "inspiration.json"

GENRE_KEYWORDS = {
    "剧情": ["命运", "选择", "挣扎", "成长", "救赎", "希望", "牺牲", "坚持", "转变", "觉醒"],
    "爱情": ["相遇", "错过", "重逢", "等待", "守护", "背叛", "永恒", "初恋", "暗恋", "离别"],
    "科幻": ["时空", "未来", "平行", "维度", "意识", "虚拟", "进化", "星际", "量子", "觉醒"],
    "动作": ["对决", "复仇", "逃亡", "守护", "反击", "潜伏", "突袭", "逆袭", "追击", "激战"],
    "悬疑": ["真相", "谎言", "谜团", "反转", "密室", "消失", "秘密", "嫌疑", "线索", "伪装"],
    "惊悚": ["恐惧", "黑暗", "追逐", "倒计时", "陷阱", "绝望", "潜伏", "窥视", "失控", "噩梦"],
    "喜剧": ["意外", "误会", "荒诞", "逆袭", "冒牌", "乌龙", "巧合", "搞笑", "反差", "闹剧"],
    "犯罪": ["阴谋", "卧底", "黑帮", "复仇", "交易", "逃亡", "正义", "堕落", "欲望", "背叛"],
    "动画": ["冒险", "友谊", "成长", "魔法", "奇幻", "梦想", "勇气", "守护", "蜕变", "奇遇"],
    "奇幻": ["魔法", "诅咒", "预言", "异世界", "觉醒", "神器", "传说", "命运", "试炼", "契约"],
    "灾难": ["末日", "求生", "牺牲", "希望", "毁灭", "逃离", "团结", "勇气", "废墟", "重生"],
    "冒险": ["寻宝", "探险", "未知", "秘境", "考验", "征途", "发现", "勇气", "伙伴", "传奇"],
}

TITLE_PATTERNS = [
    "{adj}{noun}",
    "{noun}的{noun2}",
    "{noun}与{noun2}",
    "最后的{noun}",
    "{adj}的{noun}",
    "消失的{noun}",
    "{noun}之{noun2}",
    "永恒的{noun}",
    "{noun}不{verb}",
    "当{noun}遇见{noun2}",
    "{adj}{noun}日记",
    "致{noun}",
    "{noun}之歌",
    "寻找{noun}",
    "{noun}的{season}",
    "被遗忘的{noun}",
    "{number}个{noun}",
    "{noun}回廊",
    "{adj}星途",
    "{noun}边缘",
    "无间{noun}",
    "{noun}深处",
    "暗夜{noun}",
    "{noun}迷途",
    "破晓{noun}",
]

TITLE_NOUNS = [
    "旅人", "灯塔", "回声", "碎片", "镜像", "密钥", "守门人", "渡口",
    "遗迹", "弧光", "裂隙", "旅者", "信使", "深渊", "迷雾", "星尘",
    "棋局", "谜题", "守望", "倒影", "旧梦", "飞鸟", "尘埃", "流光",
    "暗河", "潮汐", "微光", "冰川", "荒原", "浮城", "烈焰", "苍穹",
    "归途", "边城", "暮色", "晨曦", "孤舟", "长夜", "铁幕", "黄昏",
    "钟声", "烈酒", "荆棘", "枷锁", "残局", "浮生", "幻梦", "断桥",
]

TITLE_ADJS = [
    "沉默", "孤独", "漂泊", "隐秘", "无尽", "遥远", "虚幻", "燃烧",
    "冰冷", "破碎", "遗忘", "永恒", "暗夜", "深邃", "迷失", "炽热",
    "荒芜", "凝滞", "苍凉", "迷离", "寂寥", "斑驳", "朦胧", "恍惚",
    "未竟", "残缺", "逆光", "倒悬", "锈蚀", "褪色", "混沌", "零度",
]

TITLE_VERBS = [
    "回头", "归来", "言弃", "落幕", "散场", "熄灭", "沉默", "独行",
    "屈服", "妥协", "回头", "停留", "遗忘", "退场", "转身", "妥协",
]

SEASONS = ["春天", "夏天", "秋天", "冬天", "黎明", "黄昏", "午夜", "黎明"]

SYNOPSIS_TEMPLATES = [
    "{protagonist}在{setting}中发现了一个不为人知的{secret}，为了{goal}，{he_she}必须{action}，却没想到{twist}。",
    "当{event}降临，{protagonist}被迫{action}。在{setting}中，{he_she}逐渐发现{secret}，而真正的{danger}才刚刚开始。",
    "{protagonist}一直以为自己了解{concept}，直到{event}改变了{he_she}的生活。在追寻{goal}的路上，{he_she}发现{twist}。",
    "在{setting}的深处，隐藏着关于{concept}的{secret}。{protagonist}意外卷入其中，{action}的过程中，{he_she}发现{twist}。",
    "{protagonist}因{event}而踏上未知的旅途。在{setting}中，{he_she}遇见了{ally}，共同面对{danger}，最终发现{twist}。",
    "一个关于{concept}的{secret}将{protagonist}推向命运的十字路口。{he_she}必须{action}，否则{consequence}。",
    "当{event}打破了{setting}的宁静，{protagonist}决定{action}。在{danger}面前，{he_she}意识到{twist}。",
    "{protagonist}拥有别人不具备的{ability}，这让{he_she}在{setting}中如鱼得水，直到{event}揭开了一个关于{concept}的{secret}。",
]

PROTAGONISTS = [
    "退役军人", "失忆的画家", "天才少年", "流浪诗人", "孤独的医生",
    "年迈的侦探", "落魄的音乐家", "叛逆的学生", "沉默的程序员",
    "逃亡的科学家", "退休教师", "地下记者", "失落的考古学家",
    "边缘律师", "匿名黑客", "过气演员", "急诊室护士", "流浪摄影师",
]

SETTINGS = [
    "一座即将拆迁的老城", "深海研究站", "时间循环的小镇",
    "与世隔绝的山村", "霓虹闪烁的赛博城市", "一列永不停歇的列车",
    "被冰雪封锁的孤岛", "地下的秘密实验室", "漂浮在云端的学校",
    "沙漠中的绿洲", "废弃的太空站", "迷宫般的图书馆",
    "被遗忘的地下城", "暴雨中的灯塔", "镜面般的城市",
]

SECRETS = [
    "惊天秘密", "被封印的记忆", "改变命运的预言", "时空裂缝",
    "隐藏的身份", "失落文明的遗产", "基因密码", "意识的后门",
    "时间的漏洞", "平行世界的入口", "操控命运的系统", "集体遗忘的真相",
]

EVENTS = [
    "一场突如其来的灾难", "一封来自未来的信", "一次意外的事故",
    "一个神秘陌生人的出现", "一连串不可思议的事件", "一段被隐藏的录像",
    "一次科学实验的失控", "一个古老预言的应验", "一场改变一切的相遇",
    "一份匿名举报", "一次时空错位", "一个无法解释的现象",
]

GOALS = [
    "找回失去的记忆", "拯救所爱之人", "揭开被掩埋的真相",
    "打破命运的枷锁", "找到回家的路", "阻止即将发生的灾难",
    "完成未竟的使命", "守护最后的希望", "逃离永恒的循环",
    "解开困扰一生的谜题",
]

ACTIONS = [
    "面对内心的恐惧", "踏上一条不归路", "与时间赛跑",
    "与曾经的挚友为敌", "在谎言中寻找真相", "放下一切远走他乡",
    "独自潜入禁地", "做出一个不可逆转的选择", "挑战不可战胜的力量",
    "与陌生人建立意想不到的联盟",
]

TWISTS = [
    "最大的敌人竟是自己", "一切不过是命运的预演",
    "真相远比想象中更加残酷", "拯救世界的代价是失去一切",
    "身边的人一直在撒谎", "时间早已在某个节点分叉",
    "所有的记忆都是被植入的", "终点也是另一个起点",
    "拯救与毁灭只在一念之间", "最亲近的人才是幕后主使",
]

DANGERS = [
    "无处不在的监视", "逐渐崩塌的现实", "来自另一个维度的威胁",
    "自己内心的黑暗面", "时间的反噬", "不可逆的基因变异",
    "集体意识的侵蚀", "失控的人工智能", "被遗忘的远古力量",
]

CONCEPTS = [
    "时间", "记忆", "身份", "命运", "自由", "信任",
    "牺牲", "选择", "存在", "真实", "永恒", "救赎",
]

ABILITIES = [
    "感知时间线的能力", "与亡者对话的天赋", "预见碎片化未来的直觉",
    "操控他人记忆的技术", "穿越平行世界的天赋", "解读万物的密码",
]

ALLIES = [
    "一个自称来自未来的神秘人", "一只拥有人类智慧的动物",
    "一个失去记忆却身怀绝技的陌生人", "一个看似疯狂却洞悉真相的老者",
    "一个背叛了组织的内部人员", "一个来自另一个世界的镜像自己",
]

CONSEQUENCES = [
    "整个世界将坠入永恒的黑暗", "所有珍惜的人都将消失",
    "自己将不复存在", "时间将彻底崩溃",
    "两个世界将不可逆转地碰撞", "一切努力都将化为虚无",
]

DIRECTOR_STYLE = {
    "克里斯托弗·诺兰": {"genre": ["科幻", "悬疑", "动作"], "style": "擅长非线性叙事、时间与意识的深度探索"},
    "宫崎骏": {"genre": ["动画", "奇幻"], "style": "以温暖的人文关怀和奇幻世界观著称"},
    "奉俊昊": {"genre": ["惊悚", "剧情", "喜剧"], "style": "擅长社会讽刺与类型片融合"},
    "王家卫": {"genre": ["剧情", "爱情"], "style": "以碎片化叙事和极致影像美学闻名"},
    "大卫·芬奇": {"genre": ["惊悚", "悬疑", "剧情"], "style": "冷峻的视觉风格与心理深度的完美结合"},
    "姜文": {"genre": ["动作", "喜剧", "剧情"], "style": "强烈的个人风格，黑色幽默与雄性荷尔蒙"},
    "周星驰": {"genre": ["喜剧", "动作"], "style": "无厘头喜剧中包裹小人物的悲欢"},
    "丹尼斯·维伦纽瓦": {"genre": ["科幻", "惊悚", "剧情"], "style": "宏大叙事与沉思美学的融合"},
    "陈凯歌": {"genre": ["剧情", "爱情"], "style": "史诗般的叙事格局与文化反思"},
    "韦斯·安德森": {"genre": ["喜剧", "冒险"], "style": "极致的对称构图与荒诞温情"},
    "詹姆斯·卡梅隆": {"genre": ["科幻", "动作", "灾难"], "style": "技术革新与史诗叙事的标杆"},
    "弗朗西斯·科波拉": {"genre": ["犯罪", "剧情"], "style": "宏大史诗与人性深度的经典诠释"},
    "郭帆": {"genre": ["科幻", "灾难"], "style": "硬核科幻与家国情怀的融合"},
    "新海诚": {"genre": ["动画", "爱情"], "style": "极致画面与跨越时空的爱情叙事"},
    "刘伟强": {"genre": ["犯罪", "悬疑", "动作"], "style": "紧凑节奏与双线叙事的典范"},
    "吕克·贝松": {"genre": ["动作", "剧情"], "style": "法式浪漫与动作类型的独特融合"},
    "彼特·道格特": {"genre": ["动画", "喜剧"], "style": "用想象力探索情感与成长的核心"},
    "罗伯·莱纳": {"genre": ["爱情", "剧情"], "style": "温暖细腻的情感表达"},
}


def load_json(path):
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_movies():
    return load_json(MOVIES_DB)


def load_inspiration():
    return load_json(INSPIRATION_DB)


def save_inspiration(data):
    save_json(INSPIRATION_DB, data)


def keyword_overlap(user_keywords, movie_keywords):
    if not user_keywords:
        return 0
    return len(set(user_keywords) & set(movie_keywords))


def extract_keywords(text):
    stop_words = {"的", "了", "在", "是", "我", "他", "她", "它", "和", "与", "及", "等",
                  "着", "过", "被", "把", "从", "到", "向", "为", "以", "但", "而", "或",
                  "一个", "一位", "这个", "那个", "自己", "什么", "怎么", "如何", "可以",
                  "有", "没", "不", "也", "都", "就", "还", "又", "很", "非常", "最"}
    words = re.findall(r"[\u4e00-\u9fff]{2,}", text)
    return [w for w in words if w not in stop_words]


def find_similar_movies(genre, plot, movies, runtime_range=None):
    user_keywords = extract_keywords(plot)
    genre_list = genre if isinstance(genre, list) else [genre]
    genre_set = set(genre_list)
    primary_genre = genre_list[0] if genre_list else None

    all_genre_keywords = set()
    for g in genre_list:
        if g in GENRE_KEYWORDS:
            all_genre_keywords.update(GENRE_KEYWORDS[g])

    plot_genre_keywords = [k for k in user_keywords if k in all_genre_keywords]

    candidates = []
    for m in movies:
        movie_genres = set(m.get("genre", []))
        genre_match_count = len(genre_set & movie_genres)

        if genre_match_count == 0:
            continue

        all_genres_match = genre_match_count == len(genre_list)
        primary_match = 1 if (primary_genre and primary_genre in movie_genres) else 0

        movie_keywords = set(m.get("keywords", []))
        plot_keyword_match = len(set(user_keywords) & movie_keywords)
        genre_keyword_match = len(set(plot_genre_keywords) & movie_keywords)

        runtime_ok = True
        if runtime_range:
            rt = m.get("runtime", 0)
            if rt < runtime_range[0] or rt > runtime_range[1]:
                runtime_ok = False

        score = (
            (100 if all_genres_match else 0)
            + (50 if primary_match else 0)
            + genre_match_count * 10
            + genre_keyword_match * 5
            + plot_keyword_match * 3
            + (1 if runtime_ok else 0)
        )

        candidates.append((score, genre_match_count, primary_match, m))

    candidates.sort(key=lambda x: (-x[0], -x[1], -x[2], -x[3].get("rating", 0)))
    return [c[3] for c in candidates[:5]]


def generate_title(genre, similar_movies):
    if similar_movies and random.random() < 0.35:
        ref = random.choice(similar_movies)
        ref_title = ref["title"]
        parts = re.split(r"[的与之和]", ref_title)
        if len(parts) >= 2:
            return parts[0] + random.choice(["的", "与", "之"]) + random.choice(TITLE_NOUNS)

    pattern = random.choice(TITLE_PATTERNS)
    noun = random.choice(TITLE_NOUNS)
    noun2 = random.choice([n for n in TITLE_NOUNS if n != noun])
    adj = random.choice(TITLE_ADJS)
    verb = random.choice(TITLE_VERBS)
    season = random.choice(SEASONS)
    number = random.choice(["三", "七", "九", "十二", "百", "千"])

    title = pattern.format(
        noun=noun, noun2=noun2, adj=adj, verb=verb,
        season=season, number=number
    )

    if len(title) > 10:
        title = title[:10]
    return title


def generate_synopsis(genre, plot, similar_movies):
    template = random.choice(SYNOPSIS_TEMPLATES)
    protagonist = random.choice(PROTAGONISTS)
    setting = random.choice(SETTINGS)
    secret = random.choice(SECRETS)
    event = random.choice(EVENTS)
    goal = random.choice(GOALS)
    action = random.choice(ACTIONS)
    twist = random.choice(TWISTS)
    danger = random.choice(DANGERS)
    concept = random.choice(CONCEPTS)
    ability = random.choice(ABILITIES)
    ally = random.choice(ALLIES)
    consequence = random.choice(CONSEQUENCES)

    return template.format(
        protagonist=protagonist, setting=setting, secret=secret,
        event=event, goal=goal, action=action, twist=twist,
        danger=danger, concept=concept, ability=ability,
        ally=ally, consequence=consequence,
        he_she="他",
    )


def recommend_directors(genre, similar_movies, runtime_range=None):
    genre_set = set(genre) if isinstance(genre, list) else {genre}
    director_scores = {}
    for director, info in DIRECTOR_STYLE.items():
        genre_match = len(genre_set & set(info["genre"]))
        score = genre_match * 2
        if genre_match > 0:
            score += 1
        director_scores[director] = score

    if similar_movies:
        for m in similar_movies:
            d = m.get("director", "")
            if d in director_scores:
                director_scores[d] += 3
            elif d:
                director_scores[d] = 2

    if runtime_range:
        avg_runtime = sum(runtime_range) / 2
        if avg_runtime > 140:
            for d in ["克里斯托弗·诺兰", "弗朗西斯·科波拉", "陈凯歌"]:
                if d in director_scores:
                    director_scores[d] += 1
        elif avg_runtime < 100:
            for d in ["周星驰", "韦斯·安德森", "刘伟强"]:
                if d in director_scores:
                    director_scores[d] += 1

    sorted_directors = sorted(director_scores.items(), key=lambda x: x[1], reverse=True)
    results = []
    for director, score in sorted_directors[:3]:
        if score > 0:
            style = DIRECTOR_STYLE.get(director, {}).get("style", "风格独特")
            results.append({"name": director, "reason": style})
    return results


def generate_ideas(genre, plot, runtime_range=None, count=3):
    movies = load_movies()
    similar = find_similar_movies(genre, plot, movies, runtime_range)

    genre_list = genre if isinstance(genre, list) else [genre]

    ideas = []
    for i in range(count):
        title = generate_title(genre_list, similar)
        synopsis = generate_synopsis(genre_list, plot, similar)
        directors = recommend_directors(genre_list, similar, runtime_range)

        if runtime_range:
            runtime = random.randint(runtime_range[0], runtime_range[1])
            runtime = runtime - (runtime % 5)
            runtime = max(runtime_range[0], min(runtime_range[1], runtime))
        else:
            runtime = random.choice([90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140])

        idea = {
            "id": hashlib.md5(f"{title}{datetime.now().isoformat()}{i}".encode()).hexdigest()[:8],
            "title": title,
            "genre": " / ".join(genre_list),
            "synopsis": synopsis,
            "directors": directors,
            "runtime": runtime,
            "similar_movies": [m["title"] for m in similar[:3]],
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
        }
        ideas.append(idea)

    return ideas


def display_idea(idea, index=None):
    prefix = f"\033[1;36m【创意 {index}】\033[0m" if index else "\033[1;36m【创意】\033[0m"
    lines = [
        prefix,
        f"  \033[1;33m片名：\033[0m{idea['title']}",
        f"  \033[1;33m类型：\033[0m{idea['genre']}",
        f"  \033[1;33m片长：\033[0m{idea['runtime']} 分钟",
        f"  \033[1;33m梗概：\033[0m{idea['synopsis']}",
        f"  \033[1;33m推荐导演：\033[0m",
    ]
    for d in idea["directors"]:
        lines.append(f"    - {d['name']}（{d['reason']}）")
    if idea.get("similar_movies"):
        lines.append(f"  \033[1;33m相似电影：\033[0m{'、'.join(idea['similar_movies'])}")
    print("\n".join(lines))


def rate_and_save(idea, score=None):
    if score is None:
        while True:
            try:
                score_input = input("\n  \033[1;32m请为这个创意打分（1-10，0 跳过）：\033[0m").strip()
                score = int(score_input)
                if 0 <= score <= 10:
                    break
                print("  请输入 0-10 之间的数字")
            except ValueError:
                print("  请输入有效数字")
            except (KeyboardInterrupt, EOFError):
                return

    score = int(score)
    if 1 <= score <= 10:
        idea["user_rating"] = score
        if score >= 7:
            inspiration = load_inspiration()
            inspiration.append(idea)
            save_inspiration(inspiration)
            print(f"  \033[1;32m✓ 评分 {score} 分，已保存到灵感库！\033[0m")
        else:
            print(f"  评分 {score} 分，未达到保存标准（≥7分保存）")
    else:
        print("  已跳过评分")


def export_markdown(ideas, output_path=None, title="电影创意灵感"):
    if not ideas:
        print("\033[1;31m没有可导出的创意\033[0m")
        return

    if output_path is None:
        output_path = BASE_DIR / f"movie_ideas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"

    lines = [
        f"# 🎬 {title}",
        "",
        f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "| 片名 | 类型 | 片长 | 一句话梗概 | 推荐导演 | 相似电影 | 评分 |",
        "|------|------|------|-----------|---------|---------|------|",
    ]

    for idea in ideas:
        directors_str = "、".join([d["name"] for d in idea.get("directors", [])])
        similar_str = "、".join(idea.get("similar_movies", []))
        rating = idea.get("user_rating", "-")
        synopsis = idea.get("synopsis", "").replace("|", "｜")
        lines.append(
            f"| {idea['title']} | {idea.get('genre', '-')} | {idea.get('runtime', '-')}分钟 | "
            f"{synopsis} | {directors_str} | {similar_str} | {rating} |"
        )

    lines.append("")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\033[1;32m✓ 已导出 {len(ideas)} 条创意到 {output_path}\033[0m")


def view_inspiration():
    inspiration = load_inspiration()
    if not inspiration:
        print("\033[1;33m灵感库为空，快去生成一些创意吧！\033[0m")
        return

    print(f"\n\033[1;36m{'='*60}")
    print(f"  灵感库（共 {len(inspiration)} 条）")
    print(f"{'='*60}\033[0m")

    for i, idea in enumerate(inspiration, 1):
        rating = idea.get("user_rating", "?")
        directors = "、".join([d["name"] for d in idea.get("directors", [])])
        print(f"  {i}. \033[1;33m{idea['title']}\033[0m | "
              f"{idea.get('genre', '-')} | {idea.get('runtime', '-')}分钟 | "
              f"评分:{rating} | 导演:{directors}")
        print(f"     {idea.get('synopsis', '')}")
        print(f"     保存时间: {idea.get('timestamp', '未知')}")
        print()


def parse_genre_input(genre_str):
    parts = re.split(r"[/、,，\s]+", genre_str.strip())
    return [p for p in parts if p]


def parse_runtime_input(runtime_str):
    match = re.match(r"(\d+)\s*[-~—]\s*(\d+)", runtime_str.strip())
    if match:
        lo, hi = int(match.group(1)), int(match.group(2))
        return (min(lo, hi), max(lo, hi))
    return None


SESSION_IDEAS = []


def interactive_mode():
    global SESSION_IDEAS
    print("\n\033[1;36m" + "=" * 60)
    print("  🎬 电影创意生成器 — 交互模式")
    print("=" * 60 + "\033[0m")
    print("  输入电影类型和情节，生成虚构片名、梗概和导演推荐")
    print("  命令：")
    print("    \033[1;33mexport\033[0m  — 导出本次所有创意为 Markdown")
    print("    \033[1;33minspect\033[0m — 查看灵感库")
    print("    \033[1;33mhistory\033[0m — 查看本次生成的所有创意")
    print("    \033[1;33mquit\033[0m   — 退出\n")

    while True:
        try:
            print("\033[1;34m" + "-" * 40 + "\033[0m")
            genre_str = input("\033[1;32m  电影类型（如：科幻/悬疑）：\033[0m").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\n  再见！🎬")
            break

        if not genre_str:
            continue
        if genre_str.lower() in ("quit", "exit", "q"):
            print("\n  再见！🎬")
            break
        if genre_str.lower() == "export":
            export_markdown(SESSION_IDEAS, title="本次会话创意合集")
            continue
        if genre_str.lower() == "inspect":
            view_inspiration()
            continue
        if genre_str.lower() == "history":
            if not SESSION_IDEAS:
                print("  本次还没有生成创意")
            else:
                for i, idea in enumerate(SESSION_IDEAS, 1):
                    display_idea(idea, i)
            continue

        genre = parse_genre_input(genre_str)

        try:
            plot = input("\033[1;32m  简短情节描述：\033[0m").strip()
        except (KeyboardInterrupt, EOFError):
            print()
            continue
        if not plot:
            print("  情节描述不能为空")
            continue

        try:
            runtime_str = input("\033[1;32m  片长范围（如 90-120，留空不限）：\033[0m").strip()
        except (KeyboardInterrupt, EOFError):
            runtime_str = ""

        runtime_range = parse_runtime_input(runtime_str) if runtime_str else None

        try:
            count_str = input("\033[1;32m  生成数量（默认3）：\033[0m").strip()
            count = int(count_str) if count_str else 3
            count = max(1, min(count, 10))
        except ValueError:
            count = 3
        except (KeyboardInterrupt, EOFError):
            count = 3

        ideas = generate_ideas(genre, plot, runtime_range, count)

        print(f"\n\033[1;36m{'='*60}")
        print(f"  生成 {len(ideas)} 个创意")
        print(f"{'='*60}\033[0m")

        for i, idea in enumerate(ideas, 1):
            display_idea(idea, i)
            rate_and_save(idea)

        SESSION_IDEAS.extend(ideas)

        print(f"\n  本次共生成 {len(SESSION_IDEAS)} 个创意")


def single_run(genre_str, plot, runtime_str=None, count=3, export=None, score=None):
    global SESSION_IDEAS
    genre = parse_genre_input(genre_str)
    runtime_range = parse_runtime_input(runtime_str) if runtime_str else None

    ideas = generate_ideas(genre, plot, runtime_range, count)

    print(f"\n\033[1;36m{'='*60}")
    print(f"  生成 {len(ideas)} 个创意")
    print(f"{'='*60}\033[0m")

    for i, idea in enumerate(ideas, 1):
        display_idea(idea, i)
        if score is not None:
            rate_and_save(idea, score)

    SESSION_IDEAS.extend(ideas)

    if export:
        export_markdown(SESSION_IDEAS, Path(export))


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="🎬 电影创意生成器 — 根据类型和情节生成片名、梗概和导演推荐",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  # 交互模式
  python movie_gen.py -i

  # 单次生成
  python movie_gen.py -g "科幻/悬疑" -p "一个程序员发现自己活在虚拟世界中"

  # 指定片长范围
  python movie_gen.py -g "动作" -p "退役特工保护证人" -r 90-120

  # 单次生成并打分（≥7分自动保存）
  python movie_gen.py -g "爱情" -p "跨越时空的恋人" -s 8

  # 导出为 Markdown
  python movie_gen.py -g "爱情" -p "跨越时空的恋人" -e output.md

  # 导出灵感库中所有创意
  python movie_gen.py --export-all all_ideas.md

  # 查看灵感库
  python movie_gen.py --inspect
        """,
    )

    parser.add_argument("-i", "--interactive", action="store_true", help="进入交互模式")
    parser.add_argument("-g", "--genre", type=str, help="电影类型（如：科幻/悬疑/剧情）")
    parser.add_argument("-p", "--plot", type=str, help="简短情节描述")
    parser.add_argument("-r", "--runtime", type=str, help="片长范围（如：90-120）")
    parser.add_argument("-n", "--count", type=int, default=3, help="生成数量（默认3）")
    parser.add_argument("-e", "--export", type=str, help="导出为 Markdown 文件路径")
    parser.add_argument("-s", "--score", type=int, choices=range(0, 11), metavar="0-10",
                        help="为生成的创意打分（≥7分自动保存到灵感库）")
    parser.add_argument("--inspect", action="store_true", help="查看灵感库")
    parser.add_argument("--export-inspiration", type=str, metavar="PATH",
                        help="将灵感库导出为 Markdown")
    parser.add_argument("--export-all", type=str, metavar="PATH",
                        help="导出灵感库中所有创意为 Markdown")

    args = parser.parse_args()

    if args.interactive:
        interactive_mode()
        return

    if args.inspect:
        view_inspiration()
        return

    if args.export_all:
        inspiration = load_inspiration()
        if inspiration:
            export_markdown(inspiration, Path(args.export_all), title="灵感库创意合集")
        else:
            print("灵感库为空，无可导出内容")
        return

    if args.export_inspiration:
        inspiration = load_inspiration()
        if inspiration:
            export_markdown(inspiration, Path(args.export_inspiration), title="灵感库创意合集")
        else:
            print("灵感库为空")
        return

    if args.genre and args.plot:
        single_run(args.genre, args.plot, args.runtime, args.count, args.export, args.score)
        return

    parser.print_help()


if __name__ == "__main__":
    main()

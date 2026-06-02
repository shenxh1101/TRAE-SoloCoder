#!/usr/bin/env python3

import argparse
import json
import os
import random
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

DATA_DIR = Path.home() / ".travel_wish"
DATA_FILE = DATA_DIR / "data.json"

DESTINATION_DB = [
    {"name": "成都", "region": "中国-西南", "tags": ["美食", "文化", "休闲"], "tag_details": {"美食": "品尝正宗川菜与麻辣火锅", "文化": "探访武侯祠与锦里古街", "休闲": "在人民公园品茶看变脸"}},
    {"name": "西安", "region": "中国-西北", "tags": ["文化", "历史", "美食"], "tag_details": {"文化": "漫步古城墙感受千年文脉", "历史": "探访兵马俑与大雁塔", "美食": "回民街品味西北风味小吃"}},
    {"name": "丽江", "region": "中国-西南", "tags": ["冒险", "文化", "自然"], "tag_details": {"冒险": "挑战玉龙雪山徒步攀登", "文化": "迷失在纳西古城的石板巷", "自然": "仰望玉龙雪山的壮丽冰川"}},
    {"name": "东京", "region": "日本", "tags": ["美食", "文化", "购物"], "tag_details": {"美食": "筑地市场尝鲜寿司与拉面", "文化": "浅草寺祈福体验江户风情", "购物": "涩谷原宿扫货潮流单品"}},
    {"name": "京都", "region": "日本", "tags": ["文化", "历史", "自然"], "tag_details": {"文化": "穿和服漫步岚山竹林小径", "历史": "参拜金阁寺与伏见稻荷大社", "自然": "赏樱或枫红下的哲学之道"}},
    {"name": "大阪", "region": "日本", "tags": ["美食", "文化", "购物"], "tag_details": {"美食": "道顿堀大快朵颐章鱼烧与串炸", "文化": "探访大阪城天守阁", "购物": "心斋桥血拼药妆与潮牌"}},
    {"name": "曼谷", "region": "泰国", "tags": ["美食", "文化", "休闲"], "tag_details": {"美食": "街头摊位品尝冬阴功与芒果糯米饭", "文化": "朝拜大皇宫与卧佛寺", "休闲": "湄南河畔享受泰式按摩"}},
    {"name": "清迈", "region": "泰国", "tags": ["文化", "自然", "休闲"], "tag_details": {"文化": "古城寺庙巡礼与周日夜市", "自然": "素贴山俯瞰全城绿意", "休闲": "咖啡馆发呆与泰式烹饪课"}},
    {"name": "巴黎", "region": "法国", "tags": ["文化", "浪漫", "购物"], "tag_details": {"文化": "卢浮宫朝圣蒙娜丽莎的微笑", "浪漫": "塞纳河游船夜赏埃菲尔铁塔", "购物": "老佛爷百货挑选法式时尚"}},
    {"name": "巴塞罗那", "region": "西班牙", "tags": ["文化", "美食", "冒险"], "tag_details": {"文化": "惊叹高迪圣家堂的奇幻建筑", "美食": "波盖利亚市场品尝伊比利亚火腿", "冒险": "地中海帆船与海岸攀岩"}},
    {"name": "罗马", "region": "意大利", "tags": ["历史", "文化", "美食"], "tag_details": {"历史": "穿越斗兽场感受角斗士时代", "文化": "许愿池与万神殿的永恒之美", "美食": "品尝地道罗马披萨与手工冰淇淋"}},
    {"name": "新西兰皇后镇", "region": "新西兰", "tags": ["冒险", "自然", "休闲"], "tag_details": {"冒险": "蹦极发源地纵身一跃的刺激", "自然": "米尔福德峡湾巡游壮丽山水", "休闲": "湖畔品酒享受慢生活"}},
    {"name": "冰岛雷克雅未克", "region": "冰岛", "tags": ["冒险", "自然", "摄影"], "tag_details": {"冒险": "冰川徒步与火山探秘", "自然": "追逐北极光的绚丽夜空", "摄影": "拍摄间歇泉与黑沙滩的魔幻光影"}},
    {"name": "迪拜", "region": "阿联酋", "tags": ["购物", "冒险", "休闲"], "tag_details": {"购物": "Dubai Mall尽享奢华购物体验", "冒险": "沙漠冲沙与高空跳伞", "休闲": "棕榈岛亚特兰蒂斯水上乐园"}},
    {"name": "马尔代夫", "region": "马尔代夫", "tags": ["休闲", "浪漫", "自然"], "tag_details": {"休闲": "水上别墅私享无边际海景", "浪漫": "海底餐厅共进烛光晚餐", "自然": "浮潜探寻珊瑚礁与热带鱼群"}},
    {"name": "拉萨", "region": "中国-西南", "tags": ["文化", "冒险", "自然"], "tag_details": {"文化": "大昭寺转经感受虔诚信仰", "冒险": "高原徒步挑战身体极限", "自然": "纳木错湖畔仰望最纯净的天空"}},
    {"name": "厦门", "region": "中国-东南", "tags": ["美食", "文化", "休闲"], "tag_details": {"美食": "沙茶面与海蛎煎的闽南滋味", "文化": "鼓浪屿万国建筑群漫步", "休闲": "环岛路骑行吹海风"}},
    {"name": "杭州", "region": "中国-东南", "tags": ["文化", "自然", "美食"], "tag_details": {"文化": "灵隐寺晨钟暮鼓与宋韵文化", "自然": "西湖泛舟赏三潭印月", "美食": "龙井虾仁与西湖醋鱼的江南味道"}},
    {"name": "重庆", "region": "中国-西南", "tags": ["美食", "冒险", "文化"], "tag_details": {"美食": "九宫格老火锅的麻辣江湖", "冒险": "长江索道与悬崖步道的刺激", "文化": "洪崖洞夜色与磁器口古镇"}},
    {"name": "哈尔滨", "region": "中国-东北", "tags": ["冒险", "文化", "摄影"], "tag_details": {"冒险": "松花江冬泳与冰上运动", "文化": "中央大街的俄式建筑风情", "摄影": "冰雪大世界的梦幻光影"}},
    {"name": "大理", "region": "中国-西南", "tags": ["自然", "文化", "休闲"], "tag_details": {"自然": "苍山洱海的如画风光", "文化": "白族扎染与三月街民族风情", "休闲": "古城发呆与洱海边骑行"}},
    {"name": "张家界", "region": "中国-中南", "tags": ["冒险", "自然", "摄影"], "tag_details": {"冒险": "玻璃栈道与天门山翼装飞行", "自然": "石英砂岩峰林的鬼斧神工", "摄影": "云雾缭绕中的悬浮仙山"}},
    {"name": "三亚", "region": "中国-东南", "tags": ["休闲", "自然", "浪漫"], "tag_details": {"休闲": "亚龙湾沙滩椰林下的慵懒午后", "自然": "蜈支洲岛潜水看珊瑚", "浪漫": "天涯海角的日落约定"}},
    {"name": "首尔", "region": "韩国", "tags": ["购物", "美食", "文化"], "tag_details": {"购物": "明洞与东大门的韩妆血拼", "美食": "广藏市场品鉴韩式拌饭与炸鸡", "文化": "景福宫韩服体验与北村韩屋"}},
    {"name": "新加坡", "region": "新加坡", "tags": ["美食", "购物", "文化"], "tag_details": {"美食": "牛车水与小印度的多元美食", "购物": "乌节路免税店尽享购物乐趣", "文化": "鱼尾狮公园与滨海湾花园"}},
    {"name": "悉尼", "region": "澳大利亚", "tags": ["自然", "冒险", "文化"], "tag_details": {"自然": "邦迪海滩冲浪与蓝山徒步", "冒险": "攀登海港大桥俯瞰全城", "文化": "悉尼歌剧院聆听世界级演出"}},
    {"name": "开普敦", "region": "南非", "tags": ["冒险", "自然", "文化"], "tag_details": {"冒险": "与大白鲨共潜的极限体验", "自然": "桌山云端漫步与好望角", "文化": "波卡普彩色街区的多元风情"}},
    {"name": "伊斯坦布尔", "region": "土耳其", "tags": ["文化", "历史", "美食"], "tag_details": {"文化": "蓝色清真寺与圣索菲亚的文明对话", "历史": "托普卡帕宫揭秘奥斯曼帝国", "美食": "大巴扎品尝土耳其烤肉与甜品"}},
    {"name": "布拉格", "region": "捷克", "tags": ["文化", "历史", "浪漫"], "tag_details": {"文化": "查理大桥的清晨与老城广场", "历史": "布拉格城堡的千年故事", "浪漫": "红色屋顶下的波西米亚黄昏"}},
    {"name": "布宜诺斯艾利斯", "region": "阿根廷", "tags": ["文化", "美食", "冒险"], "tag_details": {"文化": "博卡区感受探戈的激情与忧伤", "美食": "圣特尔莫品味阿根廷牛排与红酒", "冒险": "潘帕斯草原骑马飞驰"}},
    {"name": "墨尔本", "region": "澳大利亚", "tags": ["美食", "文化", "休闲"], "tag_details": {"美食": "巷弄咖啡馆品鉴Flat White", "文化": "涂鸦巷与维多利亚国家美术馆", "休闲": "大洋路自驾看十二使徒岩"}},
    {"name": "河内", "region": "越南", "tags": ["美食", "文化", "休闲"], "tag_details": {"美食": "街边小摊品尝正宗越南河粉", "文化": "还剑湖畔感受法越交融风情", "休闲": "三十六行街慢行与越式滴漏咖啡"}},
    {"name": "桂林", "region": "中国-中南", "tags": ["自然", "文化", "摄影"], "tag_details": {"自然": "漓江竹筏漂流入画山水", "文化": "阳朔西街的多元文化碰撞", "摄影": "龙脊梯田的光影大片"}},
    {"name": "北京", "region": "中国-华北", "tags": ["历史", "文化", "美食"], "tag_details": {"历史": "登长城做好汉与故宫穿越六百年", "文化": "胡同四合院品味京味儿文化", "美食": "全聚德烤鸭与炸酱面"}},
    {"name": "上海", "region": "中国-华东", "tags": ["购物", "美食", "文化"], "tag_details": {"购物": "南京路与淮海路的摩登购物体验", "美食": "南翔小笼与本帮菜的精致味道", "文化": "外滩万国建筑与豫园老城厢"}},
    {"name": "苏州", "region": "中国-华东", "tags": ["文化", "自然", "历史"], "tag_details": {"文化": "拙政园品江南园林极致美学", "自然": "太湖之滨的烟波浩渺", "历史": "虎丘斜塔的千年传奇"}},
    {"name": "香港", "region": "中国-华南", "tags": ["购物", "美食", "文化"], "tag_details": {"购物": "铜锣湾与尖沙咀的免税天堂", "美食": "米其林小吃与港式茶餐厅", "文化": "天星小轮与太平山顶维港夜景"}},
    {"name": "九寨沟", "region": "中国-西南", "tags": ["自然", "摄影", "冒险"], "tag_details": {"自然": "五花海与诺日朗瀑布的童话世界", "摄影": "五彩池水的绝美倒影", "冒险": "原始森林徒步探秘"}},
    {"name": "昆明", "region": "中国-西南", "tags": ["自然", "文化", "休闲"], "tag_details": {"自然": "滇池红嘴鸥与石林奇观", "文化": "云南民族村的多元风情", "休闲": "翠湖畔的春日暖阳与过桥米线"}},
    {"name": "敦煌", "region": "中国-西北", "tags": ["历史", "文化", "冒险"], "tag_details": {"历史": "莫高窟千年壁画的震撼朝圣", "文化": "丝路文化与鸣沙山月牙泉", "冒险": "戈壁沙漠越野与骑骆驼"}},
]


@dataclass
class WishItem:
    id: str
    name: str
    region: str = ""
    tags: list = field(default_factory=list)
    priority: int = 3
    completed: bool = False
    created_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().strftime("%Y-%m-%d %H:%M")


@dataclass
class Recommendation:
    destination: str
    region: str
    tags: list
    reason: str
    liked: Optional[bool] = None


def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_data():
    _ensure_data_dir()
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"wishes": [], "disliked": [], "recommendation_history": []}


def _save_data(data):
    _ensure_data_dir()
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _wish_from_dict(d) -> WishItem:
    return WishItem(
        id=d["id"],
        name=d["name"],
        region=d.get("region", ""),
        tags=d.get("tags", []),
        priority=d.get("priority", 3),
        completed=d.get("completed", False),
        created_at=d.get("created_at", ""),
    )


def _generate_id():
    return datetime.now().strftime("%Y%m%d%H%M%S") + f"{random.randint(100, 999)}"


def cmd_add(args):
    data = _load_data()
    tags = [t.strip() for t in args.tags.split(",")] if args.tags else []
    region = args.region or ""
    priority = args.priority if args.priority else 3

    existing_names = {w["name"] for w in data["wishes"]}
    if args.name in existing_names:
        print(f"❌ 心愿「{args.name}」已存在，请勿重复添加")
        return

    item = WishItem(
        id=_generate_id(),
        name=args.name,
        region=region,
        tags=tags,
        priority=priority,
    )
    data["wishes"].append(asdict(item))
    _save_data(data)
    tag_str = "、".join(tags) if tags else "无"
    print(f"✅ 已添加心愿: {args.name}")
    print(f"   区域: {region or '未指定'} | 标签: {tag_str} | 优先级: {priority}")


def cmd_list(args):
    if args.show_excluded:
        cmd_show_excluded()
        return

    data = _load_data()
    wishes = data["wishes"]

    if args.tag:
        wishes = [w for w in wishes if args.tag in w.get("tags", [])]
    if args.region:
        wishes = [w for w in wishes if args.region in w.get("region", "")]
    if args.completed is not None:
        if args.completed:
            wishes = [w for w in wishes if w.get("completed", False)]
        else:
            wishes = [w for w in wishes if not w.get("completed", False)]

    if not wishes:
        print("📭 暂无匹配的心愿")
        return

    if args.sort == "priority":
        wishes.sort(key=lambda w: w.get("priority", 3))
    elif args.sort == "time":
        wishes.sort(key=lambda w: w.get("created_at", ""), reverse=True)

    print(f"\n{'='*60}")
    print(f"  🌍 旅行心愿清单 (共 {len(wishes)} 项)")
    print(f"{'='*60}")
    for w in wishes:
        status = "✅" if w.get("completed") else "⬜"
        tags_str = " ".join(f"#{t}" for t in w.get("tags", []))
        print(f"  {status} [{w.get('priority', 3)}★] {w['name']}")
        print(f"     区域: {w.get('region', '未指定')} | 标签: {tags_str or '无'}")
        print(f"     添加时间: {w.get('created_at', '未知')}")
        print(f"     ID: {w['id']}")
        print()


def cmd_show_excluded():
    data = _load_data()
    excluded = data.get("disliked_details", [])

    if not excluded:
        print("\n  📭 暂无被排除的目的地")
        return

    print(f"\n{'='*60}")
    print(f"  🚫 被排除的推荐目的地 (共 {len(excluded)} 项，不会再推荐)")
    print(f"{'='*60}")
    for item in excluded:
        tags_str = "、".join(item.get("tags", [])) or "无"
        print(f"  ❌ {item['name']} ({item.get('region', '未知')})")
        print(f"     标签: {tags_str}")
        print(f"     排除时间: {item.get('excluded_at', '未知')}")
        print()


def cmd_remove(args):
    data = _load_data()
    before = len(data["wishes"])
    data["wishes"] = [w for w in data["wishes"] if w["id"] != args.id]
    after = len(data["wishes"])

    if before == after:
        print(f"❌ 未找到 ID 为 {args.id} 的心愿")
        return

    _save_data(data)
    print(f"🗑️  已删除心愿 (ID: {args.id})")


def cmd_complete(args):
    data = _load_data()
    found = False
    for w in data["wishes"]:
        if w["id"] == args.id:
            w["completed"] = True
            found = True
            break

    if not found:
        print(f"❌ 未找到 ID 为 {args.id} 的心愿")
        return

    _save_data(data)
    print(f"🎉 已完成心愿 (ID: {args.id})")


def _compute_similarity(user_tags: set, dest_tags: list) -> tuple:
    matched = user_tags & set(dest_tags)
    score = len(matched) / len(set(dest_tags)) if dest_tags else 0
    return score, matched


def _generate_personalized_reason(dest: dict, matched_tags: set) -> str:
    tag_details = dest.get("tag_details", {})
    name = dest["name"]

    if not matched_tags:
        return f"{name}是一个值得探索的目的地，也许会给你带来意想不到的惊喜"

    sorted_tags = sorted(matched_tags, key=lambda t: list(tag_details.keys()).index(t) if t in tag_details else 99)

    if len(sorted_tags) == 1:
        tag = sorted_tags[0]
        detail = tag_details.get(tag, f"体验{name}的{tag}魅力")
        return f"因为你对「{tag}」感兴趣，推荐去{name}{detail}"

    if len(sorted_tags) == 2:
        details = []
        for tag in sorted_tags:
            d = tag_details.get(tag, f"感受{tag}魅力")
            details.append(d)
        tags_str = "」和「".join(sorted_tags)
        return f"因为你对「{tags_str}」感兴趣，推荐去{name}——{details[0]}，{details[1]}"

    main_tags = sorted_tags[:2]
    extra_count = len(sorted_tags) - 2
    details = []
    for tag in main_tags:
        d = tag_details.get(tag, f"感受{tag}魅力")
        details.append(d)
    tags_str = "」和「".join(main_tags)
    return f"因为你对「{tags_str}」等{len(sorted_tags)}个方向感兴趣，推荐去{name}——{details[0]}，{details[1]}，还有{extra_count}个契合点等你发现"


def cmd_recommend(args):
    data = _load_data()
    user_tags = set()
    user_names = set()
    for w in data["wishes"]:
        user_tags.update(w.get("tags", []))
        user_names.add(w["name"])

    disliked_names = set(data.get("disliked", []))

    candidates = []
    for dest in DESTINATION_DB:
        if dest["name"] in user_names:
            continue
        if dest["name"] in disliked_names:
            continue
        score, matched = _compute_similarity(user_tags, dest["tags"])
        candidates.append((dest, score, matched))

    if not candidates:
        print("🤔 暂无可推荐的目的地（已全部添加或被标记不喜欢）")
        return

    candidates.sort(key=lambda x: x[1], reverse=True)

    if candidates[0][1] == 0:
        chosen, score, matched = random.choice(candidates)
    else:
        top_candidates = [c for c in candidates if c[1] == candidates[0][1]]
        if len(top_candidates) == 1:
            chosen, score, matched = top_candidates[0]
        else:
            chosen, score, matched = random.choice(top_candidates)

    reason = _generate_personalized_reason(chosen, matched)

    rec = Recommendation(
        destination=chosen["name"],
        region=chosen["region"],
        tags=chosen["tags"],
        reason=reason,
    )

    data["current_recommendation"] = asdict(rec)
    _save_data(data)

    score_pct = f"{score * 100:.0f}%"
    matched_str = "、".join(matched) if matched else "无"

    print(f"\n{'='*60}")
    print(f"  🤖 AI 推荐目的地")
    print(f"{'='*60}")
    print(f"  📍 {rec.destination} ({rec.region})")
    print(f"  🏷️  标签: {'、'.join(rec.tags)}")
    print(f"  🎯 匹配度: {score_pct} (匹配标签: {matched_str})")
    print(f"  💡 推荐理由: {rec.reason}")
    print(f"{'='*60}")
    print(f"\n  👍 喜欢? 请输入: travel_wish.py like")
    print(f"  👎 不喜欢? 请输入: travel_wish.py dislike")


def cmd_like(args):
    data = _load_data()
    rec = data.get("current_recommendation")
    if not rec:
        print("❌ 当前没有待评价的推荐，请先运行 recommend 命令")
        return

    item = WishItem(
        id=_generate_id(),
        name=rec["destination"],
        region=rec["region"],
        tags=rec["tags"],
        priority=3,
    )
    data["wishes"].append(asdict(item))
    data["recommendation_history"] = data.get("recommendation_history", [])
    data["recommendation_history"].append({**rec, "liked": True})
    del data["current_recommendation"]
    _save_data(data)
    print(f"❤️  已将「{rec['destination']}」加入心愿清单！")


def cmd_dislike(args):
    data = _load_data()
    rec = data.get("current_recommendation")
    if not rec:
        print("❌ 当前没有待评价的推荐，请先运行 recommend 命令")
        return

    if "disliked" not in data:
        data["disliked"] = []
    data["disliked"].append(rec["destination"])

    if "disliked_details" not in data:
        data["disliked_details"] = []
    data["disliked_details"].append({
        "name": rec["destination"],
        "region": rec.get("region", ""),
        "tags": rec.get("tags", []),
        "excluded_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    })

    data["recommendation_history"] = data.get("recommendation_history", [])
    data["recommendation_history"].append({**rec, "liked": False})
    del data["current_recommendation"]
    _save_data(data)
    print(f"👎 已将「{rec['destination']}」标记为不喜欢，不会再推荐")


def cmd_export(args):
    data = _load_data()
    wishes = data["wishes"]

    if not wishes:
        print("📭 心愿清单为空，无法导出")
        return

    group_by = args.group or "region"

    if group_by == "region":
        groups = {}
        for w in wishes:
            key = w.get("region") or "未分类"
            groups.setdefault(key, []).append(w)
    elif group_by == "priority":
        groups = {}
        for w in wishes:
            key = f"优先级 {w.get('priority', 3)}"
            groups.setdefault(key, []).append(w)
    else:
        print(f"❌ 不支持的分组方式: {group_by}，请使用 region 或 priority")
        return

    output_file = args.output or f"travel_wish_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    export_data = {
        "export_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "group_by": group_by,
        "total": len(wishes),
        "groups": {},
    }
    for key, items in groups.items():
        export_data["groups"][key] = [
            {
                "name": w["name"],
                "tags": w.get("tags", []),
                "priority": w.get("priority", 3),
                "completed": w.get("completed", False),
                "region": w.get("region", ""),
            }
            for w in items
        ]

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"  📤 心愿清单已导出")
    print(f"{'='*60}")
    print(f"  分组方式: {'按区域' if group_by == 'region' else '按优先级'}")
    print(f"  总计: {len(wishes)} 项心愿")
    for key, items in groups.items():
        completed = sum(1 for w in items if w.get("completed"))
        print(f"  📁 {key}: {len(items)} 项 (已完成 {completed})")
    print(f"  💾 文件: {output_file}")
    print()


def cmd_import(args):
    file_path = args.file
    if not os.path.exists(file_path):
        print(f"❌ 文件不存在: {file_path}")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        import_data = json.load(f)

    import_wishes = []

    if "wishes" in import_data:
        import_wishes = import_data["wishes"]
    elif "groups" in import_data:
        for group_name, items in import_data["groups"].items():
            for item in items:
                if not item.get("region"):
                    item["region"] = group_name
                import_wishes.append(item)

    if not import_wishes:
        print("❌ 未在文件中找到可导入的心愿数据")
        return

    data = _load_data()
    existing_names = {w["name"] for w in data["wishes"]}

    added = 0
    skipped = 0
    for w in import_wishes:
        name = w.get("name", "").strip()
        if not name:
            continue
        if name in existing_names:
            skipped += 1
            continue

        item = WishItem(
            id=_generate_id(),
            name=name,
            region=w.get("region", ""),
            tags=w.get("tags", []),
            priority=w.get("priority", 3),
            completed=w.get("completed", False),
        )
        data["wishes"].append(asdict(item))
        existing_names.add(name)
        added += 1

    _save_data(data)
    print(f"\n{'='*60}")
    print(f"  📥 心愿导入完成")
    print(f"{'='*60}")
    print(f"  ✅ 新增: {added} 项")
    print(f"  ⏭️  跳过(已存在): {skipped} 项")
    print(f"  📊 清单总计: {len(data['wishes'])} 项")
    print()


def cmd_plan(args):
    data = _load_data()
    unfinished = [w for w in data["wishes"] if not w.get("completed")]

    if len(unfinished) < 1:
        print("📭 没有未完成的心愿，无法生成计划")
        return

    count = min(3, len(unfinished))
    selected = random.sample(unfinished, count)

    itinerary = _build_itinerary(selected)

    print(f"\n{'='*60}")
    print(f"  🗺️  旅行计划草稿")
    print(f"{'='*60}")
    print(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print()

    for i, (day, wish) in enumerate(zip(itinerary, selected), 1):
        tags_str = "、".join(wish.get("tags", [])) or "无"
        print(f"  📅 第{i}天 → {wish['name']}")
        print(f"     区域: {wish.get('region', '未指定')}")
        print(f"     标签: {tags_str}")
        print(f"     活动: {day}")
        print()

    print(f"{'='*60}")
    print(f"  💡 提示: 这是一个草稿计划，请根据实际情况调整行程")
    print(f"  可运行 'travel_wish.py plan' 重新生成随机计划")
    print()


def _build_itinerary(wishes):
    plans = []
    for wish in wishes:
        tags = wish.get("tags", [])
        name = wish["name"]
        day_plan = []

        if "美食" in tags:
            day_plan.append(f"品尝{name}当地特色美食")
        if "文化" in tags:
            day_plan.append(f"探索{name}的历史文化景点")
        if "历史" in tags:
            day_plan.append(f"参观{name}的历史遗迹与博物馆")
        if "自然" in tags:
            day_plan.append(f"欣赏{name}的自然风光")
        if "冒险" in tags:
            day_plan.append(f"体验{name}的户外探险活动")
        if "购物" in tags:
            day_plan.append(f"逛{name}的特色商圈与集市")
        if "休闲" in tags:
            day_plan.append(f"在{name}享受悠闲放松时光")
        if "摄影" in tags:
            day_plan.append(f"捕捉{name}的最佳拍摄点")
        if "浪漫" in tags:
            day_plan.append(f"感受{name}的浪漫氛围")

        if not day_plan:
            day_plan.append(f"自由探索{name}的魅力")

        plans.append(" → ".join(day_plan))

    return plans


def main():
    parser = argparse.ArgumentParser(
        prog="travel_wish",
        description="🌍 旅行心愿清单管理工具 - 记录梦想，规划旅程",
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    p_add = subparsers.add_parser("add", help="添加一个旅行心愿")
    p_add.add_argument("name", help="目的地名称")
    p_add.add_argument("-r", "--region", default="", help="所属区域 (如: 中国-西南)")
    p_add.add_argument("-t", "--tags", default="", help="标签，逗号分隔 (如: 美食,冒险)")
    p_add.add_argument("-p", "--priority", type=int, default=3, help="优先级 1-5 (默认3)")
    p_add.set_defaults(func=cmd_add)

    p_list = subparsers.add_parser("list", help="查看心愿清单")
    p_list.add_argument("-t", "--tag", help="按标签筛选")
    p_list.add_argument("-r", "--region", help="按区域筛选")
    p_list.add_argument("--completed", action="store_true", default=None, help="只显示已完成")
    p_list.add_argument("--uncompleted", action="store_true", help="只显示未完成")
    p_list.add_argument("--sort", choices=["priority", "time"], default="priority", help="排序方式")
    p_list.add_argument("--show-excluded", action="store_true", help="查看被排除的推荐目的地")
    p_list.set_defaults(func=cmd_list)

    p_remove = subparsers.add_parser("remove", help="删除一个心愿")
    p_remove.add_argument("id", help="心愿ID")
    p_remove.set_defaults(func=cmd_remove)

    p_complete = subparsers.add_parser("complete", help="标记心愿为已完成")
    p_complete.add_argument("id", help="心愿ID")
    p_complete.set_defaults(func=cmd_complete)

    p_rec = subparsers.add_parser("recommend", help="AI推荐目的地")
    p_rec.set_defaults(func=cmd_recommend)

    p_like = subparsers.add_parser("like", help="喜欢当前推荐，加入心愿清单")
    p_like.set_defaults(func=cmd_like)

    p_dislike = subparsers.add_parser("dislike", help="不喜欢当前推荐，不再推荐")
    p_dislike.set_defaults(func=cmd_dislike)

    p_export = subparsers.add_parser("export", help="导出心愿清单")
    p_export.add_argument("-g", "--group", choices=["region", "priority"], default="region", help="分组方式")
    p_export.add_argument("-o", "--output", help="输出文件路径")
    p_export.set_defaults(func=cmd_export)

    p_import = subparsers.add_parser("import", help="从JSON文件合并导入心愿")
    p_import.add_argument("file", help="JSON文件路径")
    p_import.set_defaults(func=cmd_import)

    p_plan = subparsers.add_parser("plan", help="生成旅行计划草稿")
    p_plan.set_defaults(func=cmd_plan)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if hasattr(args, "uncompleted") and args.uncompleted:
        args.completed = False

    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

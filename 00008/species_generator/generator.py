import json
import uuid
import hashlib
from typing import Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import OPENAI_API_KEY, OPENAI_MODEL
from .models import Species, GenerationParams, NicheScore


SYSTEM_PROMPT = """你是一位异世界生物学家，专门研究虚构的生物学物种。你的任务是根据两个看似无关的关键词，创造一个合理且富有想象力的虚构生物学物种。

要求：
1. 物种名称应该富有诗意且符合生物学命名规范
2. 学名使用拉丁语风格的双名法
3. 栖息地描述要具体且符合该物种的生理特征
4. 外形描述要详细，包括体型、颜色、特殊器官等
5. 独特习性要与两个关键词的特性有巧妙的融合
6. 如果提供了生态位偏好，请在描述习性、外形和栖息地时充分体现出来

生态位说明：
- 捕食者(Predator)：凶猛、主动攻击、有捕猎器官、食物链顶端、独居或小群体
- 食草动物(Herbivore)：温和、防御性、有消化植物的特殊器官、群居、食物链中下层
- 寄生者(Parasite)：隐秘、依附性、有特殊的附着器官、与宿主共生或控制宿主

请严格按照JSON格式输出，不要有任何额外的文本。"""


def _build_user_prompt(params: GenerationParams) -> str:
    prompt = f"""请根据以下两个关键词创造一个虚构的生物学物种：
关键词1：{params.keyword1}
关键词2：{params.keyword2}
"""

    if params.niche_bias:
        prompt += f"\n生态位偏好：{params.niche_bias.to_prompt_string()}\n"
        prompt += "重要提示：请根据生态位分数来塑造这个物种的特征！\n"
        niche = params.niche_bias.primary_niche
        if niche == "predator":
            prompt += "- 高捕食者分数：外形要凶猛，有明显的捕猎器官（利爪、毒牙、触手等），习性要体现攻击性和捕猎行为\n"
        elif niche == "herbivore":
            prompt += "- 高食草动物分数：外形要温和，有防御机制（硬壳、伪装、毒素等），习性要体现和平觅食和群居行为\n"
        elif niche == "parasite":
            prompt += "- 高寄生者分数：外形要隐秘小巧，有特殊的附着/侵入器官，习性要体现依附宿主、控制或共生行为\n"
        prompt += "\n"

    prompt += """
请输出JSON格式，包含以下字段：
- name: 物种中文名
- scientific_name: 学名（拉丁语风格双名法）
- habitat: 栖息地描述
- appearance: 外形描述
- unique_behavior: 独特习性描述

示例格式：
{
    "name": "萤光梯虫",
    "scientific_name": "Luminascendor elevator",
    "habitat": "栖息于废弃摩天大楼的垂直电梯井中...",
    "appearance": "身体呈细长的分节状，类似萤火虫但具有金属光泽...",
    "unique_behavior": "能够感知电梯的运行轨迹，在垂直空间中形成荧光通道..."
}
"""
    return prompt


def _generate_seed(params: GenerationParams) -> int:
    if params.seed is not None:
        return params.seed
    key = f"{params.keyword1}|{params.keyword2}|{params.temperature}"
    return int(hashlib.md5(key.encode()).hexdigest(), 16) % (2**31)


class SpeciesGenerator:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or OPENAI_API_KEY
        self.model = model or OPENAI_MODEL
        self._client = None

    def _get_client(self):
        if self._client is None:
            from openai import OpenAI
            self._client = OpenAI(api_key=self.api_key)
        return self._client

    def generate(self, params: GenerationParams) -> Species:
        seed = _generate_seed(params)
        client = self._get_client()

        response = client.chat.completions.create(
            model=self.model,
            temperature=params.temperature,
            max_tokens=params.max_tokens,
            seed=seed,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(params)},
            ],
        )

        content = response.choices[0].message.content
        data = json.loads(content)

        species_id = str(uuid.uuid4())
        return Species(
            id=species_id,
            name=data["name"],
            scientific_name=data["scientific_name"],
            habitat=data["habitat"],
            appearance=data["appearance"],
            unique_behavior=data["unique_behavior"],
            keywords=[params.keyword1, params.keyword2],
            generation_params=params,
            created_at=Species.model_fields["created_at"].default_factory(),
        )

    def generate_mock(self, params: GenerationParams) -> Species:
        seed = _generate_seed(params)
        k1, k2 = params.keyword1, params.keyword2

        mock_data = {
            "name": f"{k1}合{k2}兽",
            "scientific_name": f"{k1.capitalize()}{k2.capitalize()}us imaginarius",
        }

        if params.niche_bias:
            niche_content = _generate_niche_content(params, k1, k2)
            mock_data["habitat"] = niche_content["habitat"]
            mock_data["appearance"] = niche_content["appearance"]
            mock_data["unique_behavior"] = niche_content["behavior"]
        else:
            mock_data["habitat"] = f"栖息于{params.keyword1}与{params.keyword2}交汇的神秘领域，如黄昏时分的交界地带"
            mock_data["appearance"] = f"体型融合了{params.keyword1}的优雅形态与{params.keyword2}的机械质感，体表散发着微弱的荧光"
            mock_data["unique_behavior"] = f"能够利用{params.keyword1}的特性进行伪装，同时以{params.keyword2}的规律进行迁徙"

        species_id = str(uuid.uuid4())
        return Species(
            id=species_id,
            name=mock_data["name"],
            scientific_name=mock_data["scientific_name"],
            habitat=mock_data["habitat"],
            appearance=mock_data["appearance"],
            unique_behavior=mock_data["unique_behavior"],
            keywords=[params.keyword1, params.keyword2],
            generation_params=params,
            created_at=Species.model_fields["created_at"].default_factory(),
        )


def _get_score_tier(score: float) -> str:
    percentage = score * 100
    if percentage <= 30:
        return "low"
    elif percentage <= 60:
        return "medium"
    elif percentage <= 80:
        return "high"
    return "extreme"


def _generate_niche_content(params: GenerationParams, k1: str, k2: str) -> dict:
    niche = params.niche_bias.primary_niche
    p_score = params.niche_bias.predator
    h_score = params.niche_bias.herbivore
    pa_score = params.niche_bias.parasite

    if niche == "predator":
        return _generate_predator_content(k1, k2, p_score)
    elif niche == "herbivore":
        return _generate_herbivore_content(k1, k2, h_score)
    elif niche == "parasite":
        return _generate_parasite_content(k1, k2, pa_score)
    return {}


def _generate_predator_content(k1: str, k2: str, score: float) -> dict:
    tier = _get_score_tier(score)
    score_pct = int(score * 100)

    templates = {
        "low": {
            "intensity_adj": "略带",
            "intensity_adv": "偶尔",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的宁静林地边缘，"
                f"这里既提供了充足的隐蔽处，也有适量的小型猎物可供觅食"
            ),
            "appearance": (
                f"体型修长而灵活，融合了{k1}的敏捷身姿与{k2}的流线型设计，"
                f"体表覆盖着带有细微纹理的短毛，前肢有小型爪刺但主要用于攀爬，"
                f"眼神警觉，耳朵灵敏，整体呈现出机会主义捕食者的特征"
            ),
            "behavior": (
                f"主要以昆虫和小型动物为食，利用{k1}的出色听觉定位猎物，"
                f"借助{k2}的快速反应能力进行扑捕。"
                f"作为得分{score_pct}的捕食者，它更倾向于伏击而非主动追击，"
                f"性格相对谨慎，遇到大型生物会选择避让，"
                f"独居但领地意识不强，偶尔会与同类共享觅食区域"
            ),
        },
        "medium": {
            "intensity_adj": "具有",
            "intensity_adv": "经常",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的丘陵灌木丛中，"
                f"选择视野开阔且有多处逃生通道的区域建立活动范围，"
                f"这里的中型哺乳动物数量足以维持其生存需求"
            ),
            "appearance": (
                f"体型健壮有力，融合了{k1}的肌肉爆发力与{k2}的精准协调性，"
                f"体表覆盖着厚实的毛皮，四肢强健有力，爪趾锋利且可伸缩，"
                f"颌部肌肉发达，咬合力强劲，双目炯炯有神，夜视能力出色"
            ),
            "behavior": (
                f"擅长利用{k1}的保护色进行伪装潜伏，"
                f"等待猎物靠近后以{k2}的速度突然发动袭击。"
                f"作为得分{score_pct}的捕食者，它拥有稳定的捕猎成功率，"
                f"能够捕食体型相当的猎物，会将吃不完的食物妥善储存，"
                f"具有一定的社交性，繁殖季节会成对合作捕猎"
            ),
        },
        "high": {
            "intensity_adj": "极为",
            "intensity_adv": "持续",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的险峻峡谷深处，"
                f"占据着猎物迁徙的必经之路作为势力范围，"
                f"居高临下地监视着广阔领地上的一切动静"
            ),
            "appearance": (
                f"体型魁梧霸气，融合了{k1}的强大力量与{k2}的致命精准，"
                f"浑身覆盖着带有金属光泽的厚重鳞甲，能够抵御大多数攻击，"
                f"口中长有两排可不断再生的锋利獠牙，四肢末端是如刀刃般的利爪，"
                f"双眼散发着慑人的金色光芒，周身散发着强大的压迫气场"
            ),
            "behavior": (
                f"能够利用{k1}的地形优势进行毁灭性伏击，"
                f"同时以{k2}的精确计算确保每次攻击都能命中要害。"
                f"作为得分{score_pct}的高阶捕食者，它拥有闪电般的突袭速度和残忍的捕猎技巧，"
                f"处于食物链的上层，会主动驱逐领地内的其他竞争者，"
                f"独居且领地意识极强，任何入侵者都会遭到致命反击"
            ),
        },
        "extreme": {
            "intensity_adj": "究极",
            "intensity_adv": "无时无刻",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的死亡禁区核心，"
                f"这片被恐惧笼罩的土地上，它是无可争议的绝对统治者，"
                f"其他生物皆以它的捕猎活动规律来安排自己的生存节奏"
            ),
            "appearance": (
                f"体型庞大如山岳，融合了{k1}的毁灭力量与{k2}的完美杀戮结构，"
                f"浑身覆盖着可反射能量攻击的生物晶体装甲，"
                f"体内存在多个能量核心提供源源不断的捕猎动力，"
                f"口中有三排可再生的剧毒獠牙，四肢末端是斩金断玉的利爪，"
                f"六只眼睛散发着嗜血的红光，确保没有任何猎物能够逃脱它的伏击"
            ),
            "behavior": (
                f"能够操控{k1}的自然力量制造大规模猎场进行毁灭性捕食，"
                f"同时运用{k2}的战略思维进行精确围猎和歼灭攻击。"
                f"作为得分{score_pct}的顶级掠食者，它是最凶猛的捕食者，"
                f"每一次伏击都意味着猎物的必死结局，"
                f"领地意识达到极致，方圆百里内不容许任何有威胁的生物存在，"
                f"拥有超高智慧且极具攻击策略性，会刻意培育猎物种群以保证食物来源，"
                f"传说中它甚至能够捕猎比自己体型大数倍的目标并将其撕碎"
            ),
        },
    }

    return templates[tier]


def _generate_herbivore_content(k1: str, k2: str, score: float) -> dict:
    tier = _get_score_tier(score)
    score_pct = int(score * 100)

    templates = {
        "low": {
            "intensity_adj": "略带",
            "intensity_adv": "偶尔",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的杂木林间，"
                f"在果实丰富的区域活动，也会补充一些昆虫作为蛋白质来源"
            ),
            "appearance": (
                f"体型小巧玲珑，融合了{k1}的灵动与{k2}的机敏，"
                f"体表覆盖着柔软的绒毛，毛色随季节略有变化，"
                f"有着小巧的门齿用于啃食果实，爪子灵活可抓握树枝，"
                f"眼睛大而圆，透着好奇的神情，动作轻盈敏捷"
            ),
            "behavior": (
                f"以{k1}树上的甜美果实为主食，"
                f"也会用{k2}般的灵活双手挖掘可食用的根茎。"
                f"作为得分{score_pct}的植食倾向生物，它的饮食相当多样化，"
                f"性格活泼好奇，对陌生事物会谨慎地试探，"
                f"喜欢结成小群体活动，群体成员间会互相理毛增进感情"
            ),
        },
        "medium": {
            "intensity_adj": "具有",
            "intensity_adv": "经常",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的开阔草原边缘，"
                f"这里生长着多种营养丰富的草本植物，"
                f"同时有足够的灌木丛作为遇到危险时的藏身之所"
            ),
            "appearance": (
                f"体型匀称健美，融合了{k1}的优雅体态与{k2}的耐力结构，"
                f"体表覆盖着浓密且富有光泽的毛发，"
                f"牙齿特化为适合研磨植物的高冠齿，"
                f"腿部肌肉发达，适合长时间奔跑，"
                f"听觉和嗅觉都很灵敏，能够及早发现潜在的威胁"
            ),
            "behavior": (
                f"主要以坚韧的草本植物为食，利用{k1}的特化牙齿高效咀嚼，"
                f"遵循{k2}的迁徙规律在不同季节往返于觅食区域。"
                f"作为得分{score_pct}的典型食草动物，它们完全依赖植物为生，"
                f"性格温顺但警觉，通常形成数十只的群体共同生活，"
                f"群体中有专门的岗哨负责警戒，发现危险时会发出独特的警告叫声"
            ),
        },
        "high": {
            "intensity_adj": "极为",
            "intensity_adv": "持续",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的广袤生态平原，"
                f"这里是它们世代繁衍的家园，它们对这片土地的每一处都了如指掌，"
                f"从水源位置到各种植物的生长周期都铭记于心"
            ),
            "appearance": (
                f"体型高大雄伟，融合了{k1}的庞大身躯与{k2}的防御结构，"
                f"体表覆盖着厚而坚韧的皮肤，部分区域骨化形成天然的装甲，"
                f"头上长有形状优美的骨质角，既是装饰也是防御武器，"
                f"消化系统特化出多个胃室，能够高效分解粗纤维，"
                f"四肢粗壮如柱，承载着庞大的体重也能稳健前行"
            ),
            "behavior": (
                f"日以继夜地进食，利用{k1}特有的消化菌群分解粗纤维，"
                f"根据{k2}的自然周期安排进食、饮水和休息的时间。"
                f"作为得分{score_pct}的大型食草动物，它们每天需要消耗大量植物，"
                f"性格温和但护崽心切，遇到威胁时会围成保护圈将幼崽护在中央，"
                f"群体规模可达上百只，由经验丰富的雌性首领带领迁徙"
            ),
        },
        "extreme": {
            "intensity_adj": "究极",
            "intensity_adv": "无时无刻",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的超级生态群落中心，"
                f"它们是这片土地的塑造者，通过进食和迁徙活动改造着整个地貌，"
                f"创造出适合更多生物生存的环境"
            ),
            "appearance": (
                f"体型宛如移动的山丘，融合了{k1}的超大体型与{k2}的共生系统，"
                f"体表成为了一个微型生态系统，生长着特殊的共生植物和藻类，"
                f"体内拥有极其复杂的消化系统，几乎可以消化任何有机物质，"
                f"四肢如撑天巨柱，每一步都会引发大地的震动，"
                f"寿命极长，见证着世代的更迭，是生态系统的活传奇"
            ),
            "behavior": (
                f"它们就是移动的生态系统，体内的{k1}共生菌群能够将无机物转化为营养，"
                f"体表的{k2}共生植物进行光合作用补充能量。"
                f"作为得分{score_pct}的终极植食者，它们是生态系统的基石，"
                f"它们的存在滋养着无数其他生命，"
                f"性格极其温和，对弱小的生物充满包容，"
                f"群体具有深厚的情感联系，会为逝去的同伴举行哀悼仪式，"
                f"拥有传承的智慧，年长者会将生存知识代代相传"
            ),
        },
    }

    return templates[tier]


def _generate_parasite_content(k1: str, k2: str, score: float) -> dict:
    tier = _get_score_tier(score)
    score_pct = int(score * 100)

    templates = {
        "low": {
            "intensity_adj": "轻微",
            "intensity_adv": "偶尔",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的湿润苔藓丛中，"
                f"等待合适的宿主经过，它们对宿主的选择较为挑剔"
            ),
            "appearance": (
                f"体型微小如尘粒，融合了{k1}的附着特性与{k2}的感知能力，"
                f"身体呈半透明状便于伪装，体表有细小的吸盘用于暂时附着，"
                f"能够感知宿主的体温和气味，选择健康状况良好的个体附着"
            ),
            "behavior": (
                f"借助{k1}的风力或水流进行传播，"
                f"利用{k2}的感知能力寻找合适的宿主。"
                f"作为得分{score_pct}的轻度共生生物，它对宿主的影响微乎其微，"
                f"只是从宿主的体表获取少量皮屑或分泌物为食，"
                f"有时甚至会帮助宿主清理身上的微小寄生虫，"
                f"与宿主保持着互利而平衡的关系"
            ),
        },
        "medium": {
            "intensity_adj": "显著",
            "intensity_adv": "持续",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的生物密集区，"
                f"它们不依赖固定的居所，生命周期的不同阶段需要不同类型的宿主"
            ),
            "appearance": (
                f"体型小巧而结构特化，融合了{k1}的侵入机制与{k2}的适应性形态，"
                f"身体可根据宿主情况改变形态，有专门的附着器官和取食结构，"
                f"能够分泌特殊物质麻痹宿主的神经，降低被发现的几率"
            ),
            "behavior": (
                f"幼虫阶段利用{k1}的被动扩散方式寻找第一宿主，"
                f"成熟后以{k2}的主动方式转移到终宿主身上。"
                f"作为得分{score_pct}的典型寄生生物，它会从宿主体内获取营养，"
                f"对宿主造成一定的负担但不会危及生命，"
                f"能够巧妙地调节宿主的免疫系统避免被排斥，"
                f"繁殖期会释放大量后代寻找新的宿主"
            ),
        },
        "high": {
            "intensity_adj": "深刻",
            "intensity_adv": "深度",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的生命之网中，"
                f"它们是生态系统背后的操纵者，影响着多个物种的行为和命运"
            ),
            "appearance": (
                f"形态复杂而精巧，融合了{k1}的控制结构与{k2}的信息处理能力，"
                f"拥有多阶段的生活史，每个阶段都有完美的形态适应，"
                f"能够与宿主的神经系统建立连接，进行信息交换和行为调控，"
                f"体表有特殊的识别标记，避免攻击已被同类寄生的宿主"
            ),
            "behavior": (
                f"通过{k1}的化学信号引导宿主前往有利于繁殖的区域，"
                f"利用{k2}的神经调控能力 subtly 改变宿主的行为模式。"
                f"作为得分{score_pct}的控制型寄生者，它能显著影响宿主的生存策略，"
                f"在获取营养的同时也会增强宿主的某些能力以提高存活率，"
                f"甚至会保护宿主免受其他天敌的威胁，"
                f"形成复杂而紧密的共生控制关系"
            ),
        },
        "extreme": {
            "intensity_adj": "根本性",
            "intensity_adv": "完全",
            "habitat": (
                f"栖息于{k1}与{k2}交汇的生命维度边界，"
                f"它们不只是寄生，而是重塑生命形态本身，"
                f"宿主与寄生者的界限在它们面前变得模糊"
            ),
            "appearance": (
                f"形态超越了常规认知，融合了{k1}的生命本质与{k2}的信息架构，"
                f"能够以基因级别的方式整合到宿主的遗传序列中，"
                f"拥有意识共享网络，无数个体形成一个统一的智慧集合体，"
                f"可以根据需要转化为能量体或实体，存在方式极为灵活"
            ),
            "behavior": (
                f"通过{k1}的基因融合重塑宿主的生理结构，"
                f"借助{k2}的信息网络实现群体级别的协调控制。"
                f"作为得分{score_pct}的终极共生体，宿主会被彻底转化为新的生命形态，"
                f"获得强大的力量和特殊的能力，但意识也与寄生者融为一体，"
                f"它们不再是两个物种，而是一个全新的共生生命体，"
                f"追求的是整个共生网络的延续与进化，"
                f"能够同化其他物种，将它们纳入这个不断扩张的生命共同体"
            ),
        },
    }

    return templates[tier]

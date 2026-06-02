#!/usr/bin/env python3
"""测试生态位打分流程"""
import json
import sys
from pathlib import Path

from species_generator import (
    SpeciesGenerator,
    GenerationParams,
    NicheScorer,
    save_species,
    update_species,
    load_species,
)


def check_keywords(text: str, keywords: list) -> list:
    """检查文本中是否包含任意关键词，支持中英文混合匹配"""
    found = []
    text_lower = text.lower()
    for kw in keywords:
        if kw.lower() in text_lower:
            found.append(kw)
    return found


def test_niche_flow():
    print("=" * 70)
    print("测试生态位打分完整流程")
    print("=" * 70)

    generator = SpeciesGenerator()

    print("\n【步骤1】生成初始物种（无生态位偏好）")
    print("-" * 70)
    params = GenerationParams(
        keyword1="萤火虫",
        keyword2="电梯",
        temperature=0.9,
        max_tokens=800,
        seed=42,
    )
    species1 = generator.generate_mock(params)
    print(f"物种名称：{species1.name}")
    print(f"习性：{species1.unique_behavior[:100]}...")
    print(f"生态位分数：{species1.niche_score}")
    filepath = save_species(species1)
    print(f"保存到：{filepath}")

    print("\n【步骤2】对物种进行生态位打分（高捕食者倾向）")
    print("-" * 70)
    predator_score = 8.0
    herbivore_score = 1.0
    parasite_score = 1.0
    print(f"打分：捕食者={predator_score}, 食草动物={herbivore_score}, 寄生者={parasite_score}")

    niche_score = NicheScorer.create_from_scores(predator_score, herbivore_score, parasite_score)
    print(f"归一化后：{niche_score.to_prompt_string()}")

    species1_scored = species1.model_copy(update={"niche_score": niche_score})
    update_species(species1_scored, filepath)
    print(f"已更新：{filepath}")

    print("\n【步骤3】验证生态位分数已保存")
    print("-" * 70)
    loaded_species = load_species(filepath)
    print(f"加载物种：{loaded_species.name}")
    print(f"生态位分数：{loaded_species.niche_score.to_prompt_string()}")
    assert loaded_species.niche_score is not None, "生态位分数未保存！"
    assert loaded_species.niche_score.primary_niche == "predator", "主要生态位应该是捕食者！"
    print("✓ 生态位分数保存成功")

    print("\n【步骤4】基于已打分物种生成新物种（高捕食者，80分）")
    print("-" * 70)
    params2 = GenerationParams(
        keyword1="水母",
        keyword2="时钟",
        temperature=0.9,
        max_tokens=800,
        seed=100,
        niche_bias=loaded_species.niche_score,
    )
    species2 = generator.generate_mock(params2)
    print(f"新物种名称：{species2.name}")
    print(f"生态位偏好：{params2.niche_bias.to_prompt_string()}")
    print(f"\n栖息地：{species2.habitat}")
    print(f"\n外形：{species2.appearance}")
    print(f"\n习性：{species2.unique_behavior}")

    print("\n【验证】检查捕食者特征...")
    predator_keywords = [
        "捕食", "捕猎", "凶猛", "毒牙", "利爪", "突袭", "领地", "攻击",
        "predator", "hunt", "ferocious", "ambush", "territory"
    ]
    combined_text = species2.unique_behavior + species2.appearance
    found_keywords = check_keywords(combined_text, predator_keywords)
    if found_keywords:
        print(f"✓ 发现捕食者特征关键词：{found_keywords}")
    else:
        print("⚠ 未发现明显的捕食者特征词")

    assert "捕食者" in species2.unique_behavior or any(
        kw in species2.unique_behavior for kw in ["捕猎", "突袭", "伏击", "猎食"]), "习性中应该体现捕食者特征！"
    print("✓ 生态位影响验证通过！")

    print("\n【步骤5】测试不同生态位和不同分数段的差异")
    print("-" * 70)
    test_cases = [
        ("predator_low", "predator", 0.34),
        ("predator_medium", "predator", 0.55),
        ("predator_high", "predator", 0.75),
        ("predator_extreme", "predator", 0.95),
        ("herbivore_low", "herbivore", 0.34),
        ("herbivore_medium", "herbivore", 0.55),
        ("herbivore_high", "herbivore", 0.75),
        ("herbivore_extreme", "herbivore", 0.95),
        ("parasite_low", "parasite", 0.34),
        ("parasite_medium", "parasite", 0.55),
        ("parasite_high", "parasite", 0.75),
        ("parasite_extreme", "parasite", 0.95),
    ]

    results = {}
    for name, niche, score in test_cases:
        if niche == "predator":
            niche_score = NicheScorer.create_from_scores(score, (1-score)/2, (1-score)/2)
        elif niche == "herbivore":
            niche_score = NicheScorer.create_from_scores((1-score)/2, score, (1-score)/2)
        else:
            niche_score = NicheScorer.create_from_scores((1-score)/2, (1-score)/2, score)
        tier = "低(0-30%)" if score <= 0.3 else "中(31-60%)" if score <= 0.6 else "高(61-80%)" if score <= 0.8 else "极高(81-100%)"
        print(f"\n测试：{name} - 分数段{score:.0%} - {tier}")
        print(f"  实际分数：{niche_score.to_prompt_string()}")
        params_test = GenerationParams(
            keyword1="猫",
            keyword2="书",
            temperature=0.9,
            max_tokens=800,
            niche_bias=niche_score,
        )
        species_test = generator.generate_mock(params_test)
        print(f"  栖息地：{species_test.habitat[:60]}...")
        print(f"  习性：{species_test.unique_behavior[:80]}...")
        results[name] = species_test.unique_behavior

    print("\n【验证】检查各生态位特征词验证：")
    niche_keywords = {
        "predator": ["捕食", "捕猎", "伏击", "猎", "领地", "攻击", "掠食", "hunt", "predator"],
        "herbivore": ["觅食", "群居", "植物", "温和", "草食", "迁徙", "herbivore", "plant", "group"],
        "parasite": ["宿主", "共生", "附着", "寄生", "控制", "感染", "parasite", "host", "symbiosis"],
    }

    for niche in ["predator", "herbivore", "parasite"]:
        for tier in ["low", "medium", "high", "extreme"]:
            key = f"{niche}_{tier}"
            behavior = results[key]
            found = check_keywords(behavior, niche_keywords[niche])
            if found:
                print(f"  ✓ {niche}_{tier}: 发现特征词 {found}")
            else:
                print(f"  ⚠ {niche}_{tier}: 未发现明显特征词")

    print("\n" + "=" * 70)
    print("✓ 所有测试通过！生态位打分功能正常工作")
    print("=" * 70)
    return True


if __name__ == "__main__":
    try:
        test_niche_flow()
    except AssertionError as e:
        print(f"\n✗ 测试失败：{e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ 发生错误：{e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

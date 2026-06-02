#!/usr/bin/env python3
import argparse
import sys
import json
from pathlib import Path
from typing import List, Tuple, Optional

from species_generator import (
    SpeciesGenerator,
    GenerationParams,
    NicheScore,
    NicheScorer,
    save_species,
    update_species,
    load_species,
    list_species,
    generate_html_card,
    generate_html_gallery,
    AtlasManager,
)


def _parse_keyword_pairs(pairs_str: Optional[str]) -> List[Tuple[str, str]]:
    if not pairs_str:
        return []
    pairs = []
    for pair in pairs_str.split(";"):
        if "," in pair:
            k1, k2 = pair.split(",", 1)
            pairs.append((k1.strip(), k2.strip()))
    return pairs


def _parse_niche_bias(args) -> NicheScore:
    if args.niche:
        return NicheScorer.create_from_primary(args.niche, args.niche_strength)
    if args.predator is not None and args.herbivore is not None and args.parasite is not None:
        return NicheScorer.create_from_scores(args.predator, args.herbivore, args.parasite)
    return None


def cmd_generate(args):
    generator = SpeciesGenerator()
    niche_bias = _parse_niche_bias(args)

    if args.based_on:
        based_on_file = Path(args.based_on)
        if based_on_file.exists():
            base_species = load_species(based_on_file)
            if base_species.niche_score:
                print(f"基于物种 '{base_species.name}' 的生态位生成...")
                print(f"参考生态位：{base_species.niche_score.to_prompt_string()}")
                if niche_bias:
                    from species_generator import NicheScorer
                    niche_bias = NicheScorer.apply_bias(niche_bias, base_species.niche_score, 0.3)
                    print(f"融合后生态位：{niche_bias.to_prompt_string()}")
                else:
                    niche_bias = base_species.niche_score
            else:
                print(f"警告：参考物种 '{base_species.name}' 未进行生态位打分")

    params = GenerationParams(
        keyword1=args.keyword1,
        keyword2=args.keyword2,
        temperature=args.temperature,
        max_tokens=args.max_tokens,
        seed=args.seed,
        niche_bias=niche_bias,
    )

    print(f"\n正在生成物种：{args.keyword1} + {args.keyword2}")
    if niche_bias:
        print(f"生态位偏好：{niche_bias.to_prompt_string()}")

    try:
        if args.mock:
            species = generator.generate_mock(params)
        else:
            species = generator.generate(params)
    except Exception as e:
        print(f"生成失败：{e}")
        if args.mock_on_fail:
            print("使用Mock模式重试...")
            species = generator.generate_mock(params)
        else:
            sys.exit(1)

    _print_species(species)

    if args.save:
        filepath = save_species(species)
        print(f"\n已保存到：{filepath}")

    if args.html:
        html_path = generate_html_card(species)
        print(f"HTML卡片已生成：{html_path}")

    if args.add_to_atlas:
        atlas = AtlasManager()
        atlas.add_species(species)

    return species


def cmd_batch_generate(args):
    pairs = _parse_keyword_pairs(args.pairs)
    if not pairs and args.pairs_file:
        with open(args.pairs_file, "r", encoding="utf-8") as f:
            pairs_data = json.load(f)
            pairs = [(p["keyword1"], p["keyword2"]) for p in pairs_data]

    if not pairs:
        print("没有找到关键词对")
        sys.exit(1)

    generator = SpeciesGenerator()
    niche_bias = _parse_niche_bias(args)

    print(f"开始批量生成 {len(pairs)} 个物种...")
    species_list = []

    for i, (k1, k2) in enumerate(pairs, 1):
        print(f"\n[{i}/{len(pairs)}] 生成：{k1} + {k2}")
        params = GenerationParams(
            keyword1=k1,
            keyword2=k2,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
            seed=args.seed + i if args.seed else None,
            niche_bias=niche_bias,
        )

        try:
            if args.mock:
                species = generator.generate_mock(params)
            else:
                species = generator.generate(params)
            species_list.append(species)
            print(f"  ✓ {species.name}")

            if args.save:
                save_species(species)

        except Exception as e:
            print(f"  ✗ 失败：{e}")
            if args.mock_on_fail:
                print("    使用Mock模式...")
                species = generator.generate_mock(params)
                species_list.append(species)

    if args.html and species_list:
        html_path = generate_html_gallery(species_list)
        print(f"\nHTML图集已生成：{html_path}")

    if args.add_to_atlas:
        atlas = AtlasManager()
        for species in species_list:
            atlas.add_species(species)

    print(f"\n完成！成功生成 {len(species_list)}/{len(pairs)} 个物种")
    return species_list


def _resolve_species_file(file_arg: str) -> Path:
    """智能解析物种文件路径：支持绝对路径、相对路径、文件名匹配"""
    from config import GENERATIONS_DIR

    p = Path(file_arg)
    if p.exists():
        return p.resolve()

    candidates = [
        p,
        Path.cwd() / file_arg,
        GENERATIONS_DIR / file_arg,
        GENERATIONS_DIR / p.name,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()

    matches = list(GENERATIONS_DIR.glob(f"*{p.name}*"))
    if matches:
        return matches[0].resolve()

    return p


def cmd_score(args):
    filepath = None
    species = None

    if args.list_all:
        files = list_species()
        if not files:
            print("没有找到已生成的物种文件")
            sys.exit(0)

        print("\n=== 已生成的物种列表 ===")
        species_list = []
        for i, f in enumerate(files, 1):
            s = load_species(f)
            niche = s.niche_score.primary_niche if s.niche_score else "未打分"
            species_list.append((i, f, s))
            status = "✓ 已打分" if s.niche_score else "  未打分"
            print(f"  [{i:2d}] {s.name} - {niche} {status}")

        while True:
            try:
                choice = input("\n请选择要打分的物种编号（输入q退出）：").strip()
                if choice.lower() == 'q':
                    print("已取消")
                    sys.exit(0)
                choice_idx = int(choice) - 1
                if 0 <= choice_idx < len(species_list):
                    _, filepath, species = species_list[choice_idx]
                    break
                else:
                    print(f"请输入1到{len(species_list)}之间的数字")
            except ValueError:
                print("请输入有效的数字")
    else:
        if not args.file:
            print("错误：请提供物种文件路径，或使用 --list-all 选项选择物种")
            sys.exit(1)
        filepath = _resolve_species_file(args.file)
        if not filepath.exists():
            print(f"文件不存在：{filepath}")
            print(f"提示：请确认文件名，或在 generations/ 目录下查找")
            from config import GENERATIONS_DIR
            all_files = list_species(GENERATIONS_DIR)
            if all_files:
                print(f"\n可用的物种文件：")
                for f in all_files[:10]:
                    s = load_species(f)
                    print(f"  {f.name} ({s.name})")
            sys.exit(1)
        species = load_species(filepath)

    updated_species, score = NicheScorer.interactive_score(species)

    if args.save:
        update_species(updated_species, filepath)
        print(f"\n✓ 已更新并保存：{filepath}")
        print(f"  生态位已更新为：{score.to_prompt_string()}")

    if args.update_atlas:
        atlas = AtlasManager()
        atlas.add_species(updated_species)

    return updated_species


def cmd_atlas(args):
    atlas = AtlasManager()

    if args.action == "list":
        species_list = atlas.list_species()
        print(f"\n=== 异世界生态图谱（共 {len(species_list)} 种）===")
        for s in species_list:
            niche = s.get("primary_niche") or "未分类"
            print(f"  [{s['id'][:8]}] {s['name']} ({s['scientific_name']}) - {niche}")

    elif args.action == "stats":
        atlas.print_stats()

    elif args.action == "add":
        filepath = Path(args.file)
        species = load_species(filepath)
        atlas.add_species(species)

    elif args.action == "remove":
        atlas.remove_species(args.id)

    elif args.action == "search":
        results = atlas.search_species(args.keyword)
        print(f"\n找到 {len(results)} 个相关物种：")
        for s in results:
            print(f"  [{s['id'][:8]}] {s['name']} - 关键词: {', '.join(s['keywords'])}")

    elif args.action == "filter":
        results = atlas.filter_by_niche(args.niche)
        print(f"\n生态位 '{args.niche}' 的物种（共 {len(results)} 种）：")
        for s in results:
            print(f"  [{s['id'][:8]}] {s['name']}")

    elif args.action == "export":
        output_path = Path(args.output)
        exported = atlas.export_atlas(output_path)
        print(f"图谱已导出到：{exported}")

    elif args.action == "html":
        species_list = []
        for entry in atlas.list_species():
            species = atlas.get_species(entry["id"])
            if species:
                species_list.append(species)
        if species_list:
            html_path = generate_html_gallery(species_list)
            print(f"HTML图谱已生成：{html_path}")


def cmd_list(args):
    files = list_species()
    print(f"\n=== 已生成的物种（共 {len(files)} 个）===")
    for f in files:
        species = load_species(f)
        niche = species.niche_score.primary_niche if species.niche_score else "未分类"
        print(f"  {f.name} - {species.name} - {niche}")


def cmd_regenerate(args):
    filepath = Path(args.file)
    if not filepath.exists():
        print(f"文件不存在：{filepath}")
        sys.exit(1)

    species = load_species(filepath)
    generator = SpeciesGenerator()

    print(f"重新生成：{species.name}")
    print(f"原关键词：{species.generation_params.keyword1} + {species.generation_params.keyword2}")

    niche_bias = _parse_niche_bias(args) or species.niche_score

    params = species.generation_params.model_copy(update={
        "seed": None if args.new_seed else species.generation_params.seed,
        "niche_bias": niche_bias,
    })

    try:
        if args.mock:
            new_species = generator.generate_mock(params)
        else:
            new_species = generator.generate(params)
    except Exception as e:
        print(f"生成失败：{e}")
        if args.mock_on_fail:
            new_species = generator.generate_mock(params)
        else:
            sys.exit(1)

    _print_species(new_species)

    if args.save:
        new_filepath = save_species(new_species)
        print(f"\n已保存到：{new_filepath}")

    return new_species


def _print_species(species):
    print("\n" + "=" * 60)
    print(f"物种名称：{species.name}")
    print(f"学名：{species.scientific_name}")
    print(f"关键词：{', '.join(species.keywords)}")
    if species.niche_score:
        print(f"生态位：{species.niche_score.to_prompt_string()}")
    print("-" * 60)
    print(f"栖息地：{species.habitat}")
    print("-" * 60)
    print(f"外形：{species.appearance}")
    print("-" * 60)
    print(f"习性：{species.unique_behavior}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="AI虚构物种生成器")
    subparsers = parser.add_subparsers(dest="command", required=True)

    gen_parser = subparsers.add_parser("generate", help="生成单个物种")
    gen_parser.add_argument("keyword1", help="第一个关键词")
    gen_parser.add_argument("keyword2", help="第二个关键词")
    gen_parser.add_argument("--temperature", type=float, default=0.9)
    gen_parser.add_argument("--max-tokens", type=int, default=800)
    gen_parser.add_argument("--seed", type=int, default=None)
    gen_parser.add_argument("--save", action="store_true", default=True)
    gen_parser.add_argument("--no-save", dest="save", action="store_false")
    gen_parser.add_argument("--html", action="store_true", default=False)
    gen_parser.add_argument("--mock", action="store_true", default=False)
    gen_parser.add_argument("--mock-on-fail", action="store_true", default=True)
    gen_parser.add_argument("--add-to-atlas", action="store_true", default=False)
    gen_parser.add_argument("--based-on", help="基于已有物种的生态位分数生成新物种（物种JSON文件路径）")
    gen_parser.add_argument("--niche", choices=["predator", "herbivore", "parasite"], default=None)
    gen_parser.add_argument("--niche-strength", type=float, default=0.7)
    gen_parser.add_argument("--predator", type=float, default=None)
    gen_parser.add_argument("--herbivore", type=float, default=None)
    gen_parser.add_argument("--parasite", type=float, default=None)

    batch_parser = subparsers.add_parser("batch", help="批量生成物种")
    batch_parser.add_argument("--pairs", help="关键词对，格式：k1,k2;k3,k4")
    batch_parser.add_argument("--pairs-file", help="JSON文件路径，格式：[{keyword1, keyword2}, ...]")
    batch_parser.add_argument("--temperature", type=float, default=0.9)
    batch_parser.add_argument("--max-tokens", type=int, default=800)
    batch_parser.add_argument("--seed", type=int, default=None)
    batch_parser.add_argument("--save", action="store_true", default=True)
    batch_parser.add_argument("--html", action="store_true", default=True)
    batch_parser.add_argument("--mock", action="store_true", default=False)
    batch_parser.add_argument("--mock-on-fail", action="store_true", default=True)
    batch_parser.add_argument("--add-to-atlas", action="store_true", default=False)
    batch_parser.add_argument("--niche", choices=["predator", "herbivore", "parasite"], default=None)
    batch_parser.add_argument("--niche-strength", type=float, default=0.7)
    batch_parser.add_argument("--predator", type=float, default=None)
    batch_parser.add_argument("--herbivore", type=float, default=None)
    batch_parser.add_argument("--parasite", type=float, default=None)

    score_parser = subparsers.add_parser("score", help="对物种进行生态位打分")
    score_parser.add_argument("file", nargs="?", help="物种JSON文件路径")
    score_parser.add_argument("--list-all", "-l", action="store_true", help="列出所有已生成物种并选择打分")
    score_parser.add_argument("--save", action="store_true", default=True)
    score_parser.add_argument("--update-atlas", action="store_true", default=False)

    atlas_parser = subparsers.add_parser("atlas", help="管理异世界生态图谱")
    atlas_subparsers = atlas_parser.add_subparsers(dest="action", required=True)
    atlas_subparsers.add_parser("list", help="列出图谱中的所有物种")
    atlas_subparsers.add_parser("stats", help="显示图谱统计信息")
    add_parser = atlas_subparsers.add_parser("add", help="添加物种到图谱")
    add_parser.add_argument("file", help="物种JSON文件路径")
    remove_parser = atlas_subparsers.add_parser("remove", help="从图谱中移除物种")
    remove_parser.add_argument("id", help="物种ID")
    search_parser = atlas_subparsers.add_parser("search", help="搜索物种")
    search_parser.add_argument("keyword", help="搜索关键词")
    filter_parser = atlas_subparsers.add_parser("filter", help="按生态位筛选")
    filter_parser.add_argument("niche", choices=["predator", "herbivore", "parasite", "unknown"])
    export_parser = atlas_subparsers.add_parser("export", help="导出图谱")
    export_parser.add_argument("output", help="输出目录路径")
    atlas_subparsers.add_parser("html", help="生成HTML图谱")

    subparsers.add_parser("list", help="列出所有已生成的物种")

    regen_parser = subparsers.add_parser("regenerate", help="重新生成物种")
    regen_parser.add_argument("file", help="物种JSON文件路径")
    regen_parser.add_argument("--new-seed", action="store_true", default=False)
    regen_parser.add_argument("--save", action="store_true", default=True)
    regen_parser.add_argument("--mock", action="store_true", default=False)
    regen_parser.add_argument("--mock-on-fail", action="store_true", default=True)
    regen_parser.add_argument("--niche", choices=["predator", "herbivore", "parasite"], default=None)
    regen_parser.add_argument("--niche-strength", type=float, default=0.7)
    regen_parser.add_argument("--predator", type=float, default=None)
    regen_parser.add_argument("--herbivore", type=float, default=None)
    regen_parser.add_argument("--parasite", type=float, default=None)

    args = parser.parse_args()

    if args.command == "generate":
        cmd_generate(args)
    elif args.command == "batch":
        cmd_batch_generate(args)
    elif args.command == "score":
        cmd_score(args)
    elif args.command == "atlas":
        cmd_atlas(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "regenerate":
        cmd_regenerate(args)


if __name__ == "__main__":
    main()

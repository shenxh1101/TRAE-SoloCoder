from typing import Optional, Tuple
from .models import NicheScore, Species


class NicheScorer:
    @staticmethod
    def create_from_scores(predator: float, herbivore: float, parasite: float) -> NicheScore:
        total = predator + herbivore + parasite
        if total == 0:
            return NicheScore()
        return NicheScore(
            predator=predator / total,
            herbivore=herbivore / total,
            parasite=parasite / total,
        )

    @staticmethod
    def create_from_primary(primary: str, strength: float = 0.7) -> NicheScore:
        remaining = (1.0 - strength) / 2
        if primary == "predator":
            return NicheScore(predator=strength, herbivore=remaining, parasite=remaining)
        elif primary == "herbivore":
            return NicheScore(predator=remaining, herbivore=strength, parasite=remaining)
        elif primary == "parasite":
            return NicheScore(predator=remaining, herbivore=remaining, parasite=strength)
        else:
            raise ValueError(f"Unknown niche type: {primary}")

    @staticmethod
    def apply_bias(
        base: Optional[NicheScore], bias: NicheScore, influence: float = 0.5
    ) -> NicheScore:
        if base is None:
            return bias

        base_p = base.predator * (1 - influence) + bias.predator * influence
        base_h = base.herbivore * (1 - influence) + bias.herbivore * influence
        base_pa = base.parasite * (1 - influence) + bias.parasite * influence

        total = base_p + base_h + base_pa
        return NicheScore(
            predator=base_p / total,
            herbivore=base_h / total,
            parasite=base_pa / total,
        )

    @staticmethod
    def interactive_score(species: Species) -> Tuple[Species, NicheScore]:
        print(f"\n=== 生态位打分：{species.name} ===")
        print(f"描述：{species.unique_behavior[:100]}...")
        print("\n请为以下三个维度打分（0-10，总和会被归一化）：")

        while True:
            try:
                p = float(input("捕食者倾向 (0-10): "))
                h = float(input("食草动物倾向 (0-10): "))
                pa = float(input("寄生者倾向 (0-10): "))

                if all(0 <= x <= 10 for x in [p, h, pa]):
                    break
                print("分数必须在0-10之间，请重新输入。")
            except ValueError:
                print("请输入有效的数字。")

        new_score = NicheScorer.create_from_scores(p, h, pa)
        updated_species = species.model_copy(update={"niche_score": new_score})

        print(f"\n打分结果：{new_score.to_prompt_string()}")
        return updated_species, new_score

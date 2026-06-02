from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class NicheScore(BaseModel):
    model_config = ConfigDict(frozen=True)

    predator: float = Field(ge=0.0, le=1.0, default=0.33, description="捕食者倾向，0-1")
    herbivore: float = Field(ge=0.0, le=1.0, default=0.33, description="食草动物倾向，0-1")
    parasite: float = Field(ge=0.0, le=1.0, default=0.34, description="寄生者倾向，0-1")

    @property
    def primary_niche(self) -> str:
        scores = {
            "predator": self.predator,
            "herbivore": self.herbivore,
            "parasite": self.parasite,
        }
        return max(scores, key=scores.get)

    def to_prompt_string(self) -> str:
        return (
            f"捕食者倾向: {self.predator:.2f}, "
            f"食草动物倾向: {self.herbivore:.2f}, "
            f"寄生者倾向: {self.parasite:.2f}, "
            f"主要生态位: {self.primary_niche}"
        )


class GenerationParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    keyword1: str
    keyword2: str
    temperature: float = Field(ge=0.1, le=2.0, default=0.9)
    max_tokens: int = Field(ge=200, le=2000, default=800)
    seed: Optional[int] = Field(default=None, description="随机种子，用于重复生成")
    niche_bias: Optional[NicheScore] = Field(default=None, description="生态位偏好，影响生成")


class Species(BaseModel):
    id: str
    name: str
    scientific_name: str
    habitat: str
    appearance: str
    unique_behavior: str
    keywords: List[str]
    niche_score: Optional[NicheScore] = None
    generation_params: GenerationParams
    created_at: datetime = Field(default_factory=datetime.now)

    def summary(self) -> str:
        return f"{self.name} ({self.scientific_name}) - 栖息地: {self.habitat[:50]}..."

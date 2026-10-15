from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

@dataclass
class LLMResponse:
    content: str
    model: str
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None

class BaseLLMClient(ABC):
    @abstractmethod
    def complete(self, system: str, user: str, max_tokens: int = 1000) -> LLMResponse:
        pass

    @abstractmethod
    def complete_json(self, system: str, user: str, max_tokens: int = 1000) -> dict:
        pass

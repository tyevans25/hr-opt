import json
import requests
from ..base import BaseLLMClient, LLMResponse

class OllamaClient(BaseLLMClient):
    def __init__(self, model: str, base_url: str = "http://127.0.0.1:11434"):
        self.model = model
        self.base_url = base_url

    def complete(self, system: str, user: str, max_tokens: int = 1000) -> LLMResponse:
        resp = requests.post(
            f"{self.base_url}/api/chat",
            json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user}
                ],
                "stream": False,
                "options": {"num_predict": max_tokens}
            }
        )
        resp.raise_for_status()
        data = resp.json()
        return LLMResponse(
            content=data["message"]["content"],
            model=self.model,
            input_tokens=data.get("prompt_eval_count"),
            output_tokens=data.get("eval_count")
        )

    def complete_json(self, system: str, user: str, max_tokens: int = 1000) -> dict:
        system_json = system + "\n\nRespond only with valid JSON. No markdown, no explanation, no code fences."
        resp = self.complete(system_json, user, max_tokens)
        clean = resp.content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(clean)

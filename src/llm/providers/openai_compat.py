import json
from openai import OpenAI
from ..base import BaseLLMClient, LLMResponse

class OpenAICompatClient(BaseLLMClient):
    def __init__(self, model: str, base_url: str, api_key: str = "none"):
        self.model = model
        self.client = OpenAI(base_url=base_url, api_key=api_key)

    def complete(self, system: str, user: str, max_tokens: int = 1000) -> LLMResponse:
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            max_tokens=max_tokens
        )
        return LLMResponse(
            content=resp.choices[0].message.content,
            model=self.model,
            input_tokens=resp.usage.prompt_tokens,
            output_tokens=resp.usage.completion_tokens
        )

    def complete_json(self, system: str, user: str, max_tokens: int = 1000) -> dict:
        system_json = system + "\n\nRespond only with valid JSON. No markdown, no explanation, no code fences."
        resp = self.complete(system_json, user, max_tokens)
        clean = resp.content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(clean)

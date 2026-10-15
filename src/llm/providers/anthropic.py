import json
import anthropic
from ..base import BaseLLMClient, LLMResponse

class AnthropicClient(BaseLLMClient):
    def __init__(self, model: str, api_key: str):
        self.model = model
        self.client = anthropic.Anthropic(api_key=api_key)

    def complete(self, system: str, user: str, max_tokens: int = 1000) -> LLMResponse:
        resp = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}]
        )
        return LLMResponse(
            content=resp.content[0].text,
            model=self.model,
            input_tokens=resp.usage.input_tokens,
            output_tokens=resp.usage.output_tokens
        )

    def complete_json(self, system: str, user: str, max_tokens: int = 1000) -> dict:
        system_json = system + "\n\nRespond only with valid JSON. No markdown, no explanation, no code fences."
        resp = self.complete(system_json, user, max_tokens)
        clean = resp.content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(clean)

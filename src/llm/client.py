import os
from dotenv import load_dotenv
from .base import BaseLLMClient
from .providers.ollama import OllamaClient
from .providers.anthropic import AnthropicClient
from .providers.openai_compat import OpenAICompatClient

load_dotenv()

def get_llm_client(provider: str = None) -> BaseLLMClient:
    provider = provider or os.getenv("LLM_PROVIDER", "ollama")

    if provider == "ollama":
        return OllamaClient(
            model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
            base_url=os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
        )
    elif provider == "anthropic":
        return AnthropicClient(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )
    elif provider == "gsu":
        return OpenAICompatClient(
            model=os.getenv("GSU_MODEL", "llama3.1:8b"),
            base_url=os.getenv("GSU_BASE_URL"),
            api_key=os.getenv("GSU_API_KEY", "none")
        )
    else:
        raise ValueError(f"Unknown provider: {provider}")

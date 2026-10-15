from src.llm.client import get_llm_client

llm = get_llm_client()

print("Testing basic completion...")
resp = llm.complete(
    system="You are a helpful assistant.",
    user="Say hello in one sentence."
)
print(f"Response: {resp.content}")
print(f"Tokens: {resp.input_tokens} in, {resp.output_tokens} out")

print("\nTesting JSON completion...")
result = llm.complete_json(
    system="You are an HR assistant.",
    user="Score this candidate out of 100 for a Python developer role. Return JSON with keys: score, reasoning."
)
print(f"JSON: {result}")

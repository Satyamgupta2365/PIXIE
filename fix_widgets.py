import json

with open('training/train_grpo.ipynb', 'r', encoding='utf-8') as f:
    d = json.load(f)

# GitHub rendering bug fix: Remove 'widgets' from metadata
if 'metadata' in d and 'widgets' in d['metadata']:
    del d['metadata']['widgets']

with open('training/train_grpo.ipynb', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2)

print("Removed widgets metadata to fix GitHub rendering")

import json

with open('training/train_grpo.ipynb', 'r', encoding='utf-8') as f:
    d = json.load(f)

for cell in d['cells']:
    if cell['cell_type'] == 'code':
        source = cell['source']
        for i, line in enumerate(source):
            if "bf16=True" in line:
                source[i] = line.replace("bf16=True", "fp16=True")
            if "warmup_ratio=0.1" in line:
                source[i] = line.replace("warmup_ratio=0.1", "warmup_steps=10")

with open('training/train_grpo.ipynb', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2)

print("Updated fp16 and warmup_steps in notebook")

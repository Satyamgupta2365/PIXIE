#!/usr/bin/env python3
"""
PIXIE Mars Rover — GRPO Training Script
========================================
Trains unsloth/meta-llama-3.1-8b-instruct using TRL's GRPOTrainer on the PIXIE OpenEnv
Mars rover environment with Unsloth for memory-efficient 4-bit LoRA training.

Usage (standalone):
    python pixie/train_grpo.py

Usage (Colab):
    Upload the pixie/ directory, then run each section sequentially.
    See pixie/train_grpo.ipynb for the notebook version.
"""

# ═══════════════════════════════════════════════════════════════════════════════
#  Section 1 — Install Dependencies (run once in Colab)
# ═══════════════════════════════════════════════════════════════════════════════
#
#  !pip install -q "unsloth[colab-new]" trl transformers datasets
#  !pip install -q torch wandb matplotlib
#  !pip install -q openenv-core fastapi uvicorn pydantic
#

import os
import re
import json
import random
import warnings
from typing import Dict, Any, List

import matplotlib
matplotlib.use("Agg")  # non-interactive backend for scripts
import matplotlib.pyplot as plt
import numpy as np

warnings.filterwarnings("ignore", category=FutureWarning)

# ── WandB init (optional – set WANDB_API_KEY or disable) ─────────────────────
WANDB_ENABLED = os.getenv("WANDB_API_KEY") is not None

if WANDB_ENABLED:
    import wandb
    wandb.init(project="pixie-mars-rover", name="grpo-qwen3-1.7b")
    REPORT_TO = "wandb"
else:
    REPORT_TO = "none"
    print("[INFO] WandB not configured. Set WANDB_API_KEY to enable logging.")
    print("[INFO] Training will continue with local-only logging.\n")


# ═══════════════════════════════════════════════════════════════════════════════
#  Section 2 — Load Model with Unsloth
# ═══════════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("  Loading Meta Llama 3.1 8B with Unsloth (4-bit LoRA)")
print("=" * 60)

from unsloth import FastLanguageModel

MODEL_NAME = "unsloth/meta-llama-3.1-8b-instruct"
MAX_SEQ_LENGTH = 2048

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    load_in_4bit=True,
    dtype=None,  # auto-detect
)

# Apply LoRA adapters for GRPO training
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    lora_alpha=16,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

print(f"[OK] Model loaded: {MODEL_NAME}")
print(f"[OK] LoRA adapters applied (r=16, alpha=16)\n")


# ═══════════════════════════════════════════════════════════════════════════════
#  Section 3 — PIXIE Environment & Prompt Generation
# ═══════════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("  Building prompt dataset from PIXIE environment")
print("=" * 60)

import sys
# Ensure project root is on the path (adjust if running from a different dir)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.environment import PIXIEEnvironment, parse_action
from backend.rewards import EpisodeTracker
from backend.agents import run_agent_council

# ── System prompt for the Mars rover agent ────────────────────────────────────

SYSTEM_PROMPT = """You are PIXIE, an autonomous Mars rover AI controller.
Your mission: maximize science collection over 100 Martian sols while
managing battery, surviving dust storms, and handling anomalies.

Given the current mission status, choose your next action.
Available actions: drill, image, soil_sample, charge, safe_mode, transmit

Rules:
- If anomaly is active, you MUST choose safe_mode.
- If battery < 30%, prefer charge.
- If comm window is open and you have science data, consider transmit.
- Maximize science: drill > soil_sample > image.

Respond in EXACTLY this format:
ACTION: <action_name>
REASON: <one sentence explanation>"""


def build_prompt_dataset(
    n_episodes: int = 50,
    steps_per_episode: int = 10,
) -> list:
    """
    Generate diverse environment state prompts by running random episodes.
    Each prompt is a chat-formatted message list for the model.
    """
    prompts = []
    random_actions = ["drill", "image", "soil_sample", "charge", "safe_mode", "transmit"]

    for ep in range(n_episodes):
        env = PIXIEEnvironment()
        obs = env.reset()

        # Collect the reset observation as a prompt
        prompts.append([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": obs},
        ])

        for step in range(steps_per_episode):
            action = random.choice(random_actions)
            obs, reward, done, info = env.step(action)

            if not done:
                prompts.append([
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": obs},
                ])
            else:
                break

    random.shuffle(prompts)
    print(f"[OK] Generated {len(prompts)} diverse prompts from {n_episodes} episodes\n")
    return prompts


# Build the dataset
from datasets import Dataset

raw_prompts = build_prompt_dataset(n_episodes=50, steps_per_episode=10)
train_dataset = Dataset.from_dict({"prompt": raw_prompts})

print(f"[OK] Dataset size: {len(train_dataset)} prompts")
print(f"[OK] Sample prompt (first user message, truncated):")
sample = raw_prompts[0][-1]["content"][:200]
print(f"     {sample}...\n")


# ═══════════════════════════════════════════════════════════════════════════════
#  Section 4 — Reward Function Wrapper
# ═══════════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("  Configuring GRPO reward function")
print("=" * 60)

# ── Observation text parser (extracts state from the LLM-readable string) ─────

def parse_observation_to_state(obs_text: str) -> Dict[str, Any]:
    """
    Extract a state dict from the PIXIE observation string so the
    reward function can score actions without a live environment.
    """
    state = {
        "sol": 0, "battery": 0.5, "science_collected": 0.0,
        "tasks_available": ["drill", "image", "soil_sample"],
        "weather": "clear", "anomaly_active": False,
        "comm_window_open": False, "solar_efficiency": 1.0,
        "mission_phase": "surface_ops",
    }

    # Sol
    m = re.search(r"Sol\s+(\d+)/", obs_text)
    if m:
        state["sol"] = int(m.group(1))

    # Battery
    m = re.search(r"Battery:\s*(\d+)%", obs_text)
    if m:
        state["battery"] = int(m.group(1)) / 100.0

    # Science collected
    m = re.search(r"Science collected:\s*([\d.]+)", obs_text)
    if m:
        state["science_collected"] = float(m.group(1))

    # Weather
    m = re.search(r"Weather:\s*([\w_]+)", obs_text)
    if m:
        state["weather"] = m.group(1)

    # Solar efficiency
    m = re.search(r"Solar efficiency:\s*(\d+)%", obs_text)
    if m:
        state["solar_efficiency"] = int(m.group(1)) / 100.0

    # Anomaly
    state["anomaly_active"] = "YES" in obs_text and "Anomaly" in obs_text

    # Comm window
    state["comm_window_open"] = "OPEN" in obs_text and "Comm" in obs_text

    # Available tasks
    m = re.search(r"Available science tasks:\s*(.+)", obs_text)
    if m:
        state["tasks_available"] = [t.strip() for t in m.group(1).split(",")]

    # Mission phase
    m = re.search(r"Mission phase:\s*(\w+)", obs_text)
    if m:
        state["mission_phase"] = m.group(1)

    return state


def extract_action_from_completion(completion: str) -> str:
    """
    Parse the model's completion to extract the chosen action.
    Tries structured format first, then falls back to NLP parser.
    """
    # Try "ACTION: <action>" format
    m = re.search(r"ACTION:\s*(\w+)", completion, re.IGNORECASE)
    if m:
        candidate = m.group(1).lower()
        valid = {"drill", "image", "soil_sample", "charge", "safe_mode", "transmit"}
        if candidate in valid:
            return candidate

    # Fallback to NLP parser
    return parse_action(completion)


# ── Reward function for GRPO ─────────────────────────────────────────────────

def pixie_reward_function(prompts: list, completions: list, **kwargs) -> list:
    """
    GRPO reward function. For each (prompt, completion) pair:
    1. Parse state from the observation in the prompt
    2. Extract action from the model's completion
    3. Simulate a single step to score the action
    4. Return the rubric-weighted reward
    """
    rewards = []

    for prompt_msgs, completion in zip(prompts, completions):
        # Extract user message (the observation)
        if isinstance(prompt_msgs, list):
            obs_text = prompt_msgs[-1]["content"]
        elif isinstance(prompt_msgs, str):
            obs_text = prompt_msgs
        else:
            obs_text = str(prompt_msgs)

        # Parse state from observation
        pre_state = parse_observation_to_state(obs_text)

        # Extract action from model output
        if isinstance(completion, list):
            completion_text = completion[-1]["content"] if completion else ""
        elif isinstance(completion, str):
            completion_text = completion
        else:
            completion_text = str(completion)

        action = extract_action_from_completion(completion_text)

        # Simulate: create env, step, compute reward
        env = PIXIEEnvironment()
        env.reset()

        # Inject parsed state into the fresh environment
        env._clock.sol = pre_state["sol"]
        env._battery = pre_state["battery"]
        env._science_collected = pre_state["science_collected"]
        env._tasks_available = list(pre_state["tasks_available"])
        env._world._weather = pre_state["weather"]
        env._world._anomaly_active = pre_state["anomaly_active"]
        env._world._comm_window_open = pre_state["comm_window_open"]
        env._world._solar_efficiency = pre_state["solar_efficiency"]
        env._mission_phase = pre_state["mission_phase"]

        # Step and get rubric reward
        _, reward, _, info = env.step(action)

        # The rubric reward is already the weighted composite
        rubric = info.get("reward_rubric", {})
        total_reward = rubric.get("total", reward)

        # Bonus: penalize gibberish completions that couldn't be parsed
        if action == "safe_mode" and "safe" not in completion_text.lower():
            total_reward -= 0.2  # fallback penalty

        # Bonus: reward proper formatting
        if re.search(r"ACTION:\s*\w+", completion_text, re.IGNORECASE):
            total_reward += 0.1  # format bonus

        rewards.append(float(total_reward))

    return rewards


print("[OK] Reward function configured")
print("[OK] Parses observation -> state, extracts action, computes rubric reward\n")


# ═══════════════════════════════════════════════════════════════════════════════
#  Section 5 — GRPO Trainer Configuration
# ═══════════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("  Configuring GRPOTrainer")
print("=" * 60)

from trl import GRPOTrainer, GRPOConfig

OUTPUT_DIR = os.path.join(PROJECT_ROOT, "pixie-trained-model")

grpo_config = GRPOConfig(
    # Training parameters
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=2,
    learning_rate=5e-6,
    lr_scheduler_type="cosine",
    warmup_ratio=0.1,

    # GRPO-specific
    max_completion_length=256,
    num_generations=4,           # G completions per prompt for GRPO
    temperature=0.7,

    # Logging & saving
    output_dir=OUTPUT_DIR,
    logging_steps=10,
    save_strategy="steps",
    save_steps=100,
    report_to=REPORT_TO,

    # Memory optimization
    bf16=True,
    max_grad_norm=1.0,
    seed=42,
)

print(f"[OK] Config: epochs={grpo_config.num_train_epochs}, "
      f"batch={grpo_config.per_device_train_batch_size}, "
      f"G={grpo_config.num_generations}")
print(f"[OK] Output: {OUTPUT_DIR}")
print(f"[OK] Logging: {REPORT_TO}\n")


# ═══════════════════════════════════════════════════════════════════════════════
#  Section 6 — Training Loop
# ═══════════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("  Starting GRPO Training")
print("=" * 60)

trainer = GRPOTrainer(
    model=model,
    reward_funcs=pixie_reward_function,
    args=grpo_config,
    train_dataset=train_dataset,
    processing_class=tokenizer,
)

print("[INFO] Trainer initialized. Beginning training...\n")
trainer.train()

print("\n[OK] Training complete!")
print(f"[OK] Model saved to: {OUTPUT_DIR}\n")

# Save final model
trainer.save_model(os.path.join(OUTPUT_DIR, "final"))
tokenizer.save_pretrained(os.path.join(OUTPUT_DIR, "final"))
print(f"[OK] Final model saved to: {os.path.join(OUTPUT_DIR, 'final')}\n")


# ═══════════════════════════════════════════════════════════════════════════════
#  Section 7 — Evaluation & Plotting
# ═══════════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("  Evaluating: Trained Model vs Base Model (Random Baseline)")
print("=" * 60)


def run_evaluation_episode(
    env: PIXIEEnvironment,
    model_fn,
    max_steps: int = 100,
) -> Dict[str, Any]:
    """
    Run one full episode. model_fn(observation) -> action string.
    Returns episode stats dict.
    """
    tracker = EpisodeTracker()
    obs = env.reset()
    total_reward = 0.0
    steps = 0

    for _ in range(max_steps):
        pre_state = env.state()
        action_text = model_fn(obs)
        obs, reward, done, info = env.step(action_text)
        post_state = env.state()

        rubric = info.get("reward_rubric", {"total": reward, "science": 0,
                          "survival": 0, "efficiency": 0, "coordination": 0})
        tracker.record_step(rubric, post_state, info.get("parsed_intent", "safe_mode"),
                           pre_state=pre_state)
        total_reward += reward
        steps += 1

        if done:
            break

    summary = tracker.summary()
    summary["total_reward"] = round(total_reward, 4)
    return summary


def make_model_action_fn(model, tokenizer):
    """Create an action function that uses the trained model."""
    from unsloth import FastLanguageModel
    FastLanguageModel.for_inference(model)

    def action_fn(observation: str) -> str:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": observation},
        ]
        prompt = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        with __import__("torch").no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=64,
                temperature=0.7,
                do_sample=True,
                top_p=0.9,
            )

        new_tokens = outputs[0][inputs.input_ids.shape[-1]:]
        response = tokenizer.decode(new_tokens, skip_special_tokens=True)
        return response

    return action_fn


def random_action_fn(observation: str) -> str:
    """Random baseline agent."""
    action = random.choice(["drill", "image", "soil_sample", "charge", "safe_mode", "transmit"])
    return f"ACTION: {action}\nREASON: Random baseline."


# ── Run evaluation episodes ──────────────────────────────────────────────────

N_EVAL_EPISODES = 20

print(f"\nRunning {N_EVAL_EPISODES} episodes with random baseline...")
random_results = []
for i in range(N_EVAL_EPISODES):
    env = PIXIEEnvironment()
    result = run_evaluation_episode(env, random_action_fn)
    random_results.append(result)
    if (i + 1) % 5 == 0:
        print(f"  Random: {i+1}/{N_EVAL_EPISODES} episodes complete")

print(f"\nRunning {N_EVAL_EPISODES} episodes with trained model...")
trained_action_fn = make_model_action_fn(model, tokenizer)
trained_results = []
for i in range(N_EVAL_EPISODES):
    env = PIXIEEnvironment()
    result = run_evaluation_episode(env, trained_action_fn)
    trained_results.append(result)
    if (i + 1) % 5 == 0:
        print(f"  Trained: {i+1}/{N_EVAL_EPISODES} episodes complete")

# ── Compute stats ────────────────────────────────────────────────────────────

random_rewards  = [r["total_reward"] for r in random_results]
trained_rewards = [r["total_reward"] for r in trained_results]
random_science  = [r["science_collected"] for r in random_results]
trained_science = [r["science_collected"] for r in trained_results]

avg_random_reward  = np.mean(random_rewards)
avg_trained_reward = np.mean(trained_rewards)
avg_random_science  = np.mean(random_science)
avg_trained_science = np.mean(trained_science)

print(f"\n{'='*60}")
print(f"  EVALUATION RESULTS")
print(f"{'='*60}")
print(f"  {'Metric':<25} {'Random Baseline':>17} {'Trained Model':>17}")
print(f"  {'-'*25} {'-'*17} {'-'*17}")
print(f"  {'Avg Total Reward':<25} {avg_random_reward:>17.4f} {avg_trained_reward:>17.4f}")
print(f"  {'Avg Science Collected':<25} {avg_random_science:>17.4f} {avg_trained_science:>17.4f}")
print(f"  {'Reward Improvement':<25} {'':>17} {avg_trained_reward - avg_random_reward:>+17.4f}")
print(f"  {'Science Improvement':<25} {'':>17} {avg_trained_science - avg_random_science:>+17.4f}")
print(f"{'='*60}\n")

# ── Plot: Reward Curve ───────────────────────────────────────────────────────

PLOT_DIR = os.path.join(PROJECT_ROOT, "pixie")

fig, ax = plt.subplots(figsize=(10, 6))
ax.set_facecolor("#0A0C15")
fig.patch.set_facecolor("#0A0C15")

episodes = range(1, N_EVAL_EPISODES + 1)

ax.plot(episodes, random_rewards, "o-",
        color="#8A94A6", linewidth=2, markersize=5,
        label=f"Random Baseline (avg={avg_random_reward:.2f})", alpha=0.8)
ax.plot(episodes, trained_rewards, "o-",
        color="#FF6B35", linewidth=2.5, markersize=6,
        label=f"GRPO Trained (avg={avg_trained_reward:.2f})", alpha=0.9)

ax.axhline(y=avg_random_reward, color="#8A94A6", linestyle="--", alpha=0.4)
ax.axhline(y=avg_trained_reward, color="#FF6B35", linestyle="--", alpha=0.4)

ax.fill_between(episodes, random_rewards, alpha=0.1, color="#8A94A6")
ax.fill_between(episodes, trained_rewards, alpha=0.15, color="#FF6B35")

ax.set_xlabel("Episode", fontsize=13, color="#F0F0F0", labelpad=10)
ax.set_ylabel("Total Reward", fontsize=13, color="#F0F0F0", labelpad=10)
ax.set_title("PIXIE Mars Rover — Reward Curve (GRPO Training)",
             fontsize=15, color="#F0F0F0", fontweight="bold", pad=15)
ax.legend(fontsize=11, facecolor="#141623", edgecolor="#333",
          labelcolor="#F0F0F0", loc="upper left")
ax.tick_params(colors="#8A94A6")
ax.grid(True, alpha=0.15, color="#8A94A6")
for spine in ax.spines.values():
    spine.set_color("#333")

reward_plot_path = os.path.join(PLOT_DIR, "pixie_reward_curve.png")
plt.tight_layout()
plt.savefig(reward_plot_path, dpi=150, facecolor="#0A0C15", bbox_inches="tight")
plt.close()
print(f"[OK] Reward curve saved: {reward_plot_path}")

# ── Plot: Science Collected ──────────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(10, 6))
ax.set_facecolor("#0A0C15")
fig.patch.set_facecolor("#0A0C15")

ax.bar(np.array(list(episodes)) - 0.2, random_science, width=0.35,
       color="#8A94A6", alpha=0.7, label=f"Random (avg={avg_random_science:.2f})")
ax.bar(np.array(list(episodes)) + 0.2, trained_science, width=0.35,
       color="#10B981", alpha=0.8, label=f"GRPO Trained (avg={avg_trained_science:.2f})")

ax.axhline(y=avg_random_science, color="#8A94A6", linestyle="--", alpha=0.4)
ax.axhline(y=avg_trained_science, color="#10B981", linestyle="--", alpha=0.4)

ax.set_xlabel("Episode", fontsize=13, color="#F0F0F0", labelpad=10)
ax.set_ylabel("Science Collected (pts)", fontsize=13, color="#F0F0F0", labelpad=10)
ax.set_title("PIXIE Mars Rover — Science Collection (GRPO Training)",
             fontsize=15, color="#F0F0F0", fontweight="bold", pad=15)
ax.legend(fontsize=11, facecolor="#141623", edgecolor="#333",
          labelcolor="#F0F0F0", loc="upper left")
ax.tick_params(colors="#8A94A6")
ax.grid(True, alpha=0.15, color="#8A94A6", axis="y")
for spine in ax.spines.values():
    spine.set_color("#333")

science_plot_path = os.path.join(PLOT_DIR, "pixie_science_curve.png")
plt.tight_layout()
plt.savefig(science_plot_path, dpi=150, facecolor="#0A0C15", bbox_inches="tight")
plt.close()
print(f"[OK] Science curve saved: {science_plot_path}")


# ═══════════════════════════════════════════════════════════════════════════════
#  Section 8 — Push to HuggingFace Hub
# ═══════════════════════════════════════════════════════════════════════════════

print(f"\n{'='*60}")
print("  Push to HuggingFace Hub")
print(f"{'='*60}")

HF_REPO = os.getenv("HF_REPO", "your-username/pixie-mars-rover")
HF_TOKEN = os.getenv("HF_TOKEN", None)

if HF_TOKEN:
    print(f"[INFO] Pushing model to: {HF_REPO}")
    model.push_to_hub(HF_REPO, token=HF_TOKEN)
    tokenizer.push_to_hub(HF_REPO, token=HF_TOKEN)
    print(f"[OK] Model pushed to: https://huggingface.co/{HF_REPO}")
else:
    print("[SKIP] Set HF_TOKEN environment variable to push to Hub.")
    print(f"[INFO] To push manually:")
    print(f"  model.push_to_hub('{HF_REPO}', token='hf_...')")
    print(f"  tokenizer.push_to_hub('{HF_REPO}', token='hf_...')")

# ── Finish ────────────────────────────────────────────────────────────────────

if WANDB_ENABLED:
    wandb.finish()

print(f"\n{'='*60}")
print("  PIXIE GRPO Training Pipeline Complete!")
print(f"{'='*60}")
print(f"  Model:          {MODEL_NAME}")
print(f"  Trained epochs:  {grpo_config.num_train_epochs}")
print(f"  Output:          {OUTPUT_DIR}")
print(f"  Reward plot:     {reward_plot_path}")
print(f"  Science plot:    {science_plot_path}")
print(f"{'='*60}")

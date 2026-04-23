"""
Mars Rover Task Scheduler — OpenEnv Inference Script
=====================================================
Uses the OpenAI-compatible client to run an LLM agent through all 3 tasks.
Emits structured [START], [STEP], [END] logs exactly as required by the evaluator.

Environment variables required:
  API_BASE_URL  — OpenAI-compatible API endpoint
  MODEL_NAME    — Model identifier (e.g. llama-3.1-8b-instant)
  HF_TOKEN      — API key / HuggingFace token (used as api_key)

Optional:
  ENV_BASE_URL  — Environment URL (default: http://localhost:7860)

Usage:
  python inference.py                  # run all 3 tasks
  python inference.py --task easy      # run a single task
  python inference.py --output-json    # print final JSON summary
  python inference.py --quiet          # suppress step-level output
"""

import os
import sys
import json
import time
import argparse
import traceback

try:
    import requests
except ImportError:
    print("[ERROR] 'requests' package not found. Install with: pip install requests", file=sys.stderr)
    sys.exit(1)

try:
    from openai import OpenAI
except ImportError:
    print("[ERROR] 'openai' package not found. Install with: pip install openai", file=sys.stderr)
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

API_BASE_URL = os.getenv("API_BASE_URL", "https://api.groq.com/openai/v1")
MODEL_NAME   = os.getenv("MODEL_NAME", "llama-3.1-8b-instant")
HF_TOKEN     = os.getenv("HF_TOKEN")
LOCAL_IMAGE_NAME = os.getenv("LOCAL_IMAGE_NAME")
ENV_BASE_URL = os.getenv("ENV_BASE_URL", "http://localhost:7860").rstrip("/")

WIN_THRESHOLD = 0.70

TASKS = ["easy", "medium", "hard"]

# ── OpenAI client (lazy init) ────────────────────────────────────────────────

_client = None

def get_client() -> OpenAI:
    """Lazily initialize the OpenAI client so import-time errors don't crash the script."""
    global _client
    if _client is None:
        try:
            _client = OpenAI(
                base_url=API_BASE_URL,
                api_key=HF_TOKEN or "no-key",
                timeout=60.0,
            )
        except Exception as e:
            print(f"[ERROR] Failed to initialize OpenAI client: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            raise
    return _client

# ── Environment helpers ───────────────────────────────────────────────────────

def env_reset(task_id: str) -> dict:
    resp = requests.post(f"{ENV_BASE_URL}/reset/{task_id}", timeout=30)
    resp.raise_for_status()
    return resp.json()


def env_step(task_id: str, action_task_id: str, notes: str = "") -> dict:
    payload = {"task_id": action_task_id, "notes": notes}
    resp = requests.post(
        f"{ENV_BASE_URL}/step/{task_id}",
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def env_grade(task_id: str) -> float:
    resp = requests.post(f"{ENV_BASE_URL}/grader/{task_id}", timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return float(data.get("score", 0.0))

# ── Agent — LLM call ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an AI mission controller for NASA's Perseverance Mars rover.
Your job is to schedule science tasks each step to maximize science collected while keeping the rover safe.

Rules:
- ALWAYS respond with ONLY a valid JSON object. No prose, no markdown, no code blocks.
- Format: {"task_id": "<id>", "notes": "<brief reason>"}
- task_id must be one of the available_tasks task_ids, OR "charge", OR "wait"
- If anomaly_active is true, you MUST respond with task_id = "safe_001" (if available) to resolve the anomaly. Never do science during an anomaly.
- If battery_level < 150, prefer "charge" or "charge_001" to avoid battery death.
- Prioritize high science_value tasks first (spec_001=0.9, drill_001=1.0, img_001=0.7)
- If comms_window_open is true and comms_001 is available, include it for mission credit.
- Do not attempt tasks that require_daylight when daylight_remaining <= 0.
- Do not attempt tasks that require_comms when comms_window_open is false."""


def build_user_message(obs: dict) -> str:
    available = obs.get("available_tasks", [])
    task_list = "\n".join(
        f"  - {t['task_id']}: {t['name']} | energy={t['energy_cost']}Wh | "
        f"science={t['science_value']} | daylight_req={t['requires_daylight']} | "
        f"comms_req={t['requires_comms']}"
        for t in available
    )
    return f"""Current rover state:
Sol: {obs.get('sol')} / {obs.get('mission_sol_limit')}
Battery: {obs.get('battery_level')} Wh
Daylight remaining: {obs.get('daylight_remaining')} hrs
Solar efficiency: {obs.get('solar_efficiency')}
Dust storm: {obs.get('dust_storm_active')}
Comms window open: {obs.get('comms_window_open')} ({obs.get('comms_window_hours_remaining')} hrs remaining)
Anomaly active: {obs.get('anomaly_active')} ({obs.get('anomaly_type')})
Science collected: {obs.get('total_science_collected')}
Completed tasks: {obs.get('completed_tasks')}

Available tasks:
{task_list}
Also available: "charge" (solar charging +200Wh×efficiency), "wait" (passive +30Wh)

Choose ONE action. Respond ONLY with JSON: {{"task_id": "...", "notes": "..."}}"""


def llm_decide(obs: dict, history: list) -> tuple[str, str]:
    """Ask the LLM to pick an action. Returns (task_id, notes)."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    # Include last 3 exchanges for context (keeps tokens low)
    messages.extend(history[-6:])
    messages.append({"role": "user", "content": build_user_message(obs)})

    try:
        response = get_client().chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.2,
            max_tokens=200,
        )
        raw = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        parsed = json.loads(raw)
        task_id = str(parsed.get("task_id", "wait")).strip()
        notes   = str(parsed.get("notes", "")).strip()
        return task_id, notes

    except Exception as e:
        # Fallback: safe heuristic
        obs_available = [t["task_id"] for t in obs.get("available_tasks", [])]
        if obs.get("anomaly_active") and "safe_001" in obs_available:
            return "safe_001", f"LLM error fallback — anomaly active: {e}"
        if obs.get("battery_level", 1000) < 150:
            return "charge", f"LLM error fallback — low battery: {e}"
        # Pick best science task available
        best = None
        best_science = -1
        for t in obs.get("available_tasks", []):
            if t["science_value"] > best_science:
                if t["requires_daylight"] and obs.get("daylight_remaining", 0) <= 0:
                    continue
                if t["requires_comms"] and not obs.get("comms_window_open", False):
                    continue
                best = t["task_id"]
                best_science = t["science_value"]
        return (best or "wait"), f"LLM error fallback: {e}"


# ── Run one task episode ──────────────────────────────────────────────────────

def run_task(task_id: str, quiet: bool = False) -> dict:
    """Run one full episode for the given task. Returns result dict."""

    # ── START log ────────────────────────────────────────────────────────────
    print(f"[START] task={task_id} env=mars-rover-task-scheduler model={MODEL_NAME}")

    reset_data = env_reset(task_id)
    obs = reset_data["observation"]

    history = []
    step_num = 0
    rewards = []
    done = False
    final_score = 0.01
    error_msg = None

    while not done:
        step_num += 1

        # Agent decision
        try:
            chosen_action, notes = llm_decide(obs, history)
        except Exception as e:
            chosen_action, notes = "wait", str(e)

        # Execute step
        try:
            step_result = env_step(task_id, chosen_action, notes)
        except requests.HTTPError as e:
            error_msg = str(e)
            # ── STEP log on error ─────────────────────────────────────────
            print(
                f"[STEP] step={step_num} action={chosen_action} "
                f"reward=0.0 done=true error={error_msg}"
            )
            rewards.append(0.0)
            break

        reward_value = step_result["reward"]["value"]
        done         = step_result["done"]
        obs          = step_result["observation"]
        step_error   = step_result.get("info", {}).get("error")

        rewards.append(reward_value)

        # ── STEP log ─────────────────────────────────────────────────────
        print(
            f"[STEP] step={step_num} action={chosen_action} "
            f"reward={round(reward_value, 4)} done={str(done).lower()} "
            f"error={step_error if step_error else 'null'}"
        )

        # Update history for LLM context
        history.append({"role": "user",      "content": build_user_message(obs)})
        history.append({"role": "assistant", "content": json.dumps({"task_id": chosen_action, "notes": notes})})

        # Safety: avoid infinite loops
        if step_num >= 60:
            done = True

    # Grade the episode
    try:
        final_score = env_grade(task_id)
    except Exception as e:
        final_score = 0.01
        error_msg = str(e)

    success = final_score >= WIN_THRESHOLD

    # ── END log ───────────────────────────────────────────────────────────────
    rewards_str = ",".join(str(round(r, 4)) for r in rewards)
    print(
        f"[END] score={round(final_score, 4)} success={str(success).lower()} steps={step_num} "
        f"rewards={rewards_str}"
    )

    return {
        "task_id":      task_id,
        "score":        round(final_score, 4),
        "steps":        step_num,
        "total_reward": round(sum(rewards), 4),
        "success":      success,
        "rewards":      rewards,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Mars Rover OpenEnv inference script")
    parser.add_argument("--task",        choices=TASKS, default=None,
                        help="Run a single task (default: all 3)")
    parser.add_argument("--output-json", action="store_true",
                        help="Print final JSON summary to stdout")
    parser.add_argument("--quiet",       action="store_true",
                        help="Suppress verbose step output")
    args = parser.parse_args()

    tasks_to_run = [args.task] if args.task else TASKS

    results = []
    for task_id in tasks_to_run:
        result = run_task(task_id, quiet=args.quiet)
        results.append(result)
        print()  # blank line between tasks

    # Summary
    if len(results) > 1:
        avg_score = sum(r["score"] for r in results) / len(results)
        winner    = avg_score >= WIN_THRESHOLD
    else:
        avg_score = results[0]["score"]
        winner    = results[0]["success"]

    summary = {
        "model":         MODEL_NAME,
        "env":           "mars-rover-task-scheduler",
        "tasks":         results,
        "average_score": round(avg_score, 4),
        "winner":        winner,
    }

    if args.output_json:
        print(json.dumps(summary, indent=2))
    else:
        print("=" * 60)
        print(f"  Average Score : {avg_score:.1%}")
        print(f"  Winner        : {'✅ YES' if winner else '❌ NO'} (threshold={WIN_THRESHOLD:.0%})")
        for r in results:
            status = "✅" if r["success"] else "❌"
            print(f"  {status} {r['task_id']:8s} score={r['score']:.4f}  steps={r['steps']}")
        print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[ERROR] Unhandled exception in inference.py: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

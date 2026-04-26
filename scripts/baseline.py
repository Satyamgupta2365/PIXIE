"""
Baseline Agent — Mars Rover Task Scheduler
==========================================
A simple heuristic-based agent (no LLM) that greedily picks the highest-value
science task available each step, charging when battery is low.

Used as a reproducible performance baseline and as the /baseline endpoint.

Usage:
  python baseline.py                 # run all 3 tasks, print human-readable results
  python baseline.py --output-json   # print final JSON summary
  python baseline.py --task easy     # single task
"""

import os
import sys
import json
import argparse
import requests

ENV_BASE_URL = os.environ.get("ENV_BASE_URL", "http://localhost:7860").rstrip("/")
TASKS = ["easy", "medium", "hard"]


# ── Heuristic agent ───────────────────────────────────────────────────────────

def pick_action(obs: dict) -> str:
    """
    Simple greedy heuristic:
    1. If anomaly active → safe mode
    2. If battery critically low → charge
    3. Prefer highest science_value available task with constraints met
    4. Fallback → charge
    """
    available = obs.get("available_tasks", [])
    battery   = obs.get("battery_level", 0)
    daylight  = obs.get("daylight_remaining", 0)
    comms_open = obs.get("comms_window_open", False)
    anomaly    = obs.get("anomaly_active", False)

    # 1. Anomaly response
    if anomaly:
        safe_ids = [t["task_id"] for t in available if t.get("task_id") == "safe_001"]
        if safe_ids:
            return "safe_001"
        return "wait"

    # 2. Battery guard
    if battery < 150:
        return "charge"

    # 3. Best science task
    best_id    = None
    best_score = -1
    for t in available:
        if t["requires_daylight"] and daylight <= 0:
            continue
        if t["requires_comms"] and not comms_open:
            continue
        if t["science_value"] > best_score:
            best_score = t["science_value"]
            best_id    = t["task_id"]

    return best_id if best_id else "charge"


# ── Episode runner ────────────────────────────────────────────────────────────

def run_task(task_id: str) -> dict:
    reset_resp = requests.post(f"{ENV_BASE_URL}/reset/{task_id}", timeout=30)
    reset_resp.raise_for_status()
    obs = reset_resp.json()["observation"]

    step_num  = 0
    rewards   = []
    done      = False

    while not done and step_num < 60:
        step_num += 1
        action_id = pick_action(obs)

        payload = {"task_id": action_id, "notes": "baseline heuristic"}
        try:
            step_resp = requests.post(
                f"{ENV_BASE_URL}/step/{task_id}", json=payload, timeout=15
            )
            step_resp.raise_for_status()
            step_data = step_resp.json()
        except Exception as e:
            print(f"  [baseline] step error on {task_id} step {step_num}: {e}",
                  file=sys.stderr)
            break

        rewards.append(step_data["reward"]["value"])
        obs  = step_data["observation"]
        done = step_data["done"]

    # Grade
    try:
        grade_resp = requests.post(f"{ENV_BASE_URL}/grader/{task_id}", timeout=15)
        grade_resp.raise_for_status()
        score = grade_resp.json().get("score", 0.01)
    except Exception:
        score = 0.01

    return {
        "task_id":      task_id,
        "score":        round(score, 4),
        "steps":        step_num,
        "total_reward": round(sum(rewards), 4),
        "rewards":      rewards,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Baseline heuristic agent")
    parser.add_argument("--task",        choices=TASKS, default=None)
    parser.add_argument("--output-json", action="store_true")
    args = parser.parse_args()

    tasks_to_run = [args.task] if args.task else TASKS
    results      = []

    for tid in tasks_to_run:
        result = run_task(tid)
        results.append(result)

    avg_score = sum(r["score"] for r in results) / len(results)
    summary   = {
        "agent":         "greedy_heuristic_baseline",
        "env":           "mars-rover-task-scheduler",
        "tasks":         results,
        "average_score": round(avg_score, 4),
    }

    if args.output_json:
        print(json.dumps(summary))
    else:
        print("\n── Baseline Results ──────────────────────────")
        for r in results:
            print(f"  {r['task_id']:8s}  score={r['score']:.4f}  steps={r['steps']}")
        print(f"  Average score: {avg_score:.4f}")
        print("───────────────────────────────────────────\n")


if __name__ == "__main__":
    main()

"""
Pre-Submission Validation Script — Mars Rover Task Scheduler
============================================================
Runs all mandatory checklist items and exits with code 0 if everything passes.
Run this before submitting to confirm your environment is competition-ready.

Usage:
  python validate_submission.py
  python validate_submission.py --url http://localhost:7860
"""

import os
import sys
import json
import argparse
import requests

# ── Config ────────────────────────────────────────────────────────────────────

ENV_BASE_URL = os.environ.get("ENV_BASE_URL", "http://localhost:7860").rstrip("/")

REQUIRED_TASKS  = ["easy", "medium", "hard"]
REQUIRED_ENV_VARS = ["API_BASE_URL", "MODEL_NAME", "HF_TOKEN"]

# ── Helpers ───────────────────────────────────────────────────────────────────

PASS = "✅ PASS"
FAIL = "❌ FAIL"

results = []


def check(label: str, ok: bool, detail: str = ""):
    status = PASS if ok else FAIL
    line = f"  {status}  {label}"
    if detail:
        line += f"  →  {detail}"
    print(line)
    results.append(ok)


def section(title: str):
    print(f"\n{'─'*60}\n  {title}\n{'─'*60}")


# ── Checks ────────────────────────────────────────────────────────────────────

def check_env_vars():
    section("1. Required Environment Variables")
    for var in REQUIRED_ENV_VARS:
        val = os.environ.get(var, "")
        check(f"${var} is set", bool(val), val[:30] + "…" if len(val) > 30 else val)


def check_files():
    section("2. Required Files")
    base = os.path.dirname(__file__)
    files = {
        "inference.py":    "OpenEnv-compliant inference script",
        "Dockerfile":      "Docker deployment configuration",
        "openenv.yaml":    "OpenEnv specification file",
        "requirements.txt":"Python dependencies",
        "README.md":       "Project documentation",
    }
    for fname, desc in files.items():
        path = os.path.join(base, fname)
        check(f"{fname} exists ({desc})", os.path.isfile(path))

    # inference.py must contain [START], [STEP], [END] log format
    inf_path = os.path.join(base, "inference.py")
    if os.path.isfile(inf_path):
        content = open(inf_path, encoding="utf-8").read()
        for tag in ["[START]", "[STEP]", "[END]"]:
            check(f"inference.py emits {tag} logs", tag in content)


def check_health(base_url: str):
    section("3. Health Check  —  GET /health")
    try:
        resp = requests.get(f"{base_url}/health", timeout=10)
        ok   = resp.status_code == 200
        check("/health returns 200", ok, f"HTTP {resp.status_code}")
        if ok:
            body = resp.json()
            check("/health body has 'status' field", "status" in body, str(body))
    except Exception as e:
        check("/health is reachable", False, str(e))


def check_tasks_endpoint(base_url: str):
    section("4. Tasks Endpoint  —  GET /tasks")
    try:
        resp = requests.get(f"{base_url}/tasks", timeout=10)
        check("/tasks returns 200", resp.status_code == 200, f"HTTP {resp.status_code}")
        data = resp.json()
        task_ids = [t["task_id"] for t in data.get("tasks", [])]
        for tid in REQUIRED_TASKS:
            check(f"Task '{tid}' is registered", tid in task_ids)
    except Exception as e:
        check("/tasks endpoint works", False, str(e))


def check_reset(base_url: str):
    section("5. Reset Endpoint  —  POST /reset/{task_id}")
    for task_id in REQUIRED_TASKS:
        try:
            resp = requests.post(f"{base_url}/reset/{task_id}", timeout=15)
            ok   = resp.status_code == 200
            check(f"POST /reset/{task_id} returns 200", ok, f"HTTP {resp.status_code}")
            if ok:
                data = resp.json()
                check(f"/reset/{task_id} has 'observation' key", "observation" in data)
                obs = data.get("observation", {})
                for field in ["sol", "battery_level", "available_tasks", "mission_sol_limit"]:
                    check(f"  observation.{field} present", field in obs)
        except Exception as e:
            check(f"POST /reset/{task_id} reachable", False, str(e))


def check_step(base_url: str):
    section("6. Step Endpoint  —  POST /step/{task_id}")
    for task_id in REQUIRED_TASKS:
        try:
            # Fresh reset first
            requests.post(f"{base_url}/reset/{task_id}", timeout=15)
            # Take one step
            payload = {"task_id": "charge", "notes": "validation step"}
            resp = requests.post(f"{base_url}/step/{task_id}", json=payload, timeout=15)
            ok   = resp.status_code == 200
            check(f"POST /step/{task_id} returns 200", ok, f"HTTP {resp.status_code}")
            if ok:
                data = resp.json()
                for field in ["observation", "reward", "done"]:
                    check(f"  step/{task_id} has '{field}' key", field in data)
                reward = data.get("reward", {})
                check(f"  reward.value is in [-1, 1]",
                      -1.0 <= reward.get("value", 0) <= 1.0,
                      str(reward.get("value")))
        except Exception as e:
            check(f"POST /step/{task_id} works", False, str(e))


def check_grader(base_url: str):
    section("7. Grader Endpoint  —  POST /grader/{task_id}")
    for task_id in REQUIRED_TASKS:
        try:
            requests.post(f"{base_url}/reset/{task_id}", timeout=15)
            resp = requests.post(f"{base_url}/grader/{task_id}", timeout=15)
            ok   = resp.status_code == 200
            check(f"POST /grader/{task_id} returns 200", ok, f"HTTP {resp.status_code}")
            if ok:
                data  = resp.json()
                score = data.get("score", -1)
                check(f"  grader/{task_id} score in (0, 1) exclusive",
                      0.0 < score < 1.0,
                      f"score={score}")
        except Exception as e:
            check(f"POST /grader/{task_id} works", False, str(e))


def check_openenv_yaml():
    section("8. openenv.yaml Compliance")
    try:
        import yaml
        path = os.path.join(os.path.dirname(__file__), "openenv.yaml")
        with open(path, encoding="utf-8") as f:
            spec = yaml.safe_load(f)

        for field in ["name", "version", "description", "tasks",
                      "observation_space", "action_space", "endpoints"]:
            check(f"openenv.yaml has '{field}' field", field in spec)

        tasks = spec.get("tasks", [])
        check("openenv.yaml has 3+ tasks defined", len(tasks) >= 3, f"found {len(tasks)}")
        task_ids = [t.get("id") for t in tasks]
        for tid in REQUIRED_TASKS:
            check(f"Task '{tid}' in openenv.yaml", tid in task_ids)

    except Exception as e:
        check("openenv.yaml is valid YAML", False, str(e))


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Pre-submission validator")
    parser.add_argument("--url", default=ENV_BASE_URL,
                        help=f"Environment base URL (default: {ENV_BASE_URL})")
    args = parser.parse_args()
    base_url = args.url.rstrip("/")

    print("\n🚀  Mars Rover Task Scheduler — Pre-Submission Validator")
    print(f"    Checking environment at: {base_url}\n")

    check_env_vars()
    check_files()
    check_openenv_yaml()
    check_health(base_url)
    check_tasks_endpoint(base_url)
    check_reset(base_url)
    check_step(base_url)
    check_grader(base_url)

    # ── Summary ───────────────────────────────────────────────────────────────
    total   = len(results)
    passed  = sum(results)
    failed  = total - passed

    print(f"\n{'═'*60}")
    print(f"  Results: {passed}/{total} checks passed  ({failed} failed)")

    if failed == 0:
        print("  ✅  ALL CHECKS PASSED — Ready to submit!")
        print(f"{'═'*60}\n")
        sys.exit(0)
    else:
        print(f"  ❌  {failed} check(s) failed — fix issues before submitting.")
        print(f"{'═'*60}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()

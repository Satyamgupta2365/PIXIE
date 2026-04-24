# 🔴 PIXEL: Autonomous Mars Mission AI 🚀

<div align="center">
  <p><em>"PIXEL operates as a phase-based autonomous mission system, where each phase models a real segment of a space mission and is controlled by specialized AI agents."</em></p>
  <p>
    <img src="https://img.shields.io/badge/Status-Active-success" alt="Status">
    <img src="https://img.shields.io/badge/Framework-OpenEnv-blue" alt="OpenEnv">
    <img src="https://img.shields.io/badge/Model-Llama_3.1-orange" alt="Llama 3.1">
    <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  </p>
</div>

---

## 📖 Table of Contents
1. [The Problem Statement](#-the-problem-statement)
2. [The PIXEL Solution](#-the-pixel-solution)
3. [The 10-Phase Mission Lifecycle](#-the-10-phase-mission-lifecycle)
4. [Multi-Agent Intelligence Core](#-multi-agent-intelligence-core)
5. [Backend Architecture](#-backend-architecture)
6. [Quick Start & Installation](#-quick-start--installation)
7. [Training via GRPO](#-training-via-grpo)
8. [Evaluation & Benchmarking](#-evaluation--benchmarking)

---

## 🛑 The Problem Statement

**Current space exploration autonomy is highly localized and rigid.**
Modern rovers and spacecraft rely heavily on human-in-the-loop (HITL) communication. With Earth-Mars signal delays ranging from 3 to 20 minutes each way, real-time decision-making is impossible. When a crisis occurs (e.g., unexpected dust storms, hardware anomalies, or battery drain), existing automated systems simply enter "Safe Mode" and wait for Earth to respond. This leads to massive losses in scientific yield, wasted operational hours, and heightened mission risk.

Furthermore, existing AI simulations typically focus on a single mechanical aspect (e.g., pathfinding or image recognition), failing to train AI models on the holistic, multi-objective constraints of an entire space mission.

---

## 💡 The PIXEL Solution

**PIXEL** is a product-level, multi-agent simulation framework that completely removes the human bottleneck. Built atop the **OpenEnv** framework, PIXEL serves as a high-fidelity proving ground to train Large Language Models (LLMs) to master deep spatial-temporal reasoning.

Rather than relying on rigid rules, PIXEL utilizes a **Multi-Agent Council**—where specialized LLM agents (Planner, Risk, Resource) perceive real-time Mars dynamics, negotiate conflicting priorities, and execute optimal actions autonomously. It forces the AI to balance battery survival, unpredictable weather, and science maximization across a 100-Sol continuous mission.

> *"Most systems solve one part. PIXEL connects all of them into a single continuous, autonomous intelligence pipeline."*

---

## 🌌 The 10-Phase Mission Lifecycle

PIXEL models the entire space mission lifecycle. Currently, Phase 6 (Surface Exploration) is the core RL proving ground, with the other phases acting as critical mission dependencies.

| Phase | Title | AI Responsibility |
| :---: | :--- | :--- |
| **0** | **Mission Initialization** | Validates feasibility of rocket specs, targets, and constraints. |
| **1** | **Launch Intelligence** | Evaluates scenarios to launch now, delay, or abort based on weather. |
| **2** | **Ascent & Orbital** | Adjusts burn rates and trajectory to minimize fuel loss during orbit. |
| **3** | **Orbital Operations** | Schedules optimal data transmission windows considering signal delay. |
| **4** | **Transfer Trajectory** | Long-horizon planning balancing velocity vs. fuel consumption. |
| **5** | **Entry & Landing (EDL)**| One-shot decisions on parachute timing and thruster firing. |
| **6** | **Surface Exploration** | **[CORE]** Maximizes science yield while surviving 100 Sols on Mars. |
| **7** | **Crisis Handling** | Overrides standard planning to recover hardware or survive storms. |
| **8** | **Self-Learning** | RL models (GRPO) update neural weights based on mission failures. |
| **9** | **Mission Evaluation** | Objective benchmarking of the autonomous pipeline via OpenEnv. |

---

## 🤖 Multi-Agent Intelligence Core

Inside Phase 6, PIXEL does not use a single monolithic decision maker. It uses a specialized agent council:

1. **Planner Agent:** Focuses entirely on maximizing scientific yield (Drilling, Sampling, Imaging).
2. **Resource Agent:** Focuses strictly on battery preservation and charging optimization.
3. **Risk Agent:** Monitors for anomalies (Motor faults, Comm blackouts) and advocates for Safe Mode.
4. **Negotiation Engine:** A programmatic layer that weighs the confidence and reasoning of all three agents against the current world state to select the final action.

---

## 🏗️ Backend Architecture

Our backend is structured as a modular environment where the API layer interacts with a core simulation engine, which integrates multi-agent reasoning, negotiation, and dynamic world modeling.

```text
PIXIE/
├── backend/                 # Core Environment & Simulation Engine
│   ├── main.py              # API entry point & Server Wrapper
│   ├── environment.py       # Core RL loop (reset/step)
│   ├── agents.py            # Multi-agent logic (Planner, Resource, Risk)
│   ├── world.py             # Mars simulation (Weather, Solar, Anomalies)
│   ├── rewards.py           # Composable rubric evaluation
│   ├── grader.py            # Evaluation & benchmarking logic
│   ├── nasa_client.py       # Live NASA data integration
│   └── test_*.py            # Comprehensive regression suites
│
├── training/                # Reinforcement Learning Pipeline
│   ├── train.py             # Standalone TRL GRPO training loop
│   └── train_grpo.ipynb     # Interactive Jupyter notebook
│
└── scripts/                 # Evaluation & baselines
    ├── baseline.py          # Heuristic agent baseline
    ├── inference.py         # OpenEnv LLM inference script
    └── validate_submission.py 
```

**Full Data Flow:**
`API (/step)` → `Environment Core` → `Agents` → `Negotiation Engine` → `Final Action` → `World Update` → `Reward Calculation` → `Next State`

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
Ensure you have Python 3.10+ installed. Clone the repository and install the dependencies:
```bash
git clone https://github.com/your-username/PIXIE.git
cd PIXIE
pip install -r requirements.txt
```

### 2. Run the Environment Server
To launch the OpenEnv FastAPI server (which allows you to interact with the environment):
```bash
python backend/main.py
```
*The server will run on `http://localhost:7860`.*

### 3. Verify System Health
Run the comprehensive regression suites to verify the world model dynamics:
```bash
python backend/test_pixel.py
python backend/test_world_model.py
```

---

## 🧬 Training via GRPO

PIXEL includes a fully configured Reinforcement Learning pipeline using HuggingFace TRL and Unsloth for ultra-efficient 4-bit LoRA training. 

We utilize **Meta Llama 3.1 8B Instruct** (`unsloth/meta-llama-3.1-8b-instruct`) as the base reasoning engine.

To start training the LLM to solve the PIXEL environment:
```bash
python training/train.py
```
*You can also open `training/train_grpo.ipynb` in Google Colab or Jupyter to run the training interactively.*

---

## 🏆 Evaluation & Benchmarking

The agent's performance is objectively evaluated via the `grader.py` on 4 rigorous axes:
*   **Survival (Crucial):** Did the rover survive all 100 Sols without depleting its battery?
*   **Science Collected:** How effectively did the rover execute high-value tasks?
*   **Energy Efficiency:** Were science actions taken during optimal weather and solar conditions?
*   **Coordination Score:** How effectively did the agent council resolve conflicting priorities during crises?

**Target Metric:** An effectively trained model should achieve >90% survival rate and average >60.0 science points per 100-Sol episode.

---
<div align="center">
  <i>"Designed to push the boundaries of Agentic AI in deep space."</i>
</div>

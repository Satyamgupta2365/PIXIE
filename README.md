# 🔴 PIXEL: Dual-Rover & Satellite Mission Control 🚀

<div align="center">
  <p><em>"Teaching one AI to survive Mars dust storms, freezing Lunar nights, and orbital traffic jams."</em></p>
  <p>
    <a href="https://huggingface.co/spaces/Satyamgupta2365/pixel-dual-rover"><img src="https://img.shields.io/badge/Demo-HuggingFace_Space-yellow?style=for-the-badge&logo=huggingface" alt="HF Space"></a>
    <a href="#"><img src="https://img.shields.io/badge/Watch-YouTube_Pitch-red?style=for-the-badge&logo=youtube" alt="Video"></a>
    <a href="#"><img src="https://img.shields.io/badge/Read-HF_Blog_Post-blue?style=for-the-badge" alt="Blog"></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Framework-OpenEnv-blue" alt="OpenEnv">
    <img src="https://img.shields.io/badge/Model-Llama_3.1_8B-orange" alt="Llama 3.1">
    <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  </p>
</div>

---

## 🛑 The Problem Statement

**Space exploration autonomy is too rigid.** 
When a Mars rover encounters a dust storm, or a Moon rover faces a sudden temperature drop, standard hardcoded systems simply enter "Safe Mode" and wait for Earth. 
* On **Mars**, communication takes 20 minutes. Waiting means dying.
* On the **Moon**, nights last 14 Earth days and drop to -130°C. One bad timing decision kills the rover.
* In **Orbit**, satellites must balance bandwidth, battery, and collision risks constantly.

Standard Reinforcement Learning environments only test one specific dynamic. We needed an environment that forces an LLM to fundamentally change its reasoning based on the planetary constraints it faces.

---

## 💡 The PIXEL Solution

**PIXEL** is a multi-environment OpenEnv suite that trains a single LLM to master three vastly different spatial-temporal domains:

1. 🔴 **Mars Rover Env:** Deep autonomy. The agent must learn to **override** stale commands from Earth when local weather (dust storms) or anomalies threaten survival.
2. 🌕 **Moon Rover Env:** Extreme survival. Zero comm-delay, but the agent must learn to optimize tasks quickly during the 14-sol day, and hibernate immediately before the freezing lunar night.
3. 🛰️ **Satellite Network Env:** Multi-agent coordination. The agent controls SAT-A (Comm), SAT-B (Imaging), and SAT-C (Relay) simultaneously to prevent buffer overflows and collisions.

> *"We don't just train an AI to drive. We train it to survive."*

---

## 📈 Training Results & Reward Improvement

Using HuggingFace TRL and Unsloth (4-bit LoRA), we trained `unsloth/meta-llama-3.1-8b-instruct` using **GRPO** (Group Relative Policy Optimization). 

The LLM is scored by a 4-axis composable reward rubric:
`Science (35%) + Survival (35%) + Efficiency (15%) + Coordination (15%)`

### Before vs After (Mars Scenario)
* **Untrained:** Sees a dust storm, blindly tries to drill anyway. Battery drops to 0%. (Reward: -2.0)
* **Trained:** Sees a dust storm, recognizes solar drop, immediately enters `safe_mode` or pre-charges. (Reward: +0.8)

### Reward Curves
*(Run the Colab notebook to generate and upload the plot here!)*
<!-- ![Reward Curves](pixel_reward_curve.png) -->

---

## 🤖 Multi-Agent Intelligence Core

When the LLM makes a decision, it must negotiate with our programmatic **Multi-Agent Council**:

1. **Planner Agent:** Focuses entirely on maximizing scientific yield.
2. **Resource Agent:** Focuses strictly on battery preservation.
3. **Risk Agent:** Monitors for anomalies and advocates for Safe Mode.
4. **Negotiation Engine:** A deterministic layer that weighs the agents' confidence. If the LLM's action aligns with the council's optimal consensus, it receives a Coordination Bonus (+0.15).

---

## 🏗️ Backend Architecture

Our backend strictly implements the `openenv-core` specification.

```text
PIXIE/
├── backend/                 # Core Environment & Simulation Engine
│   ├── main.py              # FastAPI OpenEnv Server
│   ├── environment.py       # Base PIXEL Environment (extends OpenEnv)
│   ├── mars_rover_env.py    # Mars specific logic (comm delay)
│   ├── moon_rover_env.py    # Moon specific logic (day/night cycle)
│   ├── satellite_env.py     # Multi-agent satellite network
│   └── rewards.py           # Composable rubric evaluation
│
├── training/                # Reinforcement Learning Pipeline
│   └── train_grpo.ipynb     # Unified GRPO training notebook (Colab)
│
└── openenv.yaml             # OpenEnv Manifest (mars, moon tasks)
```

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
Ensure you have Python 3.10+ installed.
```bash
git clone https://github.com/Satyamgupta2365/PIXIE.git
cd PIXIE
pip install -r requirements.txt
```

### 2. Run the OpenEnv Server Locally
```bash
python backend/main.py
```
*The server will run on `http://localhost:7860`.*

### 3. Training in Google Colab
Open `training/train_grpo.ipynb` in Google Colab (T4 GPU recommended). Run all cells to execute the GRPO training loop and generate the reward curve plots.

---
<div align="center">
  <i>"Built for the PIXEL Hackathon."</i>
</div>

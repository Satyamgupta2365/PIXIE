# 🚀 PIXEL-MARS BACKEND ARCHITECTURE

## 🧩 1. HIGH-LEVEL ARCHITECTURE (BIG PICTURE)

Your backend has 5 core layers:

```text
Client (UI / Training Script)
        ↓
FastAPI Server (API Layer)
        ↓
Environment Core (RL Loop)
        ↓
Agent System + Negotiation Engine
        ↓
World Simulation + Reward System
```

**🎤 How to explain this:**
> *"Our backend is structured as a modular environment where the API layer interacts with a core simulation engine, which integrates multi-agent reasoning, negotiation, and dynamic world modeling."*

---

## 🏗️ 2. FOLDER STRUCTURE

```text
pixel-mars/
│
├── app/
│   ├── main.py              # API entry point
│   ├── environment.py       # core RL loop (reset/step)
│   ├── agents.py            # all agents logic
│   ├── negotiation.py       # decision aggregation
│   ├── world.py             # Mars simulation
│   ├── rewards.py           # reward calculation
│   ├── grader.py            # evaluation logic
│   ├── models.py            # request/response schemas
│   └── config.py            # constants & configs
│
├── training/
│   ├── train.py             # TRL training loop
│   ├── dataset.py           # data generation
│   └── plots.py             # reward visualization
│
├── openenv.yaml             # OpenEnv spec
├── Dockerfile               # deployment
├── requirements.txt
└── README.md
```

---

## 🧠 3. CORE BACKEND COMPONENTS (DETAILED)

### ⚙️ A. API LAYER (FastAPI)
**🎯 Purpose:** Acts as the entry point for the frontend, training scripts, and evaluation.
*   **📌 Endpoints:**
    *   `/reset` → start new mission
    *   `/step` → take one action
    *   `/state` → get current state
    *   `/grader` → evaluate performance
*   **🧠 Role:** *"This layer exposes the environment as a standard interface so it can be used for both simulation and training."*

### 🔁 B. ENVIRONMENT CORE (MOST IMPORTANT)
**🎯 Purpose:** Controls the entire simulation loop.
*   **🔄 Flow:**
    1. Receive current state
    2. Send state to agents
    3. Collect agent decisions
    4. Run negotiation
    5. Execute action
    6. Update world
    7. Calculate reward
    8. Return next state
*   **🧠 Role:** *"This is the central engine that connects perception, decision-making, and environment dynamics."*

### 🤖 C. AGENT SYSTEM
**🎯 Purpose:** Implements multi-agent intelligence.
*   **Agents:** Planner Agent, Resource Agent, Risk Agent, Comms Agent
*   **Behavior:** Each agent processes the same state and produces independent decisions.
*   **🧠 Role:** *"Each agent represents a specialized objective, enabling realistic multi-objective reasoning."*

### ⚖️ D. NEGOTIATION ENGINE
**🎯 Purpose:** Resolve conflicts between agents.
*   **What it does:** Collects all agent outputs, compares priorities, and selects the final action.
*   **🧠 Role:** *"This component models coordination and conflict resolution between agents, which is critical for real-world decision systems."*

### 🌍 E. WORLD SIMULATION ENGINE
**🎯 Purpose:** Simulates the dynamic Mars environment.
*   **Includes:** Dust storms, solar efficiency, anomalies, communication delays.
*   **Behavior:** Updates every step, affects decisions dynamically.
*   **🧠 Role:** *"The world is dynamic and partially observable, forcing the agent to adapt continuously."*

### 🏆 F. REWARD SYSTEM
**🎯 Purpose:** Defines what is “good behavior”.
*   **Components:** Science reward, survival reward, penalty system, coordination score.
*   **🧠 Role:** *"The reward system is designed to encourage both performance and intelligent coordination."*

### 📊 G. GRADER / EVALUATION SYSTEM
**🎯 Purpose:** Final scoring and benchmarking.
*   **Measures:** Mission success, total reward, efficiency, coordination.
*   **🧠 Role:** *"Provides objective evaluation for benchmarking agent performance."*

### 🧬 H. TRAINING PIPELINE (SEPARATE BUT CONNECTED)
**🎯 Purpose:** Train LLM agents via Reinforcement Learning.
*   **Works by:** Calling `/step` repeatedly, collecting rewards, updating the model.
*   **🧠 Role:** *"This connects the environment to real learning, showing measurable improvement."*

---

## 🔄 4. FULL DATA FLOW (VERY IMPORTANT)

```text
User / Training Script
        ↓
   API (/step)
        ↓
Environment Core
        ↓
Agents → Negotiation
        ↓
   Final Action
        ↓
   World Update
        ↓
Reward Calculation
        ↓
New State Returned
```

**🎤 Say this in demo:**
> *"Every step flows from perception to multi-agent reasoning, negotiation, execution, and feedback — forming a complete learning loop."*

---

## ⚡ 5. WHY THIS BACKEND IS STRONG

*   ✅ **Modular:** Each component operates independently.
*   ✅ **Extensible:** Easy to add more specialized agents.
*   ✅ **Trainable:** Fully compatible with RL / HuggingFace TRL.
*   ✅ **Realistic:** Mimics real mission control systems.

---

## 🧠 FINAL ONE-LINER (VERY IMPORTANT)
**🎤 Finish with:**
> *"Our backend is designed as a modular, multi-agent simulation engine where decision-making, environment dynamics, and learning are tightly integrated to enable realistic and trainable AI behavior."*

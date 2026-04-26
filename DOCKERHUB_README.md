# 🔴 PIXIE Dual-Rover & Satellite Mission Control 🚀

**PIXIE** is a highly realistic, OpenEnv-compatible multi-agent space exploration environment. It simulates the challenges of operating Mars rovers, Lunar rovers, and Satellite networks, requiring AI agents to manage battery life, conduct science, avoid anomalies, and optimize communication windows.

## 🌟 Quick Start

Run the environment locally with a single command:

```bash
docker run -p 7860:7860 satyamgpy/pixie-env:latest
```

Once running, the backend API and Mission Control dashboard are available at:
👉 **http://localhost:7860**

## 📡 API Endpoints (OpenEnv Standard)

This container fully implements the OpenEnv API standard for Reinforcement Learning:

- **`POST /reset/{task_id}`** - Initializes the environment and returns the starting state.
- **`POST /step/{task_id}`** - Submits a natural language action and returns the observation, reward, and done flag.
- **`GET /health`** - Live mission control dashboard and system status.
- **`GET /docs`** - Interactive Swagger UI for testing API calls.

## 🌍 Environments Available (`task_id`)

- **`mars`** - (Default) Survive 100 Martian sols, managing dust storms and communication delays.
- **`moon`** - Navigate extreme 14-day lunar nights and hibernate to survive.
- **`easy`** - A beginner-friendly Mars setting with biased clear weather for initial training.

## 🧠 AI Training Ready

This container was specifically designed for **GRPO (Group Relative Policy Optimization)** and **RLHF**. It handles all the complex environment state transitions, reward calculations, and physics simulations, allowing you to focus purely on training your LLM.

---
*Built for the OpenEnv Hackathon 2025*

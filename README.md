<div align="center">
  <img src="public/cashewnut-white-animated.svg" alt="Cashewnut Logo" height="80" />
</div>

# Cashewnut — Autonomous AI Software Development Company

Cashewnut is not just an AI coding tool or a UI generator. It's a complete **AI-driven software development company simulation** built in a single platform.

When you describe a project to Cashewnut, it spawns a Project Manager agent who forms a complete team (Researchers, Designers, Frontend/Backend Developers, QA, and DevOps) to autonomously plan, design, code, and deploy your software.

## Features

- **Multi-Agent Orchestration**: A PM agent orchestrates specialist agents to handle distinct phases of the software lifecycle.
- **In-Browser Development**: Uses WebContainers to run a full Node.js environment directly in your browser.
- **Agent Dashboard**: Real-time visibility into what each agent is working on, with a kanban board and live terminal outputs.
- **Bring Your Own LLM**: Supports 19+ AI providers (OpenAI, Anthropic, Gemini, Ollama, etc.).
- **Live Preview**: See your app running live as the agents write the code.
- **Phase Gates**: Review and approve research and design before development starts.

## Getting Started

### Prerequisites

- Node.js (v20.15.1 or later recommended)
- `pnpm` (v9.0.0 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Divith123/Cashewnut.git
   cd Cashewnut
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Setup environment variables:
   ```bash
   cp .env.example .env.local
   # Add your API keys to .env.local
   ```

4. Start the development server:
   ```bash
   pnpm run dev
   ```

Open `http://localhost:5173` in your browser to start your AI software company.

## Architecture

Cashewnut is built on top of a powerful tech stack:
- **Framework**: Remix (React Router v7) & Vite
- **Styling**: UnoCSS & Radix UI
- **State Management**: Nanostores
- **Sandboxing**: WebContainers
- **Multi-Agent Engine**: Custom event-bus driven agent orchestration

## License

MIT License

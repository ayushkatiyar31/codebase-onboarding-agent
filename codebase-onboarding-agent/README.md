# Codebase Onboarding Agent

A full-stack AI project that helps developers understand any GitHub repository quickly. Instead of reading many files manually, a user can paste a repository link and get an interactive architecture summary, smart Q&A, dependency map, and a guided onboarding experience.

## What problem this project solves

New developers often struggle to understand a large codebase at the beginning. This project makes onboarding faster by turning source code into simple, structured insights.

In simple words:
- it explains what a project does,
- shows how the system is organized,
- answers questions about the code,
- and helps teams share knowledge easily.

## Why this project is useful

For a company or a developer, this saves time and reduces confusion. It is useful for:
- new team members joining a project,
- open-source contributors exploring a repository,
- senior developers who want a quick architecture overview,
- interviews and project demonstrations.

## Core features

- Architecture analysis: identifies stack, structure, entry points, and important folders.
- AI-powered Q&A: allows users to ask questions about the repository and get answers with code context.
- Dependency graph: visualizes how files and modules connect.
- Guided walkthrough: suggests a smart reading order for understanding the project.
- Shareable guide: users can export or share an onboarding guide.

## How the project works

1. The user enters a public GitHub repository URL.
2. The backend fetches repository files from GitHub.
3. The code is split into smaller meaningful chunks.
4. These chunks are converted into embeddings for semantic search.
5. AI models analyze the code and generate architecture insights, answers, and guided explanations.
6. The frontend displays everything in a clean, interactive experience.

## Technical architecture

- Frontend: Next.js, React, TypeScript
- Backend: Node.js and Express
- Database: MongoDB Atlas
- AI services: Groq for generation and Hugging Face for embeddings
- Search: vector search over indexed code chunks

The app follows a simple flow:

Frontend -> Backend API -> GitHub repo data + AI processing -> MongoDB cache -> UI results

## Tech stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, React Flow
- Backend: Express, Node.js, TypeScript, Mongoose
- AI/ML: Groq, Hugging Face embeddings
- Data storage: MongoDB Atlas with vector search

## Local setup

### Prerequisites

- Node.js 20+
- MongoDB Atlas account
- Groq API key
- Hugging Face API key
- GitHub personal access token

### Install dependencies

```bash
git clone <your-repo-url>
cd codebase-onboarding-agent

cd server && npm install
cd ../client && npm install
```

### Environment variables

Create environment files for both apps.

Server example:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GITHUB_TOKEN=your_github_token
GROQ_API_KEY=your_groq_key
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile
HUGGINGFACE_API_KEY=your_hf_key
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIMENSIONS=384
CLIENT_URL=http://localhost:3000
```

Client example:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Run the app

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open http://localhost:3000

## Project structure

```text
codebase-onboarding-agent/
├── client/        # Frontend UI
├── server/        # Backend APIs and AI logic
└── README.md
```

## Interview-ready summary

This project is an AI-powered codebase onboarding platform. It takes a GitHub repository, analyzes its structure, answers developer questions, builds a dependency map, and creates a guided walkthrough. It combines frontend development, backend APIs, databases, AI models, and vector search to solve a real-world problem: helping people understand complex software systems faster.

## Simple non-technical explanation

Think of this as a smart assistant for software projects. If someone joins a new company or opens a large repository, they do not need to read everything manually. This app acts like a guide that explains the project clearly and helps them get started quickly.

## License

MIT
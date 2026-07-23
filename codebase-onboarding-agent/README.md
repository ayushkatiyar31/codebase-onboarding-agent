# Codebase Onboarding Agent

Codebase Onboarding Agent is a full-stack AI application that helps developers understand a GitHub repository quickly. A user enters a public GitHub repo URL and gets an architecture summary, file explorer, dependency graph, AI chat, walkthrough, and shareable onboarding guide.

## Problem It Solves

When developers join a new project, they usually spend a lot of time reading files, guessing entry points, and asking teammates for context. This project reduces that onboarding time by turning a repository into a guided, searchable, and beginner-friendly explanation.

In interviews, I describe it as:


> An AI-powered onboarding assistant for codebases. It fetches a GitHub repository, indexes the source code, explains the architecture, answers questions using the actual code, and generates a shareable guide.

## Key Features

- **GitHub repo ingestion**: accepts a GitHub URL and fetches repository metadata and file tree.
- **Architecture analysis**: streams an AI-generated overview with stack, entry points, folders, setup steps, and gotchas.
- **Code-aware chat**: answers questions using relevant code chunks instead of generic AI responses.
- **File explorer and code viewer**: lets users browse repo files and inspect source code.
- **Dependency graph**: parses imports and visualizes relationships between internal files.
- **Guided walkthrough**: suggests an order for reading important files.
- **Shareable guide**: generates a markdown onboarding guide with PDF export and public share link.
- **Caching**: stores repo data, chunks, embeddings, graphs, guides, and analysis in MongoDB for faster revisits.

## Tech Stack

| Technology | Used For | Why It Was Chosen |
| --- | --- | --- |
| **Next.js + React** | Frontend application | Provides a modern component-based UI and routing. |
| **TypeScript** | Frontend and backend | Adds type safety and makes the project easier to maintain. |
| **Tailwind CSS / CSS** | Styling | Helps build a clean, responsive developer-focused interface. |
| **React Flow + Dagre** | Dependency graph UI | Displays file dependency graphs with automatic layout. |
| **Node.js + Express** | Backend API | Simple and flexible API layer for repo, AI, graph, guide, and chat flows. |
| **MongoDB + Mongoose** | Data storage | Stores repositories, chunks, embeddings, analyses, graphs, and guides. |
| **MongoDB Atlas Vector Search** | Semantic code search | Finds code chunks related to a user question. |
| **Groq API** | LLM responses | Generates architecture summaries, chat answers, walkthroughs, and guides. |
| **Hugging Face Inference API** | Embeddings | Converts code chunks and questions into vectors for semantic search. |
| **GitHub REST API** | Repository access | Fetches repo metadata, file trees, and file contents. |

## High-Level Architecture

```text
User
  -> Next.js frontend
  -> Express API
  -> GitHub API fetches repo data
  -> MongoDB stores repo + chunks + generated outputs
  -> Hugging Face creates embeddings
  -> MongoDB Vector Search retrieves relevant code
  -> Groq generates explanations and answers
  -> Frontend streams and displays results
```

## End-to-End Working

### User Flow

1. User opens the app and enters a GitHub repository URL.
2. The app ingests the repository and redirects to `/repo/[owner]/[name]`.
3. User can explore tabs:
   - **Architecture** for system overview.
   - **Walkthrough** for reading order.
   - **Dep Graph** for internal file dependencies.
   - **Ask** for AI Q&A over the codebase.
   - **Guide** for an exportable onboarding document.
   - **Files** for source browsing.
4. User can share the generated guide through `/guide/[shareId]` or export it as PDF.

### Internal Flow

1. Backend validates the GitHub URL and extracts `owner` and `repo`.
2. GitHub API returns repo metadata and recursive file tree.
3. Repo is saved in MongoDB.
4. Background processing starts:
   - fetch source files,
   - skip binary/generated files,
   - split code into meaningful chunks,
   - generate embeddings,
   - parse imports and save graph data.
5. Architecture, chat, walkthrough, and guide features use stored repo data plus AI generation.
6. Server-Sent Events are used where streaming improves user experience.

## API Flow

| API | Purpose |
| --- | --- |
| `POST /api/repo/ingest` | Ingest a GitHub repo URL. |
| `GET /api/repo/:owner/:name` | Fetch stored repo metadata and file tree. |
| `GET /api/repo/:owner/:name/file?path=...` | Fetch and display a source file. |
| `POST /api/repo/:owner/:name/chunk` | Manually create code chunks. |
| `GET /api/analysis/:owner/:name/stream` | Stream architecture analysis. |
| `POST /api/analysis/:owner/:name/save` | Save generated analysis. |
| `DELETE /api/analysis/:owner/:name/cache` | Clear cached analysis. |
| `GET /api/chat/:owner/:name/embed/stream` | Stream embedding progress. |
| `POST /api/chat/:owner/:name/ask` | Ask a RAG-based code question. |
| `POST /api/graph/:owner/:name/generate` | Generate dependency graph. |
| `GET /api/graph/:owner/:name` | Fetch dependency graph. |
| `GET /api/graph/:owner/:name/walkthrough` | Generate walkthrough steps. |
| `POST /api/guide/:owner/:name/generate` | Generate onboarding guide. |
| `GET /api/guide/:owner/:name` | Fetch existing guide. |
| `GET /api/guide/shared/:shareId` | Fetch public shared guide. |

## Database Design

MongoDB stores five main collections:

- **Repo**: owner, name, full name, description, default branch, language, stars, file tree, status.
- **Chunk**: repo reference, file path, language, line range, content, chunk type, token estimate, embedding.
- **Analysis**: repo reference and generated architecture JSON.
- **Graph**: repo reference, dependency edges, graph stats, generation time.
- **Guide**: repo reference, repo name, share ID, markdown content, generation time.

The most important model is `Chunk`, because it powers semantic search. Each code chunk can store an embedding, and MongoDB Atlas Vector Search retrieves chunks that match a user question.

## Authentication and Authorization

The app currently does not have user login. It works with public GitHub repositories through a server-side `GITHUB_TOKEN`.

Security-related choices:

- API keys stay on the backend and are not exposed to the browser.
- CORS is limited using `CLIENT_URL`.
- Request body size is limited to `1mb`.
- Binary and generated files are skipped during file viewing and indexing.

## Third-Party Services

- **GitHub REST API**: fetches repository data and source files.
- **Groq**: generates architecture analysis, chat answers, walkthroughs, and guides.
- **Hugging Face**: creates embeddings for semantic retrieval.
- **MongoDB Atlas**: stores data and runs vector search.

## Important Design Decisions

- **RAG instead of plain chat**: answers are grounded in retrieved code chunks, so responses are more relevant to the actual repo.
- **Background processing**: ingestion returns quickly while chunking, embedding, and graph generation continue in the background.
- **Chunk-based indexing**: files are split by imports, functions, classes, components, and fallback sections to improve retrieval quality.
- **Streaming responses**: architecture and chat use streaming so the UI feels responsive during AI generation.
- **Caching generated outputs**: repeated visits reuse stored analysis, graph, guide, chunks, and embeddings.
- **Local embedding fallback**: if Hugging Face is unavailable, the backend can create simple deterministic fallback embeddings.

## Challenges and Solutions

- **Large repositories can be slow to process**  
  Solved by batching GitHub file fetches, batching embeddings, skipping binary files, and doing work in the background.

- **AI answers can become generic**  
  Solved with RAG: the backend searches relevant chunks first and sends code context to the LLM.

- **Dependency graph can become noisy**  
  Solved by focusing on internal imports and ignoring external packages.

- **LLM output can be hard to parse**  
  Solved by using strict prompts that request JSON for architecture and walkthrough responses.

## Scalability, Security, and Performance

- **Scalability**: background processing and cached MongoDB documents reduce repeated work.
- **Performance**: chunking and embeddings run in batches, and cached repos load faster on later visits.
- **Security**: API keys remain server-side, CORS is configured, and file filtering avoids binary/generated content.
- **Reliability**: API routes include validation, error responses, and fallback behavior for embeddings.

## Folder Structure

```text
codebase-onboarding-agent/
├── client/                 # Next.js frontend
│   ├── app/                # Routes and pages
│   ├── components/         # UI, explorer, chat, graph, guide components
│   ├── hooks/              # Reusable React hooks such as SSE
│   ├── lib/                # PDF export and graph layout helpers
│   └── types/              # Frontend TypeScript types
├── server/                 # Express backend
│   ├── src/controllers/    # Request handlers
│   ├── src/models/         # Mongoose models
│   ├── src/prompts/        # LLM prompt builders
│   ├── src/routes/         # API route definitions
│   └── src/services/       # GitHub, AI, chunking, embeddings, graph, guide logic
└── README.md
```

## Installation and Setup

### Prerequisites

- Node.js 20+
- MongoDB Atlas database
- MongoDB Atlas Vector Search index on `chunks.embedding`
- GitHub personal access token
- Groq API key
- Hugging Face API key, optional because a local fallback exists

### 1. Clone and install

```bash
git clone <your-repo-url>
cd codebase-onboarding-agent

cd server
npm install

cd ../client
npm install
```

### 2. Configure environment variables

Create `server/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:3000

GITHUB_TOKEN=your_github_token

GROQ_API_KEY=your_groq_key
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile

HUGGINGFACE_API_KEY=your_huggingface_key
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIMENSIONS=384
```

Create `client/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Run locally

Open two terminals:

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Future Improvements

- Add user accounts and private workspaces.
- Support private GitHub repositories with user OAuth.
- Add queue-based background jobs for large repositories.
- Add repo re-indexing when source code changes.
- Add better status APIs for indexing progress.
- Add tests for services, controllers, and critical UI flows.
- Support more languages in dependency parsing.

## Interview Summary

This project demonstrates full-stack development, API design, database modeling, AI integration, vector search, streaming UX, and system design. The core idea is simple: make unfamiliar codebases easier to understand by combining GitHub data, structured indexing, semantic search, and AI-generated explanations.

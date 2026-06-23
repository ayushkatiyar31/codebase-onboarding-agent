# Codebase Onboarding Agent

> Paste any public GitHub URL and get an interactive architecture analysis, AI-powered Q&A, dependency graph, and shareable onboarding guide — generated from the actual source code.

![Demo](./docs/demo.gif)
<!-- Record a Loom walkthrough and export a GIF for this — see Step 8 -->

## Features

| Feature | What it does |
|---|---|
| ⚡ **Architecture Analysis** | Auto-detects tech stack, architecture pattern, entry points, key directories, and gotchas — streamed in real time |
| 💬 **Ask the Codebase** | RAG-powered Q&A with file citations — semantic search over vector-embedded code chunks |
| 🕸️ **Dependency Graph** | Interactive file dependency visualisation using react-flow + Dagre auto-layout |
| 🧭 **Guided Walkthrough** | AI-curated reading order from entry points to core logic |
| 📋 **Exportable Guide** | PDF download or shareable link — no account needed to view |
| ⚡ **Instant on revisit** | All analysis cached in MongoDB — second visit loads in under a second |

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────┐
│  Next.js        │────▶│  Express API                 │
│  (App Router)   │     │  /api/repo    → GitHub API   │
│                 │◀────│  /api/chat    → RAG pipeline  │
│  • File tree    │ SSE │  /api/graph   → Dep parser   │
│  • Code viewer  │     │  /api/analysis → Groq        │
│  • Chat panel   │     │  /api/guide   → Guide gen    │
│  • Dep graph    │     └──────────────┬───────────────┘
│  • Guide view   │                    │
└─────────────────┘          ┌─────────▼──────────┐
                             │  MongoDB Atlas      │
                             │  • repos            │
                             │  • chunks + vectors │
                             │  • analyses (cache) │
                             │  • graphs (cache)   │
                             │  • guides (cache)   │
                             └────────────────────┘
```

### RAG Pipeline

```
User question
     │
     ▼
Embed with BAAI/bge-small-en-v1.5 (HuggingFace)
     │
     ▼
Atlas Vector Search ($vectorSearch aggregation)
     │  cosine similarity over 384-dim vectors
     ▼
Top-5 most relevant code chunks retrieved
     │
     ▼
Injected as context into Groq prompt (llama-3.3-70b-versatile)
     │
     ▼
Answer streamed token-by-token via SSE → browser
```

## Tech Stack

**Frontend:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · react-flow · react-markdown

**Backend:** Node.js · Express · TypeScript · Mongoose

**AI / ML:** Groq (llama-3.3-70b-versatile) · Hugging Face Inference API (BAAI/bge-small-en-v1.5)

**Database:** MongoDB Atlas · Atlas Vector Search

**Deployment:** Vercel (frontend) · Render (backend)

## Local Setup

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (free tier works)
- Groq API key — [console.groq.com](https://console.groq.com)
- Hugging Face API key — [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
- GitHub Personal Access Token (public\_repo scope)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/codebase-onboarding-agent
cd codebase-onboarding-agent

cd server && npm install
cd ../client && npm install
```

### 2. Set up MongoDB Atlas Vector Search index

In Atlas UI → your cluster → Atlas Search → Create Index → Atlas Vector Search → select `chunks` collection → JSON editor:

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine" },
    { "type": "filter", "path": "repoId" },
    { "type": "filter", "path": "filePath" }
  ]
}
```

Name the index `chunk_vector_index`.

### 3. Configure environment variables

**server/.env**
```
PORT=5000
MONGODB_URI=mongodb+srv://...
GITHUB_TOKEN=ghp_...
GROQ_API_KEY=gsk_...
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile
HUGGINGFACE_API_KEY=hf_...
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIMENSIONS=384
CLIENT_URL=http://localhost:3000
```

**client/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. Run

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How the chunker works

Files are split into semantically meaningful chunks rather than arbitrary line counts:

1. Import block extracted as one chunk
2. Function / class / component declarations detected via per-language regex patterns
3. Chunks capped at 150 lines — oversized functions split at blank-line boundaries
4. Each chunk stores: `filePath`, `language`, `startLine`, `endLine`, `chunkType`, `name`, `tokenEstimate`
5. Embeddings generated in batches of 32 via HuggingFace API

## Project Structure

```
codebase-onboarding-agent/
├── client/                          # Next.js frontend
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── repo/[owner]/[name]/     # Explorer page
│   │   └── guide/[shareId]/         # Public guide share page
│   ├── components/
│   │   ├── explorer/                # FileTree, CodeViewer, ArchitecturePanel, DependencyGraph
│   │   ├── chat/                    # ChatPanel, MessageBubble
│   │   ├── guide/                   # GuideRenderer, WalkthroughStepper
│   │   └── ui/                      # Skeleton, ErrorBoundary
│   ├── hooks/useSSE.ts              # SSE streaming hook
│   ├── lib/                         # dagreLayout, exportPdf
│   └── types/                       # Shared TypeScript types
└── server/                          # Express backend
    └── src/
        ├── services/                # github, chunker, embeddings, vectorSearch, groq, analysis, graph, walkthrough, guide
        ├── controllers/             # repo, analysis, chat, graph, guide
        ├── routes/                  # repo, analysis, chat, graph, guide
        ├── models/                  # Repo, Chunk, Analysis, Graph, Guide
        └── prompts/                 # architecture, qa, walkthrough, guide
```

## License

MIT
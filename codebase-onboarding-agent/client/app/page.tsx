'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GitBranch as Github,
  ArrowRight,
  Loader2,
  Zap,
  MessageSquare,
  GitBranch,
  BookOpen,
  FileText,
  Layers,
  ChevronRight,
} from 'lucide-react';

const DEMO_REPOS = [
  {
    label: 'expressjs/express',
    description: 'Minimal Node.js web framework',
    url: 'https://github.com/expressjs/express',
  },
  {
    label: 'axios/axios',
    description: 'Promise-based HTTP client',
    url: 'https://github.com/axios/axios',
  },
  {
    label: 'vitejs/vite',
    description: 'Next-gen frontend tooling',
    url: 'https://github.com/vitejs/vite',
  },
];

const FEATURES = [
  {
    icon: <Layers size={20} className="text-blue-400" />,
    title: 'Architecture Analysis',
    description:
      'Auto-detect tech stack, architecture patterns, entry points, and key directories',
  },
  {
    icon: <MessageSquare size={20} className="text-purple-400" />,
    title: 'Ask the Codebase',
    description:
      'RAG-powered Q&A with source citations — ask anything, get answers grounded in real code',
  },
  {
    icon: <GitBranch size={20} className="text-green-400" />,
    title: 'Dependency Graph',
    description:
      'Interactive file dependency graph — see how every module connects',
  },
  {
    icon: <BookOpen size={20} className="text-yellow-400" />,
    title: 'Guided Walkthrough',
    description:
      'AI-curated reading order from entry points to core logic',
  },
  {
    icon: <FileText size={20} className="text-pink-400" />,
    title: 'Exportable Guide',
    description:
      'Download a shareable PDF onboarding doc or send a link — no account needed',
  },
  {
    icon: <Zap size={20} className="text-orange-400" />,
    title: 'Instant on Revisit',
    description:
      'All analysis is cached — returning visitors get results in under a second',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (url?: string) => {
    const targetUrl = url || repoUrl;
    if (!targetUrl.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/repo/ingest`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: targetUrl }),
        }
      );

      const data = (await res.json()) as {
        repo?: { owner: string; name: string };
        error?: string;
      };

      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      if (data.repo) {
        router.push(`/repo/${data.repo.owner}/${data.repo.name}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load repository'
      );
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-20 gap-10">
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <div
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border
                          border-blue-500/20 rounded-full text-blue-400 text-xs font-medium"
          >
            <Zap size={12} />
            Powered by Groq + RAG + Vector Search
          </div>

          <h1 className="text-5xl font-bold tracking-tight">
            Understand any codebase{' '}
            <span className="text-blue-400">in minutes</span>
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed">
            Paste a GitHub URL and get an interactive architecture analysis,
            AI-powered Q&A, dependency graph, and a shareable onboarding guide —
            all generated from the actual source code.
          </p>
        </div>

        <div className="w-full max-w-xl flex flex-col gap-3">
          <div className="flex gap-2">
            <div
              className="flex-1 flex items-center bg-gray-800 border border-gray-700
                            rounded-xl px-4 focus-within:ring-2 focus-within:ring-blue-500
                            focus-within:border-transparent transition-all"
            >
              <Github
                size={16}
                className="text-gray-500 shrink-0 mr-3"
              />

              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="https://github.com/owner/repo"
                disabled={loading}
                className="flex-1 bg-transparent py-3 text-white placeholder-gray-500
                           focus:outline-none text-sm"
              />
            </div>

            <button
              onClick={() => handleSubmit()}
              disabled={loading || !repoUrl.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white font-medium px-5 py-3 rounded-xl
                         transition-all duration-200 whitespace-nowrap"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )}
              {loading ? 'Loading...' : 'Explore'}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm px-1">{error}</p>}
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-gray-500 text-sm">Or try a demo repo</p>

          <div className="flex flex-wrap gap-3 justify-center">
            {DEMO_REPOS.map((repo) => (
              <button
                key={repo.label}
                onClick={() => handleSubmit(repo.url)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/80
                           hover:bg-gray-800 border border-gray-700 hover:border-gray-600
                           rounded-xl text-sm text-gray-300 hover:text-white
                           transition-all duration-200 disabled:opacity-40 group"
              >
                <Github
                  size={14}
                  className="text-gray-500 group-hover:text-gray-300 transition-colors"
                />

                <div className="text-left">
                  <div className="font-medium text-xs">{repo.label}</div>
                  <div className="text-xs text-gray-500">
                    {repo.description}
                  </div>
                </div>

                <ChevronRight
                  size={14}
                  className="text-gray-600 group-hover:text-gray-400
                                                    transition-colors ml-1"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 px-6 py-20">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-3">
              Everything a new dev needs
            </h2>

            <p className="text-gray-400">
              Six AI-powered tools, working from a single GitHub URL
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 p-5 bg-gray-900 border border-gray-800
                           rounded-xl hover:border-gray-700 transition-colors"
              >
                <div className="p-2 bg-gray-800 rounded-lg w-fit">
                  {feature.icon}
                </div>

                <div>
                  <h3 className="font-medium text-white mb-1">
                    {feature.title}
                  </h3>

                  <p className="text-sm text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 px-6 py-20">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-10 text-center">
          <h2 className="text-3xl font-bold">How it works</h2>

          <div className="flex flex-col gap-4 w-full text-left">
            {[
              {
                step: '01',
                title: 'Paste a GitHub URL',
                desc: 'Any public repo. We fetch the file tree and raw content via the GitHub API — no cloning required.',
              },
              {
                step: '02',
                title: 'We chunk and embed every file',
                desc: 'Your code is split by function/class boundaries, converted into 384-dimensional vectors, and indexed for semantic search.',
              },
              {
                step: '03',
                title: 'AI analyses the architecture',
                desc: 'Groq reads your package.json, README, and key files to identify stack, patterns, entry points, and gotchas — streamed in real time.',
              },
              {
                step: '04',
                title: 'Ask anything',
                desc: 'Questions are embedded, matched against the most relevant code chunks via vector search, and answered with citations.',
              },
              {
                step: '05',
                title: 'Export and share',
                desc: "Download a PDF onboarding guide or send a shareable link — no account required on the reader's end.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-5 p-5 bg-gray-900 border border-gray-800 rounded-xl"
              >
                <span className="text-3xl font-bold text-gray-700 shrink-0 font-mono">
                  {item.step}
                </span>

                <div>
                  <h3 className="font-medium text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 px-6 py-8 text-center">
        <p className="text-gray-600 text-sm">
          Built with Next.js · Express · MongoDB Atlas Vector Search · Groq ·
          React Flow
        </p>
      </div>
    </main>
  );
}
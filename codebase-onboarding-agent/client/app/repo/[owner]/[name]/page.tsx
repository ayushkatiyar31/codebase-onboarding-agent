'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FileTree from '@/components/explorer/FileTree';
import RepoHeader from '@/components/explorer/RepoHeader';
import CodeViewer from '@/components/explorer/CodeViewer';
import ArchitecturePanel from '@/components/explorer/ArchitecturePanel';
import ChatPanel from '@/components/chat/ChatPanel';
import { IFileNode } from '@/types';
import { Loader2 } from 'lucide-react';

interface RepoData {
  _id: string;
  owner: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  defaultBranch: string;
  fileTree: IFileNode[];
  status: string;
}

export default function RepoPage() {
  const params = useParams() as { owner: string; name: string };

  const [repo, setRepo] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading repository...');
  const [error, setError] = useState('');

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'architecture' | 'files' | 'chat'>('architecture');
  const [chatFocusFile, setChatFocusFile] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    // Fetches the repo from MongoDB. Returns the repo object, or null if not found (404).
    // Throws for any other kind of error (network failure, 500, etc).
    const fetchRepo = async (): Promise<RepoData | null> => {
      const res = await fetch(`${apiBase}/api/repo/${params.owner}/${params.name}`);

      if (res.status === 404) {
        return null; // signals "not found" — distinct from a real error
      }

      const data = await res.json() as { repo?: RepoData; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch repo');
      }

      return data.repo ?? null;
    };

    // Triggers ingestion for this owner/name, reconstructing the GitHub URL
    // from the route params. This is the same call the landing page makes —
    // we're just invoking it automatically instead of requiring the user
    // to go back and paste the URL again.
    const ingestRepo = async (): Promise<void> => {
      const repoUrl = `https://github.com/${params.owner}/${params.name}`;

      const res = await fetch(`${apiBase}/api/repo/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await res.json() as { error?: string };

      if (!res.ok) {
        // Surface GitHub's actual error (e.g. "Not Found" for a typo'd repo,
        // or rate limit messages) rather than a generic one
        throw new Error(data.error || 'Failed to ingest repository');
      }
    };

    const loadOrIngest = async () => {
      setLoading(true);
      setError('');

      try {
        // ── Attempt 1: repo might already exist in MongoDB ──
        setLoadingMessage('Loading repository...');
        let repoData = await fetchRepo();

        if (repoData) {
          setRepo(repoData);
          setLoading(false);
          return;
        }

        // ── Not found — auto-ingest it ──
        // This is the fix: instead of dead-ending on 404, we treat a direct
        // navigation to /repo/owner/name as an implicit "please ingest this"
        setLoadingMessage(`Setting up ${params.owner}/${params.name} for the first time...`);
        await ingestRepo();

        // ── Attempt 2: fetch again now that ingestion has saved it ──
        setLoadingMessage('Finalising...');
        repoData = await fetchRepo();

        if (!repoData) {
          // Extremely unlikely — ingest succeeded but the immediate re-fetch
          // still can't find it. Treat as an error rather than looping forever.
          throw new Error('Repository was ingested but could not be loaded. Please refresh.');
        }

        setRepo(repoData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    loadOrIngest();
  }, [params.owner, params.name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <p>{loadingMessage}</p>
          <p className="text-xs text-gray-600">
            First-time setup can take a few seconds while we read the repo from GitHub
          </p>
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-2">{error || 'Repository not found'}</p>
          <p className="text-gray-500 text-sm">
            Double check the GitHub URL is correct and the repository is public.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <RepoHeader repo={repo} />

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-72 border-r border-gray-800 overflow-y-auto shrink-0">
          <FileTree
            fileTree={repo.fileTree}
            selectedFile={selectedFile}
            onFileSelect={(path) => {
              setSelectedFile(path);
              setActiveTab('files');
            }}
            onAskAboutFile={(path) => {
              setChatFocusFile(path);
              setActiveTab('chat');
            }}
          />
        </aside>

        {/* Main panel */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-gray-800 shrink-0">
            {(['architecture', 'chat', 'files'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium transition-colors
                            border-b-2 -mb-px
                            ${activeTab === tab
                              ? 'border-blue-500 text-white'
                              : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
              >
                {tab === 'architecture' && '⚡ Architecture'}
                {tab === 'chat'         && '💬 Ask Codebase'}
                {tab === 'files'        && '📄 Files'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'architecture' && (
              <ArchitecturePanel owner={repo.owner} repoName={repo.name} />
            )}
            {activeTab === 'chat' && (
              <ChatPanel
                owner={repo.owner}
                repoName={repo.name}
                repoId={repo._id}
                focusFile={chatFocusFile}
                onFocusFileConsumed={() => setChatFocusFile(null)}
                onFileSelect={(path) => {
                  setSelectedFile(path);
                  setActiveTab('files');
                }}
              />
            )}
            {activeTab === 'files' && (
              <CodeViewer
                owner={repo.owner}
                repoName={repo.name}
                filePath={selectedFile}
              />
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
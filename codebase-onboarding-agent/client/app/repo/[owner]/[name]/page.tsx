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
import DependencyGraph from '@/components/explorer/DependencyGraph';
import WalkthroughStepper from '@/components/guide/WalkthroughStepper';
import GuideRenderer from '@/components/guide/GuideRenderer';
import { FileTreeSkeleton, RepoHeaderSkeleton, ArchitectureSkeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  const [activeTab, setActiveTab] = useState<
  'architecture' | 'walkthrough' | 'graph' | 'files' | 'chat' | 'guide'
>('architecture');
  const [chatFocusFile, setChatFocusFile] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    const fetchRepo = async (): Promise<RepoData | null> => {
      const res = await fetch(`${apiBase}/api/repo/${params.owner}/${params.name}`);

      if (res.status === 404) {
        return null;
      }

      const data = await res.json() as { repo?: RepoData; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch repo');
      }

      return data.repo ?? null;
    };

    const ingestRepo = async (): Promise<void> => {
      const repoUrl = `https://github.com/${params.owner}/${params.name}`;

      const res = await fetch(`${apiBase}/api/repo/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await res.json() as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Failed to ingest repository');
      }
    };

    const loadOrIngest = async () => {
      setLoading(true);
      setError('');

      try {
        setLoadingMessage('Loading repository...');
        let repoData = await fetchRepo();

        if (repoData) {
          setRepo(repoData);
          setLoading(false);
          return;
        }

        setLoadingMessage(`Setting up ${params.owner}/${params.name} for the first time...`);
        await ingestRepo();

        setLoadingMessage('Finalising...');
        repoData = await fetchRepo();

        if (!repoData) {
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
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <RepoHeaderSkeleton />
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-72 border-r border-gray-800">
            <FileTreeSkeleton />
          </aside>
          <main className="flex-1">
            <ArchitectureSkeleton />
          </main>
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
      <aside className="w-72 border-r border-gray-800 overflow-y-auto shrink-0">
        <ErrorBoundary>
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
        </ErrorBoundary>
      </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-800 shrink-0 overflow-x-auto">
            {(['architecture', 'walkthrough', 'graph', 'chat', 'guide', 'files'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium transition-colors
                            border-b-2 -mb-px whitespace-nowrap
                            ${activeTab === tab
                              ? 'border-blue-500 text-white'
                              : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
              >
                {tab === 'architecture' && '⚡ Architecture'}
                {tab === 'walkthrough'  && '🧭 Walkthrough'}
                {tab === 'graph'        && '🕸️ Dependencies'}
                {tab === 'chat'         && '💬 Ask Codebase'}
                {tab === 'guide'        && '📋 Guide'}
                {tab === 'files'        && '📄 Files'}
              </button>
            ))}
          </div>

          {/* Tab content — each wrapped in its own ErrorBoundary */}
          <div className="flex-1 overflow-hidden">
            <ErrorBoundary>
            {activeTab === 'architecture' && (
              <ArchitecturePanel
                owner={repo.owner}
                repoName={repo.name}
              />
            )}

            {activeTab === 'walkthrough' && (
              <WalkthroughStepper
                owner={repo.owner}
                repoName={repo.name}
                onFileSelect={(path) => {
                  setSelectedFile(path);
                  setActiveTab('files');
                }}
              />
            )}

            {activeTab === 'graph' && (
              <DependencyGraph
                owner={repo.owner}
                repoName={repo.name}
                onFileSelect={(path) => {
                  setSelectedFile(path);
                  setActiveTab('files');
                }}
              />
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
            {activeTab === 'guide' && (
  <GuideRenderer
    owner={repo.owner}
    repoName={repo.name}
  />
)}

            {activeTab === 'files' && (
              <CodeViewer
                owner={repo.owner}
                repoName={repo.name}
                filePath={selectedFile}
              />
            )}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
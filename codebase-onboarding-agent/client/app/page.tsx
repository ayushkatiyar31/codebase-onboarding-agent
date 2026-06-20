'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FileTree from '@/components/explorer/FileTree';
import RepoHeader from '@/components/explorer/RepoHeader';
import CodeViewer from '@/components/explorer/CodeViewer';
import ArchitecturePanel from '@/components/explorer/ArchitecturePanel';
import ChatPanel from '@/components/chat/ChatPanel';
import { IFileNode } from '@/types';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
).replace(/\/$/, '');

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

  const [chatFocusFile, setChatFocusFile] = useState<string | null>(null);

  const [repo, setRepo] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'architecture' | 'files' | 'chat'
  >('architecture');

  useEffect(() => {
    const fetchRepo = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/repo/${params.owner}/${params.name}`
        );

        const data = (await res.json()) as {
          repo?: RepoData;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch repo');
        }

        setRepo(data.repo || null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRepo();
  }, [params.owner, params.name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p>Loading repository...</p>
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400">
          {error || 'Repository not found'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <RepoHeader repo={repo} />

      <div className="flex flex-1 overflow-hidden">
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

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-gray-800 shrink-0">
            {(['architecture', 'chat', 'files'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium transition-colors
                  border-b-2 -mb-px
                  ${
                    activeTab === tab
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
              >
                {tab === 'architecture' && '⚡ Architecture'}
                {tab === 'chat' && '💬 Ask Codebase'}
                {tab === 'files' && '📄 Files'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'architecture' && (
              <ArchitecturePanel
                owner={repo.owner}
                repoName={repo.name}
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
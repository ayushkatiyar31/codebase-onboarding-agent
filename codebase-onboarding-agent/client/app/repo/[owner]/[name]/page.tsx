// app/repo/[owner]/[name]/page.tsx
// The main explorer page — shown after a repo is ingested

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FileTree from '@/components/explorer/FileTree';
import RepoHeader from '@/components/explorer/RepoHeader';
import { IFileNode } from '@/types';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Type for the full repo response from our API
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
  // useParams() reads the dynamic segments from the URL
  // e.g. /repo/expressjs/express → { owner: 'expressjs', name: 'express' }
  const params = useParams() as {
    owner?: string | string[];
    name?: string | string[];
  };
  const owner = decodeURIComponent(Array.isArray(params.owner) ? params.owner[0] : params.owner ?? '');
  const name = decodeURIComponent(Array.isArray(params.name) ? params.name[0] : params.name ?? '');

  const [repo, setRepo] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!owner || !name) {
      return;
    }

    // useEffect runs after the component mounts (appears on screen)
    // The [] dependency array means "run this only once, on mount"
    const fetchRepo = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
        );
        const data = await res.json() as { repo?: RepoData; error?: string };

        if (!res.ok) throw new Error(data.error || 'Failed to fetch repo');

        setRepo(data.repo || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        // finally always runs — whether fetch succeeded or failed
        setLoading(false);
      }
    };

    fetchRepo();
  }, [owner, name]);

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
        <p className="text-red-400">{error || 'Repository not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <RepoHeader repo={repo} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: file tree */}
        <aside className="w-72 border-r border-gray-800 overflow-y-auto flex-shrink-0">
          <FileTree fileTree={repo.fileTree} />
        </aside>
        {/* Main content area — will be filled in Day 2+ */}
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Select a file from the sidebar</p>
        </main>
      </div>
    </div>
  );
}

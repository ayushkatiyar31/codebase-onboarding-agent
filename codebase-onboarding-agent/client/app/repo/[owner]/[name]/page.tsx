'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FileTree from '@/components/explorer/FileTree';
import RepoHeader from '@/components/explorer/RepoHeader';
import CodeViewer from '@/components/explorer/CodeViewer';
import { IFileNode } from '@/types';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

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
  const [error, setError] = useState('');

  // Track which file is currently selected — this is the "shared state"
  // between FileTree (sets it) and CodeViewer (reads it)
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepo = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/repo/${params.owner}/${params.name}`
        );
        const data = await res.json() as { repo?: RepoData; error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to fetch repo');
        setRepo(data.repo || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
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
        <p className="text-red-400">{error || 'Repository not found'}</p>
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
            onFileSelect={setSelectedFile}  // ← lift state up: FileTree calls this
          />
        </aside>

        {/* Main panel */}
        <main className="flex-1 flex overflow-hidden">
          <CodeViewer
            owner={repo.owner}
            repoName={repo.name}
            filePath={selectedFile}   // ← CodeViewer reads the selected file
          />
        </main>

      </div>
    </div>
  );
}
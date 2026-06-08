
'use client'; 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, ArrowRight, Loader2 } from 'lucide-react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function HomePage() {
  const router = useRouter();

  // useState stores values that, when changed, cause the component to re-render
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError('');

    try {
   
      const res = await fetch(`${API_BASE_URL}/api/repo/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await res.json() as { repo?: { owner: string; name: string }; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (data.repo) {
       
        router.push(`/repo/${data.repo.owner}/${data.repo.name}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repository');
      setLoading(false);
    }
  };

 
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl flex flex-col items-center gap-8">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-3 bg-gray-800 rounded-2xl">
            <GitBranch size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Codebase Agent</h1>
          <p className="text-gray-400 text-lg">
            Paste any public GitHub repo URL to generate an interactive onboarding guide
          </p>
        </div>

        {/* Input + Button */}
        <div className="w-full flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://github.com/owner/repo"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         text-white placeholder-gray-500 focus:outline-none
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200"
              disabled={loading}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !repoUrl.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white font-medium px-5 py-3 rounded-xl
                         transition-all duration-200 whitespace-nowrap"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ArrowRight size={18} />
              )}
              {loading ? 'Loading...' : 'Explore'}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-red-400 text-sm px-1">{error}</p>
          )}
        </div>

        {/* Demo repos */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-500 text-sm">Try a demo repo</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              'https://github.com/expressjs/express',
              'https://github.com/axios/axios',
            ].map((url) => (
              <button
                key={url}
                onClick={() => setRepoUrl(url)}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300
                           px-3 py-1.5 rounded-lg transition-colors duration-200"
              >
                {url.replace('https://github.com/', '')}
              </button>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}

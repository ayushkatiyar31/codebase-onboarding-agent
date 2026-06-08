

import { Star, GitBranch, Code2 } from 'lucide-react';

interface RepoHeaderProps {
  repo: {
    owner: string;
    name: string;
    fullName: string;
    description: string;
    language: string;
    stars: number;
    defaultBranch: string;
  };
}

export default function RepoHeader({ repo }: RepoHeaderProps) {
  return (
    <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-6 flex-wrap">
      {/* Repo name as a link to GitHub */}
      
        href={`https://github.com/${repo.fullName}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xl font-semibold text-white hover:text-blue-400 transition-colors"
      >
        {repo.fullName}
      </a>

      {/* Metadata badges */}
      <div className="flex items-center gap-4 text-sm text-gray-400">

        {repo.language && (
          <span className="flex items-center gap-1.5">
            <Code2 size={14} />
            {repo.language}
          </span>
        )}

        <span className="flex items-center gap-1.5">
          <Star size={14} />
          {repo.stars.toLocaleString()}
        </span>

        <span className="flex items-center gap-1.5">
          <GitBranch size={14} />
          {repo.defaultBranch}
        </span>
      </div>

      {repo.description && (
        <p className="text-gray-400 text-sm w-full mt-1">{repo.description}</p>
      )}
    </header>
  );
}
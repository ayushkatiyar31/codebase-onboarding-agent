'use client';

import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Loader2,
  RefreshCw,
  AlertCircle,
  Layers,
  GitBranch,
  FolderOpen,
  AlertTriangle,
  Terminal,
  BookOpen,
} from 'lucide-react';
import { useSSE } from '@/hooks/useSSE';
import { ArchitectureSkeleton } from '@/components/ui/Skeleton';
import type { ArchitectureAnalysis } from '@/types/analysis';

interface ArchitecturePanelProps {
  owner: string;
  repoName: string;
}

export default function ArchitecturePanel({
  owner,
  repoName,
}: ArchitecturePanelProps) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const streamUrl = `${apiBase}/api/analysis/${owner}/${repoName}/stream`;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { result, status, loading, error, retry } =
    useSSE<ArchitectureAnalysis>({
      url: streamUrl,
      enabled: true,

      onComplete: async (analysis) => {
        try {
          await fetch(
            `${apiBase}/api/analysis/${owner}/${repoName}/save`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ analysis }),
            }
          );
        } catch {
          console.warn('Failed to cache analysis');
        }
      },
    });

  if (loading && !result) {
    return <ArchitectureSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <AlertCircle size={32} className="text-red-400" />
        <div className="text-center">
          <p className="text-white font-medium mb-1">Analysis failed</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={retry}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800
                       hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Layers size={18} className="text-blue-400" />
          Architecture Analysis
        </h2>

        <button
          onClick={async () => {
            await fetch(
              `${apiBase}/api/analysis/${owner}/${repoName}/cache`,
              {
                method: 'DELETE',
              }
            );
            retry();
          }}
          className="flex items-center gap-1.5 text-xs text-gray-500
                     hover:text-gray-300 transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <Section title="Overview">
        <p className="text-gray-300 leading-relaxed text-sm">
          {result.summary}
        </p>
      </Section>

      {result.architecturePattern && (
        <Section title="Architecture Pattern">
          <div className="flex items-start gap-3">
            <span
              className="px-2.5 py-1 bg-blue-600/20 text-blue-300 rounded-md
                             text-sm font-medium border border-blue-500/20 whitespace-nowrap"
            >
              {result.architecturePattern.name}
            </span>

            <p className="text-gray-400 text-sm leading-relaxed">
              {result.architecturePattern.description}
            </p>
          </div>
        </Section>
      )}

      {result.techStack?.length > 0 && (
        <Section title="Tech Stack">
          <div className="flex flex-wrap gap-2">
            {result.techStack.map((tech, i) => (
              <TechBadge
                key={i}
                name={tech.name}
                role={tech.role}
                category={tech.category}
              />
            ))}
          </div>
        </Section>
      )}

      {result.dataFlow && (
        <Section title="How Data Flows">
          <p className="text-gray-300 text-sm leading-relaxed">
            {result.dataFlow}
          </p>
        </Section>
      )}

      {result.entryPoints?.length > 0 && (
        <Section title="Entry Points" icon={<GitBranch size={14} />}>
          <div className="flex flex-col gap-2">
            {result.entryPoints.map((ep, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <code
                  className="text-blue-400 font-mono text-xs bg-gray-800
                                 px-2 py-0.5 rounded whitespace-nowrap mt-0.5"
                >
                  {ep.path}
                </code>

                <span className="text-gray-400">{ep.description}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {result.keyDirectories?.length > 0 && (
        <Section title="Key Directories" icon={<FolderOpen size={14} />}>
          <div className="flex flex-col gap-2">
            {result.keyDirectories.map((dir, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <code
                  className="text-purple-400 font-mono text-xs bg-gray-800
                                 px-2 py-0.5 rounded whitespace-nowrap mt-0.5"
                >
                  {dir.path}/
                </code>

                <span className="text-gray-400">{dir.purpose}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {result.firstFilesToRead?.length > 0 && (
        <Section title="Start Here" icon={<BookOpen size={14} />}>
          <ol className="flex flex-col gap-2">
            {result.firstFilesToRead.map((file, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="text-gray-600 font-mono text-xs mt-0.5 w-4 shrink-0">
                  {i + 1}.
                </span>

                <div>
                  <code className="text-green-400 font-mono text-xs">
                    {file.path}
                  </code>

                  <p className="text-gray-400 mt-0.5">{file.reason}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {result.gotchas?.length > 0 && (
        <Section
          title="Watch Out For"
          icon={<AlertTriangle size={14} className="text-yellow-400" />}
        >
          <ul className="flex flex-col gap-2">
            {result.gotchas.map((g, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-300"
              >
                <span className="text-yellow-500 mt-0.5 shrink-0">
                  ⚠
                </span>
                {g}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {result.setupSteps?.length > 0 && (
        <Section title="Local Setup" icon={<Terminal size={14} />}>
          <ol className="flex flex-col gap-2">
            {result.setupSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="text-gray-600 font-mono text-xs mt-0.5 w-4 shrink-0">
                  {i + 1}.
                </span>

                <span className="text-gray-300">{step}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
}

const Section = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3">
    <h3
      className="text-xs font-semibold text-gray-500 uppercase tracking-wider
                   flex items-center gap-1.5"
    >
      {icon}
      {title}
    </h3>
    {children}
  </div>
);

const CATEGORY_COLOURS: Record<string, string> = {
  frontend: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  backend: 'bg-green-900/40 text-green-300 border-green-700/40',
  database: 'bg-orange-900/40 text-orange-300 border-orange-700/40',
  devtools: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
  testing: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
  other: 'bg-gray-800 text-gray-300 border-gray-700',
};

const TechBadge = ({
  name,
  role,
  category,
}: {
  name: string;
  role: string;
  category: string;
}) => {
  const colours = CATEGORY_COLOURS[category] ?? CATEGORY_COLOURS.other;

  return (
    <div
      className={`group relative flex items-center gap-1.5 px-2.5 py-1
                   rounded-md border text-xs font-medium cursor-default
                   transition-all ${colours}`}
    >
      {name}

      <span
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
                   bg-gray-900 text-gray-200 text-xs rounded whitespace-nowrap
                   opacity-0 group-hover:opacity-100 transition-opacity
                   border border-gray-700 pointer-events-none z-10"
      >
        {role}
      </span>
    </div>
  );
};
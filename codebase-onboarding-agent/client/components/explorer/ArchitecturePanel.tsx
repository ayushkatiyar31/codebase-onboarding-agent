'use client';

import type { ReactNode } from 'react';
import {
  Layers,
  MessageSquare,
  SearchCode,
  Sparkles,
} from 'lucide-react';

interface ArchitecturePanelProps {
  owner: string;
  repoName: string;
}

export default function ArchitecturePanel({ owner, repoName }: ArchitecturePanelProps) {
  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Layers size={18} className="text-blue-400" />
          Architecture Overview
        </h2>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-600/20 text-blue-300">
            <Sparkles size={22} />
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-white font-medium">
                Ask Codebase now powers repo understanding
              </p>
              <p className="text-sm text-gray-400 mt-1">
                The old architecture analysis stream has been retired for {owner}/{repoName}.
                Use the chat tab for grounded answers with source citations.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard
                icon={<SearchCode size={16} />}
                title="Searches real code"
                body="Questions are answered from embedded chunks stored for this repository."
              />
              <InfoCard
                icon={<MessageSquare size={16} />}
                title="Keeps context"
                body="Follow-up questions include recent conversation history."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const InfoCard = ({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) => (
  <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
    <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
      <span className="text-blue-300">{icon}</span>
      {title}
    </div>
    <p className="text-xs text-gray-500 mt-2 leading-relaxed">{body}</p>
  </div>
);

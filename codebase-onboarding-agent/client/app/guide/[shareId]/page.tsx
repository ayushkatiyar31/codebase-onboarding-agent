'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, AlertCircle, FileDown } from 'lucide-react';
import { exportElementToPdf } from '@/lib/exportPdf';
import '@/components/guide/markdown.css';

interface SharedGuideData {
  markdown: string;
  repoFullName: string;
  generatedAt: string;
}

export default function SharedGuidePage() {
  const params = useParams() as { shareId: string };
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const [data, setData] = useState<SharedGuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        const res = await fetch(
          `${apiBase}/api/guide/shared/${params.shareId}`
        );

        const json = (await res.json()) as SharedGuideData & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(json.error || 'Guide not found');
        }

        setData(json);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load guide'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [apiBase, params.shareId]);

  const handleExportPdf = async () => {
    if (!contentRef.current || !data) return;

    setExporting(true);

    try {
      await exportElementToPdf(
        contentRef.current,
        `${data.repoFullName.replace('/', '-')}-guide`
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-3">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-gray-600">{error || 'Guide not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href={`https://github.com/${data.repoFullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium text-sm"
          >
           <svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="currentColor"
  aria-hidden="true"
>
  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
</svg>
            {data.repoFullName}
          </a>

          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <FileDown size={13} />
            )}

            {exporting ? 'Exporting...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="py-10 px-6">
        <div
          ref={contentRef}
          className="markdown-body bg-white rounded-lg shadow-lg max-w-3xl mx-auto p-10"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {data.markdown}
          </ReactMarkdown>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Generated {new Date(data.generatedAt).toLocaleDateString()} · Powered
          by Codebase Agent
        </p>
      </div>
    </div>
  );
}
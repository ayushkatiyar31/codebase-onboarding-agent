'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Loader2,
  AlertCircle,
  Download,
  Share2,
  RefreshCw,
  Check,
  FileDown,
} from 'lucide-react';
import { exportElementToPdf } from '@/lib/exportPdf';
import './markdown.css';

interface GuideRendererProps {
  owner: string;
  repoName: string;
}

export default function GuideRenderer({
  owner,
  repoName,
}: GuideRendererProps) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const [markdown, setMarkdown] = useState('');
  const [shareId, setShareId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  const fetchOrGenerate = useCallback(
    async (forceRegenerate = false) => {
      setError('');

      if (!forceRegenerate) {
        setLoading(true);

        try {
          const res = await fetch(
            `${apiBase}/api/guide/${owner}/${repoName}`
          );

          if (res.ok) {
            const data = (await res.json()) as {
              markdown: string;
              shareId: string;
            };

            setMarkdown(data.markdown);
            setShareId(data.shareId);
            setLoading(false);
            return;
          }
        } catch {}
      }

      setGenerating(true);
      setLoading(false);

      try {
        const res = await fetch(
          `${apiBase}/api/guide/${owner}/${repoName}/generate`,
          {
            method: 'POST',
          }
        );

        const data = (await res.json()) as {
          markdown?: string;
          shareId?: string;
          error?: string;
        };

        if (!res.ok || !data.markdown) {
          throw new Error(data.error || 'Failed to generate guide');
        }

        setMarkdown(data.markdown);
        setShareId(data.shareId ?? '');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Something went wrong'
        );
      } finally {
        setGenerating(false);
      }
    },
    [apiBase, owner, repoName]
  );

  useEffect(() => {
    fetchOrGenerate();
  }, [fetchOrGenerate]);

  const handleExportPdf = async () => {
    if (!contentRef.current) return;

    setExporting(true);

    try {
      await exportElementToPdf(
        contentRef.current,
        `${repoName}-onboarding-guide`
      );
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareId) return;

    const url = `${window.location.origin}/guide/${shareId}`;
    await navigator.clipboard.writeText(url);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        <p className="text-sm">Checking for existing guide...</p>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <Loader2 size={28} className="animate-spin text-blue-500" />

        <div className="text-center">
          <p className="text-white font-medium mb-1">
            Writing your onboarding guide...
          </p>

          <p className="text-sm text-gray-500">
            Synthesising architecture, walkthrough, and dependency data
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <AlertCircle size={28} className="text-red-400" />

        <p className="text-sm text-gray-400 text-center max-w-sm">
          {error}
        </p>

        <button
          onClick={() => fetchOrGenerate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 shrink-0">
        <h2 className="text-sm font-medium text-gray-300">
          Onboarding Guide
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            {copied ? (
              <Check size={13} className="text-green-400" />
            ) : (
              <Share2 size={13} />
            )}

            {copied ? 'Link copied!' : 'Share'}
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <FileDown size={13} />
            )}

            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>

          <button
            onClick={() => fetchOrGenerate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <RefreshCw size={13} />
            Regenerate
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
        <div
          ref={contentRef}
          className="markdown-body bg-white rounded-lg shadow-lg max-w-3xl mx-auto p-10"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
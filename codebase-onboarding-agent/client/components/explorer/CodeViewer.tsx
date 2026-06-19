

'use client';

import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, FileText, Loader2, AlertCircle } from 'lucide-react';

interface CodeViewerProps {
  owner: string;
  repoName: string;
  filePath: string | null;   // null = no file selected
}

interface FileData {
  content: string;
  language: string;
  filePath: string;
}

export default function CodeViewer({ owner, repoName, filePath }: CodeViewerProps) {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!filePath) return;

    const fetchFile = async () => {
      setLoading(true);
      setError('');
      setFileData(null);

      try {
        
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/repo/${owner}/${repoName}/file?path=${encodeURIComponent(filePath)}`;
        const res = await fetch(url);
        const data = await res.json() as FileData & { error?: string };

        if (!res.ok) throw new Error(data.error || 'Failed to load file');

        setFileData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [filePath, owner, repoName]); // re-run when any of these change

  
  const handleCopy = async () => {
    if (!fileData) return;
    await navigator.clipboard.writeText(fileData.content);
    setCopied(true);
    
    setTimeout(() => setCopied(false), 2000);
  };

  
  if (!filePath) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="flex flex-col items-center gap-3">
          <FileText size={40} strokeWidth={1} />
          <p className="text-sm">Select a file from the sidebar</p>
        </div>
      </div>
    );
  }

  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <p className="text-sm">Loading {filePath.split('/').pop()}...</p>
        </div>
      </div>
    );
  }

  
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-red-400 max-w-sm text-center">
          <AlertCircle size={32} />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  
  if (!fileData) return null;

  const lineCount = fileData.content.split('\n').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* File toolbar */}
      <div className="flex items-center justify-between px-4 py-2
                      border-b border-gray-800 bg-gray-900 ">
        <div className="flex items-center gap-2 text-sm">flex-shrink-0
          <FileText size={14} className="text-gray-400" />
          {/* Show only last 2 path segments to save space */}
          <span className="text-gray-300 font-mono">
            {filePath.split('/').slice(-2).join('/')}
          </span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">{lineCount} lines</span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">{fileData.language}</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400
                     hover:text-white transition-colors px-2 py-1 rounded
                     hover:bg-gray-700"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code area */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={fileData.language}
          style={vscDarkPlus}
          showLineNumbers
          lineNumberStyle={{
            color: '#4b5563',     
            fontSize: '12px',
            paddingRight: '1rem',
            userSelect: 'none',   
            minWidth: '3em',
          }}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: '#111827', 
            fontSize: '13px',
            lineHeight: '1.6',
            height: '100%',
            borderRadius: 0,
          }}
          wrapLongLines={false}
        >
          {fileData.content}
        </SyntaxHighlighter>
      </div>

    </div>
  );
}
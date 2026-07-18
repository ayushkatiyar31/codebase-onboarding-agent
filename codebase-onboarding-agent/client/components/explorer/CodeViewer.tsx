'use client';
import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, FileText, AlertCircle } from 'lucide-react';
import { CodeViewerSkeleton } from '@/components/ui/Skeleton';

interface CodeViewerProps {
    owner: string;
    repoName: string;
    filePath: string | null;
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
    }, [filePath, owner, repoName]);

    const handleCopy = async () => {
        if (!fileData) return;
        await navigator.clipboard.writeText(fileData.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!filePath) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 24, borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border-default)', background: 'rgba(255,255,255,0.03)' }}>
                    <FileText size={40} strokeWidth={1} />
                    <p style={{ fontSize: 13 }}>Select a file from the sidebar</p>
                </div>
            </div>
        );
    }
    if (loading) return <CodeViewerSkeleton />;
    if (error) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--red)', maxWidth: 320, textAlign: 'center' }}>
                    <AlertCircle size={32} />
                    <p style={{ fontSize: 13 }}>{error}</p>
                </div>
            </div>
        );
    }
    if (!fileData) return null;

    const lineCount = fileData.content.split('\n').length;
    const displayPath = filePath.split('/').slice(-2).join('/');

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent)' }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <FileText size={13} style={{ color: 'var(--accent-light)' }} />
                        <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{displayPath}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{lineCount} lines</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>•</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{fileData.language}</span>
                </div>

                <button onClick={handleCopy} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    border: '1px solid var(--border-default)', borderRadius: 999,
                    padding: '7px 10px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 11, transition: 'all 0.15s ease'
                }}>
                    {copied ? <Check size={12} style={{ color: 'var(--green)' }} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
                <SyntaxHighlighter
                    language={fileData.language}
                    style={vscDarkPlus}
                    showLineNumbers
                    lineNumberStyle={{ color: '#4b5563', fontSize: '12px', paddingRight: '1rem', userSelect: 'none', minWidth: '3em' }}
                    customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: 'linear-gradient(180deg, rgba(17,24,39,0.9), rgba(10,14,26,0.98))',
                        fontSize: '13px',
                        lineHeight: '1.65',
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


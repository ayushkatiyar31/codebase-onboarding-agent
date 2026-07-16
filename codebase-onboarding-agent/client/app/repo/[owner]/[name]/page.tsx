'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FileTree from '@/components/explorer/FileTree';
import RepoHeader from '@/components/explorer/RepoHeader';
import CodeViewer from '@/components/explorer/CodeViewer';
import ArchitecturePanel from '@/components/explorer/ArchitecturePanel';
import ChatPanel from '@/components/chat/ChatPanel';
import DependencyGraph from '@/components/explorer/DependencyGraph';
import WalkthroughStepper from '@/components/guide/WalkthroughStepper';
import GuideRenderer from '@/components/guide/GuideRenderer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FileTreeSkeleton, RepoHeaderSkeleton, ArchitectureSkeleton } from '@/components/ui/Skeleton';
import { IFileNode } from '@/types';
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
const TABS = [
    { id: 'architecture', label: 'Architecture', icon: '⚡' },
    { id: 'walkthrough', label: 'Walkthrough', icon: '🧭' },
    { id: 'graph', label: 'Dep Graph', icon: '🕸️' },
    { id: 'chat', label: 'Ask', icon: '💬' },
    { id: 'guide', label: 'Guide', icon: '📋' },
    { id: 'files', label: 'Files', icon: '📄' },
] as const;
type TabId = typeof TABS[number]['id'];
export default function RepoPage() {
    const params = useParams() as {
        owner: string;
        name: string;
    };
    const [repo, setRepo] = useState<RepoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('architecture');
    useEffect(() => {
        const fetchRepo = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/repo/${params.owner}/${params.name}`);
                const data = await res.json() as {
                    repo?: RepoData;
                    error?: string;
                };
                if (!res.ok)
                    throw new Error(data.error ?? 'Failed to fetch repo');
                setRepo(data.repo ?? null);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong');
            }
            finally {
                setLoading(false);
            }
        };
        fetchRepo();
    }, [params.owner, params.name]);
    const handleFileSelect = (path: string) => {
        setSelectedFile(path);
        setActiveTab('files');
    };
    const handleAskAboutFile = (path: string) => {
        setSelectedFile(path);
        setActiveTab('chat');
    };
    if (loading) {
        return (<div style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
        <RepoHeaderSkeleton />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <aside style={{ width: 260, borderRight: '1px solid var(--border-subtle)' }}>
            <FileTreeSkeleton />
          </aside>
          <main style={{ flex: 1 }}><ArchitectureSkeleton /></main>
        </div>
      </div>);
    }
    if (error || !repo) {
        return (<div style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--red)' }}>{error || 'Repository not found'}</p>
      </div>);
    }
    return (<div style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)' }}>
      <RepoHeader repo={repo}/>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        
        <aside style={{
            width: 260, flexShrink: 0,
            borderRight: '1px solid var(--border-subtle)',
            overflowY: 'auto',
            background: 'var(--bg-surface)',
        }}>
          <ErrorBoundary>
            <FileTree fileTree={repo.fileTree} selectedFile={selectedFile} onFileSelect={path => { setSelectedFile(path); setActiveTab('files'); }} onAskAboutFile={handleAskAboutFile}/>
          </ErrorBoundary>
        </aside>

        
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)', minHeight: 0 }}>

          
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2,
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            overflowX: 'auto', flexShrink: 0,
        }}>
            {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: isActive ? '1px solid var(--border-default)' : '1px solid transparent',
                    background: isActive ? 'var(--bg-elevated)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                }} onMouseEnter={e => {
                    if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                }} onMouseLeave={e => {
                    if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)';
                }}>
                  <span style={{ fontSize: 11 }}>{tab.icon}</span>
                  {tab.label}
                </button>);
        })}
          </div>

          
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <ErrorBoundary>
              {activeTab === 'architecture' && <ArchitecturePanel owner={repo.owner} repoName={repo.name}/>}
              {activeTab === 'walkthrough' && <WalkthroughStepper owner={repo.owner} repoName={repo.name} onFileSelect={handleFileSelect}/>}
              {activeTab === 'graph' && <DependencyGraph owner={repo.owner} repoName={repo.name} onFileSelect={handleFileSelect}/>}
              <div style={{ display: activeTab === 'chat' ? 'block' : 'none', height: '100%' }}>
                <ChatPanel owner={repo.owner} repoName={repo.name} repoId={repo._id} onFileSelect={handleFileSelect} selectedFile={selectedFile}/>
              </div>
              {activeTab === 'guide' && <GuideRenderer owner={repo.owner} repoName={repo.name}/>}
              {activeTab === 'files' && <CodeViewer owner={repo.owner} repoName={repo.name} filePath={selectedFile}/>}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>);
}

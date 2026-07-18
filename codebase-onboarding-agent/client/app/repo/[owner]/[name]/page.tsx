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
return (<div style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: 'radial-gradient(circle at top left, rgba(99, 102, 241, 0.16), transparent 24%), var(--bg-base)', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-md)' }}>
      <RepoHeader repo={repo}/>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        
        <aside style={{
            width: 270, flexShrink: 0,
            borderRight: '1px solid var(--border-subtle)',
            overflowY: 'auto',
            background: 'linear-gradient(180deg, rgba(17, 17, 24, 0.96) 0%, rgba(10, 10, 15, 0.98) 100%)',
            backdropFilter: 'blur(10px)',
        }}>
          <ErrorBoundary>
            <FileTree fileTree={repo.fileTree} selectedFile={selectedFile} onFileSelect={path => { setSelectedFile(path); setActiveTab('files'); }} onAskAboutFile={handleAskAboutFile}/>
          </ErrorBoundary>
        </aside>

        
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent)', minHeight: 0 }}>

          
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(255,255,255,0.025)',
            overflowX: 'auto', flexShrink: 0,
            backdropFilter: 'blur(8px)',
        }}>
            {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 12px',
                    borderRadius: 999,
                    border: isActive ? '1px solid rgba(129, 140, 248, 0.3)' : '1px solid transparent',
                    background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(129, 140, 248, 0.1))' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontSize: 12, fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 0 0 1px rgba(99,102,241,0.16), 0 10px 24px rgba(15, 23, 42, 0.16)' : 'none',
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

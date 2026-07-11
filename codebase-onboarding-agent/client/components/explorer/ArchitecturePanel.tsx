'use client';
import { useEffect } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { RefreshCw, AlertCircle, Layers, GitBranch, FolderOpen, AlertTriangle, Terminal, BookOpen } from 'lucide-react';
import { ArchitectureAnalysis } from '@/types/analysis';
import { ArchitectureSkeleton } from '@/components/ui/Skeleton';
interface Props {
    owner: string;
    repoName: string;
}
const CATEGORY_STYLES: Record<string, {
    bg: string;
    color: string;
    dot: string;
}> = {
    frontend: { bg: 'rgba(99,102,241,0.1)', color: '#a5b4fc', dot: '#6366f1' },
    backend: { bg: 'rgba(16,185,129,0.1)', color: '#6ee7b7', dot: '#10b981' },
    database: { bg: 'rgba(245,158,11,0.1)', color: '#fcd34d', dot: '#f59e0b' },
    devtools: { bg: 'rgba(167,139,250,0.1)', color: '#c4b5fd', dot: '#a78bfa' },
    testing: { bg: 'rgba(251,146,60,0.1)', color: '#fdba74', dot: '#fb923c' },
    other: { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)', dot: 'var(--text-tertiary)' },
};
export default function ArchitecturePanel({ owner, repoName }: Props) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    const { result, status, loading, error, retry } = useSSE<ArchitectureAnalysis>({
        url: `${apiBase}/api/analysis/${owner}/${repoName}/stream`,
        enabled: true,
        onComplete: async (analysis) => {
            try {
                await fetch(`${apiBase}/api/analysis/${owner}/${repoName}/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ analysis }),
                });
            }
            catch { }
        },
    });
    if (loading && !result)
        return <ArchitectureSkeleton />;
    if (error) {
        return (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <AlertCircle size={28} color="var(--red)"/>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{error}</p>
        <button onClick={retry} style={ghostBtn}>
          <RefreshCw size={13}/> Retry
        </button>
      </div>);
    }
    if (!result)
        return null;
    return (<div className="fade-up" style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={15} color="var(--accent-light)"/>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Architecture Analysis</span>
        </div>
        <button onClick={async () => {
            await fetch(`${apiBase}/api/analysis/${owner}/${repoName}/cache`, { method: 'DELETE' });
            retry();
        }} style={ghostBtn}>
          <RefreshCw size={11}/> Refresh
        </button>
      </div>

      
      <Card>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{result.summary}</p>
      </Card>

      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {result.architecturePattern && (<Card label="Pattern">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px',
                background: 'var(--accent-dim)', color: 'var(--accent-light)',
                borderRadius: 99, fontSize: 11, fontWeight: 600,
                border: '1px solid rgba(99,102,241,0.2)', width: 'fit-content',
            }}>
                {result.architecturePattern.name}
              </span>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                {result.architecturePattern.description}
              </p>
            </div>
          </Card>)}

        {result.techStack?.length > 0 && (<Card label="Stack">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {result.techStack.map((tech, i) => {
                const s = CATEGORY_STYLES[tech.category] ?? CATEGORY_STYLES.other;
                return (<div key={i} title={tech.role} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 9px',
                        background: s.bg, color: s.color,
                        borderRadius: 99, fontSize: 11, fontWeight: 500,
                        cursor: 'default',
                    }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }}/>
                    {tech.name}
                  </div>);
            })}
            </div>
          </Card>)}
      </div>

      
      {result.dataFlow && (<Card label="Data Flow">
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{result.dataFlow}</p>
        </Card>)}

      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {result.entryPoints?.length > 0 && (<Card label="Entry Points" icon={<GitBranch size={12}/>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {result.entryPoints.map((ep, i) => (<div key={i}>
                  <code style={{ fontSize: 11, color: 'var(--accent-light)', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 2 }}>
                    {ep.path}
                  </code>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{ep.description}</p>
                </div>))}
            </div>
          </Card>)}

        {result.keyDirectories?.length > 0 && (<Card label="Key Directories" icon={<FolderOpen size={12}/>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {result.keyDirectories.map((dir, i) => (<div key={i}>
                  <code style={{ fontSize: 11, color: '#a78bfa', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 2 }}>
                    {dir.path}/
                  </code>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{dir.purpose}</p>
                </div>))}
            </div>
          </Card>)}
      </div>

      
      {result.firstFilesToRead?.length > 0 && (<Card label="Start Reading Here" icon={<BookOpen size={12}/>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.firstFilesToRead.map((file, i) => (<div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)',
                    fontFamily: 'JetBrains Mono, monospace',
                    width: 18, flexShrink: 0, paddingTop: 1,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <code style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{file.path}</code>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.5 }}>{file.reason}</p>
                </div>
              </div>))}
          </div>
        </Card>)}

      
      {result.gotchas?.length > 0 && (<Card label="Watch Out For" icon={<AlertTriangle size={12} color="var(--yellow)"/>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.gotchas.map((g, i) => (<div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--yellow)', fontSize: 12, flexShrink: 0, marginTop: 1 }}>⚠</span>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{g}</p>
              </div>))}
          </div>
        </Card>)}

      
      {result.setupSteps?.length > 0 && (<Card label="Local Setup" icon={<Terminal size={12}/>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {result.setupSteps.map((step, i) => (<div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                    fontSize: 10, color: 'var(--text-tertiary)',
                    fontFamily: 'JetBrains Mono, monospace',
                    width: 18, flexShrink: 0, paddingTop: 1,
                }}>
                  {i + 1}.
                </span>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step}</p>
              </div>))}
          </div>
        </Card>)}

    </div>);
}
function Card({ label, icon, children }: {
    label?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (<div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
        }}>
      {label && (<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {icon && <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>}
          <span style={{
                fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
            {label}
          </span>
        </div>)}
      {children}
    </div>);
}
const ghostBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px',
    background: 'transparent',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-tertiary)',
    fontSize: 11, cursor: 'pointer',
    transition: 'all 0.15s ease',
};

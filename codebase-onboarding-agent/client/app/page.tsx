'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch as Github, ArrowRight, Loader2, Zap, MessageSquare, GitBranch, BookOpen, FileText, Layers, ChevronRight, Sparkles, } from 'lucide-react';
const DEMO_REPOS = [
    { label: 'expressjs/express', description: 'Minimal Node.js web framework', url: 'https://github.com/expressjs/express' },
    { label: 'axios/axios', description: 'Promise-based HTTP client', url: 'https://github.com/axios/axios' },
    { label: 'vitejs/vite', description: 'Next-gen frontend tooling', url: 'https://github.com/vitejs/vite' },
];
const FEATURES = [
    { icon: <Layers size={16}/>, color: '#6366f1', label: 'Architecture', desc: 'Stack, patterns, entry points, gotchas — streamed live' },
    { icon: <MessageSquare size={16}/>, color: '#10b981', label: 'Ask Codebase', desc: 'RAG-powered Q&A with real source citations' },
    { icon: <GitBranch size={16}/>, color: '#f59e0b', label: 'Dep Graph', desc: 'Interactive file dependency visualisation' },
    { icon: <BookOpen size={16}/>, color: '#a78bfa', label: 'Walkthrough', desc: 'AI-curated reading order, file by file' },
    { icon: <FileText size={16}/>, color: '#34d399', label: 'Export Guide', desc: 'PDF download or shareable link, no account needed' },
    { icon: <Zap size={16}/>, color: '#fb923c', label: 'Instant Revisit', desc: 'Everything cached — second visit loads in <1s' },
];
export default function HomePage() {
    const router = useRouter();
    const [repoUrl, setRepoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const mounted = true;
    const handleSubmit = async (url?: string) => {
        const target = url ?? repoUrl;
        if (!target.trim() || loading)
            return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/repo/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl: target }),
            });
            const data = await res.json() as {
                repo?: {
                    owner: string;
                    name: string;
                };
                error?: string;
            };
            if (!res.ok)
                throw new Error(data.error ?? 'Something went wrong');
            if (data.repo)
                router.push(`/repo/${data.repo.owner}/${data.repo.name}`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load repository');
            setLoading(false);
        }
    };
    return (<main style={{ background: 'var(--bg-base)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      
      <div style={{
            position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%)',
        }}/>

      
      <nav style={{
            position: 'sticky', top: 0, zIndex: 50,
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(12px)',
            padding: '0 2rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: '52px',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent-dim)', border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Sparkles size={14} color="var(--accent-light)"/>
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>
            Codebase Agent
          </span>
        </div>
        <div style={{
            fontSize: 12, color: 'var(--text-tertiary)',
            fontFamily: 'JetBrains Mono, monospace',
        }}>
          Groq · Atlas Vector Search · RAG
        </div>
      </nav>

      
      <section style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: 'calc(100vh - 52px)',
            padding: '5rem 1.5rem',
            gap: '3rem',
        }}>
        
        <div className={mounted ? 'fade-up' : ''} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px',
            borderRadius: 99,
            border: '1px solid rgba(99,102,241,0.25)',
            background: 'rgba(99,102,241,0.08)',
            fontSize: 11, fontWeight: 500,
            color: 'var(--text-accent)',
            letterSpacing: '0.02em',
            animationDelay: '0ms',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)', display: 'inline-block',
        }}/>
          LIVE · AI-POWERED CODE UNDERSTANDING
        </div>

        
        <div className={mounted ? 'fade-up' : ''} style={{
            textAlign: 'center', maxWidth: 680,
            animationDelay: '60ms',
        }}>
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            marginBottom: '1.25rem',
        }}>
            Understand any codebase{' '}
            <span style={{
            background: 'linear-gradient(135deg, var(--accent-light), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        }}>
              in minutes
            </span>
          </h1>
          <p style={{
            fontSize: 17, lineHeight: 1.65,
            color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto',
        }}>
            Paste a GitHub URL. Get an interactive architecture analysis,
            semantic code search, dependency graph, and exportable onboarding guide.
          </p>
        </div>

        
        <div className={mounted ? 'fade-up' : ''} style={{ width: '100%', maxWidth: 560, animationDelay: '120ms' }}>
          <div style={{
            display: 'flex', gap: 8,
            padding: 5,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-glow)',
        }}>
            <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            gap: 10, paddingLeft: 14,
        }}>
              <Github size={15} color="var(--text-tertiary)" style={{ flexShrink: 0 }}/>
              <input type="text" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="https://github.com/owner/repo" disabled={loading} style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: 14,
            fontFamily: 'JetBrains Mono, monospace',
        }}/>
            </div>
            <button onClick={() => handleSubmit()} disabled={loading || !repoUrl.trim()} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px',
            background: loading || !repoUrl.trim()
                ? 'var(--bg-hover)'
                : 'var(--accent)',
            border: 'none', borderRadius: 'var(--radius-lg)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: loading || !repoUrl.trim() ? 'not-allowed' : 'pointer',
            opacity: !repoUrl.trim() ? 0.5 : 1,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
        }}>
              {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }}/> : <ArrowRight size={15}/>}
              {loading ? 'Loading...' : 'Explore repo'}
            </button>
          </div>

          {error && (<p style={{
                marginTop: 10, fontSize: 12, color: 'var(--red)',
                padding: '8px 14px',
                background: 'var(--red-dim)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239,68,68,0.2)',
            }}>
              {error}
            </p>)}
        </div>

        
        <div className={mounted ? 'fade-up' : ''} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 12, animationDelay: '180ms',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
            Try a live demo
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {DEMO_REPOS.map(repo => (<button key={repo.label} onClick={() => handleSubmit(repo.url)} disabled={loading} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-secondary)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
            }} onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
            }} onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
            }}>
                <Github size={13}/>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'inherit' }}>
                    {repo.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
                    {repo.description}
                  </div>
                </div>
                <ChevronRight size={12} style={{ marginLeft: 4, color: 'var(--text-tertiary)' }}/>
              </button>))}
          </div>
        </div>

        
        <div className={mounted ? 'fade-up' : ''} style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
            maxWidth: 640, animationDelay: '240ms',
        }}>
          {FEATURES.map((f, i) => (<div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 99,
                fontSize: 12, color: 'var(--text-secondary)',
            }}>
              <span style={{ color: f.color }}>{f.icon}</span>
              <span style={{ fontWeight: 500 }}>{f.label}</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>— {f.desc}</span>
            </div>))}
        </div>
      </section>
    </main>);
}

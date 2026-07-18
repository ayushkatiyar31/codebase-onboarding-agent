import { Star, GitBranch, ExternalLink } from 'lucide-react';
interface RepoHeaderProps {
    repo: {
        owner: string;
        name: string;
        fullName: string;
        description: string;
        language: string;
        stars: number;
        defaultBranch: string;
    };
}
const LANGUAGE_COLORS: Record<string, string> = {
    TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3776ab',
    Go: '#00add8', Rust: '#ce4a2e', Java: '#b07219', Ruby: '#701516',
};
export default function RepoHeader({ repo }: RepoHeaderProps) {
    const langColor = LANGUAGE_COLORS[repo.language] ?? '#6366f1';
    return (<header style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: '10px 16px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(15, 23, 42, 0.95) 45%, rgba(9, 12, 21, 1) 100%)',
            boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.03)',
            flexShrink: 0,
        }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: langColor, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 0 3px ${langColor}22` }} />
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Repository</span>
          </div>
          <a href={`https://github.com/${repo.fullName}`} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 14, fontWeight: 700,
              color: 'var(--text-primary)', textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '-0.01em',
              transition: 'color 0.15s',
          }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-light)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}>
            {repo.fullName}
            <ExternalLink size={11} style={{ opacity: 0.65 }} />
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {repo.language && (<span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: langColor, display: 'inline-block', flexShrink: 0 }} />
            {repo.language}
          </span>)}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Star size={11} />
          {repo.stars.toLocaleString()}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'JetBrains Mono, monospace' }}>
          <GitBranch size={11} />
          {repo.defaultBranch}
        </span>
      </div>
    </header>);
}

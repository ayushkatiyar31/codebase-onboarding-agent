import { Star, GitBranch, Code2, ExternalLink } from 'lucide-react';
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
            display: 'flex', alignItems: 'center', gap: 20,
            padding: '0 20px', height: 52,
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            flexShrink: 0, flexWrap: 'wrap',
        }}>
      <a href={`https://github.com/${repo.fullName}`} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 13, fontWeight: 600,
            color: 'var(--text-primary)', textDecoration: 'none',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '-0.01em',
            transition: 'color 0.15s',
        }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-light)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}>
        {repo.fullName}
        <ExternalLink size={11} style={{ opacity: 0.4 }}/>
      </a>

      
      <div style={{ width: 1, height: 16, background: 'var(--border-default)' }}/>

      
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {repo.language && (<span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: langColor, display: 'inline-block', flexShrink: 0 }}/>
            {repo.language}
          </span>)}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
          <Star size={12}/>
          {repo.stars.toLocaleString()}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
          <GitBranch size={12}/>
          {repo.defaultBranch}
        </span>
      </div>

      
      {repo.description && (<p style={{
                fontSize: 12, color: 'var(--text-tertiary)',
                marginLeft: 'auto', maxWidth: 320,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
          {repo.description}
        </p>)}
    </header>);
}

'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Loader2, FileText, Sparkles } from 'lucide-react';
import { ChatMessage, ChatSource, EmbeddingStatus } from '@/types/chat';
interface Props {
    owner: string;
    repoName: string;
    repoId: string;
    onFileSelect?: (path: string) => void;
    selectedFile?: string | null;
}
const STARTERS = [
    'How does authentication work?',
    'What happens when a request comes in?',
    'Where is the database connection set up?',
    'What does the main entry point do?',
];
interface PersistedChatMessage extends Omit<ChatMessage, 'timestamp'> {
    timestamp: string;
}
function loadPersistedMessages(storageKey: string): ChatMessage[] {
    if (typeof window === 'undefined')
        return [];
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw) as PersistedChatMessage[];
        return parsed.map(message => ({ ...message, timestamp: new Date(message.timestamp) }));
    }
    catch {
        return [];
    }
}
function savePersistedMessages(storageKey: string, messages: ChatMessage[]) {
    if (typeof window === 'undefined')
        return;
    try {
        if (messages.length === 0) {
            window.localStorage.removeItem(storageKey);
            return;
        }
        const payload = messages.map(message => ({
            ...message,
            timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : new Date(message.timestamp).toISOString(),
        }));
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
    }
    catch {
    }
}
export default function ChatPanel({ owner, repoName, repoId, onFileSelect, selectedFile }: Props) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    const storageKey = `rag-chat-history:${owner}/${repoName}`;
    const [messages, setMessages] = useState<ChatMessage[]>(() => loadPersistedMessages(storageKey));
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingStatus | null>(null);
    const [isEmbedding, setIsEmbedding] = useState(false);
    const [embedProgress, setEmbedProgress] = useState(0);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const historyEntries = useMemo(() => messages.filter(message => message.role === 'user' && message.content.trim()).slice().reverse(), [messages]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => {
        setMessages(loadPersistedMessages(storageKey));
        setInput('');
        setHighlightedMessageId(null);
    }, [storageKey]);
    useEffect(() => {
        savePersistedMessages(storageKey, messages);
    }, [messages, storageKey]);
    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch(`${apiBase}/api/chat/${owner}/${repoName}/status`);
                const data = await res.json() as EmbeddingStatus;
                setEmbeddingStatus(data);
                if (!data.isReady && data.totalChunks > 0 && data.embeddedChunks === 0)
                    startEmbedding();
            }
            catch { }
        };
        check();
    }, [owner, repoName]);
    const startEmbedding = useCallback(() => {
        setIsEmbedding(true);
        setEmbedProgress(0);
        const es = new EventSource(`${apiBase}/api/chat/${owner}/${repoName}/embed/stream`);
        es.onmessage = (e: MessageEvent<string>) => {
            if (e.data === '[DONE]') {
                es.close();
                setIsEmbedding(false);
                fetch(`${apiBase}/api/chat/${owner}/${repoName}/status`)
                    .then(r => r.json()).then((d: EmbeddingStatus) => setEmbeddingStatus(d)).catch(() => null);
                return;
            }
            try {
                const p = JSON.parse(e.data) as {
                    type: string;
                    completed?: number;
                    total?: number;
                };
                if (p.type === 'progress' && p.total && p.completed !== undefined)
                    setEmbedProgress(Math.round((p.completed / p.total) * 100));
                if (p.type === 'complete')
                    setEmbedProgress(100);
            }
            catch { }
        };
        es.onerror = () => { es.close(); setIsEmbedding(false); };
    }, [apiBase, owner, repoName]);
    const jumpToMessage = useCallback((messageId: string) => {
        const target = messages.find(message => message.id === messageId);
        if (!target)
            return;
        const targetRef = messageRefs.current[messageId];
        targetRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMessageId(messageId);
        setInput(target.content);
        inputRef.current?.focus();
        window.setTimeout(() => setHighlightedMessageId(null), 1800);
    }, [messages]);
    const sendMessage = useCallback(async () => {
        const question = input.trim();
        if (!question || isStreaming)
            return;
        setInput('');
        setIsStreaming(true);
        const userId = Date.now().toString();
        const asstId = (Date.now() + 1).toString();
        const history = messages.map(m => ({ role: m.role, content: m.content }));
        setMessages(prev => [
            ...prev,
            { id: userId, role: 'user', content: question, timestamp: new Date() },
            { id: asstId, role: 'assistant', content: '', isStreaming: true, timestamp: new Date() },
        ]);
        try {
            const focusFile = selectedFile?.trim() || undefined;
            const response = await fetch(`${apiBase}/api/chat/${owner}/${repoName}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    conversationHistory: history,
                    ...(focusFile ? { focusFile } : {}),
                }),
            });
            if (!response.ok || !response.body)
                throw new Error('Stream failed');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentSources: ChatSource[] = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data: '))
                        continue;
                    const payload = trimmed.slice(6);
                    if (payload === '[DONE]') {
                        setIsStreaming(false);
                        break;
                    }
                    try {
                        const ev = JSON.parse(payload) as {
                            type: string;
                            content?: string;
                            sources?: ChatSource[];
                            answer?: string;
                            message?: string;
                        };
                        if (ev.type === 'sources') {
                            currentSources = ev.sources ?? [];
                            setMessages(p => p.map(m => m.id === asstId ? { ...m, sources: currentSources } : m));
                        }
                        if (ev.type === 'token')
                            setMessages(p => p.map(m => m.id === asstId ? { ...m, content: m.content + (ev.content ?? '') } : m));
                        if (ev.type === 'complete') {
                            setMessages(p => p.map(m => m.id === asstId ? { ...m, content: ev.answer ?? m.content, sources: ev.sources ?? currentSources, isStreaming: false } : m));
                            setIsStreaming(false);
                        }
                        if (ev.type === 'error') {
                            setMessages(p => p.map(m => m.id === asstId ? { ...m, content: `Error: ${ev.message}`, isStreaming: false } : m));
                            setIsStreaming(false);
                        }
                    }
                    catch { }
                }
            }
        }
        catch (err) {
            setMessages(p => p.map(m => m.id === asstId ? { ...m, content: `Error: ${err instanceof Error ? err.message : 'Failed'}`, isStreaming: false } : m));
            setIsStreaming(false);
        }
        inputRef.current?.focus();
    }, [input, isStreaming, messages, apiBase, owner, repoName, selectedFile]);
    if (isEmbedding || (embeddingStatus && !embeddingStatus.isReady && embeddingStatus.totalChunks > 0)) {
        return (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 32 }}>
        <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'var(--accent-dim)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
          <Sparkles size={20} color="var(--accent-light)"/>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Indexing codebase</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 20 }}>
            Generating vector embeddings for {embeddingStatus?.totalChunks ?? '...'} code chunks
          </p>
          <div style={{ width: 240, height: 3, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden', margin: '0 auto' }}>
            <div style={{ height: '100%', width: `${embedProgress}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width 0.5s ease' }}/>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>{embedProgress}% — runs once, cached forever</p>
        </div>
      </div>);
    }
    return (<div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
            <div style={{
                width: 44, height: 44, borderRadius: 13,
                background: 'var(--accent-dim)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} color="var(--accent-light)"/>
            </div>
            <div style={{ textAlign: 'center', maxWidth: 340 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Ask anything about this codebase</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Answers grounded in the actual source code, with file citations
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%', maxWidth: 380 }}>
              {STARTERS.map(q => (<button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }} style={{
                    textAlign: 'left', padding: '9px 14px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)', fontSize: 12,
                    color: 'var(--text-secondary)', cursor: 'pointer',
                    transition: 'all 0.15s',
                }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}>
                  {q}
                </button>))}
            </div>
          </div>)}

        {historyEntries.length > 0 && (<div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>History</span>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{historyEntries.length}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {historyEntries.map(entry => (<button key={entry.id} onClick={() => jumpToMessage(entry.id)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 10px', borderRadius: 999,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer',
                    transition: 'all 0.15s',
                }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}>
                <span style={{ fontSize: 10, color: 'var(--accent-light)' }}>↩</span>
                <span>{entry.content.length > 56 ? `${entry.content.slice(0, 56)}…` : entry.content}</span>
              </button>))}
            </div>
          </div>)}

        {messages.map(msg => <div key={msg.id} ref={el => { messageRefs.current[msg.id] = el; }}><MessageBubble message={msg} onFileClick={onFileSelect} isHighlighted={highlightedMessageId === msg.id}/></div>)}
        <div ref={messagesEndRef}/>
      </div>

      
      <div style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '12px 16px',
            background: 'var(--bg-surface)',
            position: 'sticky',
            bottom: 0,
            zIndex: 4,
            flexShrink: 0,
        }}>
        <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 12px',
            transition: 'border-color 0.15s',
        }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter')
        sendMessage(); }} placeholder="Ask about this codebase..." disabled={isStreaming} rows={1} style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: 13, resize: 'none',
            fontFamily: 'Inter, sans-serif', maxHeight: 100, overflowY: 'auto',
        }} onInput={e => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
        }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
              ⌘↵
            </span>
            <button onClick={sendMessage} disabled={isStreaming || !input.trim()} style={{
            width: 32, height: 32, borderRadius: 8,
            background: isStreaming || !input.trim() ? 'var(--bg-hover)' : 'var(--accent)',
            border: 'none', cursor: isStreaming || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: !input.trim() ? 0.4 : 1,
            transition: 'all 0.15s',
        }}>
              {isStreaming
            ? <Loader2 size={14} color="#fff" style={{ animation: 'spin 1s linear infinite' }}/>
            : <Send size={14} color="#fff"/>}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6, textAlign: 'center' }}>
          {embeddingStatus?.embeddedChunks ?? '...'} chunks indexed · answers cite real source files
        </p>
      </div>
    </div>);
}
function MessageBubble({ message, onFileClick, isHighlighted = false }: {
    message: ChatMessage;
    onFileClick?: (p: string) => void;
    isHighlighted?: boolean;
}) {
    const isUser = message.role === 'user';
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: isUser ? 'flex-end' : 'flex-start' }}>

      
      {!isUser && message.sources && message.sources.length > 0 && (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: '85%' }}>
          {message.sources.map((src, i) => (<button key={i} onClick={() => onFileClick?.(src.filePath)} title={`${src.filePath}:${src.startLine}-${src.endLine}`} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 9px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 99, cursor: 'pointer',
                    fontSize: 10, color: 'var(--accent-light)',
                    fontFamily: 'JetBrains Mono, monospace',
                    transition: 'all 0.15s',
                }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'}>
              <FileText size={9}/>
              {src.filePath.split('/').pop()}:{src.startLine}
            </button>))}
        </div>)}

      
      <div style={{
            maxWidth: '85%',
            padding: '10px 14px',
            borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: isUser ? 'var(--accent)' : 'var(--bg-elevated)',
            border: isUser ? 'none' : '1px solid var(--border-subtle)',
            fontSize: 13, lineHeight: 1.65,
            color: isUser ? '#fff' : 'var(--text-primary)',
            boxShadow: isHighlighted ? '0 0 0 2px rgba(99,102,241,0.35)' : undefined,
        }}>
        {message.content ? (<SimpleMarkdown content={message.content}/>) : message.isStreaming ? (<span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
            {[0, 150, 300].map(delay => (<span key={delay} className="glow-pulse" style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--accent-light)', display: 'inline-block',
                    animationDelay: `${delay}ms`,
                }}/>))}
          </span>) : null}
      </div>
    </div>);
    
}
function SimpleMarkdown({ content }: {
    content: string;
}) {
    const segments = content.split(/(```[\s\S]*?```)/g);
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {segments.map((seg, i) => {
            if (seg.startsWith('```')) {
                const lines = seg.slice(3, -3).split('\n');
                const lang = lines[0].trim();
                const code = lines.slice(1).join('\n');
                return (<pre key={i} style={{
                        background: 'var(--bg-base)', borderRadius: 8,
                        padding: '10px 12px', overflowX: 'auto',
                        fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                        border: '1px solid var(--border-subtle)',
                    }}>
              {lang && <div style={{ color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 6 }}>{lang}</div>}
              <code style={{ color: '#a5b4fc' }}>{code}</code>
            </pre>);
            }
            return (<p key={i} style={{ whiteSpace: 'pre-wrap' }}>
            {seg.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, j) => {
                    if (part.startsWith('`') && part.endsWith('`'))
                        return <code key={j} style={{ background: 'var(--bg-base)', color: 'var(--accent-light)', padding: '1px 5px', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{part.slice(1, -1)}</code>;
                    if (part.startsWith('**') && part.endsWith('**'))
                        return <strong key={j} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
                    return part;
                })}
          </p>);
        })}
    </div>);
}

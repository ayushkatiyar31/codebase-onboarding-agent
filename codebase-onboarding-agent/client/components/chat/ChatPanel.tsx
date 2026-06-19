'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { ChatMessage, ChatSource, EmbeddingStatus } from '@/types/chat';

interface ChatPanelProps {
  owner: string;
  repoName: string;
  repoId: string;
  onFileSelect?: (path: string) => void;
}

export default function ChatPanel({ owner, repoName, repoId, onFileSelect }: ChatPanelProps) {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingStatus | null>(null);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embedProgress, setEmbedProgress] = useState(0);
  const [statusError, setStatusError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startEmbedding = useCallback(() => {
    if (eventSourceRef.current) return;

    setIsEmbedding(true);
    setEmbedProgress(0);
    setStatusError('');

    const es = new EventSource(`${apiBase}/api/chat/${owner}/${repoName}/embed/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      if (event.data === '[DONE]') {
        es.close();
        eventSourceRef.current = null;
        setIsEmbedding(false);

        fetch(`${apiBase}/api/chat/${owner}/${repoName}/status`)
          .then(r => r.json())
          .then((data: EmbeddingStatus) => setEmbeddingStatus(data))
          .catch(() => null);
        return;
      }

      try {
        const parsed = JSON.parse(event.data) as {
          type: string;
          completed?: number;
          total?: number;
          message?: string;
        };

        if (parsed.type === 'status' && parsed.total) {
          setEmbeddingStatus(prev => ({
            totalChunks: parsed.total ?? prev?.totalChunks ?? 0,
            embeddedChunks: parsed.completed ?? prev?.embeddedChunks ?? 0,
            pendingChunks: Math.max(
              (parsed.total ?? 0) - (parsed.completed ?? 0),
              0
            ),
            isReady: false,
            percentComplete: parsed.total
              ? Math.round(((parsed.completed ?? 0) / parsed.total) * 100)
              : 0,
          }));
        }

        if (parsed.type === 'progress' && parsed.total && parsed.completed !== undefined) {
          setEmbedProgress(Math.round((parsed.completed / parsed.total) * 100));
        }

        if (parsed.type === 'complete') {
          setEmbedProgress(100);
        }

        if (parsed.type === 'error') {
          setStatusError(parsed.message ?? 'Embedding generation failed');
          es.close();
          eventSourceRef.current = null;
          setIsEmbedding(false);
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setIsEmbedding(false);
      setStatusError('Embedding stream connection failed');
    };
  }, [apiBase, owner, repoName]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setStatusError('');
        const res = await fetch(`${apiBase}/api/chat/${owner}/${repoName}/status`);
        const data = await res.json() as EmbeddingStatus & { error?: string };

        if (!res.ok) {
          throw new Error(data.error || 'Failed to check embedding status');
        }

        setEmbeddingStatus(data);

        if (!data.isReady) {
          startEmbedding();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check embedding status';
        setStatusError(message);
        console.error('Failed to check embedding status:', err);
      }
    };

    checkStatus();

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [apiBase, owner, repoName, startEmbedding]);

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || isStreaming) return;

    setInput('');
    setIsStreaming(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);

    const history = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch(`${apiBase}/api/chat/${owner}/${repoName}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, conversationHistory: history }),
      });

      if (!response.ok || !response.body) {
        const contentType = response.headers.get('content-type') ?? '';

        if (contentType.includes('application/json')) {
          const data = await response.json() as { error?: string };
          throw new Error(data.error || `Request failed with HTTP ${response.status}`);
        }

        const text = await response.text();
        throw new Error(text || `Request failed with HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentSources: ChatSource[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            setIsStreaming(false);
            break;
          }

          try {
            const event = JSON.parse(payload) as {
              type: string;
              content?: string;
              sources?: ChatSource[];
              answer?: string;
              message?: string;
            };

            switch (event.type) {
              case 'sources':
                currentSources = event.sources ?? [];
                setMessages(prev => prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, sources: currentSources }
                    : m
                ));
                break;

              case 'token':
                setMessages(prev => prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: m.content + (event.content ?? '') }
                    : m
                ));
                break;

              case 'complete':
                setMessages(prev => prev.map(m =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: event.answer ?? m.content,
                        sources: event.sources ?? currentSources,
                        isStreaming: false,
                      }
                    : m
                ));
                setIsStreaming(false);
                break;

              case 'error':
                setMessages(prev => prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: `Error: ${event.message}`, isStreaming: false }
                    : m
                ));
                setIsStreaming(false);
                break;
            }
          } catch {}
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';

      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: `Error: ${message}`, isStreaming: false }
          : m
      ));

      setIsStreaming(false);
    }

    inputRef.current?.focus();
  }, [input, isStreaming, messages, apiBase, owner, repoName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      sendMessage();
    }
  };

  const isPreparing = !embeddingStatus || isEmbedding || !embeddingStatus.isReady;

  if (isPreparing || statusError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        {statusError ? (
          <AlertCircle size={32} className="text-red-400" />
        ) : (
          <Sparkles size={32} className="text-blue-400" />
        )}
        <div>
          <p className="text-white font-medium mb-1">
            {statusError ? 'Codebase Q&A setup failed' : 'Preparing codebase for Q&A'}
          </p>
          <p className="text-gray-400 text-sm mb-4">
            {statusError || (
              <>
                Generating semantic embeddings for {embeddingStatus?.totalChunks || '...'} code chunks.
                This runs once and takes 1-2 minutes.
              </>
            )}
          </p>

          {!statusError && (
            <>
              <div className="w-64 bg-gray-800 rounded-full h-1.5 mx-auto">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${embedProgress}%` }}
                />
              </div>

              <p className="text-gray-500 text-xs mt-2">{embedProgress}% complete</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <Sparkles size={32} className="text-blue-400" />
            <div>
              <p className="text-white font-medium mb-1">Ask anything about this codebase</p>
              <p className="text-gray-500 text-sm mb-4">
                Answers are grounded in the actual source code with file citations
              </p>

              <div className="flex flex-col gap-2 max-w-sm">
                {[
                  'How does authentication work?',
                  'What happens when a request comes in?',
                  'Where is the database connection set up?',
                  'What does the main entry point do?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="text-sm text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onFileClick={onFileSelect}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-800 p-3 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this codebase... (⌘+Enter to send)"
            disabled={isStreaming}
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
            onInput={e => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />

          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex-shrink-0"
          >
            {isStreaming ? (
              <Loader2 size={18} className="animate-spin text-white" />
            ) : (
              <Send size={18} className="text-white" />
            )}
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-1.5 px-1">
          Answers grounded in {embeddingStatus?.embeddedChunks ?? '...'} indexed code chunks
        </p>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onFileClick?: (path: string) => void;
}

function MessageBubble({ message, onFileClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-gray-800 text-gray-100 rounded-tl-sm'
        }`}
      >
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-gray-700">
            {message.sources.map((source, i) => (
              <button
                key={i}
                onClick={() => onFileClick?.(source.filePath)}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-blue-300 transition-colors"
                title={`${source.filePath}:${source.startLine}-${source.endLine} (score: ${source.score})`}
              >
                <FileText size={10} />
                {source.filePath.split('/').pop()}:{source.startLine}
              </button>
            ))}
          </div>
        )}

        {message.content ? (
          <MarkdownContent content={message.content} />
        ) : message.isStreaming ? (
          <span className="inline-flex gap-1 items-center text-gray-400">
            <span
              className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="flex flex-col gap-2">
      {segments.map((segment, i) => {
        if (segment.startsWith('```')) {
          const lines = segment.slice(3, -3).split('\n');
          const lang = lines[0].trim();
          const code = lines.slice(1).join('\n');

          return (
            <pre key={i} className="bg-gray-900 rounded-lg p-3 overflow-x-auto text-xs">
              {lang && <div className="text-gray-500 text-xs mb-2">{lang}</div>}
              <code className="text-green-300">{code}</code>
            </pre>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {segment.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, j) => {
              if (part.startsWith('`') && part.endsWith('`')) {
                return (
                  <code
                    key={j}
                    className="bg-gray-700 text-blue-300 px-1 py-0.5 rounded text-xs font-mono"
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              }

              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={j} className="font-medium text-white">
                    {part.slice(2, -2)}
                  </strong>
                );
              }

              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

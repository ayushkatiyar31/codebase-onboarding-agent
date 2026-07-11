import { useState, useEffect, useRef, useCallback } from 'react';
interface SSEOptions<T> {
    url: string;
    enabled?: boolean;
    onComplete?: (data: T) => void;
    onError?: (msg: string) => void;
}
interface SSEState<T> {
    streamedText: string;
    result: T | null;
    status: string;
    loading: boolean;
    error: string;
    retry: () => void;
}
export function useSSE<T>({ url, enabled = true, onComplete, onError, }: SSEOptions<T>): SSEState<T> {
    const [streamedText, setStreamedText] = useState('');
    const [result, setResult] = useState<T | null>(null);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const eventSourceRef = useRef<EventSource | null>(null);
    const retry = useCallback(() => {
        setStreamedText('');
        setResult(null);
        setStatus('');
        setError('');
        setRetryCount(c => c + 1);
    }, []);
    useEffect(() => {
        if (!enabled || !url)
            return undefined;
        const timer = window.setTimeout(() => {
            eventSourceRef.current?.close();
            setLoading(true);
            setStreamedText('');
            setResult(null);
            setError('');
            const es = new EventSource(url);
            eventSourceRef.current = es;
            es.onmessage = (event: MessageEvent<string>) => {
                const raw = event.data;
                if (raw === '[DONE]') {
                    setLoading(false);
                    es.close();
                    return;
                }
                try {
                    const parsed = JSON.parse(raw) as {
                        type: 'token' | 'status' | 'complete' | 'error';
                        content?: string;
                        message?: string;
                        analysis?: T;
                        fromCache?: boolean;
                    };
                    switch (parsed.type) {
                        case 'token':
                            setStreamedText(prev => prev + (parsed.content ?? ''));
                            break;
                        case 'status':
                            setStatus(parsed.message ?? '');
                            break;
                        case 'complete':
                            if (parsed.analysis) {
                                setResult(parsed.analysis);
                                onComplete?.(parsed.analysis);
                            }
                            break;
                        case 'error':
                            setError(parsed.message ?? 'Unknown error');
                            setLoading(false);
                            onError?.(parsed.message ?? 'Unknown error');
                            es.close();
                            break;
                    }
                }
                catch {
                }
            };
            es.onerror = () => {
                setError('Connection lost. Click retry to try again.');
                setLoading(false);
                es.close();
            };
        }, 0);
        return () => {
            window.clearTimeout(timer);
            eventSourceRef.current?.close();
        };
    }, [url, enabled, retryCount]);
    return { streamedText, result, status, loading, error, retry };
}

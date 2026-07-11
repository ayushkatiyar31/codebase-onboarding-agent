export interface ChatSource {
    filePath: string;
    startLine: number;
    endLine: number;
    name: string;
    score: number;
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: ChatSource[];
    isStreaming?: boolean;
    timestamp: Date;
}
export interface EmbeddingStatus {
    totalChunks: number;
    embeddedChunks: number;
    pendingChunks: number;
    isReady: boolean;
    percentComplete: number;
}

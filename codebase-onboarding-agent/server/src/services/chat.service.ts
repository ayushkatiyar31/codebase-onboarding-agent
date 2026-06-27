import { Response } from 'express';
import {
  searchSimilarChunks,
  getAllChunksForFile,
  detectFileReference,
  SearchResult,
} from './vectorSearch.service';
import { streamComplete } from './groq.service';
import { buildQAPrompt } from '../prompts/qa.prompt';
import { Repo } from '../models/Repo.model';


interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export const streamRAGAnswer = async (
  question: string,
  repoId: string,
  repoName: string,
  conversationHistory: ConversationTurn[],
  res: Response,
  focusFile?: string
): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
  res.flushHeaders();

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent({ type: 'status', message: 'Searching codebase...' });

    let searchResults: SearchResult[];

    let targetFile = focusFile ?? null;

    if (!targetFile) {
      const repo = await Repo.findById(repoId).select('fileTree').lean();

      const allFilePaths =
        repo?.fileTree
          ?.filter(f => f.type === 'blob')
          .map(f => f.path) ?? [];

      targetFile = detectFileReference(question, allFilePaths);
    }

    if (targetFile) {
      sendEvent({ type: 'status', message: `Reading ${targetFile}...` });

      searchResults = await getAllChunksForFile(repoId, targetFile);

      if (searchResults.length > 20) {
        searchResults = searchResults.slice(0, 20);
      }
    } else {
      searchResults = await searchSimilarChunks(question, repoId, {
        topK: 12,
        minScore: 0.2,
        maxPerFile: 2,
      });
    }


    if (searchResults.length === 0) {
      sendEvent({
        type: 'status',
        message: 'No relevant code found. Try rephrasing your question.',
      });

      sendEvent({
        type: 'complete',
        answer:
          "I couldn't find relevant code for that question. Try mentioning a specific file or feature you can see in the file tree.",
        sources: [],
      });

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    sendEvent({
      type: 'sources',
      sources: searchResults.map(r => ({
        filePath: r.chunk.filePath,
        startLine: r.chunk.startLine,
        endLine: r.chunk.endLine,
        name: r.chunk.name,
        score: r.score,
      })),
    });

    sendEvent({ type: 'status', message: 'Generating answer...' });

    const messages = buildQAPrompt({
      question,
      searchResults,
      repoName,
      conversationHistory,
    });

    let fullAnswer = '';

    await streamComplete(messages, {
      maxTokens: 2000,
      temperature: 0.2,

      onToken: (token: string) => {
        fullAnswer += token;
        sendEvent({ type: 'token', content: token });
      },

      onDone: () => {
        sendEvent({
          type: 'complete',
          answer: fullAnswer,
          sources: searchResults.map(r => ({
            filePath: r.chunk.filePath,
            startLine: r.chunk.startLine,
            endLine: r.chunk.endLine,
            name: r.chunk.name,
            score: r.score,
          })),
        });

        res.write('data: [DONE]\n\n');
        res.end();
      },

      onError: (err: Error) => {
        sendEvent({ type: 'error', message: err.message });
        res.write('data: [DONE]\n\n');
        res.end();
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendEvent({ type: 'error', message });
    res.write('data: [DONE]\n\n');
    res.end();
  }
};
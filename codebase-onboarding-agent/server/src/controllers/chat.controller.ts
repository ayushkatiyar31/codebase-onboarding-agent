import { Request, Response } from 'express';
import { Repo } from '../models/Repo.model';
import { Chunk } from '../models/Chunk.model';
import { generateEmbeddingsForRepo } from '../services/vectorSearch.service';
import { streamRAGAnswer } from '../services/chat.service';
import { ensureChunksForRepo } from '../services/repoIndexing.service';

export const embedRepo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner, name } = req.params;

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (!repo) {
      res.status(404).json({ error: 'Repo not found' });
      return;
    }

    const chunkCount = await ensureChunksForRepo(repo);

    if (chunkCount === 0) {
      res.status(400).json({
        error: 'No chunks could be created for this repo.',
      });
      return;
    }

    const embeddedCount = await Chunk.countDocuments({
      repoId: repo._id,
      embedding: { $exists: true },
    });

    if (embeddedCount === chunkCount) {
      res.json({
        message: 'All chunks already have embeddings',
        total: chunkCount,
        embedded: embeddedCount,
      });
      return;
    }

    const progress = await generateEmbeddingsForRepo(repo._id.toString());

    if (progress.status === 'error') {
      res.status(502).json({
        error: progress.error || 'Embedding generation failed',
        ...progress,
      });
      return;
    }

    res.json({
      message: 'Embeddings generated',
      ...progress,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};

export const embedRepoStream = async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { owner, name } = req.params;

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (!repo) {
      sendEvent({ type: 'error', message: 'Repo not found' });
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const totalChunks = await ensureChunksForRepo(repo);

    const alreadyEmbedded = await Chunk.countDocuments({
      repoId: repo._id,
      embedding: { $exists: true },
    });

    if (alreadyEmbedded === totalChunks && totalChunks > 0) {
      sendEvent({
        type: 'complete',
        total: totalChunks,
        completed: totalChunks,
        failed: 0,
      });

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    sendEvent({
      type: 'status',
      message: `Embedding ${totalChunks - alreadyEmbedded} chunks...`,
      total: totalChunks,
      completed: alreadyEmbedded,
    });

    const progress = await generateEmbeddingsForRepo(
      repo._id.toString(),
      (progress) => {
        if (progress.status === 'done') {
          sendEvent({
            type: 'complete',
            ...progress,
          });
        } else {
          sendEvent({
            type: 'progress',
            ...progress,
          });
        }
      }
    );

    if (progress.status === 'error') {
      sendEvent({
        type: 'error',
        message: progress.error || 'Embedding generation failed',
        ...progress,
      });
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    sendEvent({
      type: 'error',
      message,
    });

    res.write('data: [DONE]\n\n');
    res.end();
  }
};

export const askQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner, name } = req.params;

    const {
      question,
      conversationHistory = [],
      focusFile,
    } = req.body as {
      question: string;
      conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
      }>;
      focusFile?: string;
    };

    if (!question?.trim()) {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    const repo = await Repo.findOne({
      fullName: `${owner}/${name}`,
    });

    if (!repo) {
      res.status(404).json({ error: 'Repo not found' });
      return;
    }

    const totalChunks = await ensureChunksForRepo(repo);

    if (totalChunks === 0) {
      res.status(400).json({
        error: 'No chunks could be created for this repo.',
      });
      return;
    }

    let embeddedCount = await Chunk.countDocuments({
      repoId: repo._id,
      embedding: { $exists: true },
    });

    if (embeddedCount < totalChunks) {
      const progress = await generateEmbeddingsForRepo(
        repo._id.toString()
      );

      if (progress.status === 'error') {
        res.status(502).json({
          error:
            progress.error ||
            'Embedding generation failed',
          ...progress,
        });
        return;
      }

      embeddedCount = await Chunk.countDocuments({
        repoId: repo._id,
        embedding: { $exists: true },
      });

      if (embeddedCount === 0) {
        res.status(500).json({
          error:
            'Embedding generation failed. Check HUGGINGFACE_API_KEY and embedding provider logs.',
        });
        return;
      }
    }

    await streamRAGAnswer(
      question,
      repo._id.toString(),
      repo.name,
      conversationHistory,
      res,
      focusFile
    );

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error';

    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
};
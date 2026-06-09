import { Request, Response } from 'express';
import { Repo } from '../models/Repo.model';
import { Analysis } from '../models/Analysis.model';
import { streamArchitectureAnalysis, analyseArchitecture } from '../services/analysis.service';

export const streamAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner, name } = req.params;

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (!repo) {
      res.status(404).json({ error: 'Repo not found' });
      return;
    }

    const cached = await Analysis.findOne({ repoId: repo._id });
    if (cached) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Loading cached analysis...' })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'complete', analysis: cached.analysis, fromCache: true })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    await streamArchitectureAnalysis(
      repo.owner,
      repo.name,
      repo.language,
      repo.fileTree,
      res
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
};

export const saveAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner, name } = req.params;
    const { analysis } = req.body as { analysis: unknown };

    if (!analysis) {
      res.status(400).json({ error: 'analysis body is required' });
      return;
    }

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (!repo) {
      res.status(404).json({ error: 'Repo not found' });
      return;
    }

    await Analysis.findOneAndUpdate(
      { repoId: repo._id },
      { repoId: repo._id, analysis },
      { upsert: true, new: true }
    );

    res.json({ message: 'Analysis saved' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};

export const clearAnalysisCache = async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner, name } = req.params;

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (!repo) {
      res.status(404).json({ error: 'Repo not found' });
      return;
    }

    await Analysis.deleteOne({ repoId: repo._id });

    res.json({ message: 'Cache cleared' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};
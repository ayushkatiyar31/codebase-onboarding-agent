import { Request, Response } from 'express';
import { Repo } from '../models/Repo.model';
import { Graph } from '../models/Graph.model';
import { generateDependencyGraph } from '../services/graph.service';
import { generateWalkthrough } from '../services/walkthrough.service';

export const generateGraph = async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner, name } = req.params;

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (!repo) {
      res.status(404).json({ error: 'Repo not found' });
      return;
    }

    await generateDependencyGraph(
      owner,
      name,
      repo._id.toString(),
      repo.fileTree
    );

    const graph = await Graph.findOne({ repoId: repo._id });

    res.json({
      message: 'Graph generated',
      edgeCount: graph?.edges.length ?? 0,
      stats: graph?.stats,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};

export const getGraph = async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner, name } = req.params;

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (!repo) {
      res.status(404).json({ error: 'Repo not found' });
      return;
    }

    const graph = await Graph.findOne({ repoId: repo._id });

    if (!graph) {
      res.status(404).json({
        error: 'Graph not generated yet. POST to /generate first.',
      });
      return;
    }

    res.json({
      edges: graph.edges,
      stats: graph.stats,
      generatedAt: graph.generatedAt,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};

// ─────────────────────────────────────────────
// GET /api/graph/:owner/:name/walkthrough
// ─────────────────────────────────────────────
export const getWalkthrough = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { owner, name } = req.params;

    const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
    if (!repo) {
      res.status(404).json({ error: 'Repo not found' });
      return;
    }

    const steps = await generateWalkthrough(
      owner,
      name,
      repo._id.toString()
    );

    res.json({ steps });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};
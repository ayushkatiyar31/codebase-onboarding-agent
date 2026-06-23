import { Request, Response } from 'express';
import {
  generateGuide,
  getGuideByRepo,
  getGuideByShareId,
} from '../services/guide.service';

export const createGuide = async (
  req: Request<{ owner: string; name: string }>,
  res: Response
): Promise<void> => {
  try {
    const { owner, name } = req.params;
    const { markdown, shareId } = await generateGuide(owner, name);

    res.json({
      message: 'Guide generated',
      markdown,
      shareId,
      shareUrl: `/guide/${shareId}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};

export const getGuide = async (
  req: Request<{ owner: string; name: string }>,
  res: Response
): Promise<void> => {
  try {
    const { owner, name } = req.params;
    const guide = await getGuideByRepo(owner, name);

    if (!guide) {
      res.status(404).json({ error: 'Guide not generated yet' });
      return;
    }

    res.json({
      markdown: guide.markdown,
      shareId: guide.shareId,
      generatedAt: guide.generatedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};

export const getSharedGuide = async (
  req: Request<{ shareId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { shareId } = req.params;
    const guide = await getGuideByShareId(shareId);

    if (!guide) {
      res.status(404).json({ error: 'Guide not found' });
      return;
    }

    res.json({
      markdown: guide.markdown,
      repoFullName: guide.repoFullName,
      generatedAt: guide.generatedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};
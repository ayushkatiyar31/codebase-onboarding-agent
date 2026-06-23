import crypto from 'crypto';
import { Repo } from '../models/Repo.model';
import { Analysis } from '../models/Analysis.model';
import { Graph } from '../models/Graph.model';
import { Guide } from '../models/Guide.model';
import { complete } from './groq.service';
import { buildGuidePrompt } from '../prompts/guide.prompt';
import { generateWalkthrough } from './walkthrough.service';

const generateShareId = (): string => {
  return crypto.randomBytes(6).toString('base64url');
};

export const generateGuide = async (
  owner: string,
  name: string
): Promise<{ markdown: string; shareId: string }> => {
  const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
  if (!repo) throw new Error('Repo not found');

  const analysisDoc = await Analysis.findOne({ repoId: repo._id });
  if (!analysisDoc) {
    throw new Error(
      'Architecture analysis not found. Visit the Architecture tab first.'
    );
  }

  const graphDoc = await Graph.findOne({ repoId: repo._id });
  if (!graphDoc) {
    throw new Error(
      'Dependency graph not found. Visit the Dependencies tab first.'
    );
  }

  const walkthroughSteps = await generateWalkthrough(
    owner,
    name,
    repo._id.toString()
  );

  const messages = buildGuidePrompt({
    repoName: repo.name,
    owner: repo.owner,
    description: repo.description,
    language: repo.language,
    stars: repo.stars,
    analysis: analysisDoc.analysis as any,
    walkthroughSteps,
    graphStats: graphDoc.stats,
  });

  const markdown = await complete(messages, {
    maxTokens: 4000,
    temperature: 0.4,
  });

  let shareId = generateShareId();
  let attempts = 0;

  while ((await Guide.exists({ shareId })) && attempts < 5) {
    shareId = generateShareId();
    attempts++;
  }

  await Guide.findOneAndUpdate(
    { repoId: repo._id },
    {
      repoId: repo._id,
      repoFullName: repo.fullName,
      shareId,
      markdown,
      generatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return { markdown, shareId };
};

export const getGuideByRepo = async (owner: string, name: string) => {
  const repo = await Repo.findOne({ fullName: `${owner}/${name}` });
  if (!repo) return null;
  return Guide.findOne({ repoId: repo._id });
};

export const getGuideByShareId = async (shareId: string) => {
  return Guide.findOne({ shareId });
};
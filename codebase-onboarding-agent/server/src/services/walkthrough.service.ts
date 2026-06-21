import { Repo } from '../models/Repo.model';
import { Graph } from '../models/Graph.model';
import * as githubService from './github.service';
import { complete } from './groq.service';
import { buildWalkthroughPrompt } from '../prompts/walkthrough.prompt';

export interface WalkthroughStep {
  stepNumber: number;
  filePath: string;
  title: string;
  whatToLookFor: string;
  whyItMatters: string;
}

export const generateWalkthrough = async (
  owner: string,
  name: string,
  repoId: string
): Promise<WalkthroughStep[]> => {

  const graph = await Graph.findOne({ repoId });
  if (!graph) {
    throw new Error('Dependency graph not found. Generate it first.');
  }

  const candidateFiles = [
    ...graph.stats.entryPoints.slice(0, 3),
    ...graph.stats.mostImported.slice(0, 5).map(f => f.filePath),
  ];

  const uniqueFiles = Array.from(new Set(candidateFiles)).slice(0, 8);

  const sampleFileContents = await Promise.all(
    uniqueFiles.map(async (path) => {
      try {
        const content = await githubService.getFileContent(owner, name, path);
        return { path, snippet: content.slice(0, 300) };
      } catch {
        return { path, snippet: '(could not fetch)' };
      }
    })
  );

  const messages = buildWalkthroughPrompt({
    repoName: name,
    entryPoints: graph.stats.entryPoints,
    mostImported: graph.stats.mostImported,
    sampleFileContents,
  });

  const raw = await complete(messages, { maxTokens: 1500, temperature: 0.2 });

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as { steps: WalkthroughStep[] };
    return parsed.steps;
  } catch {
    throw new Error(`Failed to parse walkthrough JSON: ${raw.slice(0, 200)}`);
  }
};
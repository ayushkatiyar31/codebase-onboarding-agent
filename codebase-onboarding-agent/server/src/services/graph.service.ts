import { Repo, IFileNode } from '../models/Repo.model';
import { Graph } from '../models/Graph.model';
import * as githubService from './github.service';
import { detectLanguage, shouldSkipFile } from './chunker.service';
import { buildDependencyGraph, computeGraphStats } from './dependencyParser.service';

const PARSEABLE_LANGUAGES = new Set(['typescript', 'javascript', 'python', 'go']);

export const generateDependencyGraph = async (
  owner: string,
  name: string,
  repoId: string,
  fileTree: IFileNode[]
): Promise<void> => {

  const parseableFiles = fileTree.filter(node => {
    if (node.type !== 'blob' || shouldSkipFile(node.path)) return false;
    const lang = detectLanguage(node.path);
    return PARSEABLE_LANGUAGES.has(lang);
  });

  console.log(`Parsing dependencies for ${parseableFiles.length} files...`);

  const fileContents = new Map<string, { content: string; language: string }>();
  const BATCH_SIZE = 10;

  for (let i = 0; i < parseableFiles.length; i += BATCH_SIZE) {
    const batch = parseableFiles.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (file) => {
        try {
          const content = await githubService.getFileContent(owner, name, file.path);
          fileContents.set(file.path, {
            content,
            language: detectLanguage(file.path),
          });
        } catch (err) {
          console.warn(`Failed to fetch ${file.path} for graph:`, err);
        }
      })
    );

    if (i + BATCH_SIZE < parseableFiles.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const edges = buildDependencyGraph(fileContents);
  const allFiles = Array.from(fileContents.keys());
  const stats = computeGraphStats(edges, allFiles);

  await Graph.findOneAndUpdate(
    { repoId },
    { repoId, edges, stats, generatedAt: new Date() },
    { upsert: true, new: true }
  );

  console.log(`Dependency graph saved: ${edges.length} edges, ${stats.entryPoints.length} entry points`);
};
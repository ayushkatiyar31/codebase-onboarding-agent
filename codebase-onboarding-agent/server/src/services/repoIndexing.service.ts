import { Chunk } from '../models/Chunk.model';
import { IFileNode, IRepo } from '../models/Repo.model';
import * as githubService from './github.service';
import { chunkFile, shouldSkipFile } from './chunker.service';

type RepoLike = Pick<IRepo, '_id' | 'owner' | 'name' | 'fileTree'>;

const isFileNode = (node: IFileNode): boolean => {
  return node.type === 'blob' && !shouldSkipFile(node.path);
};

export const createChunksForRepo = async (repo: RepoLike): Promise<{
  totalChunks: number;
  filesProcessed: number;
  errors: string[];
}> => {
  await Chunk.deleteMany({ repoId: repo._id });

  const filesToProcess = repo.fileTree.filter(isFileNode);
  const errors: string[] = [];
  let totalChunks = 0;

  const batchSize = 10;

  for (let i = 0; i < filesToProcess.length; i += batchSize) {
    const batch = filesToProcess.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (file) => {
        const content = await githubService.getFileContent(
          repo.owner,
          repo.name,
          file.path
        );

        const chunks = chunkFile(content, file.path);

        if (chunks.length > 0) {
          await Chunk.insertMany(
            chunks.map(chunk => ({
              ...chunk,
              repoId: repo._id,
            }))
          );
        }

        return chunks.length;
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalChunks += result.value;
      } else {
        errors.push(
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown error'
        );
      }
    }

    if (i + batchSize < filesToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return {
    totalChunks,
    filesProcessed: filesToProcess.length - errors.length,
    errors,
  };
};

export const ensureChunksForRepo = async (repo: RepoLike): Promise<number> => {
  const existingCount = await Chunk.countDocuments({ repoId: repo._id });

  if (existingCount > 0) {
    return existingCount;
  }

  const result = await createChunksForRepo(repo);
  return result.totalChunks;
};

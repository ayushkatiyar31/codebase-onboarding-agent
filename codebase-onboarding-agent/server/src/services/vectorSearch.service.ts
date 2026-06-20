import mongoose from 'mongoose';
import { Chunk } from '../models/Chunk.model';
import {
  embedBatch,
  embedText,
  prepareChunkForEmbedding,
  prepareQueryForEmbedding,
} from './embeddings.service';

const EMBEDDING_BATCH_SIZE = 32;

export interface EmbeddingProgress {
  total: number;
  completed: number;
  failed: number;
  status: 'running' | 'done' | 'error';
  error?: string;
}

export const generateEmbeddingsForRepo = async (
  repoId: string,
  onProgress?: (progress: EmbeddingProgress) => void
): Promise<EmbeddingProgress> => {

  const chunks = await Chunk.find({
    repoId: new mongoose.Types.ObjectId(repoId),
    embedding: { $exists: false },
  }).lean();

  const total = chunks.length;
  let completed = 0;
  let failed = 0;
  let lastError = '';

  if (total === 0) {
    return { total: 0, completed: 0, failed: 0, status: 'done' };
  }

  console.log(`Generating embeddings for ${total} chunks...`);

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);

    try {
      const texts = batch.map(chunk => prepareChunkForEmbedding({
        content: chunk.content,
        filePath: chunk.filePath,
        language: chunk.language,
        chunkType: chunk.chunkType,
        name: chunk.name,
      }));

      const embeddings = await embedBatch(texts);

      const bulkOps = batch.map((chunk, idx) => ({
        updateOne: {
          filter: { _id: chunk._id },
          update: {
            $set: {
              embedding: embeddings[idx],
              embeddingGeneratedAt: new Date(),
            },
          },
        },
      }));

      await Chunk.bulkWrite(bulkOps);

      completed += batch.length;

      onProgress?.({
        total,
        completed,
        failed,
        status: 'running',
      });

      if (i + EMBEDDING_BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown embedding error';
      console.error(`Embedding batch ${i / EMBEDDING_BATCH_SIZE + 1} failed:`, error);
      failed += batch.length;

      onProgress?.({
        total,
        completed,
        failed,
        status: 'running',
        error: lastError,
      });
    }
  }

  const finalStatus: EmbeddingProgress = {
    total,
    completed,
    failed,
    status: failed === total ? 'error' : 'done',
    ...(lastError ? { error: lastError } : {}),
  };

  onProgress?.(finalStatus);
  return finalStatus;
};

export interface SearchResult {
  chunk: {
    _id: string;
    filePath: string;
    language: string;
    startLine: number;
    endLine: number;
    content: string;
    chunkType: string;
    name: string;
    tokenEstimate: number;
  };
  score: number;
}

export const searchSimilarChunks = async (
  query: string,
  repoId: string,
  options: {
    topK?: number;
    minScore?: number;
    filePathFilter?: string;
    maxPerFile?: number;
  } = {}
): Promise<SearchResult[]> => {

  const {
    topK = 5,
    minScore = 0.25,
    filePathFilter,
    maxPerFile = 2,
  } = options;

  const queryText = prepareQueryForEmbedding(query);
  const queryEmbedding = await embedText(queryText);

  const overFetchLimit = topK * 4;

  const pipeline: mongoose.PipelineStage[] = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: overFetchLimit * 10,
        limit: overFetchLimit,
        filter: {
          repoId: { $eq: new mongoose.Types.ObjectId(repoId) },
          ...(filePathFilter ? { filePath: { $eq: filePathFilter } } : {}),
        },
      },
    } as mongoose.PipelineStage,
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
    {
      $match: {
        score: { $gte: minScore },
      },
    },
    {
      $project: {
        _id: 1,
        filePath: 1,
        language: 1,
        startLine: 1,
        endLine: 1,
        content: 1,
        chunkType: 1,
        name: 1,
        tokenEstimate: 1,
        score: 1,
      },
    },
  ];

  const rawResults = await Chunk.aggregate(pipeline);

  const perFileCount = new Map<string, number>();
  const diversified: typeof rawResults = [];

  for (const doc of rawResults) {
    const count = perFileCount.get(doc.filePath) ?? 0;

    if (count >= maxPerFile) {
      continue;
    }

    diversified.push(doc);
    perFileCount.set(doc.filePath, count + 1);

    if (diversified.length >= topK) {
      break;
    }
  }

  if (diversified.length < topK) {
    for (const doc of rawResults) {
      if (diversified.length >= topK) {
        break;
      }

      if (diversified.includes(doc)) {
        continue;
      }

      diversified.push(doc);
    }
  }

  return diversified.map(doc => ({
    chunk: {
      _id: doc._id.toString(),
      filePath: doc.filePath,
      language: doc.language,
      startLine: doc.startLine,
      endLine: doc.endLine,
      content: doc.content,
      chunkType: doc.chunkType,
      name: doc.name,
      tokenEstimate: doc.tokenEstimate,
    },
    score: Math.round(doc.score * 1000) / 1000,
  }));
};

export const getAllChunksForFile = async (
  repoId: string,
  filePath: string
): Promise<SearchResult[]> => {
  const chunks = await Chunk.find({
    repoId: new mongoose.Types.ObjectId(repoId),
    filePath,
  })
    .sort({ startLine: 1 })
    .lean();

  return chunks.map(chunk => ({
    chunk: {
      _id: chunk._id.toString(),
      filePath: chunk.filePath,
      language: chunk.language,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      content: chunk.content,
      chunkType: chunk.chunkType,
      name: chunk.name,
      tokenEstimate: chunk.tokenEstimate,
    },
    score: 1.0,
  }));
};

export const detectFileReference = (
  question: string,
  allFilePaths: string[]
): string | null => {
  const lowerQuestion = question.toLowerCase();

  const sorted = [...allFilePaths].sort(
    (a, b) => b.length - a.length
  );

  for (const path of sorted) {
    const fileName = path.split('/').pop() ?? '';

    if (
      fileName.length > 3 &&
      lowerQuestion.includes(fileName.toLowerCase())
    ) {
      return path;
    }

    if (
      path.length > 5 &&
      lowerQuestion.includes(path.toLowerCase())
    ) {
      return path;
    }
  }

  return null;
};
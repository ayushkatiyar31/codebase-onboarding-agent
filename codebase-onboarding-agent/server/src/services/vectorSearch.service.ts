import mongoose from 'mongoose';
import { Chunk, IChunk } from '../models/Chunk.model';
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
      console.error(`Embedding batch ${i / EMBEDDING_BATCH_SIZE + 1} failed:`, error);
      failed += batch.length;

      onProgress?.({
        total,
        completed,
        failed,
        status: 'running',
      });
    }
  }

  const finalStatus: EmbeddingProgress = {
    total,
    completed,
    failed,
    status: failed === total ? 'error' : 'done',
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
  } = {}
): Promise<SearchResult[]> => {

  const { topK = 5, minScore = 0.3, filePathFilter } = options;

  const queryText = prepareQueryForEmbedding(query);
  const queryEmbedding = await embedText(queryText);

  const vectorSearchStage: Record<string, unknown> = {
    $vectorSearch: {
      index: 'chunk_vector_index',
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: topK * 15,
      limit: topK * 3,
      filter: {
        repoId: { $eq: new mongoose.Types.ObjectId(repoId) },
        ...(filePathFilter ? { filePath: { $eq: filePathFilter } } : {}),
      },
    },
  };

  const pipeline: mongoose.PipelineStage[] = [
    vectorSearchStage as mongoose.PipelineStage,

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

    { $limit: topK },

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

  const results = await Chunk.aggregate(pipeline);

  return results.map(doc => ({
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
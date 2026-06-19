import mongoose from 'mongoose';
import { Chunk, IChunk } from '../models/Chunk.model';
import {
  embedBatch,
  embedText,
  cosineSimilarity,
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
  } = {}
): Promise<SearchResult[]> => {

  const { topK = 5, minScore = 0.3, filePathFilter } = options;

  const queryText = prepareQueryForEmbedding(query);
  const queryEmbedding = await embedText(queryText);

  const vectorSearchStage = {
    $vectorSearch: {
      index: 'vector_index',
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: topK * 15,
      limit: topK * 3,
      filter: {
        repoId: { $eq: new mongoose.Types.ObjectId(repoId) },
        ...(filePathFilter ? { filePath: { $eq: filePathFilter } } : {}),
      },
    },
  } as unknown as mongoose.PipelineStage;

  const pipeline: mongoose.PipelineStage[] = [
    vectorSearchStage,

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

  try {
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
  } catch (error) {
    console.warn('Mongo vector search failed; using in-process cosine fallback:', error);
  }

  const chunks = await Chunk.find({
    repoId: new mongoose.Types.ObjectId(repoId),
    embedding: { $exists: true },
    ...(filePathFilter ? { filePath: filePathFilter } : {}),
  })
    .select('_id filePath language startLine endLine content chunkType name tokenEstimate embedding')
    .lean();

  return chunks
    .map(chunk => ({
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
      score:
        chunk.embedding && chunk.embedding.length === queryEmbedding.length
          ? cosineSimilarity(queryEmbedding, chunk.embedding)
          : 0,
    }))
    .filter(result => result.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(result => ({
      ...result,
      score: Math.round(result.score * 1000) / 1000,
    }));
};

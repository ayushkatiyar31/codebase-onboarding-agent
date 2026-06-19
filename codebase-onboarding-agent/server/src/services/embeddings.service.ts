const HF_API_BASE = 'https://api-inference.huggingface.co/models';
const DEFAULT_EMBEDDING_DIMENSIONS = 384;

interface HFEmbeddingResponse {
  [index: number]: number[];
}

export const embedText = async (text: string): Promise<number[]> => {
  const results = await embedBatch([text]);
  return results[0];
};

export const embedBatch = async (texts: string[]): Promise<number[][]> => {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const model  = process.env.EMBEDDING_MODEL || 'BAAI/bge-small-en-v1.5';

  if (!apiKey) {
    console.warn('HUGGINGFACE_API_KEY is not set; using local fallback embeddings');
    return embedBatchLocally(texts);
  }

  const processedTexts = texts.map(t => prepareForEmbedding(t));

  let response: Response;

  try {
    response = await fetch(`${HF_API_BASE}/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: processedTexts,
        options: {
          wait_for_model: true,
          use_cache: false,
        },
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    const maybeCause = error as { cause?: unknown };
    const cause = maybeCause.cause instanceof Error
      ? `: ${maybeCause.cause.message}`
      : '';

    console.warn(`HF Embedding API request failed; using local fallback embeddings: ${message}${cause}`);
    return embedBatchLocally(texts);
  }

  if (!response.ok) {
    const error = await response.text();

    if (response.status === 503) {
      console.log('HF model loading, waiting 20s...');
      await new Promise(resolve => setTimeout(resolve, 20000));
      return embedBatch(texts);
    }

    console.warn(`HF Embedding API error ${response.status}; using local fallback embeddings: ${error}`);
    return embedBatchLocally(texts);
  }

  const data = await response.json() as HFEmbeddingResponse | number[][];

  if (!Array.isArray(data) || data.length !== texts.length) {
    throw new Error(`Expected ${texts.length} embeddings, got ${Array.isArray(data) ? data.length : 'non-array'}`);
  }

  return data as number[][];
};

const embedBatchLocally = (texts: string[]): number[][] => {
  return texts.map(text => embedTextLocally(text));
};

const embedTextLocally = (text: string): number[] => {
  const dimensions = Number(process.env.EMBEDDING_DIMENSIONS) || DEFAULT_EMBEDDING_DIMENSIONS;
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = text
    .toLowerCase()
    .match(/[a-z0-9_./-]+/g) ?? [];

  for (const token of tokens) {
    const index = positiveHash(token) % dimensions;
    const sign = positiveHash(`sign:${token}`) % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }

  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0)
  );

  if (magnitude === 0) {
    return vector;
  }

  return vector.map(value => value / magnitude);
};

const positiveHash = (value: string): number => {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const prepareChunkForEmbedding = (chunk: {
  content: string;
  filePath: string;
  language: string;
  chunkType: string;
  name: string;
}): string => {
  const lines = [
    `${chunk.language} ${chunk.chunkType} ${chunk.name}`,
    `File: ${chunk.filePath}`,
    chunk.content.slice(0, 512),
  ];
  return lines.join('\n');
};

const prepareForEmbedding = (text: string): string => {
  return `Represent this code snippet for retrieval: ${text}`;
};

export const prepareQueryForEmbedding = (query: string): string => {
  return `Represent this question for retrieving relevant code: ${query}`;
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) throw new Error('Vectors must be the same length');

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const HF_API_BASE = 'https://api-inference.huggingface.co/models';

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

  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY is not set');

  const processedTexts = texts.map(t => prepareForEmbedding(t));

  const response = await fetch(`${HF_API_BASE}/${model}`, {
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

  if (!response.ok) {
    const error = await response.text();

    if (response.status === 503) {
      console.log('HF model loading, waiting 20s...');
      await new Promise(resolve => setTimeout(resolve, 20000));
      return embedBatch(texts);
    }

    throw new Error(`HF Embedding API error ${response.status}: ${error}`);
  }

  const data = await response.json() as HFEmbeddingResponse | number[][];

  if (!Array.isArray(data) || data.length !== texts.length) {
    throw new Error(`Expected ${texts.length} embeddings, got ${Array.isArray(data) ? data.length : 'non-array'}`);
  }

  return data as number[][];
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
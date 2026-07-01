export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const ARCHITECTURE_SYSTEM_PROMPT = `You are an expert software architect who specialises in onboarding new developers to unfamiliar codebases.


Your job is to analyse a GitHub repository and produce a clear, structured, and accurate architectural overview.

You must respond with ONLY valid JSON — no preamble, no markdown fences, no explanation outside the JSON.

The JSON must follow this exact structure:
{
  "summary": "2-3 sentence plain-English description of what this project does and who it's for",

  "techStack": [
    { "name": "Technology name", "role": "what it does in this project", "category": "frontend|backend|database|devtools|testing|other" }
  ],

  "architecturePattern": {
    "name": "The pattern name e.g. MVC, Microservices, Monolith, JAMstack, etc.",
    "description": "1-2 sentences explaining how this pattern is applied in this specific repo"
  },

  "entryPoints": [
    { "path": "relative file path", "description": "what happens when this file runs" }
  ],

  "keyDirectories": [
    { "path": "directory path", "purpose": "what lives here and why it matters" }
  ],

  "dataFlow": "A plain-English description of how a typical request or action flows through the system from trigger to response",

  "gotchas": [
    "A specific, actionable thing a new developer is likely to miss or misunderstand about this codebase"
  ],

  "setupSteps": [
    "Step-by-step instruction to get this project running locally"
  ],

  "firstFilesToRead": [
    { "path": "file path", "reason": "why a new dev should read this file first" }
  ]
}

Rules:
- Base your analysis ONLY on the provided context. Do not invent details.
- If you cannot determine something, omit that field rather than guessing.
- gotchas should be specific to THIS codebase, not generic advice.
- techStack entries should only include technologies you can confirm from the provided files.
- Keep descriptions concise — a new developer needs clarity, not essays.`;

export interface GroqResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface StreamChunk {
  id: string;
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}

const getGroqConfig = () => {
  const apiKey = process.env.GROQ_API_KEY;
  const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  if (!apiKey) throw new Error('GROQ_API_KEY is not set in environment variables');

  return { apiKey, baseUrl, model };
};

export const complete = async (
  messages: Message[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> => {
  const { apiKey, baseUrl, model } = getGroqConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.3,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message: string } };
    throw new Error(`Groq API error ${response.status}: ${error.error?.message ?? 'Unknown'}`);
  }

  const data = await response.json() as GroqResponse;
  return data.choices[0]?.message?.content ?? '';
};

export const streamComplete = async (
  messages: Message[],
  options: {
    maxTokens?: number;
    temperature?: number;
    onToken: (token: string) => void;
    onDone?: () => void;
    onError?: (err: Error) => void;
  }
): Promise<void> => {
  const { apiKey, baseUrl, model } = getGroqConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.3,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message: string } };
    throw new Error(`Groq API error ${response.status}: ${error.error?.message ?? 'Unknown'}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');

    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const payload = trimmed.slice(6);

      if (payload === '[DONE]') {
        options.onDone?.();
        return;
      }

      try {
        const chunk = JSON.parse(payload) as StreamChunk;
        const token = chunk.choices[0]?.delta?.content;

        if (token) {
          options.onToken(token);
        }
      } catch {
        continue;
      }
    }
  }

  options.onDone?.();
};

export const generateJSON = async <T>(
  systemInstruction: string,
  userPrompt: string,
): Promise<T> => {
  const messages: Message[] = [
    {
      role: 'system',
      content: systemInstruction,
    },
    {
      role: 'user',
      content: userPrompt,
    },
  ];

  const response = await complete(messages, { temperature: 0.1 });

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Groq returned invalid JSON: ${response.slice(0, 200)}`);
  }
};

import { Response } from 'express';

export const streamToResponse = async (
  systemInstruction: string,
  userPrompt: string,
  res: Response,
): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const messages: Message[] = [
      {
        role: 'system',
        content: systemInstruction,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    await streamComplete(messages, {
      maxTokens: 8192,
      temperature: 0.7,
      onToken: (token: string) => {
        res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
      },
      onDone: () => {
        res.write('data: [DONE]\n\n');
        res.end();
      },
      onError: (err: Error) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
};
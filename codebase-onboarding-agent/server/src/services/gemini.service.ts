import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
  Content,
} from '@google/generative-ai';
import { Response } from 'express';

let client: GoogleGenerativeAI | null = null;

const getClient = (): GoogleGenerativeAI => {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables');
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
};

const getModel = (config?: Partial<GenerationConfig>): GenerativeModel => {
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  return getClient().getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      ...config,
    },
  });
};

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export const generate = async (
  systemInstruction: string,
  userPrompt: string,
  history: ChatMessage[] = [],
): Promise<string> => {
  const model = getModel();

  const formattedHistory: Content[] = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: formattedHistory,
    systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
  });

  const result = await chat.sendMessage(userPrompt);
  const response = await result.response;

  return response.text();
};

export const streamToResponse = async (
  systemInstruction: string,
  userPrompt: string,
  res: Response,
  history: ChatMessage[] = [],
): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const model = getModel({ maxOutputTokens: 8192 });

    const formattedHistory: Content[] = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
    });

    const streamResult = await chat.sendMessageStream(userPrompt);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
};

export const generateJSON = async <T>(
  systemInstruction: string,
  userPrompt: string,
): Promise<T> => {
  const model = getClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  });

  const chat = model.startChat({
    systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
  });

  const result = await chat.sendMessage(userPrompt);
  const text = result.response.text();

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
  }
};
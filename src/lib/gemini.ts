import { GoogleGenAI } from '@google/genai';

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const FALLBACK_MODELS = ['gemma-4-31b', 'gemma-4-26b', 'gemma-3-27b', 'gemini-2.5-flash'];

export async function generateContentWithFallback(params: any): Promise<any> {
  let lastError = null;
  for (const model of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model
      });
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} failed:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error('All fallback models failed.');
}

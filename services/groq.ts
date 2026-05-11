import { Groq } from 'groq-sdk';
import type { AIService, ChatMessage } from '../types';
import process from 'node:process';
import { systemPrompt } from './prommpt';

const groq = new Groq({
  apiKey: process.env.API_KEY_GROQ,
});




export const groqService: AIService = {
  name: 'Groq',
  async chat(messages: ChatMessage[], arancelContext?: string) {
    const systemContent = arancelContext
      ? `${systemPrompt}\n\n${arancelContext}`
      : systemPrompt;
    const chatCompletion = await groq.chat.completions.create({
      messages: [...messages, { role: 'system', content: systemContent }],
      model: "openai/gpt-oss-20b",
      temperature: 0.6,
      max_completion_tokens: 4096,
      top_p: 1,
      stream: true,
      stop: null,
    });

    return (async function* () {
      for await (const chunk of chatCompletion) {
        if (chunk.choices[0]?.delta?.content) {
          // console.log('chunk', chunk.choices[0]?.delta?.content)
          yield chunk.choices[0]?.delta?.content
        }
      }
    })()
  }
}


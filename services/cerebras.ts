import Cerebras from '@cerebras/cerebras_cloud_sdk';
import type { AIService, ChatMessage } from '../types';
import { systemPrompt } from './prommpt';

const cerebras = new Cerebras(
  {
    apiKey: process.env.API_KEY_CEREBRAS,
  }
);

export const cerebrasService: AIService = {
  name: 'Cerebras',
  async chat(messages: ChatMessage[], arancelContext?: string) {
    const systemContent = arancelContext
      ? `${systemPrompt}\n\n${arancelContext}`
      : systemPrompt;
    const stream = await cerebras.chat.completions.create({
      messages: [...messages, { role: 'system', content: systemContent }] as any,
      model: 'gpt-oss-120b',
      stream: true,
      max_completion_tokens: 40960,
      temperature: 0.6,
      top_p: 0.95
    });

    return (async function* () {
      for await (const chunk of stream) {
        yield (chunk as any).choices[0]?.delta?.content || ''
      }
    })()
  }
}
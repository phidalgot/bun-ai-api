import console from 'node:console';
import type { AIService, ChatMessage } from '../types';
import { systemPrompt } from './groq';
import process from 'node:process';

const OPENCODE_GO_URL = process.env.OPENCODE_GO_URL ?? 'https://opencode.ai/zen/go/v1/chat/completions';
const API_KEY_OPENCODE_GO = process.env.API_KEY_OPENCODE_GO;

if (!API_KEY_OPENCODE_GO) {
  console.warn('Warning: API_KEY_OPENCODE_GO is not defined. OpenCode Go service may fail.');
}

export const opencodeService: AIService = {
  name: 'OpenCode Go',
  async chat(messages: ChatMessage[]) {
    const response = await fetch(OPENCODE_GO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
        Authorization: `Bearer ${API_KEY_OPENCODE_GO}`,
      },
      body: JSON.stringify({
        model: 'qwen3.6-plus',
        messages: [...messages, { role: 'system', content: systemPrompt }],
        temperature: 0.6,
        top_p: 1,
        max_tokens: 4096,
        stream: true,
        stop: ["\n\n"],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenCode Go request failed: ${response.status} ${response.statusText} - ${body}`);
    }

    if (!response.body) {
      const text = await response.text();
      return (async function* () {
        yield text;
      })();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return (async function* () {
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // ignorar líneas que no sean JSON válido
          }
        }
      }
    })();
  },
};

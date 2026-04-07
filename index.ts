import { groqService } from './services/groq';
import { cerebrasService } from './services/cerebras';
import type { AIService, ChatMessage } from './types';

const services: AIService[] = [
  groqService,
  // cerebrasService,
  // Google Gemini
  // OpenRouter
  // otro servicio incluso local
]
let currentServiceIndex = 0;

function getNextService() {
  const service = services[currentServiceIndex];
  currentServiceIndex = (currentServiceIndex + 1) % services.length;
  return service;
}

const server = Bun.serve({
  port: process.env.PORT ?? 3003,
  async fetch(req) {
    const { pathname } = new URL(req.url)

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (req.method === 'POST' && pathname === '/chat') {
      const { messages } = await req.json() as { messages: ChatMessage[] };
      console.log('messages', messages)
      const service = getNextService();

      console.log(`Using ${service?.name} service`);
      const stream = await service?.chat(messages)

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response("Not found", {
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
})

console.log(`Server is running on ${server.url}`);
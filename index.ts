import { groqService } from './services/groq';
import { cerebrasService } from './services/cerebras';
import { opencodeService } from './services/opencode';
import { formatArancelForPrompt, searchArancel } from './services/arancel';
import type { AIService, ChatMessage } from './types';

const services: AIService[] = [
  // groqService,
  opencodeService,
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
  idleTimeout: 0, // sin límite — los modelos de razonamiento tardan en responder
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

      const userMessage = messages.filter(m => m.role === 'user').pop();
      const userQuery = userMessage?.content ?? '';
      const relevantArancel = searchArancel(userQuery, 80);
      const arancelContext = formatArancelForPrompt(relevantArancel);
      const arancelSection = `\n\n=== BASE DE DATOS ARANCEL VENEZUELA (Decreto 4944 + 8 Reformas) ===\nEn base a la siguiente información del arancel oficial de Venezuela, realiza la clasificación:\n\n${arancelContext}\n=== FIN BASE DE DATOS ===\n`;

      console.log('arancelContext', arancelContext)

      console.log(`Using ${service?.name} service`);
      const stream = await service?.chat(messages, arancelSection)

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
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
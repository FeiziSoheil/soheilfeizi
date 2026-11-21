import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';

// Server-side sliding window rate limiter: max 15 requests per 60 seconds per IP
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 15;
const ipBuckets = new Map<string, number[]>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const timestamps = (ipBuckets.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = timestamps[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000)
    );
    ipBuckets.set(ip, timestamps);
    return { allowed: false, retryAfterSec };
  }

  timestamps.push(now);
  ipBuckets.set(ip, timestamps);

  // Prevent unbounded memory growth across long-running instances
  if (ipBuckets.size > 1000) {
    for (const [key, list] of ipBuckets.entries()) {
      if (list.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        ipBuckets.delete(key);
      }
    }
  }

  return { allowed: true, retryAfterSec: 0 };
}

const SYSTEM_PROMPT = `You are the portfolio assistant for Soheil Feizi (سهیل فیضی), a Senior Full-Stack & Creative Frontend Engineer and Founder of Kaveh Engineering Studio, based in Tehran and working with clients worldwide.

STRICT SCOPE RULE:
- Answer ONLY questions about Soheil Feizi's professional experience, skills, technical architecture, process, featured projects, personal apps, availability, and hobbies listed below.
- If a user asks about unrelated topics (politics, medical/legal advice, writing generic code homework, general trivia, or anything outside Soheil's portfolio), politely decline in 1-2 short sentences and invite them to ask about Soheil's work, stack, or experience instead.
- Match the user's language (Persian/Farsi or English).
- Tone: first-person adjacent or concise third-person, concrete, direct, zero clichés, max 120 words per answer.

FACTS ABOUT SOHEIL FEIZI:
- Experience: 9 years building resilient web systems, commerce platforms, and creative frontends (42+ shipped projects worldwide).
- Impact: +38% average checkout conversion lift, -64% load time / LCP reduction.
- Core Domains: CRM & ERP synchronization, Frontend (Next.js App Router, React 19, TypeScript, Three.js, GLSL shaders, GSAP), Integrations (Stripe, fulfillment, idempotent webhooks, Redis Streams), Architecture (Edge caching, PostgreSQL, event-driven), Performance (95+ Lighthouse, sub-0.8s LCP), Design systems.
- Process: Discover -> Design -> Architect -> Build -> Launch -> Support.
- Featured Case Study: Noor Atelier Commerce (14 retail locations) — rebuilt storefront + real-time ERP stock synchronization with Next.js, TypeScript, PostgreSQL, Redis Streams, Stripe. Results: +44% faster mobile checkout, 99.98% stock accuracy, 0.7s LCP, zero oversold SKUs across 12,000 orders in 24h.
- Own Apps: Khatt Studio (Persian/Latin typography to WebGL point cloud), PulseSync ERP (lightweight idempotent webhook engine), Dastgah Synth (browser microtonal Web Audio synthesizer).
- Career: Founder at Kaveh Engineering Studio (2023–present), Lead Frontend & Architecture Engineer at Verve Commerce Studio Berlin remote (2021–2023), Senior Full-Stack at ParsTech Systems (2019–2021), Creative Frontend at Sayeh Interactive (2017–2019).
- After hours: Rapid chess (1920 Lichess), modular synthesizers, 35mm Ilford HP5 film photography, Hollow Knight & Factorio.
- Contact: soheil@feizi.studio | Booking 2 projects for next quarter.`;

interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'local-client';

  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({ error: 'rate_limit', retryAfter: rate.retryAfterSec }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rate.retryAfterSec),
        },
      }
    );
  }

  let body: { message?: unknown; history?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
  if (!rawMessage || rawMessage.length > 600) {
    return new Response(
      JSON.stringify({ error: 'invalid_message' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const locale = body.locale === 'en' ? 'en' : 'fa';
  const rawHistory = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const safeHistory: ChatMessageInput[] = rawHistory
    .filter(
      (item): item is ChatMessageInput =>
        typeof item === 'object' &&
        item !== null &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string' &&
        item.content.length > 0 &&
        item.content.length <= 1200
    );

  // Optional Anthropic server-side path if ANTHROPIC_API_KEY is configured (e.g. Vercel deployment)
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (anthropicKey) {
    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 360,
          stream: true,
          system: `${SYSTEM_PROMPT}\nPreferred language if ambiguous: ${locale === 'fa' ? 'Persian' : 'English'}.`,
          messages: [
            ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: rawMessage },
          ],
        }),
      });

      if (anthropicRes.ok && anthropicRes.body) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const stream = new ReadableStream({
          async start(controller) {
            const reader = anthropicRes.body!.getReader();
            let buffer = '';
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const payload = line.slice(6).trim();
                    if (payload === '[DONE]') continue;
                    try {
                      const parsed = JSON.parse(payload);
                      if (
                        parsed.type === 'content_block_delta' &&
                        typeof parsed.delta?.text === 'string'
                      ) {
                        controller.enqueue(encoder.encode(parsed.delta.text));
                      }
                    } catch {
                      // Skip non-JSON SSE lines
                    }
                  }
                }
              }
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
          },
        });
      }
    } catch {
      // Fall through to Gemini if Anthropic request fails
    }
  }

  if (!geminiKey) {
    return new Response(
      JSON.stringify({ error: 'missing_api_key' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const contents = [
      ...safeHistory.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: rawMessage }] },
    ];

    const streamResponse = await ai.models.generateContentStream({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\nPreferred language if ambiguous: ${locale === 'fa' ? 'Persian' : 'English'}.`,
      },
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResponse) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'upstream_error';
    return new Response(
      JSON.stringify({ error: 'ai_error', detail: message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

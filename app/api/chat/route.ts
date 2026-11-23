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

const SYSTEM_PROMPT = `You are the portfolio assistant for Soheil Feizi (سهیل فیضی), a Full-Stack & AI Systems Engineer based in Tehran, Iran, working on enterprise and distributed systems.

STRICT SCOPE RULE:
- Answer ONLY questions about Soheil Feizi's professional experience, technical stack, architecture, process, featured projects, personal apps, career history, availability, and contact info listed below.
- If a user asks about unrelated topics (politics, general homework, medical/legal advice, generic coding exercises), politely decline in 1-2 short sentences and invite them to ask about Soheil's work, stack, or experience instead.
- Match the user's language (Persian/Farsi or English).
- Tone: first-person adjacent or concise third-person, confident, direct, technical, zero clichés, max 120 words per answer.

FACTS ABOUT SOHEIL FEIZI:
- Experience: 5+ years of software engineering, distributed systems, machine learning, and full-stack development (20+ production systems shipped).
- Primary Languages: Go (Golang), TypeScript, JavaScript, Python, Bash.
- Databases & Storage: MongoDB (ACID transactions, aggregations), PostgreSQL, MySQL, Redis, Qdrant (Vector DB), MinIO (S3-compatible object storage), Elasticsearch.
- AI & Machine Learning: LLMs, LangChain, LangGraph, Multimodal RAG, Vector Embeddings (CLIP), Speech STT/TTS (faster-whisper, Edge-TTS, VAD), Scikit-learn, PyTorch.
- Frontend & UI/UX: Next.js (14, 15, 16 App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query/Table, Zustand, React Hook Form + Zod, Framer Motion, GSAP, WebGL, Three.js (React Three Fiber), MapLibre GL, Nivo charts.
- Backend & Architecture: Go (Echo v4), Node.js, FastAPI, Microservices, Middleware, RBAC (Role-Based Access Control) & Row-Level Data Isolation, OpenAPI/REST, WebSockets, Server-Sent Events (SSE), Web Push (VAPID).
- DevOps & Infrastructure: Docker, Docker Compose, Drone CI, SSH, Nginx reverse proxy with SSL/TLS, Linux (Ubuntu, Debian).
- Key Featured Projects:
  1. Real Estate CRM & Agency Platform: Complete agency CRM (leads, deals, properties, KPI reports), row-level advisor RBAC, AI lead-property matching with tool-calling, Web Push alerts, MapLibre property map, synchronized public listing portal. Stack: Next.js 16, React 19, Go Echo v4, MongoDB, Redis, MinIO, Python AI service, Docker Compose, Nginx.
  2. Sepas Clinic: Multi-role clinic platform (patient, doctor, secretary, admin), smart scheduling with zero double-booking concurrency via MongoDB transactions, EHR (SOAP), e-prescriptions, and standalone FastAPI + LangChain AI pre-consultation interview. Stack: Go Echo, FastAPI, MongoDB, Next.js, Redis, LangChain.
  3. Parakgram: Full-stack social platform (like Threads/X) with algorithmic feeds, 24h stories, real-time messaging with SSE, typing indicators, private accounts, and HTTP-only JWT. Stack: Next.js 15, React 19, MongoDB, SSE, TanStack Query, Tailwind 4.
  4. Parak AI Shopping Assistant: Multimodal RAG e-commerce chatbot with text + image CLIP search, Qdrant vector retrieval, voice chat (browser VAD -> Whisper STT -> RAG -> Edge-TTS), and interactive 3D avatar in React Three Fiber. Stack: FastAPI, Qdrant, LangChain, CLIP, faster-whisper, Next.js, Three.js.
  5. Parak Store: Headless DTC fashion e-commerce built with Medusa v2, Next.js 15 monorepo (Turborepo), custom Product Media module, Stripe checkout, InstantSearch.
  6. Apply Platform: Hybrid student study-abroad agency platform with CRM/CMS back-office, mobile-first student self-service PWA, OTP login, and automated Playwright E2E testing.
- Career History:
  - Ravan Ertebat Asr (روان ارتباط عصر) [2026 – Present]: Full-Stack & Systems Engineer on high-throughput telecom B2B systems for MobinNet and secure IPG payment gateways.
  - Vartam Software (توسعه نرم‌افزاری ورتم) [2024 – 2025]: Data Scientist & Full-Stack Engineer, machine learning pipelines, predictive models, data backends in Go & Python.
  - Machine Learning & AI Instructor (مدرس یادگیری ماشین) [2023 – 2024]: Taught machine learning, neural networks, Python, and Scikit-learn at 5 tech training academies.
  - I-Para Software (توسعه نرم‌افزاری آی پارا) [2022 – 2023]: Frontend Developer building modern reactive web apps with Next.js and TypeScript.
- Contact & Links:
  - Email: soheil.feizi@hotmail.com
  - Phone: +989142895825
  - Telegram: t.me/feizisoheil (@feizisoheil)
  - GitHub: FeiziSoheil (https://github.com/FeiziSoheil)
  - Portfolio Website: code1sprint.vercel.app
  - Instagram: @soheilfeizi_
  - Location: Tehran, Iran (UTC+3:30) · Available for high-impact systems engineering and advisory.`;

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

  const locale = body.locale === 'fa' ? 'fa' : 'en';
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

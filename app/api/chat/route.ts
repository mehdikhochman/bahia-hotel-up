import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { prisma } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/ai/persona";
import { buildTools } from "@/lib/ai/tools";
import { getChatModel } from "@/lib/ai/client";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatRequestBody = {
  messages: UIMessage[];
  sessionId?: string;
};

export async function POST(req: Request) {
  // Lightweight abuse protection — 30 chat turns per IP per 10 min.
  const ip = getClientIp();
  const limit = await checkRateLimit("chat", ip, 30, "10 m");
  if (!limit.ok) {
    return new Response(
      JSON.stringify({
        error: "Trop de messages. Réessayez dans quelques minutes.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Lazy-create the persisted session on first call so the model can
  // call captureLeadEmail with a real sessionId from message 1.
  let sessionId = body.sessionId;
  if (!sessionId) {
    const created = await prisma.chatSession.create({
      data: { status: "OPEN" },
      select: { id: true },
    });
    sessionId = created.id;
  } else {
    const exists = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!exists) {
      const created = await prisma.chatSession.create({
        data: { id: sessionId, status: "OPEN" },
        select: { id: true },
      });
      sessionId = created.id;
    }
  }

  // Persist the LAST user message (we don't re-persist the full history;
  // we only ever store new user input + assistant outputs).
  const lastUser = [...body.messages]
    .reverse()
    .find((m) => m.role === "user");
  if (lastUser) {
    const textPart = lastUser.parts?.find((p) => p.type === "text");
    const text = textPart && "text" in textPart ? textPart.text : "";
    if (text) {
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: "USER",
          content: text,
        },
      });
    }
  }

  const tools = buildTools(sessionId);

  let model;
  try {
    model = getChatModel();
  } catch (e) {
    return new Response(
      JSON.stringify({
        error:
          "Le concierge n'est pas encore configuré. Définissez OPENROUTER_API_KEY ou OPENAI_API_KEY.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = streamText({
    model,
    system: buildSystemPrompt(new Date()),
    messages: convertToModelMessages(body.messages),
    tools,
    stopWhen: stepCountIs(6),
    temperature: 0.7,
    onFinish: async ({ text, toolCalls }) => {
      // Persist the assistant turn (best-effort, never blocks the stream).
      try {
        if (text) {
          await prisma.chatMessage.create({
            data: {
              sessionId,
              role: "ASSISTANT",
              content: text,
            },
          });
        }
        for (const call of toolCalls ?? []) {
          await prisma.chatMessage.create({
            data: {
              sessionId,
              role: "TOOL",
              content: "",
              toolName: call.toolName,
              toolArgs: call.input as object,
            },
          });
        }
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[chat] persist failed", e);
      }
    },
  });

  // Forward the lazily-created session id back to the client so it can
  // pin it in localStorage and keep the conversation linked.
  return result.toUIMessageStreamResponse({
    headers: { "x-chat-session-id": sessionId },
  });
}

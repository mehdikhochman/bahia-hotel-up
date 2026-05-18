"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import RoomCard, { type RoomCardData } from "./RoomCard";
import VoiceButton from "./VoiceButton";

const SESSION_KEY = "bahia.iya.sessionId";
const MESSAGES_KEY = "bahia.iya.messages";

const SUGGESTIONS = [
  "Disponibilités ce week-end",
  "Quelle villa avec vue océan ?",
  "Karaoké de samedi",
  "Comment venir depuis Abidjan ?",
];

const GREETING = `Bonjour 🌴 Je suis **Iya**, votre concierge Bahia. Je connais toutes nos villas, nos disponibilités en temps réel, et la péninsule d'Assinie comme ma poche.

Quand voulez-vous venir ? Ou que puis-je vous raconter sur l'hôtel ?`;

export default function IyaChat() {
  const [open, setOpen] = useState(false);
  const [hasBadge, setHasBadge] = useState(true);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pull a previous session out of localStorage on first mount.
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) setSessionId(stored);
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { ...body, messages, sessionId },
        }),
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          const id = res.headers.get("x-chat-session-id");
          if (id && id !== sessionId) {
            setSessionId(id);
            localStorage.setItem(SESSION_KEY, id);
          }
          return res;
        },
      }),
    [sessionId]
  );

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
  });

  // Restore messages on reload from localStorage so the conversation feels
  // continuous across pages and refreshes.
  useEffect(() => {
    if (messages.length > 0) return;
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
    } catch {
      // ignore
    }
  }, [setMessages, messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  function openPanel() {
    setOpen(true);
    setHasBadge(false);
  }

  function reset() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(MESSAGES_KEY);
    setSessionId(undefined);
    setMessages([]);
  }

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || status === "streaming" || status === "submitted") return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitText(input);
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={openPanel}
        aria-label="Ouvrir le chat Iya"
        className="fixed bottom-5 right-5 z-[60] group"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <span className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-sand-500 opacity-75 animate-ping" />
          <span className="relative w-14 h-14 rounded-full bg-gradient-to-br from-sand-400 to-sand-600 text-teal-800 grid place-items-center shadow-soft group-hover:scale-110 transition-transform">
            <Sparkles className="w-6 h-6" />
          </span>
          {hasBadge && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center border-2 border-ivory-100">
              1
            </span>
          )}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-teal-900/40 backdrop-blur-sm flex items-end md:items-center md:justify-end md:p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 220 }}
              className="relative w-full md:w-[420px] h-[88svh] md:h-[640px] md:max-h-[88vh] bg-ivory-100 md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <header className="bg-gradient-to-br from-teal-700 via-teal-600 to-teal-500 text-ivory-100 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-sand-400 text-teal-800 grid place-items-center shrink-0 shadow-inner">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-lg leading-tight">Iya</div>
                    <div className="text-ivory-100/70 text-[11px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Concierge Bahia · en ligne
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      onClick={reset}
                      className="w-9 h-9 grid place-items-center rounded-full hover:bg-ivory-100/10 text-ivory-100/80"
                      title="Nouvelle conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-9 h-9 grid place-items-center rounded-full hover:bg-ivory-100/10"
                    title="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </header>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 space-y-4 bg-ivory-50/40"
              >
                {messages.length === 0 && (
                  <MessageBubble role="ASSISTANT" text={GREETING} />
                )}

                {messages.map((m) => (
                  <RenderMessage key={m.id} message={m} />
                ))}

                {(status === "streaming" || status === "submitted") && (
                  <div className="flex items-center gap-2 text-teal-500 text-sm pl-1">
                    <TypingDots />
                  </div>
                )}

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-xs">
                    Une erreur est survenue. Réessayez.
                  </div>
                )}
              </div>

              {/* Suggestions (only before first user message) */}
              {messages.filter((m) => m.role === "user").length === 0 && (
                <div className="px-4 pb-2 flex gap-2 overflow-x-auto -mx-1 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submitText(s)}
                      className="shrink-0 px-3.5 py-2 rounded-full bg-white border border-teal-100 text-teal-700 text-xs hover:border-sand-400 hover:bg-sand-50 active:bg-sand-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Composer */}
              <footer className="px-3 py-3 border-t border-teal-100 bg-white/70 backdrop-blur-sm flex items-end gap-2 safe-bottom">
                <VoiceButton
                  disabled={status === "streaming" || status === "submitted"}
                  onTranscript={(t) => submitText(t)}
                />
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  rows={1}
                  placeholder="Posez votre question…"
                  className="flex-1 resize-none min-w-0 px-4 py-2.5 rounded-2xl border border-teal-100 bg-white text-teal-700 text-sm focus:outline-none focus:ring-2 focus:ring-sand-400 max-h-[120px]"
                />
                <button
                  type="button"
                  onClick={() => submitText(input)}
                  disabled={
                    !input.trim() ||
                    status === "streaming" ||
                    status === "submitted"
                  }
                  className="w-10 h-10 rounded-full grid place-items-center bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-ivory-100 disabled:opacity-40 touch-manipulation shrink-0"
                  aria-label="Envoyer"
                >
                  {status === "streaming" || status === "submitted" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------- internals -------------- */

type AnyMsg = ReturnType<typeof useChat>["messages"][number];

function RenderMessage({ message }: { message: AnyMsg }) {
  // Render textual content
  const text = (message.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join("");

  // Render tool calls — specifically the searchAvailableRooms results show
  // as rich cards inline.
  const toolParts = (message.parts ?? []).filter(
    (p) => typeof p.type === "string" && p.type.startsWith("tool-")
  );

  return (
    <div className="space-y-2">
      {text && (
        <MessageBubble
          role={message.role === "user" ? "USER" : "ASSISTANT"}
          text={text}
        />
      )}

      {toolParts.map((part, i) => {
        const type = part.type as string;
        const output = (part as { output?: unknown }).output;

        if (type === "tool-searchAvailableRooms" && output && typeof output === "object" && "rooms" in output) {
          const o = output as {
            rooms: Array<RoomCardData & { deepLink?: string }>;
            checkIn: string;
            checkOut: string;
            guests: number;
          };
          if (!Array.isArray(o.rooms)) return null;
          return (
            <div key={i} className="space-y-2 ml-9">
              {o.rooms.map((r) => (
                <RoomCard
                  key={r.id}
                  room={{
                    ...r,
                    deepLink: `/?openBooking=1&room=${r.id}&checkIn=${o.checkIn}&checkOut=${o.checkOut}&guests=${o.guests}#hebergements`,
                  }}
                />
              ))}
            </div>
          );
        }

        if (type === "tool-prefillBooking" && output && typeof output === "object" && "deepLink" in output) {
          const o = output as {
            deepLink: string;
            roomName: string;
            checkIn: string;
            checkOut: string;
          };
          return (
            <a
              key={i}
              href={o.deepLink}
              className="ml-9 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-sand-500 hover:bg-sand-400 active:bg-sand-600 text-teal-800 text-sm font-semibold shadow-sand transition-colors"
            >
              Réserver {o.roomName} →
            </a>
          );
        }

        return null;
      })}
    </div>
  );
}

function MessageBubble({
  role,
  text,
}: {
  role: "USER" | "ASSISTANT";
  text: string;
}) {
  const isUser = role === "USER";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-sand-400 text-teal-800 grid place-items-center shrink-0 mr-2 mt-1">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
          isUser
            ? "bg-teal-600 text-ivory-100 rounded-br-sm"
            : "bg-white border border-teal-100 text-teal-700 rounded-bl-sm"
        }`}
      >
        <SimpleMarkdown text={text} />
      </div>
    </div>
  );
}

/** Tiny markdown subset — bold (**...**) and line breaks. Avoids pulling
 *  a 50kb markdown lib for a chat bubble. */
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={li}>
            {parts.map((p, pi) =>
              p.startsWith("**") && p.endsWith("**") ? (
                <strong key={pi}>{p.slice(2, -2)}</strong>
              ) : (
                <span key={pi}>{p}</span>
              )
            )}
            {li < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" />
    </span>
  );
}

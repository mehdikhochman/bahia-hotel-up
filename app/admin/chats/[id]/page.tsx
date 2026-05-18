import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  User as UserIcon,
  Wrench,
  Mail,
  Phone,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ChatDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const session = await prisma.chatSession.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!session) notFound();

  return (
    <div>
      <Link
        href="/admin/chats"
        className="text-teal-500 text-sm flex items-center gap-1.5 mb-4 hover:text-teal-700"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux conversations
      </Link>

      <div className="mb-5">
        <h1 className="font-display text-xl sm:text-2xl text-teal-700">
          {session.guestName || "Visiteur anonyme"}
        </h1>
        <div className="text-teal-500 text-xs sm:text-sm flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          {session.guestEmail && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> {session.guestEmail}
            </span>
          )}
          {session.guestPhone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {session.guestPhone}
            </span>
          )}
          {session.language && (
            <span className="px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 text-[10px] uppercase">
              {session.language}
            </span>
          )}
          <span>· Démarrée {formatDateTime(session.createdAt)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-teal-100 p-4 sm:p-6 space-y-4">
        {session.messages.length === 0 && (
          <div className="text-teal-500/70 text-sm text-center py-6">
            Aucun message.
          </div>
        )}
        {session.messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
      </div>
    </div>
  );
}

type Msg = {
  id: string;
  role: "USER" | "ASSISTANT" | "TOOL" | "SYSTEM";
  content: string;
  toolName: string | null;
  toolArgs: unknown;
  createdAt: Date;
};

function MessageRow({ message }: { message: Msg }) {
  if (message.role === "TOOL") {
    return (
      <div className="flex gap-2 text-teal-500 text-xs italic">
        <Wrench className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div>
            Tool : <span className="font-mono">{message.toolName}</span>
          </div>
          {message.toolArgs ? (
            <pre className="mt-1 text-[10px] bg-ivory-200/50 rounded p-2 overflow-x-auto">
              {JSON.stringify(message.toolArgs, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
  const isUser = message.role === "USER";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${
          isUser
            ? "bg-teal-600 text-ivory-100"
            : "bg-sand-400 text-teal-800"
        }`}
      >
        {isUser ? (
          <UserIcon className="w-3.5 h-3.5" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
          isUser
            ? "bg-teal-600 text-ivory-100 rounded-br-sm"
            : "bg-ivory-200/60 text-teal-700 rounded-bl-sm"
        }`}
      >
        {message.content}
        <div
          className={`text-[10px] mt-1 ${
            isUser ? "text-ivory-100/60" : "text-teal-400"
          }`}
        >
          {formatDateTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

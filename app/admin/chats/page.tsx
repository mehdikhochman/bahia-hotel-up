import Link from "next/link";
import { MessageCircle, ArrowRight, Mail, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conversations Iya — Bahia",
  robots: { index: false },
};

export default async function AdminChatsPage() {
  await requireAdmin();

  const sessions = await prisma.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      _count: { select: { messages: true } },
      messages: {
        where: { role: "USER" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true },
      },
    },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="w-9 h-9 grid place-items-center rounded-full bg-sand-500 text-teal-800 shrink-0">
          <MessageCircle className="w-4 h-4" />
        </span>
        <h1 className="font-display text-xl sm:text-2xl md:text-3xl text-teal-700">
          Conversations Iya
        </h1>
      </div>
      <p className="text-teal-500 text-xs sm:text-sm mb-5">
        {sessions.length} dernière(s) conversation(s) avec la concierge
        virtuelle.
      </p>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-teal-100 py-14 text-center text-teal-500/80 text-sm">
          Aucune conversation pour le moment.
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const lastUser = s.messages[0];
            return (
              <li key={s.id}>
                <Link
                  href={`/admin/chats/${s.id}`}
                  className="block bg-white rounded-2xl border border-teal-100 p-4 hover:border-sand-400 active:bg-ivory-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-teal-700 font-medium text-sm">
                        {s.guestName || "Visiteur anonyme"}
                        {s.language && (
                          <span className="px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 text-[10px] uppercase">
                            {s.language}
                          </span>
                        )}
                        {s.bookingRef && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px]">
                            → résa
                          </span>
                        )}
                      </div>
                      <div className="text-teal-500 text-xs flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        {s.guestEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {s.guestEmail}
                          </span>
                        )}
                        {s.guestPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {s.guestPhone}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-teal-400 shrink-0" />
                  </div>
                  {lastUser && (
                    <div className="text-teal-600/80 text-xs italic line-clamp-2 mb-1.5">
                      « {lastUser.content} »
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 text-[11px] text-teal-400">
                    <span>{s._count.messages} message(s)</span>
                    <span>{formatDateTime(s.updatedAt)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

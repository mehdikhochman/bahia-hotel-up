import { prisma } from "@/lib/db";
import HomeShell from "./components/HomeShell";
import type { SerializedRoom } from "@/types";

export const revalidate = 60;

export default async function HomePage() {
  const rows = await prisma.room
    .findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { pricePerNight: "desc" }],
    })
    .catch(() => []);

  const rooms: SerializedRoom[] = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <main className="overflow-x-hidden">
      <HomeShell rooms={rooms} />
    </main>
  );
}

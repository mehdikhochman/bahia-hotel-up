"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const roomSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug trop court")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lettres minuscules, chiffres et tirets uniquement"),
  name: z.string().trim().min(2).max(80),
  type: z.enum(["VILLA", "ROOM"]),
  tagline: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(800),
  pricePerNight: z.coerce.number().int().positive("Prix invalide").max(10_000_000),
  capacity: z.coerce.number().int().min(1).max(20),
  surfaceSqm: z.coerce.number().int().min(5).max(2000),
  imageUrl: z.string().url("URL d'image invalide"),
  amenities: z
    .string()
    .transform((s) =>
      s
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string().min(1).max(40)).max(20)),
  isActive: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal(null)])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export type RoomFormResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function parseFormData(formData: FormData): RoomFormResult | z.infer<typeof roomSchema> {
  const parsed = roomSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    type: formData.get("type"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    pricePerNight: formData.get("pricePerNight"),
    capacity: formData.get("capacity"),
    surfaceSqm: formData.get("surfaceSqm"),
    imageUrl: formData.get("imageUrl"),
    amenities: formData.get("amenities"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".") || "_";
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return {
      ok: false,
      error: "Formulaire invalide. Vérifiez les champs.",
      fieldErrors,
    };
  }
  return parsed.data;
}

export async function createRoomAction(
  _prev: RoomFormResult,
  formData: FormData
): Promise<RoomFormResult> {
  await requireAdmin();
  const result = parseFormData(formData);
  if ("ok" in result) return result;

  const exists = await prisma.room.findUnique({ where: { slug: result.slug } });
  if (exists) {
    return { ok: false, error: "Ce slug est déjà utilisé." };
  }

  await prisma.room.create({ data: result });

  revalidatePath("/admin/rooms");
  revalidatePath("/");
  redirect("/admin/rooms");
}

export async function updateRoomAction(
  id: string,
  _prev: RoomFormResult,
  formData: FormData
): Promise<RoomFormResult> {
  await requireAdmin();
  const result = parseFormData(formData);
  if ("ok" in result) return result;

  // Slug collision (different room owns it)
  const slugTaken = await prisma.room.findFirst({
    where: { slug: result.slug, NOT: { id } },
  });
  if (slugTaken) {
    return { ok: false, error: "Ce slug est déjà utilisé." };
  }

  await prisma.room.update({ where: { id }, data: result });

  revalidatePath("/admin/rooms");
  revalidatePath(`/admin/rooms/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function toggleRoomActiveAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) return;
  await prisma.room.update({
    where: { id },
    data: { isActive: !room.isActive },
  });
  revalidatePath("/admin/rooms");
  revalidatePath("/");
}

export async function deleteRoomAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") || "");

  // Block if there are bookings — soft-delete instead by deactivating
  const bookings = await prisma.booking.count({ where: { roomId: id } });
  if (bookings > 0) {
    await prisma.room.update({
      where: { id },
      data: { isActive: false },
    });
    // eslint-disable-next-line no-console
    console.log(
      `[audit] ${session.email} deactivated room ${id} (has ${bookings} bookings)`
    );
  } else {
    await prisma.room.delete({ where: { id } });
    // eslint-disable-next-line no-console
    console.log(`[audit] ${session.email} deleted room ${id}`);
  }
  revalidatePath("/admin/rooms");
  revalidatePath("/");
  redirect("/admin/rooms");
}

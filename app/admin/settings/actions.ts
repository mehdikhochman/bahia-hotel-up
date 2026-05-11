"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { updateWaveSettings } from "@/lib/settings";

const schema = z.object({
  number: z
    .string()
    .trim()
    .regex(/^[+0-9 ]{8,20}$/, "Numéro invalide (chiffres, espaces et + uniquement)"),
  link: z
    .string()
    .trim()
    .url("Lien invalide")
    .refine(
      (v) => v.startsWith("https://"),
      "Le lien doit commencer par https://"
    ),
  merchantName: z.string().trim().min(2, "Trop court").max(80, "Trop long"),
});

export type SettingsFormResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function updateWaveSettingsAction(
  _prev: SettingsFormResult,
  formData: FormData
): Promise<SettingsFormResult> {
  const session = await requireAdmin();

  const parsed = schema.safeParse({
    number: formData.get("number"),
    link: formData.get("link"),
    merchantName: formData.get("merchantName"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".") || "_";
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return {
      ok: false,
      error: "Vérifiez les champs.",
      fieldErrors,
    };
  }

  await updateWaveSettings(parsed.data);

  // eslint-disable-next-line no-console
  console.log(`[audit] ${session.email} updated Wave settings`);

  // Refresh both the admin page and any open checkout page
  revalidatePath("/admin/settings");
  revalidatePath("/checkout", "layout");

  return { ok: true };
}

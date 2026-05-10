"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  setSessionCookie,
  signSession,
  verifyCredentials,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().trim().email("Email invalide").toLowerCase(),
  password: z.string().min(1, "Mot de passe requis"),
  from: z.string().nullish(),
});

export async function signIn(_: unknown, formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    from: formData.get("from"),
  });
  if (!parsed.success) {
    // Surface only user-actionable issues; ignore internal/hidden fields.
    const issue =
      parsed.error.issues.find((i) =>
        ["email", "password"].includes(String(i.path[0]))
      ) ?? parsed.error.issues[0];
    return { error: issue?.message ?? "Formulaire invalide" };
  }

  // Two buckets: per-IP and per-email — neither alone is enough.
  const ip = getClientIp();
  const ipLimit = await checkRateLimit("signin:ip", ip, 10, "5 m");
  const emailLimit = await checkRateLimit(
    "signin:email",
    parsed.data.email,
    5,
    "10 m"
  );
  if (!ipLimit.ok || !emailLimit.ok) {
    return {
      error: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
    };
  }

  const session = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!session) {
    return { error: "Identifiants incorrects." };
  }

  const token = await signSession(session);
  await setSessionCookie(token);

  const dest =
    parsed.data.from && parsed.data.from.startsWith("/admin")
      ? parsed.data.from
      : "/admin";
  redirect(dest);
}

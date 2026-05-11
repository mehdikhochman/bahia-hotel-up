import "server-only";
import { cache } from "react";
import { prisma } from "./db";

export const SETTING_KEYS = {
  WAVE_NUMBER: "wave.number",
  WAVE_LINK: "wave.link",
  WAVE_MERCHANT_NAME: "wave.merchantName",
} as const;

export type WaveSettings = {
  number: string;
  link: string;
  merchantName: string;
};

/**
 * Returns Wave config — DB values take precedence, env vars are the safety net
 * (useful on a fresh deployment before staff has saved anything).
 *
 * Wrapped in `cache()` to dedupe lookups within a single React render.
 */
export const getWaveSettings = cache(async (): Promise<WaveSettings> => {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(SETTING_KEYS) } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    number:
      map.get(SETTING_KEYS.WAVE_NUMBER) ||
      process.env.NEXT_PUBLIC_WAVE_NUMBER ||
      "+225 07 00 00 00 00",
    link:
      map.get(SETTING_KEYS.WAVE_LINK) ||
      process.env.NEXT_PUBLIC_WAVE_LINK ||
      "",
    merchantName:
      map.get(SETTING_KEYS.WAVE_MERCHANT_NAME) ||
      process.env.NEXT_PUBLIC_WAVE_MERCHANT_NAME ||
      "BAHIA HOTEL — ASSINIE",
  };
});

export async function updateWaveSettings(input: Partial<WaveSettings>) {
  const entries: Array<[string, string]> = [];
  if (input.number !== undefined)
    entries.push([SETTING_KEYS.WAVE_NUMBER, input.number]);
  if (input.link !== undefined)
    entries.push([SETTING_KEYS.WAVE_LINK, input.link]);
  if (input.merchantName !== undefined)
    entries.push([SETTING_KEYS.WAVE_MERCHANT_NAME, input.merchantName]);

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );
}

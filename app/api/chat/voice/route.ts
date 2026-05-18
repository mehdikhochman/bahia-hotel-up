import { NextResponse } from "next/server";
import { experimental_transcribe as transcribe } from "ai";
import { openai } from "@ai-sdk/openai";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Transcribes a short audio blob with Whisper.
 *
 * Body: multipart/form-data with field "audio" (any browser-recorded format
 * — webm/opus, mp4, etc.). Returns { text, language? }.
 */
export async function POST(req: Request) {
  const ip = getClientIp();
  const limit = await checkRateLimit("voice", ip, 10, "5 m");
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Trop de transcriptions. Réessayez plus tard." },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }
  const file = form.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "audio missing" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Fichier audio trop volumineux (5 Mo max)." },
      { status: 413 }
    );
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const { text, language } = await transcribe({
      model: openai.transcription("whisper-1"),
      audio: buf,
    });
    return NextResponse.json({ text, language });
  } catch (e) {
    console.error("[voice] transcription failed", e);
    return NextResponse.json(
      { error: "Échec de la transcription." },
      { status: 500 }
    );
  }
}

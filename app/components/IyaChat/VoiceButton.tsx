"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

type Props = {
  disabled?: boolean;
  onTranscript: (text: string) => void;
};

export default function VoiceButton({ disabled, onTranscript }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "uploading">(
    "idle"
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        setState("uploading");
        try {
          const fd = new FormData();
          fd.append("audio", blob, "voice.webm");
          const res = await fetch("/api/chat/voice", {
            method: "POST",
            body: fd,
          });
          const json = await res.json();
          if (json.text) onTranscript(json.text);
        } catch (e) {
          console.error("voice upload failed", e);
        } finally {
          setState("idle");
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setState("recording");
    } catch (e) {
      console.error("mic denied or unavailable", e);
      alert(
        "Impossible d'accéder au micro. Autorisez l'accès dans les réglages du navigateur."
      );
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
  }

  return (
    <button
      type="button"
      disabled={disabled || state === "uploading"}
      onClick={() => (state === "recording" ? stop() : start())}
      className={`w-10 h-10 rounded-full grid place-items-center transition-colors touch-manipulation shrink-0 ${
        state === "recording"
          ? "bg-red-500 text-white animate-pulse"
          : state === "uploading"
            ? "bg-teal-200 text-teal-700"
            : "bg-teal-50 text-teal-600 hover:bg-teal-100 active:bg-teal-200"
      }`}
      title={
        state === "recording"
          ? "Arrêter l'enregistrement"
          : "Parler à Iya"
      }
      aria-label="Entrée vocale"
    >
      {state === "uploading" ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : state === "recording" ? (
        <Square className="w-4 h-4" fill="currentColor" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
}

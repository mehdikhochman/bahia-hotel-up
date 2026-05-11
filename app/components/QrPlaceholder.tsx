"use client";

import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  /** URL or text to encode. If empty, renders a stylized placeholder. */
  value?: string | null;
  /** Used by the placeholder fallback for deterministic patterns. */
  seed?: string;
  className?: string;
};

/**
 * Renders a real Wave QR code when a `value` is provided, otherwise falls
 * back to a stylized placeholder (useful before the Wave link is configured).
 */
export default function QrPlaceholder({
  value,
  seed = "BAHIA",
  className = "",
}: Props) {
  if (value && value.length > 0) {
    return (
      <div
        className={`bg-white p-3 rounded-md flex items-center justify-center ${className}`}
      >
        <QRCodeSVG
          value={value}
          size={240}
          level="M"
          marginSize={0}
          bgColor="#FFFFFF"
          fgColor="#00445C"
          style={{ width: "100%", height: "100%", maxWidth: 240 }}
        />
      </div>
    );
  }
  return <FakePattern seed={seed} className={className} />;
}

function FakePattern({ seed, className }: { seed: string; className: string }) {
  const cells = 25;
  const grid = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    }
    return Array.from({ length: cells * cells }, (_, i) => {
      const x = i % cells;
      const y = Math.floor(i / cells);
      const inFinderFrame = (cx: number, cy: number) => {
        const ix = x - cx;
        const iy = y - cy;
        if (ix < 0 || iy < 0 || ix > 6 || iy > 6) return false;
        if (ix === 0 || ix === 6 || iy === 0 || iy === 6) return true;
        if (ix >= 2 && ix <= 4 && iy >= 2 && iy <= 4) return true;
        return false;
      };
      const isFinder =
        inFinderFrame(0, 0) ||
        inFinderFrame(cells - 7, 0) ||
        inFinderFrame(0, cells - 7);
      const rnd = ((x * 31 + y * 17 + h) >>> 0) % 100;
      return isFinder || rnd < 42;
    });
  }, [seed]);
  return (
    <div
      className={`grid w-full h-full gap-px bg-white p-2 rounded-md ${className}`}
      style={{ gridTemplateColumns: `repeat(${cells}, 1fr)` }}
      aria-label="QR placeholder"
    >
      {grid.map((on, i) => (
        <div
          key={i}
          className={on ? "bg-teal-800 rounded-[1px]" : "bg-transparent"}
        />
      ))}
    </div>
  );
}

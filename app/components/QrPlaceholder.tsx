"use client";

import { useMemo } from "react";

type Props = {
  /** Seed text — controls the deterministic pattern. */
  seed?: string;
  className?: string;
};

/**
 * Stylized QR-code placeholder.
 *
 * NOT a real QR encoder — only the three finder patterns are exact.
 * Replace this component with `<img src={waveQrUrl} />` once you have
 * the QR image from your Wave Business account.
 */
export default function QrPlaceholder({ seed = "BAHIA", className = "" }: Props) {
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

      // Pseudo-random fill from seed hash
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

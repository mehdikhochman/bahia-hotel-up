"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getRoomAvailability, type BookedRange } from "@/app/actions/availability";

type Props = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  onChange: (next: { checkIn: string; checkOut: string }) => void;
};

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function iso(d: Date) {
  return d.toISOString().split("T")[0];
}
function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return iso(d);
}

/** Generates the calendar cells for one month (Monday-first), with leading blanks. */
function monthGrid(year: number, monthIdx: number) {
  const first = new Date(Date.UTC(year, monthIdx, 1));
  const last = new Date(Date.UTC(year, monthIdx + 1, 0));
  const startDow = (first.getUTCDay() + 6) % 7; // 0 = Mon
  const cells: Array<{ date: string; day: number } | null> = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= last.getUTCDate(); d++) {
    const date = new Date(Date.UTC(year, monthIdx, d));
    cells.push({ date: iso(date), day: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function rangeContains(date: string, range: { start: string; end: string }) {
  return date >= range.start && date < range.end;
}

export default function AvailabilityCalendar({
  roomId,
  checkIn,
  checkOut,
  onChange,
}: Props) {
  const [booked, setBooked] = useState<BookedRange[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);
    getRoomAvailability(roomId, 6)
      .then((r) => {
        if (!cancelled) setBooked(r);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const grid = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);

  const isBooked = (date: string) =>
    booked.some((b) => rangeContains(date, b));

  const inSelection = (date: string) =>
    checkIn && checkOut && date >= checkIn && date < checkOut;

  const today = todayISO();

  function handleClick(date: string) {
    if (date < today) return;
    if (isBooked(date)) return;

    // Start new range if none, or if both endpoints already chosen, or if clicking before checkIn
    if (!checkIn || (checkIn && checkOut) || date < checkIn) {
      onChange({ checkIn: date, checkOut: "" });
      return;
    }

    // Reject if range crosses any booked night
    if (date > checkIn) {
      const conflicts = booked.some(
        (b) => b.start < date && b.end > checkIn // half-open overlap
      );
      if (conflicts) {
        onChange({ checkIn: date, checkOut: "" });
        return;
      }
      onChange({ checkIn, checkOut: date });
    }
  }

  return (
    <div className="rounded-2xl border border-teal-100 bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => {
            const m = cursor.m - 1;
            setCursor(m < 0 ? { y: cursor.y - 1, m: 11 } : { y: cursor.y, m });
          }}
          className="w-8 h-8 grid place-items-center rounded-full hover:bg-ivory-200 text-teal-600"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="font-display text-teal-700 text-base">
          {MONTH_NAMES[cursor.m]} {cursor.y}
        </div>
        <button
          type="button"
          onClick={() => {
            const m = cursor.m + 1;
            setCursor(m > 11 ? { y: cursor.y + 1, m: 0 } : { y: cursor.y, m });
          }}
          className="w-8 h-8 grid place-items-center rounded-full hover:bg-ivory-200 text-teal-600"
          aria-label="Mois suivant"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1 text-[10px] uppercase tracking-widest text-teal-400">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-sm">
        {grid.map((c, i) => {
          if (!c) return <div key={i} />;
          const past = c.date < today;
          const bookedDay = isBooked(c.date);
          const isStart = c.date === checkIn;
          const isEnd = c.date === checkOut;
          const inRange = inSelection(c.date);
          const disabled = past || bookedDay;

          let cls = "relative h-9 sm:h-10 rounded-md transition-colors text-xs sm:text-sm ";
          if (disabled) {
            cls += "text-teal-300 cursor-not-allowed ";
            if (bookedDay) cls += "line-through ";
          } else if (isStart || isEnd) {
            cls += "bg-teal-500 text-ivory-100 font-semibold cursor-pointer ";
          } else if (inRange) {
            cls += "bg-sand-100 text-teal-700 cursor-pointer ";
          } else {
            cls += "text-teal-700 hover:bg-ivory-200 cursor-pointer ";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(c.date)}
              className={cls}
              aria-label={c.date}
            >
              {c.day}
              {bookedDay && !past && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-teal-100 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-teal-500">
        <Legend swatch="bg-teal-500" label="Sélection" />
        <Legend swatch="bg-sand-100 border border-sand-200" label="Nuits incluses" />
        <Legend swatch="bg-white border border-red-300" dot label="Indisponible" />
        {loading && <span className="ml-auto text-teal-400">chargement…</span>}
      </div>
    </div>
  );
}

function Legend({
  swatch,
  label,
  dot,
}: {
  swatch: string;
  label: string;
  dot?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded ${swatch} relative inline-block`}>
        {dot && (
          <span className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-red-500" />
        )}
      </span>
      {label}
    </span>
  );
}

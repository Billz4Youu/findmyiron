"use client";

import { useState } from "react";
import { CalendarHeart, CheckCircle2 } from "lucide-react";
import type { BorrowHistory } from "@/types/iron";
import {
  dayLabel,
  formatTime,
  groupByDay,
  lastDays,
  toJakartaIsoDate,
} from "@/lib/historyDates";
import { parseRoomMeta } from "@/lib/roomMeta";

const historyCardThemes = [
  {
    card: "bg-[#D8F0FA]",
    icon: "bg-white text-[#22A7F0]",
  },
  {
    card: "bg-[#EFE1FF]",
    icon: "bg-white text-[#6944D8]",
  },
  {
    card: "bg-[#DCF5E7]",
    icon: "bg-white text-emerald-600",
  },
  {
    card: "bg-[#FFE6E2]",
    icon: "bg-white text-rose-500",
  },
];

export default function BorrowHistoryCard({
  history,
}: {
  history: BorrowHistory[];
}) {
  const today = toJakartaIsoDate(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const days = lastDays(today, 7);

  const datedHistory = history.map((item) => ({
    ...item,
    date: toJakartaIsoDate(item.returned_at ?? item.created_at),
  }));

  const activeDates = new Set(datedHistory.map((item) => item.date));
  const filteredHistory = selectedDate
    ? datedHistory.filter((item) => item.date === selectedDate)
    : datedHistory;
  const groups = groupByDay(filteredHistory);

  return (
    <section
      aria-labelledby="history-title"
      className="relative overflow-hidden rounded-[36px] bg-white p-6 text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      {/* Dekorasi daun garis tipis di sudut kanan atas seperti layar kanan referensi */}
      <svg
        aria-hidden="true"
        viewBox="0 0 90 90"
        fill="none"
        className="pointer-events-none absolute -right-3 top-3 h-20 w-20 text-[#8ECDF2]/65"
      >
        <path
          d="M78 18C52 16 28 32 22 58C18 72 30 82 46 76C64 69 76 46 78 18Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M74 22L28 68M58 26L46 38M64 42L48 54"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative flex items-center justify-between gap-2">
        <h2
          id="history-title"
          className="flex items-center gap-2.5 text-base font-extrabold text-slate-900"
        >
          <span className="rounded-2xl bg-[#EFE1FF] p-2 text-[#6944D8]">
            <CalendarHeart className="h-4 w-4" aria-hidden="true" />
          </span>
          Riwayat (Bulan Ini)
        </h2>

        {selectedDate ? (
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="rounded-full bg-[#22A7F0] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs transition-all duration-200 hover:bg-[#1B95D8] active:scale-95"
          >
            Semua Tanggal
          </button>
        ) : (
          <span className="rounded-full bg-[#F4F7FB] px-3 py-1 text-xs font-bold text-slate-500">
            7 Hari Terakhir
          </span>
        )}
      </div>

      {/* Mini calendar strip bergaya kapsul hitam vertikal dengan lingkaran angka putih */}
      <ol
        className="relative mt-5 grid grid-cols-7 gap-1.5"
        aria-label="Filter 7 hari terakhir"
      >
        {days.map((d) => {
          const isToday = d.iso === today;
          const isSelected = selectedDate === d.iso;
          const isActive = isSelected || (selectedDate === null && isToday);
          const hasData = activeDates.has(d.iso);

          return (
            <li key={d.iso}>
              <button
                type="button"
                onClick={() =>
                  setSelectedDate((prev) => (prev === d.iso ? null : d.iso))
                }
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                className={`flex w-full flex-col items-center gap-1.5 rounded-full px-1 py-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                  isActive
                    ? "bg-[#16181E] text-white shadow-md"
                    : "bg-transparent text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${
                    isActive
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "bg-[#F4F7FB] text-slate-800"
                  }`}
                >
                  {d.day}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                >
                  {d.weekday}
                </span>
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    hasData
                      ? isActive
                        ? "bg-[#22A7F0]"
                        : "bg-[#6944D8]"
                      : "bg-transparent"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>

      {/* Handle pemisah bergaya bottom-sheet seperti layar kanan referensi */}
      <div
        aria-hidden="true"
        className="mx-auto mt-5 mb-4 h-1 w-9 rounded-full bg-slate-200"
      />

      {groups.length === 0 ? (
        <div className="rounded-3xl bg-[#F4F7FB] p-4 text-center">
          <p className="text-sm font-medium text-slate-600">
            {selectedDate
              ? `Tidak ada riwayat peminjaman pada ${dayLabel(selectedDate, today)}.`
              : "Belum ada peminjaman bulan ini."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([date, items]) => (
            <div key={date}>
              <h3 className="mb-2.5 text-xs font-extrabold text-slate-500">
                {dayLabel(date, today)}
              </h3>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((item, i) => {
                  const { displayRoom } = parseRoomMeta(item.room_number);
                  const theme =
                    historyCardThemes[i % historyCardThemes.length];
                  return (
                    <li
                      key={item.id}
                      className={`flex items-center gap-3 rounded-[24px] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${theme.card}`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-2xs ${theme.icon}`}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {item.borrower_name}
                        </p>
                        <p className="text-xs font-semibold text-slate-600">
                          Kamar {displayRoom}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs">
                        {formatTime(item.borrowed_at)} –{" "}
                        {formatTime(item.returned_at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

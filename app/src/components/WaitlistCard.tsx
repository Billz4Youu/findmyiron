"use client";

import { useState } from "react";
import { Users, Hourglass, Sparkles, X, KeyRound } from "lucide-react";
import type { BorrowHistory } from "@/types/iron";
import { formatTime } from "@/lib/historyDates";
import { parseRoomMeta } from "@/lib/roomMeta";

const waitlistThemes = [
  {
    tile: "bg-[#D8F0FA]",
    badge: "bg-white text-[#22A7F0]",
  },
  {
    tile: "bg-[#EFE1FF]",
    badge: "bg-white text-[#6944D8]",
  },
  {
    tile: "bg-[#DCF5E7]",
    badge: "bg-white text-emerald-600",
  },
  {
    tile: "bg-[#FFE6E2]",
    badge: "bg-white text-rose-500",
  },
];

interface WaitlistCardProps {
  waitlist: BorrowHistory[];
  onCancelWaitlist: (historyId: string, inputPin: string) => Promise<void>;
}

export default function WaitlistCard({
  waitlist,
  onCancelWaitlist,
}: WaitlistCardProps) {
  const [cancellingPerson, setCancellingPerson] =
    useState<BorrowHistory | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  function openPinPrompt(person: BorrowHistory) {
    setCancellingPerson(person);
    setPinInput("");
    setPinError(null);
  }

  function closePinPrompt() {
    if (isCancelling) return;
    setCancellingPerson(null);
    setPinInput("");
    setPinError(null);
  }

  async function handleConfirmCancel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cancellingPerson) return;

    const cleanPin = pinInput.trim();
    if (cleanPin.length !== 4) {
      setPinError("Masukkan 4 digit PIN saat mendaftar antrean.");
      return;
    }

    setIsCancelling(true);
    setPinError(null);
    try {
      await onCancelWaitlist(cancellingPerson.id, cleanPin);
      setCancellingPerson(null);
      setPinInput("");
    } catch (err) {
      setPinError(
        err instanceof Error ? err.message : "PIN salah! Gagal membatalkan."
      );
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <>
      <section
        aria-labelledby="waitlist-title"
        className="relative overflow-hidden rounded-[36px] bg-white p-6 text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
      >
        {/* Garis handle sheet di atas tengah seperti referensi */}
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-9 rounded-full bg-slate-200"
        />

        {/* Ilustrasi SVG awan & gelembung melayang di background */}
        <svg
          aria-hidden="true"
          viewBox="0 0 320 160"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
        >
          <g className="animate-float">
            <circle cx="285" cy="36" r="10" fill="#E0F2FE" />
            <circle cx="268" cy="42" r="7" fill="#F3E8FF" />
            <circle cx="300" cy="43" r="6" fill="#BAE6FD" />
          </g>
          <g className="animate-float [animation-delay:1.4s]">
            <circle cx="38" cy="128" r="8" fill="#DCFCE7" />
            <circle cx="52" cy="134" r="5" fill="#FEF3C7" />
          </g>
          <circle
            cx="180"
            cy="24"
            r="4"
            fill="#E9D5FF"
            className="animate-steam"
          />
          <circle
            cx="235"
            cy="135"
            r="5"
            fill="#BAE6FD"
            className="animate-steam [animation-delay:0.9s]"
          />
        </svg>

        {/* Watermark jam pasir & kilau berdenyut lambat */}
        <Hourglass
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 right-3 h-20 w-20 rotate-12 text-slate-100 animate-pulse"
        />
        <Sparkles
          aria-hidden="true"
          className="pointer-events-none absolute right-14 top-12 h-6 w-6 text-amber-300/60 animate-float"
        />

        <div className="relative flex items-center justify-between">
          <h2
            id="waitlist-title"
            className="flex items-center gap-2.5 text-base font-extrabold text-slate-900"
          >
            <span className="rounded-2xl bg-[#D8F0FA] p-2 text-[#22A7F0]">
              <Users className="h-4 w-4" aria-hidden="true" />
            </span>
            Antrean Saat Ini
          </h2>
          <span className="rounded-full bg-[#EFE1FF] px-3 py-1 text-xs font-extrabold text-[#6944D8]">
            {waitlist.length} orang
          </span>
        </div>

        {waitlist.length === 0 ? (
          <div className="relative mt-4 rounded-3xl bg-[#F4F7FB] p-4 text-center">
            <p className="text-sm font-semibold text-slate-600">
              Belum ada yang antre. Gas langsung pinjam!
            </p>
          </div>
        ) : (
          <ol className="relative mt-4 space-y-3">
            {waitlist.map((person, i) => {
              const theme = waitlistThemes[i % waitlistThemes.length];
              const { displayRoom } = parseRoomMeta(person.room_number);

              return (
                <li
                  key={person.id}
                  className={`group flex items-center gap-3.5 rounded-[24px] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${theme.tile}`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-2xs transition-transform duration-200 group-hover:scale-105 ${theme.badge}`}
                  >
                    #{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-900">
                      {person.borrower_name}
                    </p>
                    <p className="text-xs font-semibold text-slate-600">
                      Kamar {displayRoom}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-2xs">
                    <Hourglass
                      className="h-3 w-3 animate-pulse text-[#22A7F0]"
                      aria-hidden="true"
                    />
                    {formatTime(person.created_at)}
                  </span>

                  <button
                    type="button"
                    onClick={() => openPinPrompt(person)}
                    aria-label={`Batalkan antrean ${person.borrower_name}`}
                    title="Batalkan antrean dengan PIN"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#16181E] text-white transition-all duration-200 hover:bg-rose-600 active:scale-95"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Modal prompt input PIN berada di luar <section> agar tidak terperangkap overflow/transform */}
      {cancellingPerson && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closePinPrompt}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-pin-title"
            className="w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-6 text-slate-800 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="rounded-2xl bg-rose-100 p-2.5 text-rose-600">
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3
                    id="cancel-pin-title"
                    className="text-base font-extrabold text-slate-900"
                  >
                    Batal Antre
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Antrean milik {cancellingPerson.borrower_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePinPrompt}
                aria-label="Tutup dialog PIN"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 hover:bg-slate-200 active:scale-95"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="cancel-pin-input"
                  className="mb-1.5 block text-xs font-bold text-slate-700"
                >
                  Masukkan 4 digit PIN saat mendaftar:
                </label>
                <input
                  id="cancel-pin-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  required
                  disabled={isCancelling}
                  placeholder="8392"
                  value={pinInput}
                  onChange={(e) =>
                    setPinInput(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl font-extrabold tracking-[0.35em] text-slate-900 placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none"
                />
              </div>

              {pinError && (
                <p
                  role="alert"
                  className="rounded-2xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
                >
                  {pinError}
                </p>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={closePinPrompt}
                  disabled={isCancelling}
                  className="min-h-11 flex-1 rounded-full bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-200 active:scale-95"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="min-h-11 flex-1 rounded-full bg-rose-600 px-3 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all duration-200 hover:bg-rose-700 active:scale-95 disabled:opacity-60"
                >
                  {isCancelling ? "Mengecek..." : "Batalkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

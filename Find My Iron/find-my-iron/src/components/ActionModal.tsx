"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, DoorOpen, User, Hourglass, Clock } from "lucide-react";
import { DEFAULT_OVERDUE_MINUTES } from "@/lib/roomMeta";

export type ActionModalMode = "checkin" | "waitlist";

const DURATION_OPTIONS = [
  { value: 15, label: "15 Menit" },
  { value: 30, label: "30 Menit" },
];

interface ActionModalProps {
  isOpen: boolean;
  mode: ActionModalMode;
  onClose: () => void;
  onSubmit: (
    borrowerName: string,
    roomNumber: string,
    durationMinutes: number
  ) => Promise<void>;
}

export default function ActionModal({
  isOpen,
  mode,
  onClose,
  onSubmit,
}: ActionModalProps) {
  const [borrowerName, setBorrowerName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(
    DEFAULT_OVERDUE_MINUTES
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const isWaitlist = mode === "waitlist";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanName = borrowerName.trim();
    const cleanRoom = roomNumber.trim();

    if (!cleanName || !cleanRoom) {
      setErrorMessage("Nama dan nomor kamar wajib diisi ya!");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit(cleanName, cleanRoom, durationMinutes);
      setBorrowerName("");
      setRoomNumber("");
      setDurationMinutes(DEFAULT_OVERDUE_MINUTES);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : isWaitlist
            ? "Gagal mendaftar antrean. Coba lagi."
            : "Gagal meminjam setrika. Coba lagi."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-modal-title"
        className="relative w-full max-w-sm rounded-[36px] bg-white p-6 text-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-9 rounded-full bg-slate-200"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`rounded-2xl p-2.5 ${
                isWaitlist
                  ? "bg-[#EFE1FF] text-[#6944D8]"
                  : "bg-[#D8F0FA] text-[#22A7F0]"
              }`}
            >
              {isWaitlist ? (
                <Hourglass className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <h2
                id="action-modal-title"
                className="text-lg font-extrabold text-slate-900"
              >
                {isWaitlist ? "Ikut Antrean" : "Pinjam Setrika"}
              </h2>
              <p className="text-xs font-medium text-slate-500">
                {isWaitlist
                  ? "Daftar antrean supaya dapat giliran berikutnya"
                  : "Isi data biar teman asrama tahu posisi setrika"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup modal"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F7FB] text-slate-600 transition-all duration-200 hover:bg-slate-200 hover:text-slate-900 active:scale-95"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="borrower-name"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700"
            >
              <User className="h-3.5 w-3.5 text-[#22A7F0]" aria-hidden="true" />
              Nama Panggilan
            </label>
            <input
              id="borrower-name"
              type="text"
              required
              autoFocus
              disabled={isSubmitting}
              placeholder="Contoh: Rodi"
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              className="w-full rounded-full border-2 border-transparent bg-[#F4F7FB] px-4 py-3 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-[#22A7F0] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="room-number"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700"
            >
              <DoorOpen
                className="h-3.5 w-3.5 text-[#6944D8]"
                aria-hidden="true"
              />
              Nomor Kamar
            </label>
            <input
              id="room-number"
              type="text"
              required
              disabled={isSubmitting}
              placeholder="Contoh: 2.27 atau 2.19"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full rounded-full border-2 border-transparent bg-[#F4F7FB] px-4 py-3 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-[#22A7F0] focus:bg-white focus:outline-none"
            />
          </div>

          {!isWaitlist && (
            <fieldset>
              <legend className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Clock
                  className="h-3.5 w-3.5 text-[#22A7F0]"
                  aria-hidden="true"
                />
                Estimasi Waktu (Maksimal 30 Menit)
              </legend>
              <div className="grid grid-cols-2 gap-2 rounded-full bg-[#F4F7FB] p-1.5">
                {DURATION_OPTIONS.map((opt) => {
                  const selected = durationMinutes === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-extrabold transition-all duration-200 active:scale-95 ${
                        selected
                          ? "bg-[#22A7F0] text-white shadow-sm"
                          : "bg-transparent text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name="duration-minutes"
                        value={opt.value}
                        checked={selected}
                        disabled={isSubmitting}
                        onChange={() => setDurationMinutes(opt.value)}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="rounded-2xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
            >
              {errorMessage}
            </p>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-12 flex-1 rounded-full bg-[#F4F7FB] px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-200 active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-12 flex-2 rounded-full bg-[#22A7F0] px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-[#22A7F0]/30 transition-all duration-200 hover:bg-[#1B95D8] active:scale-95 disabled:opacity-60"
            >
              {isSubmitting
                ? "Memproses..."
                : isWaitlist
                  ? "Daftar Antrean"
                  : "Konfirmasi Pinjam"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

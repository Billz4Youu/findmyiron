"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  MapPin,
  Clock,
  Flame,
  User,
  Wrench,
  KeyRound,
  X,
} from "lucide-react";
import IronMascot from "./IronMascot";
import IronHouse from "./IronHouse";
import type { IronStatus } from "@/types/iron";
import { formatTime } from "@/lib/historyDates";
import { parseRoomMeta } from "@/lib/roomMeta";

interface IronStatusCardProps {
  status: IronStatus;
  lastReturnedAt: string | null;
  onOpenCheckIn: () => void;
  onOpenWaitlist: () => void;
  onCheckOut: (inputPin: string) => Promise<void>;
  onResolveBroken: () => Promise<void>;
  isCheckingOut?: boolean;
  isResolvingBroken?: boolean;
}

export default function IronStatusCard({
  status,
  lastReturnedAt,
  onOpenCheckIn,
  onOpenWaitlist,
  onCheckOut,
  onResolveBroken,
  isCheckingOut = false,
  isResolvingBroken = false,
}: IronStatusCardProps) {
  if (status.is_available) {
    return (
      <AvailableCard
        lastRoom={status.current_room}
        lastReturnedAt={lastReturnedAt}
        onOpenCheckIn={onOpenCheckIn}
      />
    );
  }

  if (status.current_borrower === "PERBAIKAN") {
    return (
      <BrokenCard
        onResolveBroken={onResolveBroken}
        isResolvingBroken={isResolvingBroken}
      />
    );
  }

  return (
    <InUseCard
      status={status}
      onCheckOut={onCheckOut}
      onOpenWaitlist={onOpenWaitlist}
      isCheckingOut={isCheckingOut}
    />
  );
}

function AvailableCard({
  lastRoom,
  lastReturnedAt,
  onOpenCheckIn,
}: {
  lastRoom: string | null;
  lastReturnedAt: string | null;
  onOpenCheckIn: () => void;
}) {
  const { displayRoom } = parseRoomMeta(lastRoom);
  const locationText =
    !displayRoom || displayRoom === "-" ? "-" : `Kamar ${displayRoom}`;

  return (
    <section
      aria-labelledby="status-title"
      className="relative overflow-hidden rounded-[36px] bg-[#6944D8] p-5 text-white shadow-lg shadow-[#6944D8]/20 transition-all duration-200 hover:-translate-y-1"
    >
      <div className="relative flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-semibold text-violet-200">Status setrika</p>
          <h2
            id="status-title"
            className="mt-0.5 text-2xl font-extrabold tracking-tight text-white"
          >
            Siap dipakai!
          </h2>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/30">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#7CE7AC]" aria-hidden="true" />
          Tersedia
        </span>
      </div>

      <div className="relative mx-auto mt-3 w-44 animate-float">
        <IronMascot mood="happy" className="h-auto w-full drop-shadow-lg" />
      </div>

      {/* Kartu putih bertingkat dengan strip biru muda seperti referensi */}
      <div className="relative mt-3 overflow-hidden rounded-[28px] bg-white text-slate-900 shadow-sm">
        <div className="flex items-center justify-between gap-3 bg-[#D8F0FA] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#22A7F0] shadow-2xs">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">
                Lokasi Terakhir
              </p>
              <p className="text-sm font-extrabold text-slate-900">
                {locationText}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#16181E] px-2.5 py-1 text-[11px] font-extrabold text-white">
            Ready
          </span>
        </div>

        <div className="p-5">
          <p className="text-xs font-bold text-slate-800"> Ringkasan Status</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Lagi nganggur, belum ada yang pinjam.
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#F4F7FB] p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-[#22A7F0]" aria-hidden="true" />
                Lokasi
              </dt>
              <dd className="mt-1 truncate text-sm font-extrabold text-slate-900">
                {locationText}
              </dd>
            </div>
            <div className="rounded-2xl bg-[#F4F7FB] p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <Clock className="h-3.5 w-3.5 text-[#6944D8]" aria-hidden="true" />
                Kembali pukul
              </dt>
              <dd className="mt-1 text-sm font-extrabold text-slate-900">
                {formatTime(lastReturnedAt)}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={onOpenCheckIn}
            className="mt-5 min-h-12 w-full rounded-full bg-[#22A7F0] px-6 py-3.5 text-sm font-extrabold text-white shadow-md shadow-[#22A7F0]/30 transition-all duration-200 hover:bg-[#1B95D8] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22A7F0]"
          >
            Pinjam Setrika Sekarang
          </button>
        </div>
      </div>
    </section>
  );
}

function InUseCard({
  status,
  onCheckOut,
  onOpenWaitlist,
  isCheckingOut,
}: {
  status: IronStatus;
  onCheckOut: (inputPin: string) => Promise<void>;
  onOpenWaitlist: () => void;
  isCheckingOut: boolean;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    const immediate = window.setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 5_000);
    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(interval);
    };
  }, [status.borrowed_at]);

  const {
    displayRoom,
    durationMinutes,
  } = parseRoomMeta(status.current_room);
  const overdueThresholdMs = durationMinutes * 60 * 1000;

  const borrowedMs = status.borrowed_at ? Date.parse(status.borrowed_at) : NaN;
  const isOverdue =
    !Number.isNaN(borrowedMs) && nowMs - borrowedMs >= overdueThresholdMs;

  const borrower = status.current_borrower ?? "Penghuni";

  async function handleReturnButtonClick() {
    if (typeof window !== "undefined") {
      const savedPin = window.localStorage.getItem("activeIronPin")?.trim();
      if (savedPin && savedPin.length === 4) {
        try {
          await onCheckOut(savedPin);
          window.localStorage.removeItem("activeIronPin");
          return;
        } catch {
          // Jika gagal, lanjutkan membuka modal PIN manual
        }
      }
    }
    setPinInput("");
    setPinError(null);
    setIsPinModalOpen(true);
  }

  function closeReturnPinPrompt() {
    if (isCheckingOut) return;
    setIsPinModalOpen(false);
    setPinInput("");
    setPinError(null);
  }

  async function handleConfirmReturn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    if (cleanPin.length !== 4) {
      setPinError("PIN salah, hanya peminjam yang bisa mengembalikan.");
      return;
    }

    setPinError(null);
    try {
      await onCheckOut(cleanPin);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("activeIronPin");
      }
      setIsPinModalOpen(false);
      setPinInput("");
    } catch (err) {
      setPinError(
        err instanceof Error
          ? err.message
          : "PIN salah, hanya peminjam yang bisa mengembalikan."
      );
    }
  }

  return (
    <>
      <section
        aria-labelledby="status-title"
        className={`relative overflow-hidden rounded-[36px] p-5 text-white shadow-lg transition-all duration-200 hover:-translate-y-1 ${
          isOverdue
            ? "bg-rose-600 shadow-rose-600/25"
            : "bg-[#6944D8] shadow-[#6944D8]/20"
        }`}
      >
        <div className="relative flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-semibold text-white/80">Status setrika</p>
            <h2
              id="status-title"
              className="mt-0.5 text-2xl font-extrabold tracking-tight text-white"
            >
              Sedang Dipakai
            </h2>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-900">
            <Flame
              className={`h-3.5 w-3.5 animate-pulse ${
                isOverdue ? "text-rose-600" : "text-amber-500"
              }`}
              aria-hidden="true"
            />
            {isOverdue ? `Lewat ${durationMinutes}m!` : `Dipakai (${durationMinutes}m)`}
          </span>
        </div>

        <div className="relative mx-auto mt-2 w-52 animate-float">
          <IronHouse room={displayRoom} isOverdue={isOverdue} />
        </div>

        {/* Kartu putih bertingkat di bagian bawah */}
        <div className="relative mt-2 overflow-hidden rounded-[28px] bg-white text-slate-900 shadow-sm">
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3.5 ${
              isOverdue ? "bg-rose-100" : "bg-[#D8F0FA]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-2xs ${
                  isOverdue ? "text-rose-600" : "text-[#22A7F0]"
                }`}
              >
                <User className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">
                  Peminjam Aktif
                </p>
                <p className="truncate text-sm font-extrabold text-slate-900">
                  {borrower} • Kamar {displayRoom}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#16181E] px-2.5 py-1 text-[11px] font-extrabold text-white">
              {durationMinutes}m
            </span>
          </div>

          <div className="p-5">
            <p
              className={`text-xs font-semibold ${
                isOverdue ? "text-rose-700" : "text-slate-600"
              }`}
            >
              {isOverdue ? (
                "Wah, nyetrika atau buka laundry nih? Gantian yuk!"
              ) : (
                <>
                  Dipinjam oleh <strong>{borrower}</strong> di Kamar{" "}
                  <strong>{displayRoom}</strong>
                </>
              )}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#F4F7FB] p-3">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <User
                    className={`h-3.5 w-3.5 ${
                      isOverdue ? "text-rose-600" : "text-[#22A7F0]"
                    }`}
                    aria-hidden="true"
                  />
                  Peminjam
                </dt>
                <dd className="mt-1 truncate text-sm font-extrabold text-slate-900">
                  {borrower} ({displayRoom})
                </dd>
              </div>
              <div className="rounded-2xl bg-[#F4F7FB] p-3">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <Clock
                    className={`h-3.5 w-3.5 ${
                      isOverdue ? "text-rose-600" : "text-[#6944D8]"
                    }`}
                    aria-hidden="true"
                  />
                  Dipinjam sejak
                </dt>
                <dd className="mt-1 text-sm font-extrabold text-slate-900">
                  {formatTime(status.borrowed_at)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => void handleReturnButtonClick()}
                disabled={isCheckingOut}
                className="min-h-12 rounded-full bg-[#22A7F0] px-4 py-3 text-xs font-extrabold text-white shadow-md shadow-[#22A7F0]/30 transition-all duration-200 hover:bg-[#1B95D8] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22A7F0] disabled:opacity-60 sm:text-sm"
              >
                {isCheckingOut ? "Mengembalikan..." : "Kembalikan"}
              </button>
              <button
                type="button"
                onClick={onOpenWaitlist}
                className="min-h-12 rounded-full bg-[#EFE1FF] px-4 py-3 text-xs font-extrabold text-[#6944D8] transition-all duration-200 hover:bg-[#E4CEFF] active:scale-95 sm:text-sm"
              >
                Ikut Antrean
              </button>
            </div>
          </div>
        </div>
      </section>

      {isPinModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={closeReturnPinPrompt}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="return-pin-title"
              className="w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-2xl bg-[#D8F0FA] p-2.5 text-[#22A7F0]">
                    <KeyRound className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3
                      id="return-pin-title"
                      className="text-base font-extrabold text-slate-900"
                    >
                      Kembalikan Setrika
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                      Peminjam: {borrower} (Kamar {displayRoom})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeReturnPinPrompt}
                  aria-label="Tutup dialog PIN pengembalian"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 hover:bg-slate-200 active:scale-95"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleConfirmReturn} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="return-pin-input"
                    className="mb-1.5 block text-xs font-bold text-slate-700"
                  >
                    Masukkan 4 digit PIN peminjaman:
                  </label>
                  <input
                    id="return-pin-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    autoFocus
                    required
                    disabled={isCheckingOut}
                    placeholder="8392"
                    value={pinInput}
                    onChange={(e) =>
                      setPinInput(e.target.value.replace(/\D/g, ""))
                    }
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-center text-xl font-extrabold tracking-[0.35em] text-slate-900 placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:border-[#22A7F0] focus:bg-white focus:outline-none"
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
                    onClick={closeReturnPinPrompt}
                    disabled={isCheckingOut}
                    className="min-h-11 flex-1 rounded-full bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-200 active:scale-95"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isCheckingOut}
                    className="min-h-11 flex-1 rounded-full bg-[#22A7F0] px-3 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all duration-200 hover:bg-[#1B95D8] active:scale-95 disabled:opacity-60"
                  >
                    {isCheckingOut ? "Mengecek..." : "Konfirmasi"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function BrokenCard({
  onResolveBroken,
  isResolvingBroken,
}: {
  onResolveBroken: () => Promise<void>;
  isResolvingBroken: boolean;
}) {
  return (
    <section
      aria-labelledby="status-title"
      className="relative overflow-hidden rounded-[36px] bg-slate-700 p-5 text-white grayscale shadow-lg transition-all duration-200 hover:-translate-y-1"
    >
      <div className="relative flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-semibold text-slate-300">Status setrika</p>
          <h2
            id="status-title"
            className="mt-0.5 text-2xl font-extrabold tracking-tight text-white"
          >
            Sedang Bermasalah
          </h2>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
          <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
          PERBAIKAN
        </span>
      </div>

      {/* Maskot SVG setrika bermasalah (mata X, mulut sedih, berasap) */}
      <div className="relative mx-auto mt-2 w-44 animate-float">
        <IronMascot mood="broken" className="h-auto w-full drop-shadow-lg" />
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[28px] bg-white p-5 text-slate-900 shadow-sm">
        <p className="text-center text-sm font-medium text-slate-600">
          Setrika sedang rusak atau dalam perbaikan, belum bisa dipakai dulu ya.
        </p>

        <button
          type="button"
          onClick={onResolveBroken}
          disabled={isResolvingBroken}
          className="mt-5 min-h-12 w-full rounded-full bg-slate-900 px-6 py-3.5 text-sm font-extrabold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-95 disabled:opacity-60"
        >
          {isResolvingBroken ? "Memulihkan..." : "Tandai Sudah Diperbaiki"}
        </button>
      </div>
    </section>
  );
}

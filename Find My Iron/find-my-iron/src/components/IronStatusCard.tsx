"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  MapPin,
  Clock,
  Flame,
  User,
  Wrench,
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
  onCheckOut: () => Promise<void>;
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
  onCheckOut: () => Promise<void>;
  onOpenWaitlist: () => void;
  isCheckingOut: boolean;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

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

  const { displayRoom, durationMinutes } = parseRoomMeta(status.current_room);
  const overdueThresholdMs = durationMinutes * 60 * 1000;

  const borrowedMs = status.borrowed_at ? Date.parse(status.borrowed_at) : NaN;
  const isOverdue =
    !Number.isNaN(borrowedMs) && nowMs - borrowedMs >= overdueThresholdMs;

  const borrower = status.current_borrower ?? "Penghuni";

  return (
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
              onClick={onCheckOut}
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

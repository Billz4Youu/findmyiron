"use client";

import { useRef } from "react";
import IronMascot from "./IronMascot";
import MyPinButton from "./MyPinButton";

interface HeaderCardProps {
  onSecretTrigger?: () => void;
  activeIds?: string[] | null;
}

export default function HeaderCard({
  onSecretTrigger,
  activeIds,
}: HeaderCardProps) {
  const tapCountRef = useRef(0);
  const resetTimerRef = useRef<number | null>(null);

  function handleTitleClick() {
    tapCountRef.current += 1;

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      resetTimerRef.current = null;
      onSecretTrigger?.();
      return;
    }

    resetTimerRef.current = window.setTimeout(() => {
      tapCountRef.current = 0;
      resetTimerRef.current = null;
    }, 1500);
  }

  return (
    <header className="relative overflow-hidden rounded-[36px] bg-[#F2E7FF] px-6 py-5 text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5">
      {/* Dekorasi garis daun tropis di sisi kanan seperti referensi */}
      <svg
        aria-hidden="true"
        viewBox="0 0 120 140"
        fill="none"
        className="pointer-events-none absolute -right-4 -bottom-4 h-32 w-28 text-[#C4A6E8]/60"
      >
        <path
          d="M95 130C72 108 58 76 62 32C64 16 78 8 92 14C106 20 112 42 104 68C96 94 95 130 95 130Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M78 120C52 106 32 86 26 56C22 38 34 26 48 30C64 35 74 58 76 86"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M64 48L82 40M62 68L86 58M68 88L90 78M42 52L58 46M38 70L58 64"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#7A6A96]">
            Hai, sobat lorong 2B!
          </p>
          <div className="mt-0.5 flex items-center gap-2.5">
            <h1
              onClick={handleTitleClick}
              className="cursor-pointer select-none text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl"
            >
              Find My Iron
            </h1>
            {activeIds && <MyPinButton activeIds={activeIds} />}
          </div>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#FFE5A3] p-1.5 shadow-xs transition-transform duration-200 hover:scale-105">
          <IronMascot mood="happy" className="h-full w-full" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}

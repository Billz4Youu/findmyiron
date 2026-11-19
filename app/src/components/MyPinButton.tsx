"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { KeyRound, X } from "lucide-react";
import {
  clearMyPin,
  MY_PIN_STORAGE_KEY,
  MY_PIN_UPDATED_EVENT,
  parseSavedPin,
} from "@/lib/pinStorage";

interface MyPinButtonProps {
  activeIds: string[];
}

function subscribeMyPin(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === MY_PIN_STORAGE_KEY) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(MY_PIN_UPDATED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(MY_PIN_UPDATED_EVENT, onStoreChange);
  };
}

function getRawMyPinSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(MY_PIN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function MyPinButton({ activeIds }: MyPinButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const rawSnapshot = useSyncExternalStore(
    subscribeMyPin,
    getRawMyPinSnapshot,
    () => null
  );
  const savedPin = parseSavedPin(rawSnapshot);
  const isAuthorized = savedPin !== null && activeIds.includes(savedPin.id);

  useEffect(() => {
    if (savedPin && !activeIds.includes(savedPin.id)) {
      clearMyPin();
    }
  }, [savedPin, activeIds]);

  useEffect(() => {
    if (!isModalOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  if (!isAuthorized || !savedPin) {
    return null;
  }

  const statusText =
    savedPin.type === "borrow" ? "Peminjaman" : "Waiting List";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Lihat PIN Saya"
        title="Lihat PIN Saya"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white text-[#6944D8] shadow-xs transition-all duration-200 hover:scale-105 hover:bg-[#FAF5FF] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6944D8]"
      >
        {/* SVG setrika sederhana */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
        >
          <path
            d="M9 7h7a3 3 0 0 1 3 3v1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M4 17h16v-3a4 4 0 0 0-4-4h-5.5a6.5 6.5 0 0 0-6.5 6.5V17Z"
            fill="#EFE1FF"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>

        {/* Badge ikon kunci di pojok kanan bawah */}
        <span className="absolute -right-1 -bottom-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-white bg-[#22A7F0] text-white shadow-2xs">
          <KeyRound className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      </button>

      {isModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="my-pin-modal-title"
              className="w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-2xl bg-[#EFE1FF] p-2.5 text-[#6944D8]">
                    <KeyRound className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2
                      id="my-pin-modal-title"
                      className="text-base font-extrabold text-slate-900"
                    >
                      PIN Saya
                    </h2>
                    <p className="text-xs font-medium text-slate-500">
                      Hanya tersimpan di perangkat ini
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Tutup modal PIN saya"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-200 hover:bg-slate-200 active:scale-95"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-[#F4F7FB] px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500">
                    Status
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                      savedPin.type === "borrow"
                        ? "bg-[#D8F0FA] text-[#1479B5]"
                        : "bg-[#EFE1FF] text-[#6944D8]"
                    }`}
                  >
                    {statusText}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-[#F4F7FB] px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500">
                    Nomor Kamar
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">
                    Kamar {savedPin.room}
                  </span>
                </div>

                <div className="rounded-2xl bg-[#F2E7FF] px-4 py-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A6A96]">
                    Kode PIN Anda
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tracking-[0.35em] text-slate-900">
                    {savedPin.pin}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="mt-5 min-h-11 w-full rounded-full bg-[#22A7F0] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all duration-200 hover:bg-[#1B95D8] active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

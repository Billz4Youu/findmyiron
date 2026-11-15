"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";

const MASTER_PIN = "9999";

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminAuthModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminAuthModalProps) {
  const [pinInput, setPinInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleClose() {
    setPinInput("");
    setErrorMsg(null);
    onClose();
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPinInput("");
        setErrorMsg(null);
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pinInput.trim() === MASTER_PIN) {
      setPinInput("");
      setErrorMsg(null);
      onSuccess();
    } else {
      setErrorMsg("Master PIN tidak sesuai.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-auth-title"
        className="w-full max-w-xs rounded-3xl border border-slate-100 bg-white p-6 text-slate-800 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-9 rounded-full bg-slate-200"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="rounded-2xl bg-[#EFE1FF] p-2.5 text-[#6944D8]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="admin-auth-title"
                className="text-base font-extrabold text-slate-900"
              >
                Akses Admin
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Masukkan 4 digit Master PIN
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup modal autentikasi admin"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F7FB] text-slate-600 transition-all duration-200 hover:bg-slate-200 active:scale-95"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="admin-master-pin"
              className="mb-1.5 block text-xs font-bold text-slate-700"
            >
              Master PIN
            </label>
            <input
              id="admin-master-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              required
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-2xl border-2 border-slate-200 bg-[#F4F7FB] px-4 py-3 text-center text-xl font-extrabold tracking-[0.35em] text-slate-900 placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:border-[#22A7F0] focus:bg-white focus:outline-none"
            />
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="rounded-2xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
            >
              {errorMsg}
            </p>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-11 flex-1 rounded-full bg-[#F4F7FB] px-3 py-2.5 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-200 active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              className="min-h-11 flex-1 rounded-full bg-[#16181E] px-3 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-95"
            >
              Masuk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


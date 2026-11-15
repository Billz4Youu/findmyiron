"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, X, AlertTriangle, KeyRound } from "lucide-react";
import HeaderCard from "@/components/HeaderCard";
import IronStatusCard from "@/components/IronStatusCard";
import WaitlistCard from "@/components/WaitlistCard";
import BorrowHistoryCard from "@/components/BorrowHistoryCard";
import ActionModal, { type ActionModalMode } from "@/components/ActionModal";
import AdminAuthModal from "@/components/AdminAuthModal";
import AdminDashboardModal from "@/components/AdminDashboardModal";
import { supabase } from "@/lib/supabase";
import {
  cancelWaitlist,
  checkInIron,
  checkOutIron,
  deleteHistoryRecord,
  forceCancelWaitlist,
  forceResetIron,
  getDashboardData,
  joinWaitlist,
  reportBrokenIron,
  resolveBrokenIron,
  type DashboardData,
} from "@/lib/ironService";
import { parseRoomMeta } from "@/lib/roomMeta";

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [generatedPinInfo, setGeneratedPinInfo] = useState<{
    id: string;
    name: string;
    pin: string;
  } | null>(null);
  const [modalMode, setModalMode] = useState<ActionModalMode | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isResolvingBroken, setIsResolvingBroken] = useState(false);
  const [isReportingBroken, setIsReportingBroken] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  // Auto-dismiss untuk notifikasi toast (5,5 detik)
  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 5500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Auto-dismiss untuk banner PIN antrean (6,5 detik)
  useEffect(() => {
    if (!generatedPinInfo) return;
    const timer = window.setTimeout(() => {
      setGeneratedPinInfo(null);
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [generatedPinInfo]);

  const loadDashboard = useCallback(async () => {
    try {
      const result = await getDashboardData();
      setErrorMessage(null);
      setData(result);
      // Bersihkan banner PIN jika antrean tersebut sudah tidak ada di daftar tunggu
      setGeneratedPinInfo((prev) => {
        if (!prev) return null;
        const stillWaiting = result.waitlist.some((w) => w.id === prev.id);
        return stillWaiting ? prev : null;
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Gagal memuat data dari database Supabase."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    const channel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "iron_status" },
        () => {
          void loadDashboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "iron_status" },
        () => {
          void loadDashboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "borrow_history" },
        () => {
          void loadDashboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "borrow_history" },
        () => {
          void loadDashboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "borrow_history" },
        () => {
          void loadDashboard();
        }
      )
      .subscribe();

    return () => {
      window.clearTimeout(initTimer);
      void supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  async function handleModalSubmit(
    borrowerName: string,
    roomNumber: string,
    durationMinutes: number
  ) {
    if (modalMode === "waitlist") {
      const { id, pin } = await joinWaitlist(borrowerName, roomNumber);
      setGeneratedPinInfo({ id, name: borrowerName, pin });
      showToast(`Simpan PIN ini untuk batal antre: ${pin}`);
    } else {
      await checkInIron(borrowerName, roomNumber, durationMinutes);
      setGeneratedPinInfo(null);
      showToast(`Selamat menyetrika, ${borrowerName} (Kamar ${roomNumber})!`);
    }
    await loadDashboard();
  }

  async function handleCancelWaitlist(historyId: string, inputPin: string) {
    await cancelWaitlist(historyId, inputPin);
    setGeneratedPinInfo(null);
    showToast("Antrean berhasil dibatalkan!");
    await loadDashboard();
  }

  async function handleCheckOut() {
    if (!data) return;
    setIsCheckingOut(true);
    setErrorMessage(null);
    try {
      const result = await checkOutIron(data.ironStatus.active_history_id);
      setGeneratedPinInfo(null);
      if (result.promotedBorrower) {
        const { displayRoom } = parseRoomMeta(
          result.promotedBorrower.room_number
        );
        showToast(
          `Setrika otomatis dioper ke ${result.promotedBorrower.borrower_name} (Kamar ${displayRoom})!`
        );
      } else {
        showToast("Berhasil dikembalikan!");
      }
      await loadDashboard();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal mengembalikan setrika."
      );
    } finally {
      setIsCheckingOut(false);
    }
  }

  async function handleReportBroken() {
    if (!data) return;
    setIsReportingBroken(true);
    setErrorMessage(null);
    try {
      await reportBrokenIron(data.ironStatus.active_history_id);
      setGeneratedPinInfo(null);
      showToast("Status setrika diubah ke mode PERBAIKAN.");
      await loadDashboard();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Gagal melaporkan setrika bermasalah."
      );
    } finally {
      setIsReportingBroken(false);
    }
  }

  async function handleResolveBroken() {
    setIsResolvingBroken(true);
    setErrorMessage(null);
    try {
      const result = await resolveBrokenIron();
      setGeneratedPinInfo(null);
      if (result.promotedBorrower) {
        const { displayRoom } = parseRoomMeta(
          result.promotedBorrower.room_number
        );
        showToast(
          `Setrika selesai diperbaiki & otomatis dioper ke ${result.promotedBorrower.borrower_name} (Kamar ${displayRoom})!`
        );
      } else {
        showToast("Setrika sudah diperbaiki dan siap dipakai kembali!");
      }
      await loadDashboard();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Gagal menandai setrika sudah diperbaiki."
      );
    } finally {
      setIsResolvingBroken(false);
    }
  }

  async function handleForceCancelWaitlist(historyId: string) {
    await forceCancelWaitlist(historyId);
    setGeneratedPinInfo((prev) => (prev?.id === historyId ? null : prev));
    showToast("Antrean berhasil dibatalkan paksa oleh Admin.");
    await loadDashboard();
  }

  async function handleForceResetIron() {
    await forceResetIron(data?.ironStatus.active_history_id);
    setGeneratedPinInfo(null);
    showToast("Status setrika berhasil di-reset ke Tersedia (-).");
    await loadDashboard();
  }

  async function handleDeleteHistory(historyId: string) {
    await deleteHistoryRecord(historyId);
    showToast("Data riwayat berhasil dihapus permanen.");
    await loadDashboard();
  }

  const lastReturnedAt = data?.history[0]?.returned_at ?? null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 text-slate-800">
      <HeaderCard onSecretTrigger={() => setIsAdminAuthOpen(true)} />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-full border border-slate-800 bg-slate-900 px-4 py-3 text-white shadow-md transition-all duration-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-300 text-slate-900">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-xs font-extrabold leading-snug">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Tutup notifikasi"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white transition-all duration-200 hover:bg-slate-700 active:scale-95"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {generatedPinInfo && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-200 text-amber-950">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold text-amber-800">
                Antrean {generatedPinInfo.name} terdaftar!
              </p>
              <p className="text-sm font-extrabold">
                Simpan PIN ini untuk batal antre:{" "}
                <span className="rounded-lg bg-amber-200 px-2 py-0.5 tracking-wider">
                  {generatedPinInfo.pin}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGeneratedPinInfo(null)}
            aria-label="Tutup info PIN"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-950 transition-all duration-200 hover:bg-amber-300 active:scale-95"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-xs font-semibold text-rose-800 shadow-xs"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              void loadDashboard();
            }}
            className="shrink-0 rounded-full bg-rose-200 px-3.5 py-1.5 text-xs font-bold text-rose-950 transition-all duration-200 hover:bg-rose-300 active:scale-95"
          >
            Muat Ulang
          </button>
        </div>
      )}

      {isLoading || !data ? (
        <div
          className="flex flex-col gap-6 md:grid md:grid-cols-12 md:items-start lg:gap-8"
          aria-busy="true"
          aria-label="Memuat data"
        >
          <div className="h-96 animate-pulse rounded-3xl bg-white shadow-sm md:col-span-5" />
          <div className="flex flex-col gap-6 md:col-span-7">
            <div className="h-44 animate-pulse rounded-3xl bg-white shadow-sm" />
            <div className="h-64 animate-pulse rounded-3xl bg-white shadow-sm" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 md:grid md:grid-cols-12 md:items-start lg:gap-8">
          <div className="flex flex-col gap-4 md:col-span-5 md:sticky md:top-6">
            <IronStatusCard
              status={data.ironStatus}
              lastReturnedAt={lastReturnedAt}
              onOpenCheckIn={() => setModalMode("checkin")}
              onOpenWaitlist={() => setModalMode("waitlist")}
              onCheckOut={handleCheckOut}
              onResolveBroken={handleResolveBroken}
              isCheckingOut={isCheckingOut}
              isResolvingBroken={isResolvingBroken}
            />

            {data.ironStatus.current_borrower !== "PERBAIKAN" && (
              <div className="flex justify-center pt-1 pb-2">
                <button
                  type="button"
                  onClick={handleReportBroken}
                  disabled={isReportingBroken}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-slate-600 shadow-xs transition-all duration-200 hover:bg-rose-50 hover:text-rose-700 active:scale-95 disabled:opacity-50"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                  {isReportingBroken
                    ? "Melaporkan..."
                    : "Lapor Setrika Bermasalah"}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 md:col-span-7">
            <WaitlistCard
              waitlist={data.waitlist}
              onCancelWaitlist={handleCancelWaitlist}
            />
            <BorrowHistoryCard history={data.history} />
          </div>
        </div>
      )}

      <ActionModal
        isOpen={modalMode !== null}
        mode={modalMode ?? "checkin"}
        onClose={() => setModalMode(null)}
        onSubmit={handleModalSubmit}
      />

      <AdminAuthModal
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onSuccess={() => {
          setIsAdminAuthOpen(false);
          setIsAdminDashboardOpen(true);
        }}
      />

      {data && (
        <AdminDashboardModal
          isOpen={isAdminDashboardOpen}
          ironStatus={data.ironStatus}
          waitlist={data.waitlist}
          history={data.history}
          onClose={() => setIsAdminDashboardOpen(false)}
          onForceCancelWaitlist={handleForceCancelWaitlist}
          onForceResetIron={handleForceResetIron}
          onDeleteHistory={handleDeleteHistory}
        />
      )}
    </main>
  );
}

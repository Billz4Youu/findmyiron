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
  deleteAllHistoryRecords,
  deleteHistoryRecord,
  forceCancelWaitlist,
  forceResetIron,
  getAdminPins,
  getDashboardData,
  joinWaitlist,
  reportBrokenIron,
  resolveBrokenIron,
  type AdminPinsResult,
  type DashboardData,
} from "@/lib/ironService";
import { parseRoomMeta, stripRoomMeta } from "@/lib/roomMeta";
import { saveMyPin } from "@/lib/pinStorage";

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [generatedPinInfo, setGeneratedPinInfo] = useState<{
    id: string;
    name: string;
    pin: string;
    context: "borrow" | "waitlist";
  } | null>(null);
  const [modalMode, setModalMode] = useState<ActionModalMode | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isResolvingBroken, setIsResolvingBroken] = useState(false);
  const [isReportingBroken, setIsReportingBroken] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [adminPins, setAdminPins] = useState<AdminPinsResult>({
    activePin: null,
    waitlistPins: {},
  });

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
      // Bersihkan banner PIN jika antrean/peminjaman tersebut sudah tidak aktif
      setGeneratedPinInfo((prev) => {
        if (!prev) return null;
        const stillWaiting = result.waitlist.some((w) => w.id === prev.id);
        const stillBorrowing =
          !result.ironStatus.is_available &&
          result.ironStatus.active_history_id === prev.id;
        return stillWaiting || stillBorrowing ? prev : null;
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

    const channelName = `realtime-iron-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "iron_status" },
        () => {
          void loadDashboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "borrow_history" },
        () => {
          void loadDashboard();
        }
      )
      .subscribe();

    const syncInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadDashboard();
      }
    }, 4000);

    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(syncInterval);
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
      await loadDashboard();
      saveMyPin({
        id: String(id),
        type: "queue",
        pin,
        room: stripRoomMeta(roomNumber),
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("activeIronPin", pin);
      }
      setGeneratedPinInfo({ id, name: borrowerName, pin, context: "waitlist" });
      showToast(`Simpan PIN ini untuk batal antre / kembalikan: ${pin}`);
    } else {
      const { id, pin } = await checkInIron(
        borrowerName,
        roomNumber,
        durationMinutes
      );
      await loadDashboard();
      saveMyPin({
        id: String(id),
        type: "borrow",
        pin,
        room: stripRoomMeta(roomNumber),
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("activeIronPin", pin);
      }
      setGeneratedPinInfo({ id, name: borrowerName, pin, context: "borrow" });
      showToast(
        `Selamat menyetrika, ${borrowerName}! Simpan PIN kembalikan: ${pin}`
      );
    }
  }

  async function handleCancelWaitlist(historyId: string, inputPin: string) {
    await cancelWaitlist(historyId, inputPin);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("activeIronPin");
    }
    setGeneratedPinInfo(null);
    showToast("Antrean berhasil dibatalkan!");
    await loadDashboard();
  }

  async function handleCheckOut(inputPin: string) {
    if (!data) return;
    setIsCheckingOut(true);
    setErrorMessage(null);
    try {
      const result = await checkOutIron(
        data.ironStatus.active_history_id,
        inputPin
      );
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("activeIronPin");
      }
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
      throw err instanceof Error
        ? err
        : new Error("PIN salah, hanya peminjam yang bisa mengembalikan.");
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

  const refreshAdminPins = useCallback(async (pin: string) => {
    try {
      const pins = await getAdminPins(pin);
      setAdminPins(pins);
    } catch {
      // Abaikan jika gagal memuat PIN admin; tombol aksi lain tetap tersedia
    }
  }, []);

  async function handleForceCancelWaitlist(historyId: string) {
    if (!adminPin) throw new Error("Sesi admin tidak valid.");
    await forceCancelWaitlist(historyId, adminPin);
    setGeneratedPinInfo((prev) => (prev?.id === historyId ? null : prev));
    showToast("Antrean berhasil dibatalkan paksa oleh Admin.");
    await loadDashboard();
    await refreshAdminPins(adminPin);
  }

  async function handleForceResetIron() {
    if (!adminPin) throw new Error("Sesi admin tidak valid.");
    await forceResetIron(adminPin, data?.ironStatus.active_history_id);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("activeIronPin");
    }
    setGeneratedPinInfo(null);
    showToast("Status setrika berhasil di-reset ke Tersedia (-).");
    await loadDashboard();
    await refreshAdminPins(adminPin);
  }

  async function handleDeleteHistory(historyId: string) {
    if (!adminPin) throw new Error("Sesi admin tidak valid.");
    await deleteHistoryRecord(historyId, adminPin);
    showToast("Data riwayat berhasil dihapus permanen.");
    await loadDashboard();
  }

  async function handleDeleteAllHistory() {
    if (!adminPin) throw new Error("Sesi admin tidak valid.");
    await deleteAllHistoryRecords(adminPin);
    showToast("Seluruh data riwayat berhasil dihapus permanen.");
    await loadDashboard();
  }

  const lastReturnedAt = data?.history[0]?.returned_at ?? null;
  const activeIds = data
    ? [
        ...(!data.ironStatus.is_available && data.ironStatus.active_history_id
          ? [String(data.ironStatus.active_history_id)]
          : []),
        ...data.waitlist.map((w) => String(w.id)),
      ]
    : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 text-slate-800">
      <HeaderCard
        onSecretTrigger={() => setIsAdminAuthOpen(true)}
        activeIds={activeIds}
      />

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
                {generatedPinInfo.context === "borrow"
                  ? `Peminjaman ${generatedPinInfo.name} aktif!`
                  : `Antrean ${generatedPinInfo.name} terdaftar!`}
              </p>
              <p className="text-sm font-extrabold">
                {generatedPinInfo.context === "borrow"
                  ? "Simpan PIN ini untuk kembalikan setrika: "
                  : "Simpan PIN ini untuk batal antre / kembalikan: "}
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
          className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:items-start lg:grid-cols-12 lg:gap-8"
          aria-busy="true"
          aria-label="Memuat data"
        >
          <div className="h-96 w-full animate-pulse rounded-3xl bg-white shadow-sm md:col-span-1 lg:col-span-5" />
          <div className="flex w-full flex-col gap-6 md:col-span-1 lg:col-span-7">
            <div className="h-44 w-full animate-pulse rounded-3xl bg-white shadow-sm" />
            <div className="h-64 w-full animate-pulse rounded-3xl bg-white shadow-sm" />
          </div>
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:items-start lg:grid-cols-12 lg:gap-8">
          <div className="flex min-w-0 w-full flex-col gap-4 md:col-span-1 lg:col-span-5 lg:sticky lg:top-6">
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

          <div className="flex min-w-0 w-full flex-col gap-6 md:col-span-1 lg:col-span-7">
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
        onSuccess={(verifiedPin) => {
          setAdminPin(verifiedPin);
          setIsAdminAuthOpen(false);
          setIsAdminDashboardOpen(true);
          void refreshAdminPins(verifiedPin);
        }}
      />

      {data && (
        <AdminDashboardModal
          isOpen={isAdminDashboardOpen}
          ironStatus={data.ironStatus}
          waitlist={data.waitlist}
          history={data.history}
          activePin={adminPins.activePin}
          waitlistPins={adminPins.waitlistPins}
          onClose={() => {
            setIsAdminDashboardOpen(false);
            setAdminPin(null);
            setAdminPins({ activePin: null, waitlistPins: {} });
          }}
          onForceCancelWaitlist={handleForceCancelWaitlist}
          onForceResetIron={handleForceResetIron}
          onDeleteHistory={handleDeleteHistory}
          onDeleteAllHistory={handleDeleteAllHistory}
        />
      )}
    </main>
  );
}

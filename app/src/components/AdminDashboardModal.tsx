"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  RotateCcw,
  Trash2,
  Download,
  Users,
  History,
  X,
} from "lucide-react";
import type { BorrowHistory, IronStatus } from "@/types/iron";
import { getAllBorrowHistory } from "@/lib/ironService";
import { formatTime, toJakartaIsoDate } from "@/lib/historyDates";
import { parseRoomMeta } from "@/lib/roomMeta";

interface AdminDashboardModalProps {
  isOpen: boolean;
  ironStatus: IronStatus;
  waitlist: BorrowHistory[];
  history: BorrowHistory[];
  activePin?: string | null;
  waitlistPins?: Record<string, string>;
  onClose: () => void;
  onForceCancelWaitlist: (historyId: string) => Promise<void>;
  onForceResetIron: () => Promise<void>;
  onDeleteHistory: (historyId: string) => Promise<void>;
  onDeleteAllHistory: () => Promise<void>;
}

function escapeCsvCell(value: string | null | undefined): string {
  const raw = value ?? "";
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export default function AdminDashboardModal({
  isOpen,
  ironStatus,
  waitlist,
  history,
  activePin: serverActivePin = null,
  waitlistPins = {},
  onClose,
  onForceCancelWaitlist,
  onForceResetIron,
  onDeleteHistory,
  onDeleteAllHistory,
}: AdminDashboardModalProps) {
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleClose() {
    setErrorMsg(null);
    onClose();
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setErrorMsg(null);
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { displayRoom, pin: legacyActivePin } = parseRoomMeta(
    ironStatus.current_room
  );
  const activePin = serverActivePin ?? legacyActivePin;
  const isCurrentlyBorrowed =
    !ironStatus.is_available && ironStatus.current_borrower !== "PERBAIKAN";
  const statusLabel = ironStatus.is_available
    ? `Tersedia (Lokasi: ${displayRoom})`
    : ironStatus.current_borrower === "PERBAIKAN"
      ? "Mode PERBAIKAN"
      : `Dipakai oleh ${ironStatus.current_borrower || "-"} (Kamar ${displayRoom})`;

  async function handleForceCancel(id: string) {
    setBusyActionId(id);
    setErrorMsg(null);
    try {
      await onForceCancelWaitlist(id);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal membatalkan antrean."
      );
    } finally {
      setBusyActionId(null);
    }
  }

  async function handleForceReset() {
    setIsResetting(true);
    setErrorMsg(null);
    try {
      await onForceResetIron();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal mereset status setrika."
      );
    } finally {
      setIsResetting(false);
    }
  }

  async function handleDeleteRecord(id: string) {
    setBusyActionId(id);
    setErrorMsg(null);
    try {
      await onDeleteHistory(id);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menghapus data riwayat."
      );
    } finally {
      setBusyActionId(null);
    }
  }

  async function handleDeleteAllRecords() {
    if (!window.confirm("Yakin ingin menghapus seluruh riwayat?")) {
      return;
    }

    setIsDeletingAll(true);
    setErrorMsg(null);
    try {
      await onDeleteAllHistory();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menghapus seluruh riwayat."
      );
    } finally {
      setIsDeletingAll(false);
    }
  }

  async function handleExportCsv() {
    setIsExporting(true);
    setErrorMsg(null);
    try {
      const rows = await getAllBorrowHistory();
      const header = [
        "id",
        "borrower_name",
        "room_number",
        "status",
        "borrowed_at",
        "returned_at",
        "created_at",
      ];
      const csvLines = [
        header.join(","),
        ...rows.map((r) =>
          [
            escapeCsvCell(r.id),
            escapeCsvCell(r.borrower_name),
            escapeCsvCell(r.room_number),
            escapeCsvCell(r.status),
            escapeCsvCell(r.borrowed_at),
            escapeCsvCell(r.returned_at),
            escapeCsvCell(r.created_at),
          ].join(",")
        ),
      ];

      const blob = new Blob([csvLines.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = toJakartaIsoDate(new Date());
      link.href = url;
      link.download = `borrow-history-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal mengunduh file CSV."
      );
    } finally {
      setIsExporting(false);
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
        aria-labelledby="admin-dashboard-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 text-slate-800 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-slate-200"
        />

        {/* Header Modal */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#EFE1FF] p-2.5 text-[#6944D8]">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="admin-dashboard-title"
                className="text-lg font-extrabold text-slate-900"
              >
                Secret Admin Dashboard
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Panel kendali darurat antrean, status setrika, & riwayat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#22A7F0] px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-all duration-200 hover:bg-[#1B95D8] active:scale-95 disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              {isExporting ? "Mengunduh..." : "Download CSV"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Tutup panel admin"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F7FB] text-slate-600 transition-all duration-200 hover:bg-slate-200 active:scale-95"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <p
            role="alert"
            className="mt-4 shrink-0 rounded-2xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700"
          >
            {errorMsg}
          </p>
        )}

        {/* Body Scrollable */}
        <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
          {/* 1. Kendali Setrika (Force Reset) */}
          <section className="rounded-3xl bg-[#F4F7FB] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Kendali Setrika (Force Reset)
                </h3>
                <p className="mt-1 text-sm font-extrabold text-slate-900">
                  {statusLabel}
                </p>
                {isCurrentlyBorrowed && (
                  <p className="mt-1 inline-block rounded-xl bg-white px-3 py-1 text-xs font-extrabold text-[#6944D8] shadow-2xs">
                    Dipinjam oleh: {ironStatus.current_borrower || "-"} | PIN
                    Aktif: {activePin ?? "-"}
                  </p>
                )}
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Reset paksa status ke Tersedia dan lokasi menjadi tanda strip (-).
                </p>
              </div>
              <button
                type="button"
                onClick={handleForceReset}
                disabled={isResetting}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#16181E] px-5 py-2.5 text-xs font-extrabold text-white shadow-xs transition-all duration-200 hover:bg-slate-800 active:scale-95 disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {isResetting ? "Mereset..." : "Reset Setrika"}
              </button>
            </div>
          </section>

          {/* 2. Manajemen Antrean (Force Cancel) */}
          <section className="rounded-3xl bg-[#F4F7FB] p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <span className="rounded-xl bg-[#D8F0FA] p-1.5 text-[#22A7F0]">
                  <Users className="h-4 w-4" aria-hidden="true" />
                </span>
                Manajemen Antrean ({waitlist.length})
              </h3>
            </div>

            {waitlist.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-white p-3.5 text-center text-xs font-semibold text-slate-500">
                Tidak ada antrean yang sedang menunggu.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {waitlist.map((person, index) => {
                  const meta = parseRoomMeta(person.room_number);
                  const personPin = waitlistPins[String(person.id)] ?? meta.pin;
                  const isBusy = busyActionId === person.id;
                  return (
                    <li
                      key={person.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          #{index + 1} {person.borrower_name}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          Kamar {meta.displayRoom}
                          {personPin ? ` • PIN: ${personPin}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleForceCancel(person.id)}
                        disabled={isBusy}
                        className="shrink-0 rounded-full bg-rose-100 px-3.5 py-2 text-xs font-extrabold text-rose-700 transition-all duration-200 hover:bg-rose-600 hover:text-white active:scale-95 disabled:opacity-50"
                      >
                        {isBusy ? "Memproses..." : "Paksa Batal"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* 3. Manajemen Riwayat (Hapus Data) */}
          <section className="rounded-3xl bg-[#F4F7FB] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <span className="rounded-xl bg-[#DCF5E7] p-1.5 text-emerald-600">
                  <History className="h-4 w-4" aria-hidden="true" />
                </span>
                Manajemen Riwayat ({history.length})
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  Hapus permanen dari database
                </span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllRecords}
                    disabled={isDeletingAll}
                    className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-extrabold text-rose-700 transition-all duration-200 hover:bg-rose-600 hover:text-white active:scale-95 disabled:opacity-50"
                  >
                    {isDeletingAll ? "Menghapus..." : "Hapus Semua"}
                  </button>
                )}
              </div>
            </div>

            {history.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-white p-3.5 text-center text-xs font-semibold text-slate-500">
                Belum ada riwayat peminjaman.
              </p>
            ) : (
              <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                {history.map((item) => {
                  const meta = parseRoomMeta(item.room_number);
                  const isBusy = busyActionId === item.id;
                  const dateLabel = toJakartaIsoDate(
                    item.returned_at ?? item.created_at
                  );
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {item.borrower_name}{" "}
                          <span className="text-xs font-semibold text-slate-500">
                            (Kamar {meta.displayRoom})
                          </span>
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {dateLabel} • {formatTime(item.borrowed_at)} –{" "}
                          {formatTime(item.returned_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(item.id)}
                        disabled={isBusy}
                        aria-label={`Hapus riwayat ${item.borrower_name}`}
                        title="Hapus permanen dari database"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 transition-all duration-200 hover:bg-rose-600 hover:text-white active:scale-95 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}


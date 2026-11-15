import { supabase } from "./supabase";
import type { BorrowHistory, IronStatus } from "@/types/iron";
import {
  DEFAULT_OVERDUE_MINUTES,
  formatRoomWithDuration,
  formatRoomWithPin,
  generatePin,
  parseRoomMeta,
  stripRoomMeta,
} from "./roomMeta";

export interface DashboardData {
  ironStatus: IronStatus;
  waitlist: BorrowHistory[];
  history: BorrowHistory[];
}

export interface CheckOutResult {
  ironStatus: IronStatus;
  promotedBorrower: BorrowHistory | null;
}

export interface JoinWaitlistResult {
  id: string;
  pin: string;
}

const DEFAULT_IRON_STATUS: IronStatus = {
  id: 1,
  is_available: true,
  current_borrower: null,
  current_room: "-",
  borrowed_at: null,
  active_history_id: null,
  updated_at: new Date().toISOString(),
};

export async function getDashboardData(): Promise<DashboardData> {
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [statusRes, waitlistRes, historyRes] = await Promise.all([
    supabase.from("iron_status").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("borrow_history")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: true }),
    supabase
      .from("borrow_history")
      .select("*")
      .eq("status", "returned")
      .gte("created_at", oneMonthAgo)
      .order("returned_at", { ascending: false }),
  ]);

  if (statusRes.error) throw new Error(statusRes.error.message);
  if (waitlistRes.error) throw new Error(waitlistRes.error.message);
  if (historyRes.error) throw new Error(historyRes.error.message);

  return {
    ironStatus: (statusRes.data as IronStatus | null) ?? DEFAULT_IRON_STATUS,
    waitlist: (waitlistRes.data as BorrowHistory[]) ?? [],
    history: (historyRes.data as BorrowHistory[]) ?? [],
  };
}

export async function checkInIron(
  borrowerName: string,
  roomNumber: string,
  durationMinutes: number = DEFAULT_OVERDUE_MINUTES
): Promise<IronStatus> {
  const cleanName = borrowerName.trim();
  const cleanRoom = stripRoomMeta(roomNumber);

  if (!cleanName || !cleanRoom || cleanRoom === "-") {
    throw new Error("Nama peminjam dan nomor kamar wajib diisi.");
  }

  const now = new Date().toISOString();

  // Masukkan baris riwayat baru dengan status 'borrowed'
  const { data: historyRow, error: historyError } = await supabase
    .from("borrow_history")
    .insert({
      borrower_name: cleanName,
      room_number: cleanRoom,
      status: "borrowed",
      borrowed_at: now,
      returned_at: null,
    })
    .select("*")
    .single();

  if (historyError || !historyRow) {
    throw new Error(historyError?.message ?? "Gagal mencatat riwayat peminjaman.");
  }

  // Simpan nomor kamar beserta estimasi durasi di iron_status
  const roomWithDuration = formatRoomWithDuration(cleanRoom, durationMinutes);

  const { data: updatedStatus, error: statusError } = await supabase
    .from("iron_status")
    .update({
      is_available: false,
      current_borrower: cleanName,
      current_room: roomWithDuration,
      borrowed_at: now,
      active_history_id: historyRow.id,
      updated_at: now,
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (statusError || !updatedStatus) {
    throw new Error(statusError?.message ?? "Gagal memperbarui status setrika.");
  }

  return updatedStatus as IronStatus;
}

// Helper internal untuk mengecek antrean pertama; jika kosong, atur apakah current_room dipertahankan atau di-set menjadi '-'
async function relayOrSetAvailable(
  now: string,
  resetRoomToDash: boolean
): Promise<CheckOutResult> {
  const { data: nextWaiting, error: waitlistError } = await supabase
    .from("borrow_history")
    .select("*")
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (waitlistError) {
    throw new Error(waitlistError.message);
  }

  if (nextWaiting) {
    const cleanNextRoom = stripRoomMeta(nextWaiting.room_number);

    const { data: promotedHistory, error: promoteError } = await supabase
      .from("borrow_history")
      .update({
        status: "borrowed",
        room_number: cleanNextRoom,
        borrowed_at: now,
      })
      .eq("id", nextWaiting.id)
      .select("*")
      .single();

    if (promoteError || !promotedHistory) {
      throw new Error(
        promoteError?.message ?? "Gagal mempromosikan antrean berikutnya."
      );
    }

    const { data: promotedStatus, error: statusError } = await supabase
      .from("iron_status")
      .update({
        is_available: false,
        current_borrower: promotedHistory.borrower_name,
        current_room: formatRoomWithDuration(
          cleanNextRoom,
          DEFAULT_OVERDUE_MINUTES
        ),
        borrowed_at: now,
        active_history_id: promotedHistory.id,
        updated_at: now,
      })
      .eq("id", 1)
      .select("*")
      .single();

    if (statusError || !promotedStatus) {
      throw new Error(
        statusError?.message ?? "Gagal mengoper status setrika ke antrean."
      );
    }

    return {
      ironStatus: promotedStatus as IronStatus,
      promotedBorrower: promotedHistory as BorrowHistory,
    };
  }

  // Jika antrean kosong:
  // - Saat selesai perbaikan (resetRoomToDash = true): set current_room menjadi '-'
  // - Saat pengembalian normal (resetRoomToDash = false): JANGAN reset current_room (tetap simpan kamar peminjam terakhir)
  const updatePayload: Record<string, unknown> = {
    is_available: true,
    current_borrower: null,
    borrowed_at: null,
    active_history_id: null,
    updated_at: now,
  };

  if (resetRoomToDash) {
    updatePayload.current_room = "-";
  }

  const { data: updatedStatus, error: statusError } = await supabase
    .from("iron_status")
    .update(updatePayload)
    .eq("id", 1)
    .select("*")
    .single();

  if (statusError || !updatedStatus) {
    throw new Error(statusError?.message ?? "Gagal mengembalikan status setrika.");
  }

  return {
    ironStatus: updatedStatus as IronStatus,
    promotedBorrower: null,
  };
}

export async function checkOutIron(
  activeHistoryId?: string | null
): Promise<CheckOutResult> {
  const now = new Date().toISOString();

  // 1. Selesaikan riwayat peminjaman saat ini menjadi 'returned'
  if (activeHistoryId) {
    const { error: historyError } = await supabase
      .from("borrow_history")
      .update({
        status: "returned",
        returned_at: now,
      })
      .eq("id", activeHistoryId);

    if (historyError) {
      throw new Error(historyError.message);
    }
  } else {
    const { error: fallbackError } = await supabase
      .from("borrow_history")
      .update({
        status: "returned",
        returned_at: now,
      })
      .eq("status", "borrowed");

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }
  }

  // 2. Estafet ke antrean pertama, atau kembalikan dengan mempertahankan current_room peminjam terakhir
  return relayOrSetAvailable(now, false);
}

export async function joinWaitlist(
  borrowerName: string,
  roomNumber: string
): Promise<JoinWaitlistResult> {
  const cleanName = borrowerName.trim();
  const cleanRoom = stripRoomMeta(roomNumber);

  if (!cleanName || !cleanRoom || cleanRoom === "-") {
    throw new Error("Nama peminjam dan nomor kamar wajib diisi.");
  }

  const pin = generatePin();
  const roomWithPin = formatRoomWithPin(cleanRoom, pin);

  const { data, error } = await supabase
    .from("borrow_history")
    .insert({
      borrower_name: cleanName,
      room_number: roomWithPin,
      status: "waiting",
      borrowed_at: null,
      returned_at: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Gagal mendaftar ke antrean.");
  }

  return {
    id: data.id as string,
    pin,
  };
}

export async function cancelWaitlist(
  historyId: string,
  inputPin: string
): Promise<void> {
  if (!historyId) {
    throw new Error("ID antrean tidak valid.");
  }

  const cleanPin = inputPin.trim();
  if (!cleanPin) {
    throw new Error("Masukkan 4 digit PIN terlebih dahulu.");
  }

  const { data: row, error: fetchError } = await supabase
    .from("borrow_history")
    .select("id, room_number")
    .eq("id", historyId)
    .maybeSingle();

  if (fetchError || !row) {
    throw new Error(fetchError?.message ?? "Data antrean tidak ditemukan.");
  }

  const { pin } = parseRoomMeta(row.room_number);
  if (pin && pin !== cleanPin) {
    throw new Error("PIN salah! Pastikan 4 digit PIN sesuai saat mendaftar.");
  }

  const { error } = await supabase
    .from("borrow_history")
    .update({ status: "cancelled" })
    .eq("id", historyId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function reportBrokenIron(
  activeHistoryId?: string | null
): Promise<IronStatus> {
  const now = new Date().toISOString();

  if (activeHistoryId) {
    await supabase
      .from("borrow_history")
      .update({
        status: "returned",
        returned_at: now,
      })
      .eq("id", activeHistoryId);
  }

  const { data: updatedStatus, error } = await supabase
    .from("iron_status")
    .update({
      is_available: false,
      current_borrower: "PERBAIKAN",
      current_room: "-",
      borrowed_at: now,
      active_history_id: null,
      updated_at: now,
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error || !updatedStatus) {
    throw new Error(
      error?.message ?? "Gagal mengubah status setrika ke mode perbaikan."
    );
  }

  return updatedStatus as IronStatus;
}

export async function resolveBrokenIron(): Promise<CheckOutResult> {
  const now = new Date().toISOString();
  // Saat selesai diperbaiki: jika ada antrean langsung oper, jika kosong set current_room menjadi '-'
  return relayOrSetAvailable(now, true);
}

export async function forceCancelWaitlist(historyId: string): Promise<void> {
  if (!historyId) {
    throw new Error("ID antrean tidak valid.");
  }

  const { error } = await supabase
    .from("borrow_history")
    .update({ status: "cancelled" })
    .eq("id", historyId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function forceResetIron(
  activeHistoryId?: string | null
): Promise<IronStatus> {
  const now = new Date().toISOString();

  if (activeHistoryId) {
    await supabase
      .from("borrow_history")
      .update({
        status: "returned",
        returned_at: now,
      })
      .eq("id", activeHistoryId);
  } else {
    await supabase
      .from("borrow_history")
      .update({
        status: "returned",
        returned_at: now,
      })
      .eq("status", "borrowed");
  }

  const { data: updatedStatus, error } = await supabase
    .from("iron_status")
    .update({
      is_available: true,
      current_borrower: "",
      current_room: "-",
      borrowed_at: null,
      active_history_id: null,
      updated_at: now,
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error || !updatedStatus) {
    throw new Error(error?.message ?? "Gagal mereset status setrika.");
  }

  return updatedStatus as IronStatus;
}

export async function deleteHistoryRecord(id: string): Promise<void> {
  if (!id) {
    throw new Error("ID riwayat tidak valid.");
  }

  const { error } = await supabase
    .from("borrow_history")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAllBorrowHistory(): Promise<BorrowHistory[]> {
  const { data, error } = await supabase
    .from("borrow_history")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as BorrowHistory[]) ?? [];
}

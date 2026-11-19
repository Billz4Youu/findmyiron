import { supabase } from "./supabase";
import type { BorrowHistory, IronStatus } from "@/types/iron";
import { DEFAULT_OVERDUE_MINUTES } from "./roomMeta";

export interface DashboardData {
  ironStatus: IronStatus;
  waitlist: BorrowHistory[];
  history: BorrowHistory[];
}

export interface CheckInResult {
  ironStatus: IronStatus;
  id: string;
  pin: string;
}

export interface CheckOutResult {
  ironStatus: IronStatus;
  promotedBorrower: BorrowHistory | null;
}

export interface JoinWaitlistResult {
  id: string;
  pin: string;
}

export interface AdminPinsResult {
  activePin: string | null;
  waitlistPins: Record<string, string>;
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

async function postJson<T>(url: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error ?? "Permintaan gagal diproses oleh server.");
  }

  return data;
}

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
): Promise<CheckInResult> {
  return postJson<CheckInResult>("/api/iron/borrow", {
    borrowerName,
    roomNumber,
    durationMinutes,
  });
}

export async function checkOutIron(
  activeHistoryId?: string | null,
  inputPin?: string
): Promise<CheckOutResult> {
  return postJson<CheckOutResult>("/api/iron/return", {
    id: activeHistoryId ?? null,
    inputPin: inputPin ?? "",
  });
}

export async function joinWaitlist(
  borrowerName: string,
  roomNumber: string
): Promise<JoinWaitlistResult> {
  return postJson<JoinWaitlistResult>("/api/iron/waitlist", {
    borrowerName,
    roomNumber,
  });
}

export async function cancelWaitlist(
  historyId: string,
  inputPin: string
): Promise<void> {
  await postJson<{ ok: boolean }>("/api/iron/cancel", {
    id: historyId,
    inputPin,
  });
}

export async function reportBrokenIron(
  activeHistoryId?: string | null
): Promise<IronStatus> {
  const res = await postJson<{ ironStatus: IronStatus }>("/api/iron/broken", {
    action: "report",
    activeHistoryId: activeHistoryId ?? null,
  });
  return res.ironStatus;
}

export async function resolveBrokenIron(): Promise<CheckOutResult> {
  return postJson<CheckOutResult>("/api/iron/broken", {
    action: "resolve",
  });
}

export async function verifyAdminPin(masterPin: string): Promise<void> {
  await postJson<{ ok: boolean }>("/api/admin", {
    action: "verify",
    masterPin,
  });
}

export async function getAdminPins(masterPin: string): Promise<AdminPinsResult> {
  return postJson<AdminPinsResult>("/api/admin", {
    action: "get_pins",
    masterPin,
  });
}

export async function forceCancelWaitlist(
  historyId: string,
  masterPin: string
): Promise<void> {
  await postJson<{ ok: boolean }>("/api/admin", {
    action: "force_cancel",
    masterPin,
    historyId,
  });
}

export async function forceResetIron(
  masterPin: string,
  activeHistoryId?: string | null
): Promise<IronStatus> {
  const res = await postJson<{ ironStatus: IronStatus }>("/api/admin", {
    action: "force_reset",
    masterPin,
    activeHistoryId: activeHistoryId ?? null,
  });
  return res.ironStatus;
}

export async function deleteHistoryRecord(
  id: string,
  masterPin: string
): Promise<void> {
  await postJson<{ ok: boolean }>("/api/admin", {
    action: "delete_history",
    masterPin,
    historyId: id,
  });
}

export async function deleteAllHistoryRecords(masterPin: string): Promise<void> {
  await postJson<{ ok: boolean }>("/api/admin", {
    action: "delete_all_history",
    masterPin,
  });
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

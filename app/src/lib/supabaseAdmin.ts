import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BorrowHistory, IronStatus } from "@/types/iron";
import {
  DEFAULT_OVERDUE_MINUTES,
  formatRoomWithDuration,
  parseRoomMeta,
} from "./roomMeta";

let cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdmin hanya boleh dipanggil di sisi server.");
  }

  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Konfigurasi server tidak lengkap: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.local."
    );
  }

  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}

export async function relayOrSetAvailableServer(
  now: string,
  resetRoomToDash: boolean,
  lastCleanRoom?: string
): Promise<{
  ironStatus: IronStatus;
  promotedBorrower: BorrowHistory | null;
}> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: nextWaiting, error: waitlistError } = await supabaseAdmin
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
    const { displayRoom: cleanNextRoom } = parseRoomMeta(
      nextWaiting.room_number
    );

    const { data: promotedHistory, error: promoteError } = await supabaseAdmin
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

    const { data: promotedStatus, error: statusError } = await supabaseAdmin
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

  const updatePayload: Record<string, unknown> = {
    is_available: true,
    current_borrower: null,
    borrowed_at: null,
    active_history_id: null,
    updated_at: now,
  };

  if (resetRoomToDash) {
    updatePayload.current_room = "-";
  } else if (lastCleanRoom) {
    updatePayload.current_room = lastCleanRoom;
  }

  const { data: updatedStatus, error: statusError } = await supabaseAdmin
    .from("iron_status")
    .update(updatePayload)
    .eq("id", 1)
    .select("*")
    .single();

  if (statusError || !updatedStatus) {
    throw new Error(
      statusError?.message ?? "Gagal mengembalikan status setrika."
    );
  }

  return {
    ironStatus: updatedStatus as IronStatus,
    promotedBorrower: null,
  };
}

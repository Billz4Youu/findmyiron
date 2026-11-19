import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  relayOrSetAvailableServer,
} from "@/lib/supabaseAdmin";
import { parseRoomMeta, stripRoomMeta } from "@/lib/roomMeta";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string | null;
      activeHistoryId?: string | null;
      inputPin?: string;
    };

    const cleanPin = (body.inputPin ?? "").trim();
    if (!cleanPin) {
      return NextResponse.json(
        { error: "PIN salah, hanya peminjam yang bisa mengembalikan." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: currentStatusRow, error: statusFetchError } =
      await supabaseAdmin
        .from("iron_status")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

    if (statusFetchError) {
      return NextResponse.json(
        { error: statusFetchError.message },
        { status: 500 }
      );
    }

    const targetHistoryId =
      body.id ?? body.activeHistoryId ?? currentStatusRow?.active_history_id ?? null;

    let lastCleanRoom = stripRoomMeta(currentStatusRow?.current_room);
    let expectedPin: string | null = null;

    // 1. Cek PIN di tabel rahasia borrow_pins terlebih dahulu
    if (targetHistoryId) {
      const { data: pinRow } = await supabaseAdmin
        .from("borrow_pins")
        .select("pin")
        .eq("history_id", targetHistoryId)
        .maybeSingle();

      if (pinRow?.pin) {
        expectedPin = String(pinRow.pin);
      }

      const { data: historyRow } = await supabaseAdmin
        .from("borrow_history")
        .select("id, room_number")
        .eq("id", targetHistoryId)
        .maybeSingle();

      if (historyRow) {
        const historyMeta = parseRoomMeta(historyRow.room_number);
        // Fallback kompatibilitas untuk peminjaman lama sebelum migrasi borrow_pins
        if (!expectedPin && historyMeta.pin) {
          expectedPin = historyMeta.pin;
        }
        if (lastCleanRoom === "-" && historyMeta.displayRoom !== "-") {
          lastCleanRoom = historyMeta.displayRoom;
        }
      }
    }

    if (!expectedPin) {
      expectedPin = parseRoomMeta(currentStatusRow?.current_room).pin;
    }

    if (expectedPin && cleanPin !== expectedPin) {
      return NextResponse.json(
        { error: "PIN salah, hanya peminjam yang bisa mengembalikan." },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    if (targetHistoryId) {
      const { error: historyError } = await supabaseAdmin
        .from("borrow_history")
        .update({
          status: "returned",
          returned_at: now,
        })
        .eq("id", targetHistoryId);

      if (historyError) {
        return NextResponse.json(
          { error: historyError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: fallbackError } = await supabaseAdmin
        .from("borrow_history")
        .update({
          status: "returned",
          returned_at: now,
        })
        .eq("status", "borrowed");

      if (fallbackError) {
        return NextResponse.json(
          { error: fallbackError.message },
          { status: 500 }
        );
      }
    }

    const result = await relayOrSetAvailableServer(now, false, lastCleanRoom);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal mengembalikan setrika.",
      },
      { status: 500 }
    );
  }
}

import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  DEFAULT_OVERDUE_MINUTES,
  formatRoomWithDuration,
  stripRoomMeta,
} from "@/lib/roomMeta";
import type { IronStatus } from "@/types/iron";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      borrowerName?: string;
      roomNumber?: string;
      durationMinutes?: number;
    };

    const cleanName = (body.borrowerName ?? "").trim();
    const cleanRoom = stripRoomMeta(body.roomNumber);
    const rawDuration = Number(body.durationMinutes);
    const durationMinutes =
      Number.isFinite(rawDuration) && rawDuration > 0 && rawDuration <= 240
        ? Math.round(rawDuration)
        : DEFAULT_OVERDUE_MINUTES;

    if (!cleanName || !cleanRoom || cleanRoom === "-") {
      return NextResponse.json(
        { error: "Nama peminjam dan nomor kamar wajib diisi." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();
    const pin = String(randomInt(1000, 10000));

    // Simpan riwayat peminjaman dengan nomor kamar bersih (tanpa PIN)
    const { data: historyRow, error: historyError } = await supabaseAdmin
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
      return NextResponse.json(
        { error: historyError?.message ?? "Gagal mencatat riwayat peminjaman." },
        { status: 500 }
      );
    }

    // Simpan PIN di tabel rahasia borrow_pins (tertutup dari browser/anon)
    const { error: pinError } = await supabaseAdmin
      .from("borrow_pins")
      .insert({
        history_id: historyRow.id,
        pin,
      });

    if (pinError) {
      await supabaseAdmin.from("borrow_history").delete().eq("id", historyRow.id);
      return NextResponse.json(
        { error: pinError.message },
        { status: 500 }
      );
    }

    // Simpan kamar + estimasi durasi tanpa PIN di iron_status
    const roomWithDuration = formatRoomWithDuration(cleanRoom, durationMinutes);

    const { data: updatedStatus, error: statusError } = await supabaseAdmin
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
      return NextResponse.json(
        { error: statusError?.message ?? "Gagal memperbarui status setrika." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ironStatus: updatedStatus as IronStatus,
      id: String(historyRow.id),
      pin,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal memproses peminjaman.",
      },
      { status: 500 }
    );
  }
}

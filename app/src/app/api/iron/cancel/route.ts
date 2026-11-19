import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseRoomMeta } from "@/lib/roomMeta";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      inputPin?: string;
    };

    const historyId = (body.id ?? "").trim();
    if (!historyId) {
      return NextResponse.json(
        { error: "ID antrean tidak valid." },
        { status: 400 }
      );
    }

    const cleanPin = (body.inputPin ?? "").trim();
    if (!cleanPin) {
      return NextResponse.json(
        { error: "Masukkan 4 digit PIN terlebih dahulu." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: row, error: fetchError } = await supabaseAdmin
      .from("borrow_history")
      .select("id, room_number")
      .eq("id", historyId)
      .maybeSingle();

    if (fetchError || !row) {
      return NextResponse.json(
        { error: fetchError?.message ?? "Data antrean tidak ditemukan." },
        { status: 404 }
      );
    }

    const { data: pinRow } = await supabaseAdmin
      .from("borrow_pins")
      .select("pin")
      .eq("history_id", historyId)
      .maybeSingle();

    const expectedPin = pinRow?.pin
      ? String(pinRow.pin)
      : parseRoomMeta(row.room_number).pin;

    if (expectedPin && expectedPin !== cleanPin) {
      return NextResponse.json(
        { error: "PIN salah! Pastikan 4 digit PIN sesuai saat mendaftar." },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from("borrow_history")
      .update({ status: "cancelled" })
      .eq("id", historyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal membatalkan antrean.",
      },
      { status: 500 }
    );
  }
}

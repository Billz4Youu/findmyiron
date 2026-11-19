import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { stripRoomMeta } from "@/lib/roomMeta";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      borrowerName?: string;
      roomNumber?: string;
    };

    const cleanName = (body.borrowerName ?? "").trim();
    const cleanRoom = stripRoomMeta(body.roomNumber);

    if (!cleanName || !cleanRoom || cleanRoom === "-") {
      return NextResponse.json(
        { error: "Nama peminjam dan nomor kamar wajib diisi." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const pin = String(randomInt(1000, 10000));

    const { data, error } = await supabaseAdmin
      .from("borrow_history")
      .insert({
        borrower_name: cleanName,
        room_number: cleanRoom,
        status: "waiting",
        borrowed_at: null,
        returned_at: null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Gagal mendaftar ke antrean." },
        { status: 500 }
      );
    }

    const { error: pinError } = await supabaseAdmin
      .from("borrow_pins")
      .insert({
        history_id: data.id,
        pin,
      });

    if (pinError) {
      await supabaseAdmin.from("borrow_history").delete().eq("id", data.id);
      return NextResponse.json(
        { error: pinError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: String(data.id),
      pin,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal mendaftar ke antrean.",
      },
      { status: 500 }
    );
  }
}

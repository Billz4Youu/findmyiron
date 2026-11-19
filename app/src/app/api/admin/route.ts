import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseRoomMeta } from "@/lib/roomMeta";
import type { IronStatus } from "@/types/iron";

type AdminAction =
  | "verify"
  | "get_pins"
  | "force_cancel"
  | "force_reset"
  | "delete_history"
  | "delete_all_history";

function isValidMasterPin(inputPin: string): { ok: boolean; error?: string } {
  const expectedPin = process.env.ADMIN_MASTER_PIN;
  if (!expectedPin) {
    return {
      ok: false,
      error: "ADMIN_MASTER_PIN belum diatur di .env.local pada server.",
    };
  }

  const inputBuf = Buffer.from(inputPin, "utf8");
  const expectedBuf = Buffer.from(expectedPin, "utf8");
  if (inputBuf.length !== expectedBuf.length) {
    return { ok: false, error: "Master PIN tidak sesuai." };
  }

  const matched = timingSafeEqual(inputBuf, expectedBuf);
  return matched ? { ok: true } : { ok: false, error: "Master PIN tidak sesuai." };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: AdminAction;
      masterPin?: string;
      historyId?: string | null;
      activeHistoryId?: string | null;
    };

    const masterPin = (body.masterPin ?? "").trim();
    const auth = isValidMasterPin(masterPin);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.error?.includes(".env.local") ? 500 : 401 }
      );
    }

    if (body.action === "verify") {
      return NextResponse.json({ ok: true });
    }

    const supabaseAdmin = getSupabaseAdmin();

    if (body.action === "get_pins") {
      const [statusRes, waitlistRes] = await Promise.all([
        supabaseAdmin
          .from("iron_status")
          .select("is_available, active_history_id, current_room")
          .eq("id", 1)
          .maybeSingle(),
        supabaseAdmin
          .from("borrow_history")
          .select("id, room_number")
          .eq("status", "waiting"),
      ]);

      const activeHistoryId =
        statusRes.data && !statusRes.data.is_available
          ? (statusRes.data.active_history_id as string | null)
          : null;
      const waitlistRows = waitlistRes.data ?? [];

      const lookupIds = [
        ...(activeHistoryId ? [activeHistoryId] : []),
        ...waitlistRows.map((w) => String(w.id)),
      ];

      const pinMap: Record<string, string> = {};
      if (lookupIds.length > 0) {
        const { data: pinRows } = await supabaseAdmin
          .from("borrow_pins")
          .select("history_id, pin")
          .in("history_id", lookupIds);

        for (const row of pinRows ?? []) {
          pinMap[String(row.history_id)] = String(row.pin);
        }
      }

      const activePin = activeHistoryId
        ? (pinMap[String(activeHistoryId)] ??
          parseRoomMeta(statusRes.data?.current_room).pin ??
          null)
        : null;

      const waitlistPins: Record<string, string> = {};
      for (const w of waitlistRows) {
        const id = String(w.id);
        const pin = pinMap[id] ?? parseRoomMeta(w.room_number).pin;
        if (pin) {
          waitlistPins[id] = pin;
        }
      }

      return NextResponse.json({ activePin, waitlistPins });
    }

    if (body.action === "force_cancel") {
      const historyId = (body.historyId ?? "").trim();
      if (!historyId) {
        return NextResponse.json(
          { error: "ID antrean tidak valid." },
          { status: 400 }
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
    }

    if (body.action === "force_reset") {
      const now = new Date().toISOString();

      if (body.activeHistoryId) {
        await supabaseAdmin
          .from("borrow_history")
          .update({ status: "returned", returned_at: now })
          .eq("id", body.activeHistoryId);
      } else {
        await supabaseAdmin
          .from("borrow_history")
          .update({ status: "returned", returned_at: now })
          .eq("status", "borrowed");
      }

      const { data: updatedStatus, error } = await supabaseAdmin
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
        return NextResponse.json(
          { error: error?.message ?? "Gagal mereset status setrika." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ironStatus: updatedStatus as IronStatus });
    }

    if (body.action === "delete_history") {
      const historyId = (body.historyId ?? "").trim();
      if (!historyId) {
        return NextResponse.json(
          { error: "ID riwayat tidak valid." },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from("borrow_history")
        .delete()
        .eq("id", historyId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete_all_history") {
      const { error } = await supabaseAdmin
        .from("borrow_history")
        .delete()
        .in("status", ["returned", "cancelled"]);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Aksi admin tidak dikenali." },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal menjalankan aksi admin.",
      },
      { status: 500 }
    );
  }
}

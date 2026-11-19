import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  relayOrSetAvailableServer,
} from "@/lib/supabaseAdmin";
import type { IronStatus } from "@/types/iron";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "report" | "resolve";
      activeHistoryId?: string | null;
    };

    const now = new Date().toISOString();
    const supabaseAdmin = getSupabaseAdmin();

    if (body.action === "report") {
      if (body.activeHistoryId) {
        await supabaseAdmin
          .from("borrow_history")
          .update({
            status: "returned",
            returned_at: now,
          })
          .eq("id", body.activeHistoryId);
      }

      const { data: updatedStatus, error } = await supabaseAdmin
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
        return NextResponse.json(
          {
            error:
              error?.message ??
              "Gagal mengubah status setrika ke mode perbaikan.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ ironStatus: updatedStatus as IronStatus });
    }

    if (body.action === "resolve") {
      const result = await relayOrSetAvailableServer(now, true);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Aksi tidak dikenali." },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal memperbarui status perbaikan setrika.",
      },
      { status: 500 }
    );
  }
}

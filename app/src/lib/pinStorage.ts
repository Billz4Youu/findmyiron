export type PinRecordType = "borrow" | "queue";

export interface SavedPinRecord {
  id: string;
  type: PinRecordType;
  pin: string;
  room: string;
}

export const MY_PIN_STORAGE_KEY = "findMyIron_myPin";
export const MY_PIN_UPDATED_EVENT = "findmyiron:my-pin-updated";

export function parseSavedPin(raw: string | null): SavedPinRecord | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const rec = parsed as Record<string, unknown>;
    if (
      typeof rec.id === "string" &&
      rec.id.trim() !== "" &&
      (rec.type === "borrow" || rec.type === "queue") &&
      typeof rec.pin === "string" &&
      rec.pin.trim() !== "" &&
      typeof rec.room === "string"
    ) {
      return {
        id: rec.id,
        type: rec.type,
        pin: rec.pin,
        room: rec.room,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function notifyPinUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MY_PIN_UPDATED_EVENT));
  }
}

export function saveMyPin(
  record: SavedPinRecord,
  storage?: Pick<Storage, "setItem">
): void {
  const target =
    storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  if (!target) return;
  try {
    target.setItem(MY_PIN_STORAGE_KEY, JSON.stringify(record));
    notifyPinUpdated();
  } catch {
    // Abaikan jika storage tidak tersedia (misal mode private browser penuh)
  }
}

export function getMyPin(
  storage?: Pick<Storage, "getItem">
): SavedPinRecord | null {
  const target =
    storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  if (!target) return null;
  try {
    return parseSavedPin(target.getItem(MY_PIN_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearMyPin(
  storage?: Pick<Storage, "removeItem">
): void {
  const target =
    storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  if (!target) return;
  try {
    target.removeItem(MY_PIN_STORAGE_KEY);
    notifyPinUpdated();
  } catch {
    // Abaikan jika storage tidak tersedia
  }
}

const PIN_REGEX = /\s*\(PIN:\s*(\d{4})\)/i;
const DURATION_REGEX = /\s*\[(\d+)m\]/i;
const LEADING_KAMAR_REGEX = /^kamar\s+/i;

export const DEFAULT_OVERDUE_MINUTES = 30;

export function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function formatRoomWithPin(room: string, pin: string): string {
  const clean = stripRoomMeta(room);
  return `Kamar ${clean} (PIN: ${pin})`;
}

export function formatRoomWithDuration(
  room: string,
  durationMinutes: number
): string {
  const clean = stripRoomMeta(room);
  return `${clean} [${durationMinutes}m]`;
}

export function stripRoomMeta(rawRoom: string | null | undefined): string {
  if (!rawRoom) return "-";
  const cleaned = rawRoom
    .replace(PIN_REGEX, "")
    .replace(DURATION_REGEX, "")
    .replace(LEADING_KAMAR_REGEX, "")
    .trim();
  if (!cleaned || cleaned.toLowerCase().startsWith("rak")) {
    return "-";
  }
  return cleaned;
}

export function parseRoomMeta(rawRoom: string | null | undefined): {
  displayRoom: string;
  pin: string | null;
  durationMinutes: number;
} {
  if (!rawRoom) {
    return {
      displayRoom: "-",
      pin: null,
      durationMinutes: DEFAULT_OVERDUE_MINUTES,
    };
  }

  const pinMatch = rawRoom.match(PIN_REGEX);
  const durationMatch = rawRoom.match(DURATION_REGEX);

  const parsedDuration = durationMatch ? Number(durationMatch[1]) : NaN;
  const durationMinutes =
    !Number.isNaN(parsedDuration) && parsedDuration > 0
      ? parsedDuration
      : DEFAULT_OVERDUE_MINUTES;

  return {
    displayRoom: stripRoomMeta(rawRoom),
    pin: pinMatch ? pinMatch[1] : null,
    durationMinutes,
  };
}

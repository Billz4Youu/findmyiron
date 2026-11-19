// Jalankan: node --test src/lib/historyDates.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { dayLabel, lastDays, groupByDay, toJakartaIsoDate, formatTime } from "./historyDates.ts";
import {
  formatRoomWithPin,
  formatRoomWithDuration,
  parseRoomMeta,
} from "./roomMeta.ts";
import {
  saveMyPin,
  getMyPin,
  clearMyPin,
  parseSavedPin,
} from "./pinStorage.ts";

test("dayLabel", () => {
  assert.equal(dayLabel("2026-11-15", "2026-11-15"), "Hari Ini");
  assert.equal(dayLabel("2026-11-14", "2026-11-15"), "Kemarin");
  assert.equal(dayLabel("2026-11-12", "2026-11-15"), "12 Nov");
  assert.equal(dayLabel("2026-10-31", "2026-11-01"), "Kemarin");
});

test("lastDays berakhir di hari ini", () => {
  const days = lastDays("2026-11-15", 7);
  assert.equal(days.length, 7);
  assert.equal(days[0].iso, "2026-11-09");
  assert.equal(days[6].iso, "2026-11-15");
  assert.equal(days[6].day, 15);
});

test("groupByDay urut terbaru dulu", () => {
  const groups = groupByDay([
    { date: "2026-11-12", id: 1 },
    { date: "2026-11-15", id: 2 },
    { date: "2026-11-12", id: 3 },
  ]);
  assert.deepEqual(groups.map(([d]) => d), ["2026-11-15", "2026-11-12"]);
  assert.equal(groups[1][1].length, 2);
});

test("toJakartaIsoDate dan formatTime memakai WIB (UTC+7)", () => {
  assert.equal(toJakartaIsoDate("2026-11-15T18:30:00Z"), "2026-11-16");
  assert.equal(formatTime("2026-11-15T12:20:00Z"), "19.20");
  assert.equal(formatTime(null), "-");
});

test("parseRoomMeta memisahkan nomor kamar, PIN, dan durasi", () => {
  const withPin = formatRoomWithPin("2.19", "8392");
  assert.equal(withPin, "Kamar 2.19 (PIN: 8392)");
  assert.deepEqual(parseRoomMeta(withPin), {
    displayRoom: "2.19",
    pin: "8392",
    durationMinutes: 30,
  });

  const withDur = formatRoomWithDuration("2.27", 15);
  assert.equal(withDur, "2.27 [15m]");
  assert.deepEqual(parseRoomMeta(withDur), {
    displayRoom: "2.27",
    pin: null,
    durationMinutes: 15,
  });

  const withDurAndPin = formatRoomWithDuration("2.27", 15, "4821");
  assert.equal(withDurAndPin, "2.27 (PIN: 4821) [15m]");
  assert.deepEqual(parseRoomMeta(withDurAndPin), {
    displayRoom: "2.27",
    pin: "4821",
    durationMinutes: 15,
  });
});

test("pinStorage menyimpan, membaca, memvalidasi, dan menghapus PIN", () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };

  assert.equal(getMyPin(mockStorage), null);

  const rec = { id: "hist-1", type: "borrow" as const, pin: "4821", room: "2.19" };
  saveMyPin(rec, mockStorage);
  assert.deepEqual(getMyPin(mockStorage), rec);

  clearMyPin(mockStorage);
  assert.equal(getMyPin(mockStorage), null);

  assert.equal(parseSavedPin("bukan-json"), null);
  assert.equal(parseSavedPin(JSON.stringify({ id: "1", type: "invalid", pin: "1234", room: "2.1" })), null);
});

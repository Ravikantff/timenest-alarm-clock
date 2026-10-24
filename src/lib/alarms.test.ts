import { describe, expect, it } from "vitest";
import { addDuration, parseField } from "./alarms";

describe("addDuration", () => {
  it("adds calendar months before days/hours/minutes", () => {
    const from = new Date(2026, 0, 31, 10, 0);
    const r = addDuration(from, { months: 1, days: 5, hours: 4, minutes: 0 })!;
    // Jan 31 + 1 month = Feb 28 (clamped), +5 days = Mar 5, +4h = 14:00
    expect([r.getMonth(), r.getDate(), r.getHours()]).toEqual([2, 5, 14]);
  });
  it("supports 2 days 3 hours 10 minutes", () => {
    const from = new Date(2026, 9, 24, 10, 0);
    const r = addDuration(from, { months: 0, days: 2, hours: 3, minutes: 10 })!;
    expect([r.getDate(), r.getHours(), r.getMinutes()]).toEqual([26, 13, 10]);
  });
  it("returns null beyond representable dates instead of capping", () => {
    expect(addDuration(Date.now(), { months: 0, days: 0, hours: 0, minutes: 9e15 })).toBeNull();
  });
});

describe("parseField", () => {
  it("rejects negatives and decimals", () => {
    expect(typeof parseField("-1")).toBe("string");
    expect(typeof parseField("1.5")).toBe("string");
  });
  it("accepts large values", () => {
    expect(parseField("100000")).toBe(100000);
  });
});

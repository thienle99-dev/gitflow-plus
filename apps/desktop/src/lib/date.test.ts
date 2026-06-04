import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseGitDate, formatDateString, formatRelativeTime, formatCommitDate } from "./date";

describe("date utility", () => {
  describe("parseGitDate", () => {
    it("parses Git standard date with timezone offset", () => {
      const parsed = parseGitDate("2026-06-04 17:02:15 +0700");
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(5); // June is 5
      expect(parsed.getDate()).toBe(4);
    });

    it("parses already ISO date string", () => {
      const parsed = parseGitDate("2026-06-04T10:02:15Z");
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(5);
    });

    it("returns an invalid Date object for invalid date strings", () => {
      const parsed = parseGitDate("invalid-date-string");
      expect(parsed).toBeInstanceOf(Date);
      expect(Number.isNaN(parsed.getTime())).toBe(true);
    });
  });

  describe("formatDateString", () => {
    const testDate = new Date("2026-06-04T17:02:15Z");

    it("formats with YYYY-MM-DD HH:mm:ss", () => {
      // We check UTC parts to be environment independent
      const formatted = formatDateString(testDate, "YYYY-MM-DD");
      const expectedYear = testDate.getFullYear().toString();
      const expectedMonth = (testDate.getMonth() + 1).toString().padStart(2, "0");
      const expectedDate = testDate.getDate().toString().padStart(2, "0");
      expect(formatted).toBe(`${expectedYear}-${expectedMonth}-${expectedDate}`);
    });

    it("formats with custom tokens MMMM, MMM, YY", () => {
      const formatted = formatDateString(testDate, "YY");
      expect(formatted).toBe("26");
    });
  });

  describe("formatRelativeTime", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-04T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("formats relative time correctly for different ranges", () => {
      const now = new Date("2026-06-04T12:00:00Z");
      
      const justNow = new Date(now.getTime() - 5 * 1000);
      expect(formatRelativeTime(justNow)).toBe("Just now");

      const secondsAgo = new Date(now.getTime() - 15 * 1000);
      expect(formatRelativeTime(secondsAgo)).toBe("15s ago");

      const minutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTime(minutesAgo)).toBe("5m ago");

      const hoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(hoursAgo)).toBe("3h ago");

      const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const expectedYestHours = String(yesterdayDate.getHours()).padStart(2, "0");
      const expectedYestMinutes = String(yesterdayDate.getMinutes()).padStart(2, "0");
      expect(formatRelativeTime(yesterdayDate)).toBe(`2026-06-03 ${expectedYestHours}:${expectedYestMinutes}`);

      const olderDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const expectedHours = String(olderDate.getHours()).padStart(2, "0");
      const expectedMinutes = String(olderDate.getMinutes()).padStart(2, "0");
      expect(formatRelativeTime(olderDate)).toBe(`2026-06-02 ${expectedHours}:${expectedMinutes}`);
    });
  });

  describe("formatCommitDate", () => {
    let store: Record<string, string> = {};

    beforeEach(() => {
      store = {};
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        clear: () => {
          store = {};
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        length: 0,
        key: () => null,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("uses relative format by default when no key is in localStorage", () => {
      const dateStr = new Date().toISOString();
      const formatted = formatCommitDate(dateStr);
      expect(formatted).toBe("Just now");
    });

    it("respects custom format from localStorage", () => {
      store["gitflowDateFormat"] = "custom";
      store["gitflowCustomDateFormat"] = "YYYY/MM/DD";
      const dateStr = "2026-06-04 17:02:15 +0700";
      const formatted = formatCommitDate(dateStr);
      
      const parsed = parseGitDate(dateStr)!;
      const expectedYear = parsed.getFullYear().toString();
      const expectedMonth = (parsed.getMonth() + 1).toString().padStart(2, "0");
      const expectedDate = parsed.getDate().toString().padStart(2, "0");
      
      expect(formatted).toBe(`${expectedYear}/${expectedMonth}/${expectedDate}`);
    });
  });
});

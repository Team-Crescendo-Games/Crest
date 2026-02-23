import { describe, it, expect } from "vitest";
import {
  parseLocalDate,
  formatUTCDate,
  localDateToUTC,
  localDateObjToUTC,
  utcToDateInputValue,
} from "@/lib/dateUtils";

describe("dateUtils", () => {
  describe("parseLocalDate", () => {
    it("parses yyyy-MM-dd as local date", () => {
      const date = parseLocalDate("2026-02-14");
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(1); // 0-indexed
      expect(date.getDate()).toBe(14);
    });

    it("parses ISO string taking only the date portion", () => {
      const date = parseLocalDate("2026-02-14T00:00:00.000Z");
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(1);
      expect(date.getDate()).toBe(14);
    });
  });

  describe("formatUTCDate", () => {
    it("formats a UTC date string for display", () => {
      const result = formatUTCDate("2026-02-14T00:00:00.000Z");
      expect(result).toBe("Feb 14, 2026");
    });

    it("accepts custom options", () => {
      const result = formatUTCDate("2026-12-25T00:00:00.000Z", {
        month: "long",
      });
      expect(result).toContain("December");
    });
  });

  describe("localDateToUTC", () => {
    it("converts yyyy-MM-dd to UTC ISO string", () => {
      expect(localDateToUTC("2026-02-14")).toBe("2026-02-14T00:00:00.000Z");
    });
  });

  describe("localDateObjToUTC", () => {
    it("converts a local Date to UTC ISO string preserving calendar date", () => {
      const date = new Date(2026, 1, 14); // Feb 14, 2026
      expect(localDateObjToUTC(date)).toBe("2026-02-14T00:00:00.000Z");
    });

    it("pads single-digit months and days", () => {
      const date = new Date(2026, 0, 5); // Jan 5, 2026
      expect(localDateObjToUTC(date)).toBe("2026-01-05T00:00:00.000Z");
    });
  });

  describe("utcToDateInputValue", () => {
    it("extracts yyyy-MM-dd from ISO string", () => {
      expect(utcToDateInputValue("2026-02-14T00:00:00.000Z")).toBe(
        "2026-02-14",
      );
    });
  });
});

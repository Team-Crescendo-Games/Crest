import { describe, it, expect } from "vitest";
import { statusIntToString, statusStringToInt } from "../lib/statusUtils.ts";

describe("statusIntToString", () => {
    it("maps 0 to Input Queue", () => expect(statusIntToString(0)).toBe("Input Queue"));
    it("maps 1 to Work In Progress", () => expect(statusIntToString(1)).toBe("Work In Progress"));
    it("maps 2 to Review", () => expect(statusIntToString(2)).toBe("Review"));
    it("maps 3 to Done", () => expect(statusIntToString(3)).toBe("Done"));
    it("returns null for null", () => expect(statusIntToString(null)).toBeNull());
    it("returns null for unknown int", () => expect(statusIntToString(99)).toBeNull());
});

describe("statusStringToInt", () => {
    it("maps Input Queue to 0", () => expect(statusStringToInt("Input Queue")).toBe(0));
    it("maps Work In Progress to 1", () => expect(statusStringToInt("Work In Progress")).toBe(1));
    it("maps Review to 2", () => expect(statusStringToInt("Review")).toBe(2));
    it("maps Done to 3", () => expect(statusStringToInt("Done")).toBe(3));
    it("returns null for null", () => expect(statusStringToInt(null)).toBeNull());
    it("returns null for undefined", () => expect(statusStringToInt(undefined)).toBeNull());
    it("returns null for unknown string", () => expect(statusStringToInt("Unknown")).toBeNull());
});

import { describe, it, expect } from "vitest";
import {
  isTextFile,
  isImageFile,
  isVideoFile,
  validateFile,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/attachmentUtils";

describe("attachmentUtils", () => {
  describe("isTextFile", () => {
    it("returns true for code/text extensions", () => {
      expect(isTextFile("ts")).toBe(true);
      expect(isTextFile("tsx")).toBe(true);
      expect(isTextFile("json")).toBe(true);
      expect(isTextFile("md")).toBe(true);
      expect(isTextFile("py")).toBe(true);
    });

    it("returns false for non-text extensions", () => {
      expect(isTextFile("png")).toBe(false);
      expect(isTextFile("mp4")).toBe(false);
      expect(isTextFile("pdf")).toBe(false);
    });

    it("is case-insensitive", () => {
      expect(isTextFile("TS")).toBe(true);
      expect(isTextFile("JSON")).toBe(true);
    });
  });

  describe("isImageFile", () => {
    it("returns true for image extensions", () => {
      expect(isImageFile("jpg")).toBe(true);
      expect(isImageFile("png")).toBe(true);
      expect(isImageFile("gif")).toBe(true);
      expect(isImageFile("webp")).toBe(true);
      expect(isImageFile("svg")).toBe(true);
    });

    it("returns false for non-image extensions", () => {
      expect(isImageFile("mp4")).toBe(false);
      expect(isImageFile("ts")).toBe(false);
    });
  });

  describe("isVideoFile", () => {
    it("returns true for video extensions", () => {
      expect(isVideoFile("mp4")).toBe(true);
      expect(isVideoFile("webm")).toBe(true);
      expect(isVideoFile("mov")).toBe(true);
    });

    it("returns false for non-video extensions", () => {
      expect(isVideoFile("png")).toBe(false);
      expect(isVideoFile("txt")).toBe(false);
    });
  });

  describe("validateFile", () => {
    it("accepts a valid file", () => {
      const file = new File(["hello"], "test.txt", { type: "text/plain" });
      expect(validateFile(file)).toEqual({ valid: true });
    });

    it("rejects files exceeding size limit", () => {
      const bigContent = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
      const file = new File([bigContent], "big.txt", { type: "text/plain" });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("size");
    });

    it("rejects unsupported file types", () => {
      const file = new File(["data"], "malware.exe", {
        type: "application/x-msdownload",
      });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not supported");
    });

    it("accepts supported document types", () => {
      const file = new File(["data"], "report.pdf", {
        type: "application/pdf",
      });
      expect(validateFile(file)).toEqual({ valid: true });
    });
  });
});

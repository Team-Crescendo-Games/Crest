import { describe, it, expect } from "vitest";
import {
  isValidEmoji,
  getEmojiSrc,
  getEmojiLabel,
  AVAILABLE_EMOJIS,
  DEFAULT_QUICK_REACTION,
} from "@/lib/emojiConstants";

describe("emojiConstants", () => {
  it("AVAILABLE_EMOJIS has entries", () => {
    expect(AVAILABLE_EMOJIS.length).toBeGreaterThan(0);
  });

  it("DEFAULT_QUICK_REACTION is a valid emoji", () => {
    expect(isValidEmoji(DEFAULT_QUICK_REACTION)).toBe(true);
  });

  describe("isValidEmoji", () => {
    it("returns true for known emoji IDs", () => {
      expect(isValidEmoji("FeelingYes")).toBe(true);
      expect(isValidEmoji("FeelingGreat")).toBe(true);
    });

    it("returns false for unknown emoji IDs", () => {
      expect(isValidEmoji("NonExistent")).toBe(false);
      expect(isValidEmoji("")).toBe(false);
    });
  });

  describe("getEmojiSrc", () => {
    it("returns src for valid emoji", () => {
      expect(getEmojiSrc("FeelingYes")).toBe("/emojis/FeelingYes.jpg");
    });

    it("returns null for invalid emoji", () => {
      expect(getEmojiSrc("bogus")).toBeNull();
    });
  });

  describe("getEmojiLabel", () => {
    it("returns label for valid emoji", () => {
      expect(getEmojiLabel("FeelingYes")).toBe("Yes");
      expect(getEmojiLabel("FeelingGreat")).toBe("Great");
    });

    it("returns null for invalid emoji", () => {
      expect(getEmojiLabel("bogus")).toBeNull();
    });
  });
});

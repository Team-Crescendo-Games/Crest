import { describe, it, expect } from "vitest";
import { formatRelativeTime, formatActivityMessage } from "@/lib/activityUtils";
import { ActivityType, Activity } from "@/state/api";

describe("activityUtils", () => {
  describe("formatRelativeTime", () => {
    it('returns "just now" for recent dates', () => {
      expect(formatRelativeTime(new Date())).toBe("just now");
    });

    it("returns minutes ago", () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinAgo)).toBe("5 minutes ago");
    });

    it("returns singular minute", () => {
      const oneMinAgo = new Date(Date.now() - 60 * 1000);
      expect(formatRelativeTime(oneMinAgo)).toBe("1 minute ago");
    });

    it("returns hours ago", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe("2 hours ago");
    });

    it("returns days ago", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysAgo)).toBe("3 days ago");
    });

    it("accepts string input", () => {
      const recent = new Date(Date.now() - 30 * 1000).toISOString();
      expect(formatRelativeTime(recent)).toBe("just now");
    });
  });

  describe("formatActivityMessage", () => {
    const baseActivity: Activity = {
      id: 1,
      taskId: 1,
      userId: 1,
      activityType: ActivityType.CREATE_TASK,
      createdAt: new Date().toISOString(),
      user: { userId: 1, username: "alice", fullName: "Alice Smith" },
    };

    it("formats CREATE_TASK", () => {
      const result = formatActivityMessage({
        ...baseActivity,
        activityType: ActivityType.CREATE_TASK,
      });
      expect(result.username).toBe("Alice Smith");
      expect(result.action).toBe("created the card");
    });

    it("formats MOVE_TASK with highlighted parts", () => {
      const result = formatActivityMessage({
        ...baseActivity,
        activityType: ActivityType.MOVE_TASK,
        previousStatus: "Input Queue",
        newStatus: "Work In Progress",
      });
      expect(result.action).toBe("moved the card from");
      expect(result.highlightedParts).toBeDefined();
      expect(result.highlightedParts![0].text).toBe("Input Queue");
      expect(result.highlightedParts![2].text).toBe("Work In Progress");
    });

    it("formats EDIT_TASK with priority change", () => {
      const result = formatActivityMessage({
        ...baseActivity,
        activityType: ActivityType.EDIT_TASK,
        editField: "changed the priority to High",
      } as Activity);
      expect(result.action).toBe("changed the priority to ");
      expect(result.highlightedParts![0].text).toBe("High");
    });

    it("formats EDIT_TASK with generic edit field", () => {
      const result = formatActivityMessage({
        ...baseActivity,
        activityType: ActivityType.EDIT_TASK,
        editField: "updated the title",
      } as Activity);
      expect(result.action).toBe("updated the title");
      expect(result.highlightedParts).toBeUndefined();
    });

    it("falls back to username when fullName is missing", () => {
      const result = formatActivityMessage({
        ...baseActivity,
        user: { userId: 2, username: "bob" },
        activityType: ActivityType.CREATE_TASK,
      } as Activity);
      expect(result.username).toBe("bob");
    });
  });
});

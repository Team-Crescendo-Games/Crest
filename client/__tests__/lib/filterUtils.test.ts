import { describe, it, expect } from "vitest";
import {
  isFilterActive,
  matchesTagFilter,
  matchesPriorityFilter,
  matchesStatusFilter,
  matchesSearchText,
  matchesBoardFilter,
  matchesAssigneeFilter,
  applyFilters,
  applySorting,
  isSortActive,
  priorityOrder,
} from "@/lib/filterUtils";
import { Priority, Status, Task } from "@/state/api";
import { FilterState, TaskStatus } from "@/lib/filterTypes";

const emptyFilter: FilterState = {
  selectedTagIds: [],
  selectedPriorities: [],
  selectedDueDateOptions: [],
  selectedAssigneeIds: [],
  selectedStatuses: [],
  selectedBoardIds: [],
  searchText: "",
  timeRange: null,
  sort: { field: "none", direction: "asc" },
};

const makeTask = (overrides: Partial<Task> = {}): Task =>
  ({
    id: 1,
    title: "Test Task",
    description: "A test task",
    status: "Input Queue",
    priority: Priority.Medium,
    boardId: 10,
    authorUserId: 1,
    taskTags: [],
    taskAssignments: [],
    ...overrides,
  }) as Task;

describe("filterUtils", () => {
  describe("isFilterActive", () => {
    it("returns false for empty filter state", () => {
      expect(isFilterActive(emptyFilter)).toBe(false);
    });

    it("returns true when tags are selected", () => {
      expect(
        isFilterActive({ ...emptyFilter, selectedTagIds: [1] }),
      ).toBe(true);
    });

    it("returns true when search text is present", () => {
      expect(
        isFilterActive({ ...emptyFilter, searchText: "bug" }),
      ).toBe(true);
    });
  });

  describe("matchesTagFilter", () => {
    it("passes all tasks when no tags selected", () => {
      expect(matchesTagFilter(makeTask(), [])).toBe(true);
    });

    it("matches task with matching tag", () => {
      const task = makeTask({
        taskTags: [{ id: 1, tagId: 5, taskId: 1, tag: { id: 5, name: "Bug", workspaceId: 1 } }],
      });
      expect(matchesTagFilter(task, [5])).toBe(true);
    });

    it("rejects task without matching tag", () => {
      const task = makeTask({
        taskTags: [{ id: 1, tagId: 5, taskId: 1, tag: { id: 5, name: "Bug", workspaceId: 1 } }],
      });
      expect(matchesTagFilter(task, [99])).toBe(false);
    });
  });

  describe("matchesPriorityFilter", () => {
    it("passes all tasks when no priorities selected", () => {
      expect(matchesPriorityFilter(makeTask(), [])).toBe(true);
    });

    it("matches task with matching priority", () => {
      expect(
        matchesPriorityFilter(
          makeTask({ priority: Priority.High }),
          [Priority.High],
        ),
      ).toBe(true);
    });

    it("rejects task with non-matching priority", () => {
      expect(
        matchesPriorityFilter(
          makeTask({ priority: Priority.Low }),
          [Priority.Urgent],
        ),
      ).toBe(false);
    });
  });

  describe("matchesStatusFilter", () => {
    it("passes all tasks when no statuses selected", () => {
      expect(matchesStatusFilter(makeTask(), [])).toBe(true);
    });

    it("matches task with matching status", () => {
      expect(
        matchesStatusFilter(makeTask({ status: "Done" as Status }), ["Done" as TaskStatus]),
      ).toBe(true);
    });
  });

  describe("matchesSearchText", () => {
    it("passes all tasks when search is empty", () => {
      expect(matchesSearchText(makeTask(), "")).toBe(true);
    });

    it("matches on title", () => {
      expect(matchesSearchText(makeTask({ title: "Fix login bug" }), "login")).toBe(true);
    });

    it("matches on description", () => {
      expect(
        matchesSearchText(
          makeTask({ description: "The API returns 500" }),
          "api",
        ),
      ).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(matchesSearchText(makeTask({ title: "BUG FIX" }), "bug fix")).toBe(true);
    });

    it("rejects non-matching text", () => {
      expect(matchesSearchText(makeTask({ title: "Setup CI" }), "deploy")).toBe(false);
    });
  });

  describe("matchesBoardFilter", () => {
    it("passes all tasks when no boards selected", () => {
      expect(matchesBoardFilter(makeTask(), [])).toBe(true);
    });

    it("matches task on its board", () => {
      expect(matchesBoardFilter(makeTask({ boardId: 10 }), [10])).toBe(true);
    });

    it("rejects task not on selected board", () => {
      expect(matchesBoardFilter(makeTask({ boardId: 10 }), [20])).toBe(false);
    });
  });

  describe("matchesAssigneeFilter", () => {
    it("passes all tasks when no assignees selected", () => {
      expect(matchesAssigneeFilter(makeTask(), [])).toBe(true);
    });

    it("matches task with matching assignee", () => {
      const task = makeTask({
        taskAssignments: [{ id: 1, userId: 5, taskId: 1, user: { userId: 5, username: "alice" } }],
      });
      expect(matchesAssigneeFilter(task, [5])).toBe(true);
    });

    it("rejects task without matching assignee", () => {
      const task = makeTask({
        taskAssignments: [{ id: 1, userId: 5, taskId: 1, user: { userId: 5, username: "alice" } }],
      });
      expect(matchesAssigneeFilter(task, [99])).toBe(false);
    });
  });

  describe("applyFilters", () => {
    it("returns all tasks with empty filters", () => {
      const tasks = [makeTask({ id: 1 }), makeTask({ id: 2 })];
      expect(applyFilters(tasks, emptyFilter)).toHaveLength(2);
    });

    it("applies AND logic across filter categories", () => {
      const tasks = [
        makeTask({ id: 1, priority: Priority.High, title: "Bug" }),
        makeTask({ id: 2, priority: Priority.Low, title: "Bug" }),
        makeTask({ id: 3, priority: Priority.High, title: "Feature" }),
      ];
      const filter: FilterState = {
        ...emptyFilter,
        selectedPriorities: [Priority.High],
        searchText: "Bug",
      };
      const result = applyFilters(tasks, filter);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe("sorting", () => {
    it("isSortActive returns false for 'none'", () => {
      expect(isSortActive({ field: "none", direction: "asc" })).toBe(false);
    });

    it("isSortActive returns true for active sort", () => {
      expect(isSortActive({ field: "priority", direction: "asc" })).toBe(true);
    });

    it("sorts by priority ascending", () => {
      const tasks = [
        makeTask({ id: 1, priority: Priority.Low }),
        makeTask({ id: 2, priority: Priority.Urgent }),
        makeTask({ id: 3, priority: Priority.Medium }),
      ];
      const sorted = applySorting(tasks, { field: "priority", direction: "asc" });
      expect(sorted.map((t) => t.id)).toEqual([2, 3, 1]);
    });

    it("sorts by priority descending", () => {
      const tasks = [
        makeTask({ id: 1, priority: Priority.Urgent }),
        makeTask({ id: 2, priority: Priority.Low }),
      ];
      const sorted = applySorting(tasks, {
        field: "priority",
        direction: "desc",
      });
      expect(sorted.map((t) => t.id)).toEqual([2, 1]);
    });

    it("priorityOrder has correct ordering", () => {
      expect(priorityOrder[Priority.Urgent]).toBeLessThan(
        priorityOrder[Priority.High],
      );
      expect(priorityOrder[Priority.High]).toBeLessThan(
        priorityOrder[Priority.Medium],
      );
      expect(priorityOrder[Priority.Medium]).toBeLessThan(
        priorityOrder[Priority.Low],
      );
      expect(priorityOrder[Priority.Low]).toBeLessThan(
        priorityOrder[Priority.Backlog],
      );
    });
  });
});

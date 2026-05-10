# Workspace Tasks Page — Design

**Date:** 2026-05-10
**Status:** Approved for implementation

## Goal

Add a workspace-scoped master Tasks page that lets users search and filter every task in the active workspace from a single list. Surfaced as a "Tasks" entry in the left sidebar, placed above the Boards section.

## Scope

- **Route:** `/w/[workspaceId]/tasks` (server-rendered)
- **View:** List only (no kanban / no flow view)
- **Filtering:** search text, board(s), sprint(s), tag(s), priorities, assignees, status(es), show-archived toggle
- **Sorting:** existing `SortControls` (dueDate, startDate, priority, points)
- **Pagination:** server-side via URL `?page=N`, default 25 per page

Out of scope: creating tasks from this page, drag-to-reorder, saved filter presets.

## Sidebar entry

Edit `components/sidebar/sidebar.tsx`. Insert a `SidebarLink` between the "Team" link and `<BoardNav />`:

```
<SidebarLink
  href={`/w/${activeWorkspaceId}/tasks`}
  icon={ListChecks}
  label="Tasks"
  active={pathname === `/w/${activeWorkspaceId}/tasks`}
/>
```

Use `ListChecks` from `lucide-react`.

## Page route

**File:** `app/w/[workspaceId]/tasks/page.tsx` (server component)

**Search params:**

| Param | Type | Notes |
|---|---|---|
| `q` | string | substring on title or description |
| `priority` | csv | one of `TASK_PRIORITIES` |
| `tag` | csv | tag names (AND semantics, matching board page) |
| `assignee` | csv | user IDs, plus literal `unassigned` |
| `board` | csv | board IDs |
| `sprint` | csv | sprint IDs |
| `status` | csv | one of `TASK_STATUSES` |
| `showArchived` | "1" / undefined | include tasks from archived boards |
| `sort` | string | parsed by `parseSorts` |
| `page` | int | 1-based, default 1 |

**Auth:** look up `WorkspaceMember`; `notFound()` if missing.

**Data fetch (parallel):**
1. `searchWorkspaceTasksList(...)` → `{ tasks, total }`
2. `prisma.board.findMany({ where: { workspaceId, isActive: true } })` for board filter dropdown
3. `prisma.sprint.findMany({ where: { workspaceId, isActive: true } })` for sprint filter dropdown
4. `prisma.tag.findMany({ where: { workspaceId } })` for tag filter dropdown
5. `prisma.workspaceMember.findMany({ where: { workspaceId }, include: { user } })` for assignee filter

**Render:** header (workspace name + "<filtered>/<total> tasks"), `<TaskSearchFilters />`, `<TaskListView />` with server pagination.

## Server query helper

**File:** `lib/actions/task/search.ts` — add new function:

```ts
export async function searchWorkspaceTasksList(
  workspaceId: string,
  filters: {
    q?: string;
    priorities?: string[];
    tagFilters?: string[];
    assigneeFilters?: string[];
    boardIds?: string[];
    sprintIds?: string[];
    statuses?: string[];
    showArchived?: boolean;
  },
  sorts: SortOption[],
  page: number,
  pageSize: number,
): Promise<{ tasks: TaskListRow[]; total: number }>
```

**Where clause construction:**

Start with `where.board = { workspaceId }`. If `!showArchived`, set `where.board.isActive = true`.

- `q` → `where.OR = [{ title: contains }, { description: contains }]`
- `priorities` → `where.priority = { in: ... }` (or single value)
- `tagFilters` → `where.AND = filters.map(name => ({ tags: { some: { name } } }))` (matches existing semantics from board page)
- `assigneeFilters` → reuse pattern from `app/w/[workspaceId]/b/[boardId]/page.tsx`:
  - both unassigned + ids → `OR: [{ assignees: { none: {} } }, { assignees: { some: { id: { in: ids } } } }]`
  - only unassigned → `assignees: { none: {} }`
  - only ids → `assignees: { some: { id: { in: ids } } }`
- `boardIds` → `where.boardId = { in: ids }`
- `sprintIds` → `where.sprints = { some: { id: { in: ids } } }`
- `statuses` → `where.status = { in: statuses }`

**Order/skip/take:** use existing `buildOrderBy(sorts)`; if a `priority` sort is present, perform in-memory sort via `PRIORITY_ORDER` after fetch (consistent with `loadMyColumnTasks`). Pagination via `skip = (page - 1) * pageSize`, `take = pageSize`. Run `prisma.task.count({ where })` in parallel for `total`.

**Include:** `assignees`, `tags`, `board (id, name, workspaceId)`, `subtasks (id, status)`, `_count.comments`.

**Return shape:** match the `Task` interface consumed by `TaskListView` — `boardId`, `workspaceId`, `commentCount`, `subtaskTotal`, `subtaskCompleted`.

## Components

### Extract: `components/tasks/multi-select.tsx`

Move the `MultiSelect` and `FilterChip` helpers out of `task-filters.tsx` into their own file so both `task-filters.tsx` and the new `task-search-filters.tsx` can import them without duplication. `task-filters.tsx` re-imports from the new module — no behavior change.

### New: `components/tasks/task-search-filters.tsx`

Client component owning the workspace-tasks filter UI.

**Props:**
```ts
{
  boards: { id: string; name: string }[];
  sprints: { id: string; title: string }[];
  tags: { name: string; color: string | null }[];
  assignees: { id: string; name: string | null; image?: string | null }[];
  current: {
    q?: string;
    priorities: string[];
    tags: string[];
    assignees: string[];
    boards: string[];
    sprints: string[];
    statuses: string[];
    sorts: SortOption[];
    showArchived: boolean;
  };
}
```

**Behavior:**
- Mirrors `task-filters.tsx`: search input (Enter to commit), six `MultiSelect` dropdowns (Board, Sprint, Tag, Priority, Assignee, Status), a small "Archived" toggle button, and `SortControls` inline.
- Each filter change resets `page` to 1 (omit from URL).
- "Clear all" wipes filters but preserves nothing else (this page has no other params).
- Active filter chips row underneath, identical pattern to `TaskFilters`.

### Extend: `components/tasks/task-list-view.tsx`

Add an optional `pagination` prop:

```ts
type Pagination =
  | { mode: "client" }                                // current behavior (default)
  | {
      mode: "server";
      page: number;
      totalPages: number;
      total: number;
      buildHref: (page: number) => string;
    };
```

When `mode: "server"`, render the same Prev / page-numbers / Next UI but as `<Link>` elements via `buildHref`, and skip the in-component slicing (rows are already paginated server-side). Default (`undefined` or `client`) keeps the existing behavior intact for callers like `task-views.tsx` and the dashboard.

`buildHref(page)` is constructed by the server page using `URLSearchParams` so all current filters are preserved.

## Data flow

```
URL params
  → server page parses → searchWorkspaceTasksList()
  → server props { tasks, total, filterOptions, current }
  → <TaskSearchFilters /> + <TaskListView pagination={server} />
  → user edits filter → router.push(new URL) → server re-renders
```

## Edge cases

- **No workspace member:** `notFound()`.
- **Empty results:** `TaskListView` already shows "No tasks found." — preserve.
- **Page out of range:** clamp `page` to `[1, totalPages]` (totalPages ≥ 1) before fetching.
- **Filter referring to deleted board/sprint/tag/user:** Prisma `IN` will simply match nothing; chip still renders the raw id. Acceptable for v1.
- **Tag AND semantics:** keep matching the board page for consistency — a task must have all selected tags.
- **`showArchived` toggle:** default `false`. When `true`, no `isActive` constraint on board.

## Testing checklist

- Filters URL round-trip: each filter persists on reload.
- Combining boards + sprint + assignee + tag yields intersection.
- Pagination Prev/Next preserves all filters.
- Sort changes preserve filters and reset page to 1.
- Archived toggle includes/excludes archived-board tasks.
- "Clear all" removes filter chips and resets page.
- Sidebar entry highlights only on `/w/[id]/tasks`.

## Files touched

**New**
- `app/w/[workspaceId]/tasks/page.tsx`
- `components/tasks/task-search-filters.tsx`
- `components/tasks/multi-select.tsx`

**Modified**
- `components/sidebar/sidebar.tsx` — add Tasks link
- `components/tasks/task-list-view.tsx` — add server-pagination mode
- `components/tasks/task-filters.tsx` — import `MultiSelect` / `FilterChip` from new module
- `lib/actions/task/search.ts` — add `searchWorkspaceTasksList`

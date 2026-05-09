"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Link from "next/link";
import { Search, X, Locate, Loader2, RefreshCw, LayoutGrid, Plus } from "lucide-react";
import { setTaskParent, getFlowGraphTasks, searchWorkspaceTasks } from "@/lib/actions/task";
import { CreateTaskFormModal } from "@/components/tasks/create-task-form";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/task-enums";
import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FlowTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  boardId: string;
  board: { id: string; name: string };
  assignees: { id: string; name: string | null }[];
  tags: { name: string; color: string | null }[];
  parentTaskId?: string | null;
  subtaskIds?: string[];
}

interface NodePosition {
  x: number;
  y: number;
}

interface DragLine {
  fromId: string;
  fromPort: "parent" | "child";
  x: number;
  y: number;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const PORT_RADIUS = 6;
const H_GAP = 60;
const V_GAP = 50;

// Module-level cache: persists pan/zoom across refresh remounts (keyed by rootId).
const viewportCache = new Map<string, { pan: { x: number; y: number }; zoom: number }>();

// ─── Graph traversal ────────────────────────────────────────────────────────

/** BFS from a root task, following parent/subtask edges. Returns all connected task IDs. */
function getConnectedGraph(rootId: string, taskMap: Map<string, FlowTask>): Set<string> {
  const visited = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const task = taskMap.get(current);
    if (!task) continue;

    // Traverse to parent
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      queue.push(task.parentTaskId);
    }

    // Traverse to subtasks
    if (task.subtaskIds) {
      for (const childId of task.subtaskIds) {
        if (taskMap.has(childId)) {
          queue.push(childId);
        }
      }
    }
  }

  return visited;
}

/** Layout nodes in a tree-like structure. Handles cycles by only visiting each node once. */
function layoutGraph(
  rootId: string,
  connectedIds: Set<string>,
  taskMap: Map<string, FlowTask>,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();

  // Find the topmost ancestor of the root to start layout from the real root
  let topRoot = rootId;
  const ancestorVisited = new Set<string>();
  while (true) {
    ancestorVisited.add(topRoot);
    const task = taskMap.get(topRoot);
    if (!task?.parentTaskId || !connectedIds.has(task.parentTaskId) || ancestorVisited.has(task.parentTaskId)) {
      break;
    }
    topRoot = task.parentTaskId;
  }

  // Tree layout: each parent is centered above its subtree.
  // Walk children in DFS order, accumulating x as we lay out leaves left-to-right.
  // `placed` prevents revisiting nodes via cycle edges.
  const placed = new Set<string>();
  const subtreeWidth = new Map<string, number>();

  const childrenOf = (id: string): string[] => {
    const task = taskMap.get(id);
    if (!task?.subtaskIds) return [];
    return task.subtaskIds.filter((c) => connectedIds.has(c));
  };

  // First pass: compute subtree width (in pixels) for each node.
  const computeWidth = (id: string, seen: Set<string>): number => {
    if (subtreeWidth.has(id)) return subtreeWidth.get(id)!;
    if (seen.has(id)) return NODE_WIDTH;
    seen.add(id);
    const kids = childrenOf(id).filter((c) => !seen.has(c));
    if (kids.length === 0) {
      subtreeWidth.set(id, NODE_WIDTH);
      return NODE_WIDTH;
    }
    const total = kids.reduce((sum, c) => sum + computeWidth(c, seen), 0) + (kids.length - 1) * H_GAP;
    const w = Math.max(NODE_WIDTH, total);
    subtreeWidth.set(id, w);
    return w;
  };
  computeWidth(topRoot, new Set());

  // Second pass: assign x positions. Each subtree gets a horizontal slot of `subtreeWidth`,
  // and the node sits centered above its subtree.
  const place = (id: string, leftX: number, depth: number, seen: Set<string>) => {
    if (placed.has(id) || seen.has(id)) return;
    seen.add(id);
    placed.add(id);
    const width = subtreeWidth.get(id) ?? NODE_WIDTH;
    const kids = childrenOf(id).filter((c) => !placed.has(c) && !seen.has(c));

    if (kids.length === 0) {
      positions.set(id, {
        x: leftX + (width - NODE_WIDTH) / 2 + 40,
        y: depth * (NODE_HEIGHT + V_GAP) + 40,
      });
      return;
    }

    // Lay out children left-to-right within this subtree's slot.
    let cursor = leftX;
    for (const childId of kids) {
      const childWidth = subtreeWidth.get(childId) ?? NODE_WIDTH;
      place(childId, cursor, depth + 1, seen);
      cursor += childWidth + H_GAP;
    }

    // Center the parent over the actual span of placed children.
    const firstChildPos = positions.get(kids[0]);
    const lastChildPos = positions.get(kids[kids.length - 1]);
    if (firstChildPos && lastChildPos) {
      const childrenCenter = (firstChildPos.x + lastChildPos.x + NODE_WIDTH) / 2;
      positions.set(id, {
        x: childrenCenter - NODE_WIDTH / 2,
        y: depth * (NODE_HEIGHT + V_GAP) + 40,
      });
    } else {
      positions.set(id, {
        x: leftX + (width - NODE_WIDTH) / 2 + 40,
        y: depth * (NODE_HEIGHT + V_GAP) + 40,
      });
    }
  };

  place(topRoot, 0, 0, new Set());

  // Place any remaining connected nodes that weren't reached (cycle edges / disconnected)
  let extraDepth = 0;
  for (const pos of positions.values()) {
    extraDepth = Math.max(extraDepth, Math.round((pos.y - 40) / (NODE_HEIGHT + V_GAP)));
  }
  let extraX = 0;
  for (const id of connectedIds) {
    if (!placed.has(id)) {
      placed.add(id);
      positions.set(id, {
        x: extraX + 40,
        y: (extraDepth + 1) * (NODE_HEIGHT + V_GAP) + 40,
      });
      extraX += NODE_WIDTH + H_GAP;
    }
  }

  return positions;
}

// ─── Port position helpers ──────────────────────────────────────────────────

function getParentPortPos(pos: NodePosition): { x: number; y: number } {
  return { x: pos.x + NODE_WIDTH / 2, y: pos.y };
}

function getChildPortPos(pos: NodePosition): { x: number; y: number } {
  return { x: pos.x + NODE_WIDTH / 2, y: pos.y + NODE_HEIGHT };
}

// ─── Edge drawing ───────────────────────────────────────────────────────────

function EdgePath({
  from,
  to,
  isHighlighted,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onDisconnect,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isHighlighted?: boolean;
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDisconnect?: () => void;
}) {
  const midY = (from.y + to.y) / 2;
  const midX = (from.x + to.x) / 2;
  const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
  const active = isHighlighted || isHovered;

  return (
    <g
      className="pointer-events-auto"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Wide invisible hit target for easier hover/click */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: "pointer" }} />
      <path
        d={d}
        fill="none"
        stroke={active ? "var(--accent)" : "var(--border)"}
        strokeWidth={active ? 2 : 1.5}
        strokeDasharray={active ? undefined : "4 3"}
        className="pointer-events-none transition-colors duration-150"
      />
      {isHovered && onDisconnect && (
        <g
          onClick={(e) => {
            e.stopPropagation();
            onDisconnect();
          }}
          style={{ cursor: "pointer" }}
        >
          <circle cx={midX} cy={midY} r={9} fill="var(--bg-elevated)" stroke="var(--accent)" strokeWidth={1.5} />
          <line x1={midX - 3.5} y1={midY - 3.5} x2={midX + 3.5} y2={midY + 3.5} stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" />
          <line x1={midX + 3.5} y1={midY - 3.5} x2={midX - 3.5} y2={midY + 3.5} stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

function DragEdgePath({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const midY = (from.y + to.y) / 2;
  const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;

  return <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="6 4" opacity={0.7} />;
}

// ─── Task selector ──────────────────────────────────────────────────────────

function TaskSelector({ tasks, onSelect }: { tasks: FlowTask[]; onSelect: (taskId: string) => void }) {
  const [query, setQuery] = useState("");

  const filtered = query ? tasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase())) : tasks;

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <p className="mb-4 font-mono text-sm text-fg-secondary">Select a task to view its dependency graph</p>
      <div className="relative w-80">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks..."
          className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 pl-9 font-mono text-xs text-fg-primary placeholder:text-fg-muted focus:border-accent/50 focus:outline-none"
        />
      </div>
      <div className="mt-3 max-h-64 w-80 overflow-y-auto rounded-md border border-border bg-bg-elevated">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-fg-muted">No tasks found</p>
        ) : (
          filtered.map((task) => {
            const hasRelations = !!task.parentTaskId || (task.subtaskIds && task.subtaskIds.length > 0);
            return (
              <button
                key={task.id}
                onClick={() => onSelect(task.id)}
                className="flex w-full cursor-pointer items-center gap-2 border-b border-border-subtle px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-bg-secondary/50"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: STATUS_COLORS[task.status],
                  }}
                />
                <span className="flex-1 truncate font-mono text-xs text-fg-primary">{task.title}</span>
                {hasRelations && (
                  <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                    has links
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Add-task search modal ──────────────────────────────────────────────────

interface AddTaskPrompt {
  fromId: string;
  fromPort: "parent" | "child";
  /** Canvas position where the user released the mouse */
  canvasX: number;
  canvasY: number;
}

type SearchResult = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  boardId: string;
  parentTaskId: string | null;
  board: { id: string; name: string };
};

function AddTaskSearchModal({
  prompt,
  workspaceId,
  existingIds,
  onSelect,
  onCreate,
  onClose,
}: {
  prompt: AddTaskPrompt;
  workspaceId: string;
  /** IDs already in the graph — we'll dim them but still allow selection */
  existingIds: Set<string>;
  onSelect: (taskId: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus the input when the modal opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search — only fires after the user types something
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchWorkspaceTasks(workspaceId, query)
        .then((res) => {
          setResults((res as SearchResult[]).filter((t) => t.id !== prompt.fromId));
          setSearching(false);
        })
        .catch(() => {
          setSearching(false);
        });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, workspaceId, prompt.fromId]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onMouseDown={(e) => {
        // Close when clicking the backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-96 rounded-lg border border-border bg-bg-elevated shadow-xl">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <span className="font-mono text-xs font-medium text-fg-primary">
            Add task as {prompt.fromPort === "child" ? "subtask" : "parent"}
          </span>
          <button onClick={onClose} className="cursor-pointer text-fg-muted transition-colors hover:text-fg-primary">
            <X size={14} />
          </button>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search workspace tasks..."
              className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 pl-9 font-mono text-xs text-fg-primary placeholder:text-fg-muted focus:border-accent/50 focus:outline-none"
            />
            {searching && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-fg-muted" />
            )}
          </div>

          <button
            type="button"
            onClick={onCreate}
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-bg-primary px-3 py-2 font-mono text-[11px] text-fg-secondary transition-colors hover:border-accent/40 hover:text-accent"
          >
            <Plus size={12} />
            Create new task
          </button>

          <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-border bg-bg-primary">
            {!query.trim() ? (
              <p className="px-3 py-6 text-center text-xs text-fg-muted">Start typing to search tasks…</p>
            ) : searching ? (
              <p className="px-3 py-6 text-center text-xs text-fg-muted animate-pulse">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-fg-muted">No tasks found</p>
            ) : (
              results.map((task) => {
                const alreadyInGraph = existingIds.has(task.id);
                // When adding as a subtask, the candidate cannot already have a parent.
                const blockedAsSubtask = prompt.fromPort === "child" && task.parentTaskId !== null;
                const disabled = blockedAsSubtask;
                return (
                  <button
                    key={task.id}
                    onClick={() => !disabled && onSelect(task.id)}
                    disabled={disabled}
                    title={blockedAsSubtask ? "This task already has a parent" : undefined}
                    className={`flex w-full items-center gap-2 border-b border-border-subtle px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                      disabled
                        ? "cursor-not-allowed opacity-40"
                        : `cursor-pointer hover:bg-bg-secondary/50 ${alreadyInGraph ? "opacity-50" : ""}`
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: STATUS_COLORS[task.status],
                      }}
                    />
                    <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                      <span className="truncate font-mono text-xs text-fg-primary">{task.title}</span>
                      <span className="text-[9px] text-fg-muted">{task.board.name}</span>
                    </div>
                    {blockedAsSubtask ? (
                      <span className="shrink-0 rounded bg-fg-muted/10 px-1.5 py-0.5 text-[9px] font-medium text-fg-muted">
                        has parent
                      </span>
                    ) : alreadyInGraph ? (
                      <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                        in graph
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tooltip-capable tool button ────────────────────────────────────────────

function FlowToolButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group/btn relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="cursor-pointer rounded-md border border-border bg-bg-elevated/90 p-1.5 text-fg-muted backdrop-blur-sm transition-colors hover:text-fg-primary"
      >
        {children}
      </button>
      <span className="pointer-events-none absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md border border-border bg-bg-elevated px-2 py-1 font-mono text-[10px] text-fg-secondary opacity-0 shadow-md transition-opacity duration-150 group-hover/btn:opacity-100">
        {label}
      </span>
    </div>
  );
}

// ─── Flow canvas ────────────────────────────────────────────────────────────

export function FlowCanvas({
  tasks,
  rootId,
  workspaceId,
  boards,
  sprints,
  members,
  tags,
  onGraphChange,
}: {
  tasks: FlowTask[];
  rootId: string;
  workspaceId: string;
  boards?: { id: string; name: string }[];
  sprints?: { id: string; title: string }[];
  members?: { id: string; name: string | null; email?: string | null; image?: string | null }[];
  tags?: { id: string; name: string; color: string | null }[];
  onGraphChange?: () => void;
}) {
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const connectedIds = useMemo(() => getConnectedGraph(rootId, taskMap), [rootId, taskMap]);
  const layoutPositions = useMemo(() => layoutGraph(rootId, connectedIds, taskMap), [rootId, connectedIds, taskMap]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOverrides, setDragOverrides] = useState<Map<string, NodePosition>>(new Map());

  // Reset drag overrides when the layout changes (tasks/rootId changed)
  const prevLayoutRef = useRef(layoutPositions);
  useEffect(() => {
    if (prevLayoutRef.current !== layoutPositions) {
      prevLayoutRef.current = layoutPositions;
      setDragOverrides(new Map());
    }
  }, [layoutPositions]);

  const positions = useMemo(() => {
    if (dragOverrides.size === 0) return layoutPositions;
    const merged = new Map(layoutPositions);
    for (const [id, pos] of dragOverrides) merged.set(id, pos);
    return merged;
  }, [layoutPositions, dragOverrides]);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragLine, setDragLine] = useState<DragLine | null>(null);
  const [hoveredPort, setHoveredPort] = useState<{
    id: string;
    port: "parent" | "child";
  } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{ from: string; to: string } | null>(null);
  const [addTaskPrompt, setAddTaskPrompt] = useState<AddTaskPrompt | null>(null);
  const [createPrompt, setCreatePrompt] = useState<AddTaskPrompt | null>(null);

  // Pan & zoom — restore from module cache so refresh keeps the viewport in place.
  const cached = viewportCache.get(rootId);
  const [pan, setPan] = useState(cached?.pan ?? { x: 0, y: 0 });
  const [zoom, setZoom] = useState(cached?.zoom ?? 1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    panRef.current = pan;
    viewportCache.set(rootId, { pan, zoom: zoomRef.current });
  }, [pan, rootId]);
  useEffect(() => {
    zoomRef.current = zoom;
    viewportCache.set(rootId, { pan: panRef.current, zoom });
  }, [zoom, rootId]);

  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: screenX, y: screenY };
      return {
        x: (screenX - rect.left - pan.x) / zoom,
        y: (screenY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom],
  );

  // ── Node dragging ──────────────────────────────────────────────────────

  const handleNodeMouseDown = useCallback(
    (e: ReactMouseEvent, nodeId: string) => {
      // Only left click, and not on a port
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-port]")) return;
      if (target.closest("a")) return;

      e.stopPropagation();
      const pos = positions.get(nodeId);
      if (!pos) return;

      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setDraggingNode(nodeId);
      setDragOffset({
        x: canvasPos.x - pos.x,
        y: canvasPos.y - pos.y,
      });
    },
    [positions, screenToCanvas],
  );

  // ── Port dragging (create connections) ─────────────────────────────────

  const handlePortMouseDown = useCallback(
    (e: ReactMouseEvent, nodeId: string, port: "parent" | "child") => {
      e.stopPropagation();
      e.preventDefault();
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setDragLine({
        fromId: nodeId,
        fromPort: port,
        x: canvasPos.x,
        y: canvasPos.y,
      });
    },
    [screenToCanvas],
  );

  // ── Pan start ──────────────────────────────────────────────────────────

  const handleCanvasMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (e.button !== 0) return;
      // Only pan if clicking on the canvas background
      const target = e.target as HTMLElement;
      if (target.closest("[data-node]") || target.closest("[data-port]")) return;

      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan],
  );

  // ── Global mouse move ──────────────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      if (draggingNode) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setDragOverrides((prev) => {
          const next = new Map(prev);
          next.set(draggingNode, {
            x: canvasPos.x - dragOffset.x,
            y: canvasPos.y - dragOffset.y,
          });
          return next;
        });
      } else if (dragLine) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setDragLine((prev) => (prev ? { ...prev, x: canvasPos.x, y: canvasPos.y } : null));
      } else if (isPanning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPan({
          x: panStart.current.panX + dx,
          y: panStart.current.panY + dy,
        });
      }
    },
    [draggingNode, dragOffset, dragLine, isPanning, screenToCanvas],
  );

  // ── Mouse up (finish drag / create connection) ─────────────────────────

  const handleMouseUp = useCallback(
    (e: ReactMouseEvent) => {
      if (dragLine && hoveredPort) {
        // Determine parent and child based on port types
        let parentId: string;
        let childId: string;

        if (dragLine.fromPort === "child" && hoveredPort.port === "parent") {
          // Dragged from child port to parent port: fromId is parent, hoveredPort.id is child
          parentId = dragLine.fromId;
          childId = hoveredPort.id;
        } else if (dragLine.fromPort === "parent" && hoveredPort.port === "child") {
          // Dragged from parent port to child port: hoveredPort.id is parent, fromId is child
          parentId = hoveredPort.id;
          childId = dragLine.fromId;
        } else {
          // Invalid connection (same port types)
          setDragLine(null);
          setDraggingNode(null);
          setIsPanning(false);
          return;
        }

        if (parentId !== childId) {
          const formData = new FormData();
          formData.set("childId", childId);
          formData.set("parentId", parentId);
          formData.set("workspaceId", workspaceId);
          setTaskParent(null, formData).then((result) => {
            if (result && "success" in result && result.success) {
              onGraphChange?.();
            }
          });
        }
      } else if (dragLine && !hoveredPort) {
        // Released on empty canvas — open the "Add Task" search prompt
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setAddTaskPrompt({
          fromId: dragLine.fromId,
          fromPort: dragLine.fromPort,
          canvasX: canvasPos.x,
          canvasY: canvasPos.y,
        });
      }

      setDragLine(null);
      setDraggingNode(null);
      setIsPanning(false);
    },
    [dragLine, hoveredPort, workspaceId, screenToCanvas, onGraphChange],
  );

  // ── Zoom ───────────────────────────────────────────────────────────────

  // Attach wheel listener as non-passive so preventDefault() actually works.
  // React's onWheel is registered as passive in modern browsers, which means
  // preventDefault() is silently ignored and the page scrolls instead.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      // Scale step proportional to current zoom for smooth feel
      const prevZoom = zoomRef.current;
      const prevPan = panRef.current;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const nextZoom = Math.min(2, Math.max(0.3, prevZoom * factor));
      if (nextZoom === prevZoom) return;
      // Keep the point under the cursor stationary in canvas space.
      // canvasX = (mouseX - panX) / zoom must remain constant.
      const nextPan = {
        x: mouseX - ((mouseX - prevPan.x) / prevZoom) * nextZoom,
        y: mouseY - ((mouseY - prevPan.y) / prevZoom) * nextZoom,
      };
      zoomRef.current = nextZoom;
      panRef.current = nextPan;
      setZoom(nextZoom);
      setPan(nextPan);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const fitView = () => {
    // Center the viewport on the root (shown) task at 100% zoom.
    const rootPos = positions.get(rootId);
    const el = containerRef.current;
    if (!rootPos || !el) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const rect = el.getBoundingClientRect();
    const nextZoom = 1;
    // We want the root node's center to land at the container's center.
    // canvasX_center = rootPos.x + NODE_WIDTH/2
    // screenX_center = rect.width / 2
    // screenX = canvasX * zoom + panX  ⇒  panX = screenX - canvasX * zoom
    const nextPan = {
      x: rect.width / 2 - (rootPos.x + NODE_WIDTH / 2) * nextZoom,
      y: rect.height / 2 - (rootPos.y + NODE_HEIGHT / 2) * nextZoom,
    };
    setZoom(nextZoom);
    setPan(nextPan);
  };

  // ── Disconnect a parent/child edge ─────────────────────────────────────

  const handleDisconnect = useCallback(
    (childId: string) => {
      const formData = new FormData();
      formData.set("childId", childId);
      formData.set("parentId", "");
      formData.set("workspaceId", workspaceId);
      setTaskParent(null, formData).then((result) => {
        if (result && "success" in result && result.success) {
          onGraphChange?.();
        }
      });
    },
    [workspaceId, onGraphChange],
  );

  // ── Handle task selected from search modal ─────────────────────────────

  const linkTaskToPrompt = useCallback(
    (selectedTaskId: string, prompt: AddTaskPrompt) => {
      let parentId: string;
      let childId: string;

      if (prompt.fromPort === "child") {
        // Dragged from child port → the source is the parent, selected task is the child
        parentId = prompt.fromId;
        childId = selectedTaskId;
      } else {
        // Dragged from parent port → selected task is the parent, source is the child
        parentId = selectedTaskId;
        childId = prompt.fromId;
      }

      const formData = new FormData();
      formData.set("childId", childId);
      formData.set("parentId", parentId);
      formData.set("workspaceId", workspaceId);
      setTaskParent(null, formData).then((result) => {
        if (result && "success" in result && result.success) {
          onGraphChange?.();
        }
      });
    },
    [workspaceId, onGraphChange],
  );

  const handleAddTaskSelect = useCallback(
    (selectedTaskId: string) => {
      if (!addTaskPrompt) return;
      linkTaskToPrompt(selectedTaskId, addTaskPrompt);
      setAddTaskPrompt(null);
    },
    [addTaskPrompt, linkTaskToPrompt],
  );

  // ── Build edges ────────────────────────────────────────────────────────

  const edges: { from: string; to: string }[] = [];
  for (const id of connectedIds) {
    const task = taskMap.get(id);
    if (!task?.subtaskIds) continue;
    for (const childId of task.subtaskIds) {
      if (connectedIds.has(childId)) {
        edges.push({ from: id, to: childId });
      }
    }
  }

  // ── Compute canvas bounds ──────────────────────────────────────────────

  let svgWidth = 800;
  let svgHeight = 400;
  for (const pos of positions.values()) {
    svgWidth = Math.max(svgWidth, pos.x + NODE_WIDTH + 80);
    svgHeight = Math.max(svgHeight, pos.y + NODE_HEIGHT + 80);
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-md border border-border bg-bg-primary"
        style={{
          height: "500px",
          cursor: isPanning ? "grabbing" : draggingNode ? "grabbing" : dragLine ? "crosshair" : "grab",
          backgroundImage: "radial-gradient(circle, var(--border-subtle) 1px, transparent 1px)",
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: svgWidth,
            height: svgHeight,
            position: "relative",
          }}
        >
          {/* SVG layer for edges */}
          <svg
            width={svgWidth}
            height={svgHeight}
            className="pointer-events-none absolute inset-0"
            style={{ overflow: "visible" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {edges.map(({ from, to }) => {
              const fromPos = positions.get(from);
              const toPos = positions.get(to);
              if (!fromPos || !toPos) return null;
              const isHighlighted = hoveredNode === from || hoveredNode === to;
              const isHovered = hoveredEdge?.from === from && hoveredEdge?.to === to;
              return (
                <EdgePath
                  key={`${from}-${to}`}
                  from={getChildPortPos(fromPos)}
                  to={getParentPortPos(toPos)}
                  isHighlighted={isHighlighted}
                  isHovered={isHovered}
                  onMouseEnter={() => setHoveredEdge({ from, to })}
                  onMouseLeave={() => setHoveredEdge(null)}
                  onDisconnect={() => handleDisconnect(to)}
                />
              );
            })}
            {/* Drag line */}
            {dragLine &&
              (() => {
                const fromPos = positions.get(dragLine.fromId);
                if (!fromPos) return null;
                const portPos = dragLine.fromPort === "child" ? getChildPortPos(fromPos) : getParentPortPos(fromPos);
                return <DragEdgePath from={portPos} to={{ x: dragLine.x, y: dragLine.y }} />;
              })()}
          </svg>

          {/* Node layer */}
          {Array.from(connectedIds).map((id) => {
            const task = taskMap.get(id);
            const pos = positions.get(id);
            if (!task || !pos) return null;

            const isRoot = id === rootId;
            const isHovered = hoveredNode === id;

            return (
              <div
                key={id}
                data-node
                className={`absolute select-none rounded-md bg-bg-elevated shadow-sm transition-shadow ${
                  isRoot
                    ? "border-2 border-accent ring-2 ring-accent/30 shadow-md"
                    : isHovered
                      ? "border border-accent/40 shadow-md"
                      : "border border-border"
                }`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                  cursor: draggingNode === id ? "grabbing" : "grab",
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, id)}
                onMouseEnter={() => setHoveredNode(id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Priority bar */}
                {task.priority !== "NONE" && (
                  <span
                    className="absolute inset-y-0 left-0 w-1 rounded-l-md"
                    style={{
                      backgroundColor: PRIORITY_COLORS[task.priority] ?? "transparent",
                    }}
                  />
                )}

                {/* Content */}
                <div className="flex h-full flex-col justify-between p-2.5 pl-3">
                  <div className="flex items-start justify-between gap-1">
                    <Link
                      href={`/w/${workspaceId}/b/${task.boardId}/t/${task.id}`}
                      className="line-clamp-2 flex-1 font-mono text-[10px] font-medium leading-tight text-fg-primary hover:text-accent"
                      onClick={(e) => e.stopPropagation()}
                      title={task.title}
                    >
                      {task.title}
                    </Link>
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: STATUS_COLORS[task.status],
                      }}
                      title={task.status.replace("_", " ")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {task.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.name}
                          className="rounded px-1 py-px text-[8px]"
                          style={{
                            backgroundColor: (tag.color ?? "#6B7280") + "15",
                            color: tag.color ?? "#6B7280",
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    <span className="text-[9px] text-fg-muted">{task.board.name}</span>
                  </div>
                </div>

                {/* Parent port (top center) — disabled if task already has a parent */}
                {(() => {
                  const hasParent = !!task.parentTaskId;
                  return (
                    <div
                      data-port={hasParent ? undefined : "parent"}
                      title={hasParent ? "Already has a parent" : "Drag to add a parent"}
                      className={`absolute top-[-6px] left-1/2 -translate-x-1/2 rounded-full border-2 transition-colors ${
                        hasParent
                          ? "cursor-not-allowed border-border-subtle bg-bg-secondary opacity-50"
                          : hoveredPort?.id === id && hoveredPort?.port === "parent"
                            ? "cursor-crosshair border-accent bg-accent scale-125"
                            : "cursor-crosshair border-border bg-bg-elevated hover:border-accent hover:bg-accent/30"
                      }`}
                      style={{
                        width: PORT_RADIUS * 2,
                        height: PORT_RADIUS * 2,
                      }}
                      onMouseDown={hasParent ? undefined : (e) => handlePortMouseDown(e, id, "parent")}
                      onMouseEnter={hasParent ? undefined : () => setHoveredPort({ id, port: "parent" })}
                      onMouseLeave={hasParent ? undefined : () => setHoveredPort(null)}
                    />
                  );
                })()}

                {/* Child port (bottom center) */}
                <div
                  data-port="child"
                  className={`absolute bottom-[-6px] left-1/2 -translate-x-1/2 cursor-crosshair rounded-full border-2 transition-colors ${
                    hoveredPort?.id === id && hoveredPort?.port === "child"
                      ? "border-accent bg-accent scale-125"
                      : "border-border bg-bg-elevated hover:border-accent hover:bg-accent/30"
                  }`}
                  style={{
                    width: PORT_RADIUS * 2,
                    height: PORT_RADIUS * 2,
                  }}
                  onMouseDown={(e) => handlePortMouseDown(e, id, "child")}
                  onMouseEnter={() => setHoveredPort({ id, port: "child" })}
                  onMouseLeave={() => setHoveredPort(null)}
                />
              </div>
            );
          })}
        </div>

        {/* Docked controls */}
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
          <FlowToolButton onClick={() => setDragOverrides(new Map())} label="Reorganize nodes">
            <LayoutGrid size={14} />
          </FlowToolButton>
          <FlowToolButton onClick={fitView} label="Focus on this task">
            <Locate size={14} />
          </FlowToolButton>
          <FlowToolButton onClick={() => onGraphChange?.()} label="Refresh graph">
            <RefreshCw size={14} />
          </FlowToolButton>
        </div>
      </div>

      {/* Add-task search modal */}
      {addTaskPrompt && (
        <AddTaskSearchModal
          prompt={addTaskPrompt}
          workspaceId={workspaceId}
          existingIds={connectedIds}
          onSelect={handleAddTaskSelect}
          onCreate={() => {
            setCreatePrompt(addTaskPrompt);
            setAddTaskPrompt(null);
          }}
          onClose={() => setAddTaskPrompt(null)}
        />
      )}

      {/* Create-new-task modal — reuses the shared task form */}
      {createPrompt && boards && boards.length > 0 && (
        <CreateTaskFormModal
          workspaceId={workspaceId}
          boards={boards}
          sprints={sprints}
          members={members}
          tags={tags}
          title={createPrompt.fromPort === "child" ? "New Subtask" : "New Parent Task"}
          onClose={() => setCreatePrompt(null)}
          onCreated={(newTaskId) => {
            linkTaskToPrompt(newTaskId, createPrompt);
            setCreatePrompt(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Exported component ─────────────────────────────────────────────────────

export function FlowView({ tasks, workspaceId }: { tasks: FlowTask[]; workspaceId: string }) {
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [graphTasks, setGraphTasks] = useState<FlowTask[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  const forceRefresh = useCallback(() => {
    // Mimic close + reopen: blow away state, then re-select on next tick.
    if (!selectedRootId) return;
    const id = selectedRootId;
    setGraphTasks(null);
    setSelectedRootId(null);
    setRefetchKey((k) => k + 1);
    setTimeout(() => setSelectedRootId(id), 0);
  }, [selectedRootId]);

  // When a root task is selected, fetch the full dependency graph from the DB
  useEffect(() => {
    if (!selectedRootId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGraphTasks(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getFlowGraphTasks(selectedRootId, workspaceId)
      .then((result) => {
        if (cancelled) return;
        setGraphTasks(result as FlowTask[]);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback to sprint-scoped tasks if the fetch fails
        setGraphTasks(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRootId, workspaceId, refetchKey]);

  if (!selectedRootId) {
    return <TaskSelector tasks={tasks} onSelect={setSelectedRootId} />;
  }

  if (loading && !graphTasks) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="font-mono text-sm text-fg-muted animate-pulse">Loading dependency graph…</p>
      </div>
    );
  }

  return (
    <FlowCanvas
      key={refetchKey}
      tasks={graphTasks ?? tasks}
      rootId={selectedRootId}
      workspaceId={workspaceId}
      onGraphChange={forceRefresh}
    />
  );
}

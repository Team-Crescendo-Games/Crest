"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useTransition,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Link from "next/link";
import { Search, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { setTaskParent, getFlowGraphTasks } from "@/lib/actions/task";
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

// ─── Graph traversal ────────────────────────────────────────────────────────

/** BFS from a root task, following parent/subtask edges. Returns all connected task IDs. */
function getConnectedGraph(
  rootId: string,
  taskMap: Map<string, FlowTask>,
): Set<string> {
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
  const visited = new Set<string>();

  // Find the topmost ancestor of the root to start layout from the real root
  let topRoot = rootId;
  const ancestorVisited = new Set<string>();
  while (true) {
    ancestorVisited.add(topRoot);
    const task = taskMap.get(topRoot);
    if (
      !task?.parentTaskId ||
      !connectedIds.has(task.parentTaskId) ||
      ancestorVisited.has(task.parentTaskId)
    ) {
      break;
    }
    topRoot = task.parentTaskId;
  }

  // BFS layer-by-layer from topRoot
  interface LayerNode {
    id: string;
    depth: number;
  }

  const layers: string[][] = [];
  const queue: LayerNode[] = [{ id: topRoot, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    while (layers.length <= depth) layers.push([]);
    layers[depth].push(id);

    const task = taskMap.get(id);
    if (!task?.subtaskIds) continue;

    for (const childId of task.subtaskIds) {
      if (connectedIds.has(childId) && !visited.has(childId)) {
        queue.push({ id: childId, depth: depth + 1 });
      }
    }
  }

  // Place any remaining connected nodes that weren't reached (cycle edges)
  for (const id of connectedIds) {
    if (!visited.has(id)) {
      visited.add(id);
      // Add to the last layer + 1
      const depth = layers.length;
      while (layers.length <= depth) layers.push([]);
      layers[depth].push(id);
    }
  }

  // Calculate positions centered per layer
  const maxLayerWidth = Math.max(...layers.map((l) => l.length));
  const totalWidth = maxLayerWidth * (NODE_WIDTH + H_GAP) - H_GAP;

  for (let depth = 0; depth < layers.length; depth++) {
    const layer = layers[depth];
    const layerWidth = layer.length * (NODE_WIDTH + H_GAP) - H_GAP;
    const offsetX = (totalWidth - layerWidth) / 2;

    for (let i = 0; i < layer.length; i++) {
      positions.set(layer[i], {
        x: offsetX + i * (NODE_WIDTH + H_GAP) + 40,
        y: depth * (NODE_HEIGHT + V_GAP) + 40,
      });
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
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isHighlighted?: boolean;
}) {
  const midY = (from.y + to.y) / 2;
  const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;

  return (
    <path
      d={d}
      fill="none"
      stroke={isHighlighted ? "var(--accent)" : "var(--border)"}
      strokeWidth={isHighlighted ? 2 : 1.5}
      strokeDasharray={isHighlighted ? undefined : "4 3"}
      className="transition-colors duration-150"
    />
  );
}

function DragEdgePath({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const midY = (from.y + to.y) / 2;
  const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;

  return (
    <path
      d={d}
      fill="none"
      stroke="var(--accent)"
      strokeWidth={2}
      strokeDasharray="6 4"
      opacity={0.7}
    />
  );
}

// ─── Task selector ──────────────────────────────────────────────────────────

function TaskSelector({
  tasks,
  onSelect,
}: {
  tasks: FlowTask[];
  onSelect: (taskId: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = query
    ? tasks.filter((t) =>
        t.title.toLowerCase().includes(query.toLowerCase()),
      )
    : tasks;

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <p className="mb-4 font-mono text-sm text-fg-secondary">
        Select a task to view its dependency graph
      </p>
      <div className="relative w-80">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
        />
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
          <p className="px-3 py-4 text-center text-xs text-fg-muted">
            No tasks found
          </p>
        ) : (
          filtered.map((task) => {
            const hasRelations =
              !!task.parentTaskId ||
              (task.subtaskIds && task.subtaskIds.length > 0);
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
                <span className="flex-1 truncate font-mono text-xs text-fg-primary">
                  {task.title}
                </span>
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

// ─── Flow canvas ────────────────────────────────────────────────────────────

function FlowCanvas({
  tasks,
  rootId,
  workspaceId,
  onBack,
}: {
  tasks: FlowTask[];
  rootId: string;
  workspaceId: string;
  onBack: () => void;
}) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const connectedIds = getConnectedGraph(rootId, taskMap);
  const initialPositions = layoutGraph(rootId, connectedIds, taskMap);

  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Map<string, NodePosition>>(initialPositions);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragLine, setDragLine] = useState<DragLine | null>(null);
  const [hoveredPort, setHoveredPort] = useState<{
    id: string;
    port: "parent" | "child";
  } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Pan & zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Recalculate layout when tasks change (e.g. after adding a relation)
  useEffect(() => {
    const newMap = new Map(tasks.map((t) => [t.id, t]));
    const newConnected = getConnectedGraph(rootId, newMap);
    const newPositions = layoutGraph(rootId, newConnected, newMap);
    setPositions(newPositions);
  }, [tasks, rootId]);

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
        setPositions((prev) => {
          const next = new Map(prev);
          next.set(draggingNode, {
            x: canvasPos.x - dragOffset.x,
            y: canvasPos.y - dragOffset.y,
          });
          return next;
        });
      } else if (dragLine) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setDragLine((prev) =>
          prev ? { ...prev, x: canvasPos.x, y: canvasPos.y } : null,
        );
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

  const handleMouseUp = useCallback(() => {
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
        startTransition(() => {
          setTaskParent(null, formData);
        });
      }
    }

    setDragLine(null);
    setDraggingNode(null);
    setIsPanning(false);
  }, [dragLine, hoveredPort, workspaceId]);

  // ── Zoom ───────────────────────────────────────────────────────────────

  // Attach wheel listener as non-passive so preventDefault() actually works.
  // React's onWheel is registered as passive in modern browsers, which means
  // preventDefault() is silently ignored and the page scrolls instead.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom((z) => Math.min(2, Math.max(0.3, z + delta)));
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(2, z + 0.15));
  const zoomOut = () => setZoom((z) => Math.max(0.3, z - 0.15));
  const fitView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

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

  const rootTask = taskMap.get(rootId);

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-fg-secondary transition-colors hover:text-fg-primary"
          >
            <X size={12} />
            Close
          </button>
          {rootTask && (
            <span className="font-mono text-xs text-fg-muted">
              Viewing graph for:{" "}
              <span className="text-fg-primary">{rootTask.title}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isPending && (
            <span className="mr-2 text-[11px] text-accent animate-pulse">
              Saving...
            </span>
          )}
          <button
            onClick={zoomOut}
            className="cursor-pointer rounded-md bg-bg-secondary p-1.5 text-fg-muted transition-colors hover:text-fg-primary"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="min-w-[3rem] text-center font-mono text-[11px] text-fg-muted">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="cursor-pointer rounded-md bg-bg-secondary p-1.5 text-fg-muted transition-colors hover:text-fg-primary"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={fitView}
            className="cursor-pointer rounded-md bg-bg-secondary p-1.5 text-fg-muted transition-colors hover:text-fg-primary"
            title="Fit view"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-md border border-border bg-bg-primary"
        style={{
          height: "500px",
          cursor: isPanning
            ? "grabbing"
            : draggingNode
              ? "grabbing"
              : dragLine
                ? "crosshair"
                : "grab",
          backgroundImage:
            "radial-gradient(circle, var(--border-subtle) 1px, transparent 1px)",
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
          >
            {edges.map(({ from, to }) => {
              const fromPos = positions.get(from);
              const toPos = positions.get(to);
              if (!fromPos || !toPos) return null;
              const isHighlighted =
                hoveredNode === from || hoveredNode === to;
              return (
                <EdgePath
                  key={`${from}-${to}`}
                  from={getChildPortPos(fromPos)}
                  to={getParentPortPos(toPos)}
                  isHighlighted={isHighlighted}
                />
              );
            })}
            {/* Drag line */}
            {dragLine && (() => {
              const fromPos = positions.get(dragLine.fromId);
              if (!fromPos) return null;
              const portPos =
                dragLine.fromPort === "child"
                  ? getChildPortPos(fromPos)
                  : getParentPortPos(fromPos);
              return (
                <DragEdgePath
                  from={portPos}
                  to={{ x: dragLine.x, y: dragLine.y }}
                />
              );
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
                className={`absolute select-none rounded-md border bg-bg-elevated shadow-sm transition-shadow ${
                  isRoot
                    ? "border-accent/50 ring-1 ring-accent/20"
                    : isHovered
                      ? "border-accent/40 shadow-md"
                      : "border-border"
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
                      backgroundColor:
                        PRIORITY_COLORS[task.priority] ?? "transparent",
                    }}
                  />
                )}

                {/* Content */}
                <div className="flex h-full flex-col justify-between p-2.5 pl-3">
                  <div className="flex items-start justify-between gap-1">
                    <Link
                      href={`/dashboard/workspaces/${workspaceId}/boards/${task.boardId}/tasks/${task.id}`}
                      className="flex-1 truncate font-mono text-[11px] font-medium text-fg-primary hover:text-accent"
                      onClick={(e) => e.stopPropagation()}
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
                            backgroundColor:
                              (tag.color ?? "#6B7280") + "15",
                            color: tag.color ?? "#6B7280",
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    <span className="text-[9px] text-fg-muted">
                      {task.board.name}
                    </span>
                  </div>
                </div>

                {/* Parent port (top center) */}
                <div
                  data-port="parent"
                  className={`absolute -top-[6px] left-1/2 -translate-x-1/2 cursor-crosshair rounded-full border-2 transition-colors ${
                    hoveredPort?.id === id && hoveredPort?.port === "parent"
                      ? "border-accent bg-accent scale-125"
                      : "border-border bg-bg-elevated hover:border-accent hover:bg-accent/30"
                  }`}
                  style={{
                    width: PORT_RADIUS * 2,
                    height: PORT_RADIUS * 2,
                  }}
                  onMouseDown={(e) => handlePortMouseDown(e, id, "parent")}
                  onMouseEnter={() =>
                    setHoveredPort({ id, port: "parent" })
                  }
                  onMouseLeave={() => setHoveredPort(null)}
                />

                {/* Child port (bottom center) */}
                <div
                  data-port="child"
                  className={`absolute -bottom-[6px] left-1/2 -translate-x-1/2 cursor-crosshair rounded-full border-2 transition-colors ${
                    hoveredPort?.id === id && hoveredPort?.port === "child"
                      ? "border-accent bg-accent scale-125"
                      : "border-border bg-bg-elevated hover:border-accent hover:bg-accent/30"
                  }`}
                  style={{
                    width: PORT_RADIUS * 2,
                    height: PORT_RADIUS * 2,
                  }}
                  onMouseDown={(e) => handlePortMouseDown(e, id, "child")}
                  onMouseEnter={() =>
                    setHoveredPort({ id, port: "child" })
                  }
                  onMouseLeave={() => setHoveredPort(null)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full border border-border bg-bg-elevated" />
          Port — drag to connect
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-px w-4 border-t border-dashed border-border" />
          Parent → Child
        </span>
        <span>Scroll to zoom · Drag background to pan · Drag nodes to reposition</span>
      </div>
    </div>
  );
}

// ─── Exported component ─────────────────────────────────────────────────────

export function FlowView({
  tasks,
  workspaceId,
}: {
  tasks: FlowTask[];
  workspaceId: string;
}) {
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [graphTasks, setGraphTasks] = useState<FlowTask[] | null>(null);
  const [loading, setLoading] = useState(false);

  // When a root task is selected, fetch the full dependency graph from the DB
  useEffect(() => {
    if (!selectedRootId) {
      setGraphTasks(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getFlowGraphTasks(selectedRootId, workspaceId).then((result) => {
      if (cancelled) return;
      setGraphTasks(result as FlowTask[]);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      // Fallback to sprint-scoped tasks if the fetch fails
      setGraphTasks(null);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [selectedRootId, workspaceId]);

  if (!selectedRootId) {
    return <TaskSelector tasks={tasks} onSelect={setSelectedRootId} />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="font-mono text-sm text-fg-muted animate-pulse">
          Loading dependency graph…
        </p>
      </div>
    );
  }

  return (
    <FlowCanvas
      tasks={graphTasks ?? tasks}
      rootId={selectedRootId}
      workspaceId={workspaceId}
      onBack={() => setSelectedRootId(null)}
    />
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  LogOut,
  Plus,
  LayoutList,
  Timer,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { UserAvatar } from "@/components/user-avatar";

interface Board {
  id: string;
  name: string;
  isActive: boolean;
}

interface Sprint {
  id: string;
  title: string;
  isActive: boolean;
}

interface Workspace {
  id: string;
  name: string;
  boards: Board[];
  sprints: Sprint[];
}

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  workspaces: Workspace[];
}

const userNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
];

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 224; // w-56 = 14rem = 224px

export function Sidebar({ user, workspaces }: SidebarProps) {
  const pathname = usePathname();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [boardsExpanded, setBoardsExpanded] = useState(true);
  const [sprintsExpanded, setSprintsExpanded] = useState(true);
  const [showArchivedBoards, setShowArchivedBoards] = useState(false);
  const [showArchivedSprints, setShowArchivedSprints] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isResizing.current) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(newWidth);
    }
    function onMouseUp() {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);
  const [lastWorkspaceId, setLastWorkspaceId] = useState<string | undefined>(
    undefined,
  );

  const workspaceMatch = pathname.match(/^\/dashboard\/workspaces\/([^/]+)/);
  const urlWorkspaceId = workspaceMatch?.[1];

  // When URL has a workspace, remember it
  if (urlWorkspaceId && urlWorkspaceId !== lastWorkspaceId) {
    setLastWorkspaceId(urlWorkspaceId);
  }

  const activeWorkspaceId =
    urlWorkspaceId ?? lastWorkspaceId ?? workspaces[0]?.id;
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const boardsHref = activeWorkspaceId
    ? `/dashboard/workspaces/${activeWorkspaceId}/boards`
    : "#";
  const boardsActive = pathname.includes("/boards");
  // Check if a specific child board is active (not just the boards list)
  const childBoardActive = activeWorkspace?.boards.some((b) =>
    pathname.startsWith(`/dashboard/workspaces/${activeWorkspaceId}/boards/${b.id}`),
  ) ?? false;

  const sprintsActive = pathname.startsWith(
    `/dashboard/workspaces/${activeWorkspaceId}/sprints`,
  );
  const childSprintActive = activeWorkspace?.sprints.some((s) =>
    pathname.startsWith(`/dashboard/workspaces/${activeWorkspaceId}/sprints/${s.id}`),
  ) ?? false;

  return (
    <aside
      ref={sidebarRef}
      className="relative flex flex-col border-r border-border bg-bg-elevated/60 backdrop-blur-sm"
      style={{ width, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        className="absolute inset-y-0 right-0 z-30 w-1 cursor-col-resize transition-colors hover:bg-accent/30"
      />
      {/* Logo */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={22} />
          <span className="font-mono text-sm font-bold tracking-tight text-accent">
            Crest
          </span>
        </Link>
        <ThemeToggle />
      </div>

      {/* User navigation */}
      <nav className="space-y-0.5 px-2 pt-3 pb-2">
        {userNavigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-fg-secondary hover:bg-bg-secondary hover:text-fg-primary"
              }`}
            >
              <item.icon size={14} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="relative mx-3">
        <div className="border-t border-border" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent-subtle" />
        </div>
      </div>

      {/* Workspace section */}
      <div className="flex-1 overflow-y-auto px-2 pt-3">
        <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-widest text-accent-subtle">
          Workspace
        </p>

        {/* Workspace switcher */}
        <div className="relative mb-2">
          <button
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className="flex w-full items-center justify-between rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-fg-primary transition-colors hover:border-accent/30 hover:text-accent"
          >
            <span className="truncate">
              {activeWorkspace?.name ?? "No workspace"}
            </span>
            <ChevronDown
              size={12}
              className={`transition-transform ${workspaceOpen ? "rotate-180" : ""}`}
            />
          </button>

          {workspaceOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-border bg-bg-elevated p-1 shadow-lg shadow-accent/5">
              {workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  href={`/dashboard/workspaces/${ws.id}`}
                  onClick={() => setWorkspaceOpen(false)}
                  className={`block rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    ws.id === activeWorkspaceId
                      ? "bg-accent/10 text-accent"
                      : "text-fg-secondary hover:bg-bg-secondary hover:text-fg-primary"
                  }`}
                >
                  {ws.name}
                </Link>
              ))}
              <div className="mt-1 border-t border-border pt-1">
                <Link
                  href="/dashboard/workspaces"
                  onClick={() => setWorkspaceOpen(false)}
                  className="block rounded-md px-2.5 py-1.5 text-xs text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-primary"
                >
                  All workspaces →
                </Link>
                <Link
                  href="/dashboard/workspaces/new"
                  onClick={() => setWorkspaceOpen(false)}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10"
                >
                  <Plus size={11} />
                  Create workspace
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Workspace nav */}
        {activeWorkspace && (
          <nav className="space-y-0.5">
            {/* Overview */}
            <SidebarLink
              href={`/dashboard/workspaces/${activeWorkspaceId}`}
              icon={LayoutGrid}
              label="Overview"
              active={pathname === `/dashboard/workspaces/${activeWorkspaceId}`}
            />

            {/* Boards — expandable */}
            <div>
              <div className={`flex items-center rounded-md transition-colors ${
                boardsActive
                  ? childBoardActive
                    ? "bg-accent/5"
                    : "bg-accent/10"
                  : "hover:bg-bg-secondary"
              }`}>
                <button
                  onClick={() => setBoardsExpanded(!boardsExpanded)}
                  className="shrink-0 rounded p-0.5 text-fg-muted hover:text-fg-secondary"
                >
                  {boardsExpanded ? (
                    <ChevronDown size={10} />
                  ) : (
                    <ChevronRight size={10} />
                  )}
                </button>
                <Link
                  href={boardsHref}
                  className={`flex flex-1 items-center gap-2 px-2 py-1.5 text-xs font-medium transition-colors ${
                    boardsActive
                      ? "text-accent"
                      : "text-fg-secondary hover:text-fg-primary"
                  }`}
                >
                  <LayoutList size={13} />
                  Boards
                </Link>
                <button
                  onClick={() => setShowArchivedBoards(!showArchivedBoards)}
                  className={`shrink-0 rounded p-0.5 mr-1 transition-colors ${
                    showArchivedBoards
                      ? "text-accent hover:text-accent-emphasis"
                      : "text-fg-muted hover:text-fg-secondary"
                  }`}
                  title={showArchivedBoards ? "Hide archived boards" : "Show archived boards"}
                >
                  {showArchivedBoards ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
              </div>

              {boardsExpanded && activeWorkspace.boards.filter((b) => showArchivedBoards || b.isActive).length > 0 && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border-subtle pl-2">
                  {activeWorkspace.boards
                    .filter((b) => showArchivedBoards || b.isActive)
                    .map((board) => {
                    const boardHref = `/dashboard/workspaces/${activeWorkspaceId}/boards/${board.id}`;
                    const isBoardActive = pathname.startsWith(boardHref);
                    return (
                      <Link
                        key={board.id}
                        href={boardHref}
                        className={`flex items-center gap-1.5 truncate rounded-md px-2 py-1 text-xs transition-colors ${
                          isBoardActive
                            ? "bg-accent/10 text-accent"
                            : "text-fg-muted hover:bg-bg-secondary/40 hover:text-fg-secondary"
                        } ${!board.isActive ? "italic opacity-60" : ""}`}
                      >
                        {board.name}
                        {!board.isActive && (
                          <span className="text-[8px] text-fg-muted">(archived)</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sprints — expandable */}
            <div>
              <div className={`flex items-center rounded-md transition-colors ${
                sprintsActive
                  ? childSprintActive
                    ? "bg-accent/5"
                    : "bg-accent/10"
                  : "hover:bg-bg-secondary"
              }`}>
                <button
                  onClick={() => setSprintsExpanded(!sprintsExpanded)}
                  className="shrink-0 rounded p-0.5 text-fg-muted hover:text-fg-secondary"
                >
                  {sprintsExpanded ? (
                    <ChevronDown size={10} />
                  ) : (
                    <ChevronRight size={10} />
                  )}
                </button>
                <Link
                  href={`/dashboard/workspaces/${activeWorkspaceId}/sprints`}
                  className={`flex flex-1 items-center gap-2 px-2 py-1.5 text-xs font-medium transition-colors ${
                    sprintsActive
                      ? "text-accent"
                      : "text-fg-secondary hover:text-fg-primary"
                  }`}
                >
                  <Timer size={13} />
                  Sprints
                </Link>
                <button
                  onClick={() => setShowArchivedSprints(!showArchivedSprints)}
                  className={`shrink-0 rounded p-0.5 mr-1 transition-colors ${
                    showArchivedSprints
                      ? "text-accent hover:text-accent-emphasis"
                      : "text-fg-muted hover:text-fg-secondary"
                  }`}
                  title={showArchivedSprints ? "Hide archived sprints" : "Show archived sprints"}
                >
                  {showArchivedSprints ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
              </div>

              {sprintsExpanded && activeWorkspace.sprints.filter((s) => showArchivedSprints || s.isActive).length > 0 && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border-subtle pl-2">
                  {activeWorkspace.sprints
                    .filter((s) => showArchivedSprints || s.isActive)
                    .map((sprint) => {
                    const sprintHref = `/dashboard/workspaces/${activeWorkspaceId}/sprints/${sprint.id}`;
                    const isSprintActive = pathname.startsWith(sprintHref);
                    return (
                      <Link
                        key={sprint.id}
                        href={sprintHref}
                        className={`flex items-center gap-1.5 truncate rounded-md px-2 py-1 text-xs transition-colors ${
                          isSprintActive
                            ? "bg-accent/10 text-accent"
                            : "text-fg-muted hover:bg-bg-secondary/40 hover:text-fg-secondary"
                        } ${!sprint.isActive ? "italic opacity-60" : ""}`}
                      >
                        {sprint.title}
                        {!sprint.isActive && (
                          <span className="text-[8px] text-fg-muted">(archived)</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Team */}
            <SidebarLink
              href={`/dashboard/workspaces/${activeWorkspaceId}/team`}
              icon={Users}
              label="Team"
              active={pathname.startsWith(
                `/dashboard/workspaces/${activeWorkspaceId}/team`,
              )}
            />
          </nav>
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/profile"
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <UserAvatar name={user.name} image={user.image} size={28} />
          </Link>
          <Link href="/dashboard/profile" className="min-w-0 flex-1 group">
            <p className="truncate text-xs font-medium text-fg-primary group-hover:text-accent">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-fg-muted">{user.email}</p>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="shrink-0 rounded-md p-1 text-fg-muted transition-colors hover:bg-bg-secondary hover:text-accent-emphasis"
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ size: number }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-fg-secondary hover:bg-bg-secondary hover:text-fg-primary"
      }`}
    >
      <Icon size={13} />
      {label}
    </Link>
  );
}

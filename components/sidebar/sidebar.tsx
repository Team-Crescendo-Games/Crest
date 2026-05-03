"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { LayoutGrid, Users } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Logo } from "@/components/common/logo";
import { SidebarLink } from "./sidebar-link";
import { UserFooter } from "./user-footer";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { BoardNav } from "./board-nav";
import { SprintNav } from "./sprint-nav";

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

const userNavigation = [{ name: "Dashboard", href: "/", icon: LayoutGrid }];

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 224; // w-56 = 14rem = 224px

export function Sidebar({ user, workspaces }: SidebarProps) {
  const pathname = usePathname();
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

  const workspaceMatch = pathname.match(/^\/w\/([^/]+)/);
  const urlWorkspaceId = workspaceMatch?.[1];

  if (urlWorkspaceId && urlWorkspaceId !== lastWorkspaceId) {
    setLastWorkspaceId(urlWorkspaceId);
  }

  const activeWorkspaceId =
    urlWorkspaceId ?? lastWorkspaceId ?? workspaces[0]?.id;
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <aside
      ref={sidebarRef}
      className="sticky top-0 flex h-screen flex-col border-r border-border bg-bg-elevated/60 backdrop-blur-sm overflow-y-auto"
      style={{ width, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        className="absolute inset-y-0 right-0 z-30 w-1 cursor-col-resize transition-colors hover:bg-accent/30"
      />
      {/* Logo */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2">
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
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
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

        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          activeWorkspaceName={activeWorkspace?.name}
        />

        {activeWorkspace && (
          <nav className="space-y-0.5">
            <SidebarLink
              href={`/w/${activeWorkspaceId}`}
              icon={LayoutGrid}
              label="Overview"
              active={pathname === `/w/${activeWorkspaceId}`}
            />

            <BoardNav
              boards={activeWorkspace.boards}
              activeWorkspaceId={activeWorkspaceId!}
              pathname={pathname}
            />

            <SprintNav
              sprints={activeWorkspace.sprints}
              activeWorkspaceId={activeWorkspaceId!}
              pathname={pathname}
            />

            <SidebarLink
              href={`/w/${activeWorkspaceId}/team`}
              icon={Users}
              label="Team"
              active={pathname.startsWith(`/w/${activeWorkspaceId}/team`)}
            />
          </nav>
        )}
      </div>

      <UserFooter user={user} />
    </aside>
  );
}

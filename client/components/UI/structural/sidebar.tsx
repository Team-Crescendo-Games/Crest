"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import {
  setIsDarkMode,
  setImpersonatedUser,
  setIsSidebarCollapsed,
} from "@/state";
import {
  useGetBoardsQuery,
  useGetSprintsQuery,
  useGetUnreadCountQuery,
  useUpdateTaskMutation,
  useAddTaskToSprintMutation,
  useReorderBoardsMutation,
  useGetWorkspacesQuery,
  useAddWorkspaceMemberMutation,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { useWorkspace } from "@/lib/useWorkspace";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  LucideIcon,
  Maximize2,
  Minimize2,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Tag,
  User,
  Users,
  Zap,
  LogOut,
  Building2,
} from "lucide-react";
import { BiColumns } from "react-icons/bi";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import ModalNewBoard from "@/components/boards/modalNewBoard";
import ModalNewSprint from "@/components/sprints/modalNewSprint";
import TaskCreateModal from "@/components/tasks/taskCreateModal";
import ModalNewWorkspace from "@/components/workspaces/ModalNewWorkspace";
import S3Image from "@/components/S3Image";
import {
  BOARD_MAIN_COLOR,
  SPRINT_MAIN_COLOR,
  APP_ACCENT_LIGHT,
  APP_ACCENT_DARK,
} from "@/lib/entityColors";
import {
  DND_ITEM_TYPES,
  DraggedTask,
  DraggedSidebarBoard,
} from "@/lib/dndTypes";
import { isAdminUser } from "@/lib/adminAllowlist";

const Sidebar = () => {
  const [showAdmin, setShowAdmin] = useState(false);
  const [showBoards, setShowBoards] = useState(true);
  const [showSprints, setShowSprints] = useState(true);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [showActiveSprintsOnly, setShowActiveSprintsOnly] = useState(true);
  const [showActiveBoardsOnly, setShowActiveBoardsOnly] = useState(true);
  const [fullscreenSection, setFullscreenSection] = useState<"boards" | "sprints" | null>(null);

  const [isModalNewBoardOpen, setIsModalNewBoardOpen] = useState(false);
  const [isModalNewSprintOpen, setIsModalNewSprintOpen] = useState(false);
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const [isModalNewWorkspaceOpen, setIsModalNewWorkspaceOpen] = useState(false);

  const hasShownWelcomeRef = useRef(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);

  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );
  const impersonatedUser = useAppSelector(
    (state) => state.global.impersonatedUser,
  );
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();

  const { data: currentUser } = useAuthUser();
  const userId = currentUser?.userDetails?.userId;
  const realUserEmail = impersonatedUser
    ? undefined
    : currentUser?.userDetails?.email;
  const isAdmin = isAdminUser(realUserEmail) || !!impersonatedUser;

  const { activeWorkspaceId, setWorkspace } = useWorkspace();

  // --- DATA FETCHING ---
  const {
    data: workspaces,
    isLoading: isLoadingWorkspaces,
    isFetching: isFetchingWorkspaces,
  } = useGetWorkspacesQuery(userId!, {
    skip: !userId,
  });

  // Initialize workspace if none selected, or force modal if they have 0 workspaces
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !activeWorkspaceId) {
      setWorkspace(workspaces[0].id);
      hasShownWelcomeRef.current = false;
    } else if (
      workspaces &&
      workspaces.length > 0 &&
      activeWorkspaceId &&
      !workspaces.find((w) => w.id === activeWorkspaceId)
    ) {
      // Active workspace no longer in user's list — switch to first available
      setWorkspace(workspaces[0].id);
    } else if (
      workspaces &&
      workspaces.length === 0 &&
      !isLoadingWorkspaces &&
      !isFetchingWorkspaces
    ) {
      // Clear stale workspace ID when user has no workspaces
      if (activeWorkspaceId) {
        setWorkspace(null);
      }
      if (!hasShownWelcomeRef.current) {
        hasShownWelcomeRef.current = true;
        setIsModalNewWorkspaceOpen(true);
      }
    }
  }, [
    workspaces,
    activeWorkspaceId,
    setWorkspace,
    isLoadingWorkspaces,
    isFetchingWorkspaces,
  ]);

  const { data: boards } = useGetBoardsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });
  const { data: sprints } = useGetSprintsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });
  const { data: unreadCountData } = useGetUnreadCountQuery(userId!, {
    skip: !userId,
  });

  const [updateTask] = useUpdateTaskMutation();
  const [addTaskToSprint] = useAddTaskToSprintMutation();
  const [reorderBoards] = useReorderBoardsMutation();

  const unreadCount = unreadCountData?.count ?? 0;

  // --- FILTERING ---
  const filteredSprints = sprints
    ?.filter((sprint) =>
      showActiveSprintsOnly ? sprint.isActive !== false : true,
    )
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });

  const filteredBoards = boards?.filter((board) =>
    showActiveBoardsOnly ? board.isActive !== false : true,
  );

  const activeWorkspace = workspaces?.find((w) => w.id === activeWorkspaceId);

  // Update browser tab title with workspace name
  useEffect(() => {
    document.title = activeWorkspace?.name
      ? `Crest - ${activeWorkspace.name}`
      : "Crest";
  }, [activeWorkspace?.name]);

  // --- HANDLERS ---
  const handleStopImpersonating = () => dispatch(setImpersonatedUser(null));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(event.target as Node)
      ) {
        setShowCreateMenu(false);
      }
      if (
        workspaceDropdownRef.current &&
        !workspaceDropdownRef.current.contains(event.target as Node)
      ) {
        setIsWorkspaceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (event.target as HTMLElement)?.isContentEditable
      )
        return;
      if (event.shiftKey && event.key === "A") {
        event.preventDefault();
        setShowCreateMenu((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreateOption = (
    option: "task" | "sprint" | "board" | "workspace" | "invite",
  ) => {
    setShowCreateMenu(false);
    if (option === "task") setIsModalNewTaskOpen(true);
    else if (option === "sprint") setIsModalNewSprintOpen(true);
    else if (option === "board") setIsModalNewBoardOpen(true);
    else if (option === "workspace") setIsModalNewWorkspaceOpen(true);
  };

  const handleMoveTaskToBoard = async (
    taskId: number,
    boardId: number,
    currentBoardId: number,
  ) => {
    if (boardId === currentBoardId) return;
    try {
      await updateTask({ id: taskId, boardId, userId }).unwrap();
      router.push(`/boards/${boardId}`);
    } catch (error) {
      console.error("Failed to move task to board:", error);
    }
  };

  const handleAddTaskToSprint = async (taskId: number, sprintId: number) => {
    try {
      await addTaskToSprint({ sprintId, taskId }).unwrap();
    } catch (error) {
      console.error("Failed to add task to sprint:", error);
    }
  };

  const handleReorderBoards = async (dragIndex: number, hoverIndex: number) => {
    if (!filteredBoards || dragIndex === hoverIndex || !activeWorkspaceId)
      return;
    const newOrder = [...filteredBoards];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);
    const orderedIds = newOrder.map((p) => p.id);
    try {
      await reorderBoards({
        orderedIds,
        workspaceId: activeWorkspaceId,
      }).unwrap();
    } catch (error) {
      console.error("Failed to reorder boards:", error);
    }
  };

  if (!currentUser) return null;
  const currentUserDetails = currentUser?.userDetails;

  return (
    <div
      className={`fixed z-20 flex h-full flex-col bg-white shadow-xl transition-all duration-300 dark:bg-dark-secondary ${isSidebarCollapsed ? "w-16" : "w-64"}`}
    >
      <ModalNewBoard
        isOpen={isModalNewBoardOpen}
        onClose={() => setIsModalNewBoardOpen(false)}
      />
      <ModalNewSprint
        isOpen={isModalNewSprintOpen}
        onClose={() => setIsModalNewSprintOpen(false)}
      />
      <TaskCreateModal
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
      />
      <ModalNewWorkspace
        isOpen={isModalNewWorkspaceOpen}
        onClose={() => setIsModalNewWorkspaceOpen(false)}
        canCancel={!!workspaces && workspaces.length > 0}
      />

      {/* Impersonation banner */}
      {impersonatedUser && !isSidebarCollapsed && (
        <div className="flex shrink-0 items-center justify-between bg-amber-100 px-3 py-1.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          <span className="truncate">
            Viewing as <strong>{impersonatedUser.username}</strong>
          </span>
          <button
            onClick={handleStopImpersonating}
            className="ml-2 flex shrink-0 items-center gap-1 rounded bg-amber-600 px-2 py-0.5 text-white hover:bg-amber-700"
          >
            <LogOut className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* WORKSPACE ICON & NAME */}
      <div
        className="relative shrink-0 border-b border-gray-100 dark:border-gray-800"
        ref={workspaceDropdownRef}
      >
        {/* Hero header background — bleeds behind icon & title */}
        {!isSidebarCollapsed && activeWorkspace?.headerExt && (
          <div className="absolute inset-0 overflow-hidden">
            <S3Image
              s3Key={`workspaces/${activeWorkspace.id}/header.${activeWorkspace.headerExt}`}
              alt=""
              width={256}
              height={160}
              className="h-full w-full object-cover"
              fallbackType="image"
            />
            {/* Liquid glass gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/15 to-white/50 backdrop-blur-[1px] dark:from-dark-secondary/30 dark:via-dark-secondary/15 dark:to-dark-secondary/50" />
          </div>
        )}

        <div
          className={`relative flex shrink-0 items-center ${isSidebarCollapsed ? "justify-center px-2 py-4" : "gap-3 px-6 py-6"}`}
        >
          <div className="relative shrink-0">
            <button
              onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
              className="shrink-0 cursor-pointer rounded-lg transition-opacity hover:opacity-80"
            >
              {activeWorkspace?.iconExt ? (
                <S3Image
                  s3Key={`workspaces/${activeWorkspace.id}/icon.${activeWorkspace.iconExt}`}
                  alt={activeWorkspace.name || "Workspace"}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-lg object-cover"
                  fallbackType="image"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200/80 backdrop-blur-sm dark:bg-dark-tertiary/80">
                  <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
              )}
            </button>
            {isWorkspaceDropdownOpen && (
              <div className={`absolute z-50 mt-1 animate-scale-in overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-tertiary ${isSidebarCollapsed ? "left-full top-0 ml-1 w-48" : "left-0 top-full w-48"}`}>
                <div className="max-h-48 overflow-y-auto">
                  {workspaces?.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setWorkspace(ws.id);
                        setIsWorkspaceDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors ${
                        activeWorkspaceId === ws.id
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-secondary"
                      }`}
                    >
                      {ws.iconExt ? (
                        <S3Image
                          s3Key={`workspaces/${ws.id}/icon.${ws.iconExt}`}
                          alt={ws.name}
                          width={20}
                          height={20}
                          className="h-5 w-5 shrink-0 rounded object-cover"
                          fallbackType="image"
                        />
                      ) : (
                        <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
                      )}
                      <span className="truncate">{ws.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 border-t border-gray-200 p-2 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setIsWorkspaceDropdownOpen(false);
                      setIsModalNewWorkspaceOpen(true);
                    }}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
                    style={{
                      backgroundColor: isDarkMode ? APP_ACCENT_LIGHT : APP_ACCENT_DARK,
                      color: isDarkMode ? "#1f2937" : "#ffffff",
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
          {!isSidebarCollapsed && (
            <>
              <span
                className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 drop-shadow-sm dark:text-white dark:drop-shadow-md"
                title={activeWorkspace?.name || "Workspace"}
              >
                {(activeWorkspace?.name || "Workspace").slice(0, 64)}
              </span>
              <Link
                href="/settings/workspace"
                className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-dark-tertiary dark:hover:text-gray-300"
                title="Workspace settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

      </div>

      {/* CREATE BUTTON */}
      <div
        className={`relative shrink-0 ${isSidebarCollapsed ? "px-2 py-3" : "px-6 pb-1 pt-5"}`}
        ref={createMenuRef}
      >
        <button
          onClick={() => setShowCreateMenu((prev) => !prev)}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 ${isSidebarCollapsed ? "w-full p-2" : "w-full px-4 py-1.5"}`}
          style={{
            backgroundColor: isDarkMode ? APP_ACCENT_LIGHT : APP_ACCENT_DARK,
            color: isDarkMode ? "#1f2937" : "#ffffff",
          }}
        >
          <Plus className="h-4 w-4" />
          {!isSidebarCollapsed && "Create"}
        </button>
        {showCreateMenu && (
          <div
            className={`absolute z-50 mt-1 w-40 animate-scale-in overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-tertiary ${isSidebarCollapsed ? "left-full top-0 ml-1" : "left-6 right-6 top-full w-auto"}`}
          >
            <button
              onClick={() => handleCreateOption("task")}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-secondary"
            >
              <ClipboardList className="h-4 w-4" /> Task
            </button>
            <button
              onClick={() => handleCreateOption("sprint")}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 dark:text-gray-200 dark:hover:bg-purple-900/20"
            >
              <Zap className="h-4 w-4" style={{ color: SPRINT_MAIN_COLOR }} />
              Sprint
            </button>
            <button
              onClick={() => handleCreateOption("board")}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-blue-900/20"
            >
              <BiColumns
                className="h-4 w-4"
                style={{ color: BOARD_MAIN_COLOR }}
              />
              Board
            </button>
          </div>
        )}
      </div>

      {!isSidebarCollapsed && activeWorkspaceId && (
        <>
          {fullscreenSection === "boards" ? (
            /* FULLSCREEN BOARDS */
            <div className="animate-fade-in flex min-h-0 flex-1 flex-col pt-3">
              <div className="flex shrink-0 items-center gap-2 bg-gray-50 px-4 py-2 dark:bg-dark-bg">
                <button
                  onClick={() => setFullscreenSection(null)}
                  className="rounded p-0.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-tertiary"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <BiColumns className="h-4 w-4" style={{ color: BOARD_MAIN_COLOR }} />
                <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">Boards</span>
                <span
                  role="button"
                  onClick={() => setShowActiveBoardsOnly((prev) => !prev)}
                  className="group/tip relative rounded p-0.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-tertiary"
                >
                  {showActiveBoardsOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                    {showActiveBoardsOnly ? "Show archived" : "Hide archived"}
                  </span>
                </span>
                <span
                  role="button"
                  onClick={() => setIsModalNewBoardOpen(true)}
                  className="group/tip relative rounded p-0.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-tertiary"
                >
                  <Plus className="h-4 w-4" />
                  <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                    New board
                  </span>
                </span>
                <button
                  onClick={() => setFullscreenSection(null)}
                  className="group/tip relative rounded p-0.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-tertiary"
                >
                  <Minimize2 className="h-4 w-4" />
                  <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                    Collapse
                  </span>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {filteredBoards?.map((board, index) => (
                  <div
                    key={board.id}
                    className="animate-slide-down opacity-0"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <DraggableBoardLink
                      boardId={board.id}
                      index={index}
                      label={board.name}
                      href={`/boards/${board.id}`}
                      isInactive={board.isActive === false}
                      onDropTask={handleMoveTaskToBoard}
                      onReorder={handleReorderBoards}
                    />
                  </div>
                ))}
                {(!filteredBoards || filteredBoards.length === 0) && (
                  <p className="px-6 py-4 text-sm text-gray-400 dark:text-neutral-500">No boards</p>
                )}
              </div>
            </div>
          ) : fullscreenSection === "sprints" ? (
            /* FULLSCREEN SPRINTS */
            <div className="animate-fade-in flex min-h-0 flex-1 flex-col pt-3">
              <div className="flex shrink-0 items-center gap-2 bg-gray-50 px-4 py-2 dark:bg-dark-bg">
                <button
                  onClick={() => setFullscreenSection(null)}
                  className="rounded p-0.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-tertiary"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <Zap className="h-4 w-4" style={{ color: SPRINT_MAIN_COLOR }} />
                <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">Sprints</span>
                <span
                  role="button"
                  onClick={() => setShowActiveSprintsOnly((prev) => !prev)}
                  className="group/tip relative rounded p-0.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-tertiary"
                >
                  {showActiveSprintsOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                    {showActiveSprintsOnly ? "Show archived" : "Hide archived"}
                  </span>
                </span>
                <span
                  role="button"
                  onClick={() => setIsModalNewSprintOpen(true)}
                  className="group/tip relative rounded p-0.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-tertiary"
                >
                  <Plus className="h-4 w-4" />
                  <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                    New sprint
                  </span>
                </span>
                <button
                  onClick={() => setFullscreenSection(null)}
                  className="group/tip relative rounded p-0.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-tertiary"
                >
                  <Minimize2 className="h-4 w-4" />
                  <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                    Collapse
                  </span>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {filteredSprints?.map((sprint, index) => (
                  <div
                    key={sprint.id}
                    className="animate-slide-down opacity-0"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <DroppableSprintLink
                      sprintId={sprint.id}
                      label={sprint.title}
                      href={`/sprints/${sprint.id}`}
                      isInactive={sprint.isActive === false}
                      onDropTask={handleAddTaskToSprint}
                    />
                  </div>
                ))}
                {(!filteredSprints || filteredSprints.length === 0) && (
                  <p className="px-6 py-4 text-sm text-gray-400 dark:text-neutral-500">No sprints</p>
                )}
              </div>
            </div>
          ) : (
        <>
          {/* OVERVIEW SECTION */}
          <div className="shrink-0 pt-3">
            {isAdmin && (
              <div className="shrink-0">
                <button
                  onClick={() => setShowAdmin((prev) => !prev)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md bg-gray-50 px-6 py-2 text-red-500 transition-all hover:pl-7 hover:text-red-600 hover:scale-[1.01] dark:bg-dark-bg dark:text-red-400 dark:hover:text-red-300"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>SYSTEM ADMIN</span>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-300 ${showAdmin ? "rotate-180" : "rotate-0"}`}
                  />
                </button>
                {showAdmin && (
                  <div className="overflow-hidden">
                    <div
                      className="animate-slide-down opacity-0"
                      style={{ animationDelay: "0ms" }}
                    >
                      <SidebarSubLinkWithIcon
                        icon={Users}
                        label="Users"
                        href="/admin/users"
                        isDarkMode={isDarkMode}
                        variant="admin"
                      />
                    </div>
                    <div
                      className="animate-slide-down opacity-0"
                      style={{ animationDelay: "50ms" }}
                    >
                      <SidebarSubLinkWithIcon
                        icon={Building2}
                        label="Workspaces"
                        href="/admin/workspaces"
                        isDarkMode={isDarkMode}
                        variant="admin"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="px-6 pb-1 pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Overview
              </span>
            </div>
            <SidebarSubLinkWithIcon
              icon={BarChart3}
              label="Dashboard"
              href="/dashboard"
              isDarkMode={isDarkMode}
            />
            <SidebarSubLinkWithIcon
              icon={ClipboardList}
              label="My Tasks"
              href={userId ? `/users/${userId}` : "/users"}
              isDarkMode={isDarkMode}
              isActiveOverride={
                userId ? pathname === `/users/${userId}` : false
              }
            />
            <SidebarSubLinkWithIcon
              icon={Bell}
              label="Inbox"
              href="/inbox"
              isDarkMode={isDarkMode}
              badge={unreadCount}
            />
          </div>

          {/* WORKSPACE SECTION */}
          <div className="relative z-0 shrink-0">
            <div className="px-6 pb-1 pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Workspace
              </span>
            </div>
            <SidebarSubLinkWithIcon
              icon={Search}
              label="Search"
              href="/search"
              isDarkMode={isDarkMode}
            />
            <SidebarSubLinkWithIcon
              icon={Tag}
              label="Tags"
              href="/tags"
              isDarkMode={isDarkMode}
            />
            <SidebarSubLinkWithIcon
              icon={Users}
              label="Team"
              href="/team"
              isDarkMode={isDarkMode}
            />
            <SidebarSubLinkWithIcon
              icon={Settings}
              label="Settings"
              href="/settings/workspace"
              isDarkMode={isDarkMode}
            />
          </div>

          {/* BOARDS & SPRINTS */}
          <div className="flex min-h-0 flex-1 flex-col">
            {/* BOARDS */}
            <div
              className="flex min-h-0 flex-col"
              style={{ maxHeight: showBoards && filteredBoards && filteredBoards.length > 0 ? "50%" : "auto" }}
            >
              <button
                onClick={() => filteredBoards && filteredBoards.length > 0 && setShowBoards((prev) => !prev)}
                className="relative z-20 flex w-full shrink-0 cursor-pointer items-center justify-between overflow-visible rounded-md bg-gray-50 px-6 py-2 text-gray-500 transition-all hover:pl-7 hover:text-gray-700 hover:scale-[1.01] dark:bg-dark-bg dark:hover:text-gray-300"
              >
                <div className="flex items-center gap-2">
                  <BiColumns
                    className="h-4 w-4"
                    style={{ color: BOARD_MAIN_COLOR }}
                  />
                  <span>Boards</span>
                </div>
                <div className="flex items-center gap-1 overflow-visible">
                  {filteredBoards && filteredBoards.length > 0 && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActiveBoardsOnly((prev) => !prev);
                      }}
                      className="group/tip relative rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                    >
                      {showActiveBoardsOnly ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                        {showActiveBoardsOnly ? "Show archived" : "Hide archived"}
                      </span>
                    </span>
                  )}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModalNewBoardOpen(true);
                    }}
                    className="group/tip relative rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                      New board
                    </span>
                  </span>
                  {filteredBoards && filteredBoards.length > 0 && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenSection("boards");
                      }}
                      className="group/tip relative rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                        Expand
                      </span>
                    </span>
                  )}
                  {filteredBoards && filteredBoards.length > 0 && (
                    <ChevronDown
                      className={`h-5 w-5 transition-transform duration-300 ${showBoards ? "rotate-180" : "rotate-0"}`}
                    />
                  )}
                </div>
              </button>
              {showBoards && filteredBoards && filteredBoards.length > 0 && (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {filteredBoards.map((board, index) => (
                    <div
                      key={board.id}
                      className="animate-slide-down opacity-0"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <DraggableBoardLink
                        boardId={board.id}
                        index={index}
                        label={board.name}
                        href={`/boards/${board.id}`}
                        isInactive={board.isActive === false}
                        onDropTask={handleMoveTaskToBoard}
                        onReorder={handleReorderBoards}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SPRINTS */}
            <div
              className="flex min-h-0 flex-col"
              style={{ maxHeight: showSprints && filteredSprints && filteredSprints.length > 0 ? "50%" : "auto" }}
            >
              <button
                onClick={() => filteredSprints && filteredSprints.length > 0 && setShowSprints((prev) => !prev)}
                className="relative z-10 flex w-full shrink-0 cursor-pointer items-center justify-between overflow-visible rounded-md bg-gray-50 px-6 py-2 text-gray-500 transition-all hover:pl-7 hover:text-gray-700 hover:scale-[1.01] dark:bg-dark-bg dark:hover:text-gray-300"
              >
                <div className="flex items-center gap-2">
                  <Zap
                    className="h-4 w-4"
                    style={{ color: SPRINT_MAIN_COLOR }}
                  />
                  <span>Sprints</span>
                </div>
                <div className="flex items-center gap-1 overflow-visible">
                  {filteredSprints && filteredSprints.length > 0 && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActiveSprintsOnly((prev) => !prev);
                      }}
                      className="group/tip relative rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                    >
                      {showActiveSprintsOnly ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                        {showActiveSprintsOnly ? "Show archived" : "Hide archived"}
                      </span>
                    </span>
                  )}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModalNewSprintOpen(true);
                    }}
                    className="group/tip relative rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                      New sprint
                    </span>
                  </span>
                  {filteredSprints && filteredSprints.length > 0 && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenSection("sprints");
                      }}
                      className="group/tip relative rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tip:opacity-100 dark:bg-gray-700">
                        Expand
                      </span>
                    </span>
                  )}
                  {filteredSprints && filteredSprints.length > 0 && (
                    <ChevronDown
                      className={`h-5 w-5 transition-transform duration-300 ${showSprints ? "rotate-180" : "rotate-0"}`}
                    />
                  )}
                </div>
              </button>
              {showSprints && filteredSprints && filteredSprints.length > 0 && (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {filteredSprints.map((sprint, index) => (
                    <div
                      key={sprint.id}
                      className="animate-slide-down opacity-0"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <DroppableSprintLink
                        sprintId={sprint.id}
                        label={sprint.title}
                        href={`/sprints/${sprint.id}`}
                        isInactive={sprint.isActive === false}
                        onDropTask={handleAddTaskToSprint}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
          )}
      </>
      )}

      {/* BOTTOM SECTION */}
      <div
        className={`mt-auto shrink-0 border-t border-gray-100 bg-white py-4 dark:border-gray-800 dark:bg-dark-secondary ${isSidebarCollapsed ? "px-2" : "px-4"}`}
      >
        <div
          className={`flex items-center ${isSidebarCollapsed ? "flex-col gap-2" : "gap-1"}`}
        >
          <button
            onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-tertiary"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-tertiary"
          >
            {currentUserDetails?.userId &&
            currentUserDetails?.profilePictureExt ? (
              <S3Image
                s3Key={`users/${currentUserDetails.userId}/profile.${currentUserDetails.profilePictureExt}`}
                alt={currentUserDetails?.username || "User Profile Picture"}
                width={20}
                height={20}
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 shrink-0" />
            )}
            {!isSidebarCollapsed && (
              <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                {currentUserDetails?.fullName || currentUserDetails?.username || "Profile"}
              </span>
            )}
          </Link>
          <button
            onClick={() => dispatch(setIsDarkMode(!isDarkMode))}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-tertiary"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface DroppableSprintLinkProps {
  sprintId: number;
  href: string;
  label: string;
  isInactive?: boolean;
  onDropTask: (taskId: number, sprintId: number) => void;
}

const DroppableSprintLink = ({
  sprintId,
  href,
  label,
  isInactive,
  onDropTask,
}: DroppableSprintLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: DND_ITEM_TYPES.TASK,
      drop: (item: DraggedTask) => {
        onDropTask(item.id, sprintId);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [sprintId, onDropTask],
  );

  return (
    <div
      ref={(instance) => {
        drop(instance);
      }}
    >
      <Link href={href} className="w-full">
        <div
          className={`relative flex cursor-pointer items-center transition-colors hover:bg-gray-100 dark:hover:bg-dark-tertiary ${
            isActive ? "bg-gray-100 dark:bg-dark-tertiary" : ""
          } ${
            isOver
              ? "bg-purple-100 ring-2 ring-inset ring-purple-400 dark:bg-purple-900/30"
              : ""
          } justify-start px-6 py-2 pl-10`}
        >
          {isActive && (
            <div
              className="w-0.75 absolute left-0 top-0 h-full"
              style={{ backgroundColor: SPRINT_MAIN_COLOR }}
            />
          )}

          <span
            className={`text-sm ${isInactive ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-200"}`}
          >
            {label}
          </span>
        </div>
      </Link>
    </div>
  );
};

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isDarkMode: boolean;
  badge?: number;
  variant?: "default" | "admin";
}

const SidebarLink = ({
  href,
  icon: Icon,
  label,
  isDarkMode,
  badge,
  variant = "default",
}: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive =
    pathname === href || (pathname === "/" && href === "/dashboard");
  const isAdmin = variant === "admin";

  const activeColor = isAdmin
    ? "#dc2626"
    : isDarkMode
      ? APP_ACCENT_LIGHT
      : APP_ACCENT_DARK;
  const iconColor = isAdmin ? "#ef4444" : undefined;

  return (
    <Link href={href} className="w-full">
      <div
        className={`relative flex cursor-pointer items-center gap-3 transition-colors hover:bg-gray-100 dark:hover:bg-dark-tertiary ${
          isActive ? "bg-gray-100 text-white dark:bg-dark-tertiary" : ""
        } ${isAdmin ? "hover:bg-red-50 dark:hover:bg-red-900/20" : ""} justify-start px-6 py-2`}
      >
        {isActive && (
          <div
            className="w-0.75 absolute left-0 top-0 h-full"
            style={{ backgroundColor: activeColor }}
          />
        )}

        <Icon
          className="h-5 w-5 text-gray-800 dark:text-gray-100"
          style={iconColor ? { color: iconColor } : undefined}
        />

        <span
          className={`text-sm font-medium ${isAdmin ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-100"}`}
        >
          {label}
        </span>

        {badge !== undefined && badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
    </Link>
  );
};

interface SidebarSubLinkWithIconProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isDarkMode: boolean;
  badge?: number;
  isActiveOverride?: boolean;
  variant?: "default" | "admin";
}

const SidebarSubLinkWithIcon = ({
  href,
  label,
  icon: Icon,
  isDarkMode,
  badge,
  isActiveOverride,
  variant = "default",
}: SidebarSubLinkWithIconProps) => {
  const pathname = usePathname();

  const isActive =
    isActiveOverride !== undefined ? isActiveOverride : pathname === href;
  const isAdmin = variant === "admin";
  const activeColor = isAdmin
    ? "#dc2626"
    : isDarkMode
      ? APP_ACCENT_LIGHT
      : APP_ACCENT_DARK;

  return (
    <Link href={href} className="w-full">
      <div
        className={`relative flex cursor-pointer items-center gap-2 transition-colors ${
          isAdmin ? "hover:bg-red-50 dark:hover:bg-red-900/20" : "hover:bg-gray-100 dark:hover:bg-dark-tertiary"
        } ${
          isActive ? (isAdmin ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-100 dark:bg-dark-tertiary") : ""
        } justify-start px-6 py-2 pl-10`}
      >
        {isActive && (
          <div
            className="w-0.75 absolute left-0 top-0 h-full"
            style={{ backgroundColor: activeColor }}
          />
        )}

        <Icon
          className={isAdmin ? "h-4 w-4 text-red-500 dark:text-red-400" : "h-4 w-4 text-gray-600 dark:text-gray-300"}
        />

        <span
          className={isAdmin ? "text-sm text-red-600 dark:text-red-400" : "text-sm text-gray-700 dark:text-gray-200"}
        >
          {label}
        </span>

        {badge !== undefined && badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
    </Link>
  );
};

interface DraggableBoardLinkProps {
  boardId: number;
  index: number;
  href: string;
  label: string;
  isInactive?: boolean;
  onDropTask: (taskId: number, boardId: number, currentBoardId: number) => void;
  onReorder: (dragIndex: number, dropIndex: number) => void;
}

const DraggableBoardLink = ({
  boardId,
  index,
  href,
  label,
  isInactive,
  onDropTask,
  onReorder,
}: DraggableBoardLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  const ref = useRef<HTMLDivElement>(null);
  const [dropPosition, setDropPosition] = useState<"above" | "below" | null>(
    null,
  );

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: DND_ITEM_TYPES.SIDEBAR_BOARD,
      item: { id: boardId, index },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
      end: () => setDropPosition(null),
    }),
    [boardId, index],
  );

  const [{ isOver: isOverTask, canDrop: canDropTask }, dropTask] = useDrop(
    () => ({
      accept: DND_ITEM_TYPES.TASK,
      drop: (item: DraggedTask) => onDropTask(item.id, boardId, item.boardId),
      canDrop: (item: DraggedTask) => item.boardId !== boardId,
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [boardId, onDropTask],
  );

  const [{ isOver: isOverBoard }, dropBoard] = useDrop(
    () => ({
      accept: DND_ITEM_TYPES.SIDEBAR_BOARD,
      hover: (item: DraggedSidebarBoard, monitor) => {
        if (item.id === boardId) {
          setDropPosition(null);
          return;
        }
        const hoverBoundingRect = ref.current?.getBoundingClientRect();
        if (!hoverBoundingRect) return;
        const hoverMiddleY =
          (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset) return;
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        setDropPosition(hoverClientY < hoverMiddleY ? "above" : "below");
      },
      drop: (item: DraggedSidebarBoard) => {
        if (item.id === boardId || dropPosition === null) return;
        const targetIndex = dropPosition === "above" ? index : index + 1;
        const adjustedIndex =
          item.index < index ? targetIndex - 1 : targetIndex;
        if (item.index !== adjustedIndex) onReorder(item.index, adjustedIndex);
        setDropPosition(null);
      },
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [index, boardId, onReorder, dropPosition],
  );

  useEffect(() => {
    if (!isOverBoard) setDropPosition(null);
  }, [isOverBoard]);

  // eslint-disable-next-line react-hooks/refs
  drag(dropTask(dropBoard(ref)));

  return (
    <div
      ref={ref}
      className="relative"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {dropPosition === "above" && (
        <div className="absolute left-6 right-2 top-0 h-0.5 -translate-y-0.5 rounded-full bg-blue-500" />
      )}
      <Link href={href} className="w-full">
        <div
          className={`relative flex cursor-grab items-center transition-colors hover:bg-gray-100 dark:hover:bg-dark-tertiary ${isActive ? "bg-gray-100 dark:bg-dark-tertiary" : ""} ${isOverTask && canDropTask ? "bg-blue-100 ring-2 ring-inset ring-blue-400 dark:bg-blue-900/30" : ""} justify-start px-6 py-2 pl-10`}
        >
          {isActive && (
            <div
              className="w-0.75 absolute left-0 top-0 h-full"
              style={{ backgroundColor: BOARD_MAIN_COLOR }}
            />
          )}
          <span
            className={`text-sm ${isInactive ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-200"}`}
          >
            {label}
          </span>
        </div>
      </Link>
      {dropPosition === "below" && (
        <div className="absolute bottom-0 left-6 right-2 h-0.5 translate-y-0.5 rounded-full bg-blue-500" />
      )}
    </div>
  );
};

export default Sidebar;

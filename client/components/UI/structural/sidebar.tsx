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
import { signOut } from "aws-amplify/auth";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  Folder,
  Home,
  LucideIcon,
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
  UserPlus,
} from "lucide-react";
import { BiColumns } from "react-icons/bi";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import ModalNewBoard from "@/components/boards/modalNewBoard";
import ModalNewSprint from "@/components/sprints/modalNewSprint";
import TaskCreateModal from "@/components/tasks/taskCreateModal";
import ModalNewWorkspace from "@/components/workspaces/modalNewWorkspace";
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
import ModalInviteMember from "@/components/workspaces/modalInviteMember";

const Sidebar = () => {
  const [showOverview, setShowOverview] = useState(true);
  const [showBoards, setShowBoards] = useState(true);
  const [showSprints, setShowSprints] = useState(true);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(true);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [showActiveSprintsOnly, setShowActiveSprintsOnly] = useState(true);
  const [showActiveBoardsOnly, setShowActiveBoardsOnly] = useState(true);

  const [isModalNewBoardOpen, setIsModalNewBoardOpen] = useState(false);
  const [isModalNewSprintOpen, setIsModalNewSprintOpen] = useState(false);
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const [isModalNewWorkspaceOpen, setIsModalNewWorkspaceOpen] = useState(false);
  const [isModalInviteMemberOpen, setIsModalInviteMemberOpen] = useState(false);

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
  const { data: workspaces, isLoading: isLoadingWorkspaces } =
    useGetWorkspacesQuery(userId!, {
      skip: !userId,
    });

  // Initialize workspace if none selected, or force modal if they have 0 workspaces
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !activeWorkspaceId) {
      setWorkspace(workspaces[0].id);
    } else if (workspaces && workspaces.length === 0 && !isLoadingWorkspaces) {
      setIsModalNewWorkspaceOpen(true);
    }
  }, [workspaces, activeWorkspaceId, setWorkspace, isLoadingWorkspaces]);

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

  // --- HANDLERS ---
  const handleStopImpersonating = () => dispatch(setImpersonatedUser(null));
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

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
    else if (option === "invite") setIsModalInviteMemberOpen(true);
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
        // If they have 0 workspaces, force them to create one (hide close button)
        canCancel={!!workspaces && workspaces.length > 0}
      />
      <ModalInviteMember
        isOpen={isModalInviteMemberOpen}
        onClose={() => setIsModalInviteMemberOpen(false)}
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

      {/* LOGO & TITLE */}
      <div
        className={`flex shrink-0 items-center border-b border-gray-100 dark:border-gray-800 ${isSidebarCollapsed ? "justify-center px-2 py-4" : "gap-3 px-6 py-4"}`}
      >
        <Image
          src="/favicon.ico"
          alt="Logo"
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
        />
        {!isSidebarCollapsed && (
          <span className="text-xl font-semibold text-gray-900 dark:text-white">
            Crest
          </span>
        )}
      </div>

      {/* WORKSPACE SWITCHER */}
      {!isSidebarCollapsed && (
        <div
          className="relative shrink-0 px-6 pb-2 pt-4"
          ref={workspaceDropdownRef}
        >
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-dark-tertiary dark:text-gray-200 dark:hover:bg-dark-secondary"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Building2 className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span className="truncate">
                {activeWorkspace?.name || "Select Workspace"}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${isWorkspaceDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isWorkspaceDropdownOpen && (
            <div className="absolute left-6 right-6 top-full z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-tertiary">
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
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-secondary"
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setIsWorkspaceDropdownOpen(false);
                    setIsModalNewWorkspaceOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-secondary"
                >
                  <Plus className="h-4 w-4" />
                  Create Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE BUTTON */}
      <div
        className={`relative shrink-0 ${isSidebarCollapsed ? "px-2 py-3" : "px-6 py-3"}`}
        ref={createMenuRef}
      >
        <button
          onClick={() => setShowCreateMenu((prev) => !prev)}
          className={`flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 ${isSidebarCollapsed ? "w-full p-2" : "w-full px-4 py-1.5"}`}
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
            className={`absolute z-50 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-tertiary ${isSidebarCollapsed ? "left-full top-0 ml-1" : "left-6 right-6 top-full w-auto"}`}
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
            <button
              onClick={() => handleCreateOption("invite")}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 dark:text-gray-200 dark:hover:bg-green-900/20"
            >
              <UserPlus className="h-4 w-4 text-green-600 dark:text-green-500" />
              Invite Member
            </button>
          </div>
        )}
      </div>

      {!isSidebarCollapsed && (
        <>
          {/* OVERVIEW SECTION */}
          <div className="shrink-0">
            {isAdmin && (
              <SidebarLink
                icon={Settings}
                label="Admin"
                href="/admin/users"
                isDarkMode={isDarkMode}
                variant="admin"
              />
            )}
            <button
              onClick={() => setShowOverview((prev) => !prev)}
              className="flex w-full items-center justify-between px-6 py-2 text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
            >
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span>Overview</span>
              </div>
              <ChevronDown
                className={`h-5 w-5 transition-transform duration-300 ${showOverview ? "rotate-180" : "rotate-0"}`}
              />
            </button>
            {showOverview && (
              <div className="overflow-hidden">
                <div
                  className="animate-slide-down opacity-0"
                  style={{ animationDelay: "0ms" }}
                >
                  <SidebarSubLinkWithIcon
                    icon={BarChart3}
                    label="Dashboard"
                    href="/dashboard"
                    isDarkMode={isDarkMode}
                  />
                </div>
                <div
                  className="animate-slide-down opacity-0"
                  style={{ animationDelay: "50ms" }}
                >
                  <SidebarSubLinkWithIcon
                    icon={ClipboardList}
                    label="My Tasks"
                    href={userId ? `/users/${userId}` : "/users"}
                    isDarkMode={isDarkMode}
                    isActiveOverride={
                      userId ? pathname === `/users/${userId}` : false
                    }
                  />
                </div>
                <div
                  className="animate-slide-down opacity-0"
                  style={{ animationDelay: "100ms" }}
                >
                  <SidebarSubLinkWithIcon
                    icon={Bell}
                    label="Inbox"
                    href="/inbox"
                    isDarkMode={isDarkMode}
                    badge={unreadCount}
                  />
                </div>
              </div>
            )}
          </div>

          {/* WORKSPACE SECTION */}
          <div className="relative z-0 shrink-0">
            <button
              onClick={() => setShowWorkspaceMenu((prev) => !prev)}
              className="flex w-full items-center justify-between px-6 py-2 text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
            >
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span>Workspace Details</span>
              </div>
              <ChevronDown
                className={`h-5 w-5 transition-transform duration-300 ${showWorkspaceMenu ? "rotate-180" : "rotate-0"}`}
              />
            </button>
            {showWorkspaceMenu && (
              <div className="overflow-hidden">
                <div
                  className="animate-slide-down opacity-0"
                  style={{ animationDelay: "0ms" }}
                >
                  <SidebarSubLinkWithIcon
                    icon={Search}
                    label="Search"
                    href="/search"
                    isDarkMode={isDarkMode}
                  />
                </div>
                <div
                  className="animate-slide-down opacity-0"
                  style={{ animationDelay: "50ms" }}
                >
                  <SidebarSubLinkWithIcon
                    icon={Tag}
                    label="Tags"
                    href="/tags"
                    isDarkMode={isDarkMode}
                  />
                </div>
                <div
                  className="animate-slide-down opacity-0"
                  style={{ animationDelay: "100ms" }}
                >
                  <SidebarSubLinkWithIcon
                    icon={Users}
                    label="Team"
                    href="/users"
                    isDarkMode={isDarkMode}
                  />
                </div>
              </div>
            )}
          </div>

          {/* BOARDS & SPRINTS */}
          <div className="flex min-h-0 flex-1 flex-col">
            {/* BOARDS */}
            <div
              className="flex min-h-0 flex-col"
              style={{ maxHeight: showBoards ? "50%" : "auto" }}
            >
              <button
                onClick={() => setShowBoards((prev) => !prev)}
                className="relative z-20 flex w-full shrink-0 items-center justify-between overflow-visible bg-white px-6 py-2 text-gray-500 transition-colors hover:text-gray-700 dark:bg-dark-secondary dark:hover:text-gray-300"
              >
                <div className="flex items-center gap-2">
                  <BiColumns
                    className="h-4 w-4"
                    style={{ color: BOARD_MAIN_COLOR }}
                  />
                  <span>Boards</span>
                </div>
                <div className="flex items-center gap-1 overflow-visible">
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActiveBoardsOnly((prev) => !prev);
                    }}
                    className="group relative rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                  >
                    {showActiveBoardsOnly ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </span>
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModalNewBoardOpen(true);
                    }}
                    className="rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-300 ${showBoards ? "rotate-180" : "rotate-0"}`}
                  />
                </div>
              </button>
              {showBoards && (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {filteredBoards?.map((board, index) => (
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
              style={{ maxHeight: showSprints ? "50%" : "auto" }}
            >
              <button
                onClick={() => setShowSprints((prev) => !prev)}
                className="relative z-10 flex w-full shrink-0 items-center justify-between overflow-visible bg-white px-6 py-2 text-gray-500 transition-colors hover:text-gray-700 dark:bg-dark-secondary dark:hover:text-gray-300"
              >
                <div className="flex items-center gap-2">
                  <Zap
                    className="h-4 w-4"
                    style={{ color: SPRINT_MAIN_COLOR }}
                  />
                  <span>Sprints</span>
                </div>
                <div className="flex items-center gap-1 overflow-visible">
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActiveSprintsOnly((prev) => !prev);
                    }}
                    className="group relative rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                  >
                    {showActiveSprintsOnly ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </span>
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModalNewSprintOpen(true);
                    }}
                    className="rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-300 ${showSprints ? "rotate-180" : "rotate-0"}`}
                  />
                </div>
              </button>
              {showSprints && (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {filteredSprints?.map((sprint, index) => (
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
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-tertiary"
          >
            {currentUserDetails?.userId &&
            currentUserDetails?.profilePictureExt ? (
              <S3Image
                s3Key={`users/${currentUserDetails.userId}/profile.${currentUserDetails.profilePictureExt}`}
                alt={currentUserDetails?.username || "User Profile Picture"}
                width={20}
                height={20}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5" />
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
          {!isSidebarCollapsed && (
            <button
              onClick={handleSignOut}
              className="ml-auto rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Sign out
            </button>
          )}
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
}

const SidebarSubLinkWithIcon = ({
  href,
  label,
  icon: Icon,
  isDarkMode,
  badge,
  isActiveOverride,
}: SidebarSubLinkWithIconProps) => {
  const pathname = usePathname();

  const isActive =
    isActiveOverride !== undefined ? isActiveOverride : pathname === href;
  const activeColor = isDarkMode ? APP_ACCENT_LIGHT : APP_ACCENT_DARK;

  return (
    <Link href={href} className="w-full">
      <div
        className={`relative flex cursor-pointer items-center gap-2 transition-colors hover:bg-gray-100 dark:hover:bg-dark-tertiary ${
          isActive ? "bg-gray-100 dark:bg-dark-tertiary" : ""
        } justify-start px-6 py-2 pl-10`}
      >
        {isActive && (
          <div
            className="w-0.75 absolute left-0 top-0 h-full"
            style={{ backgroundColor: activeColor }}
          />
        )}

        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />

        <span className="text-sm text-gray-700 dark:text-gray-200">
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

"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setImpersonatedUser, setIsSidebarCollapsed } from "@/state";
import {
  useGetProjectsQuery,
  useGetSprintsQuery,
  useGetUnreadCountQuery,
  useUpdateTaskMutation,
  useAddTaskToSprintMutation,
  useReorderProjectsMutation,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
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
} from "lucide-react";
import { BiColumns } from "react-icons/bi";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import ModalNewBoard from "@/components/boards/modalNewBoard";
import ModalNewSprint from "@/app/sprints/ModalNewSprint";
import TaskCreateModal from "@/components/TaskCreateModal";
import S3Image from "@/components/S3Image";
import {
  BOARD_MAIN_COLOR,
  SPRINT_MAIN_COLOR,
  APP_ACCENT_LIGHT,
  APP_ACCENT_DARK,
} from "@/lib/entityColors";
import { DND_ITEM_TYPES, DraggedTask, DraggedSidebarBoard } from "@/lib/dndTypes";
import { isAdminUser } from "@/lib/adminAllowlist";

const Sidebar = () => {
  const [showOverview, setShowOverview] = useState(true);
  const [showBoards, setShowBoards] = useState(true);
  const [showSprints, setShowSprints] = useState(true);
  const [showWorkspace, setShowWorkspace] = useState(true);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showActiveSprintsOnly, setShowActiveSprintsOnly] = useState(true);
  const [showActiveBoardsOnly, setShowActiveBoardsOnly] = useState(true);
  const [isModalNewBoardOpen, setIsModalNewBoardOpen] = useState(false);
  const [isModalNewSprintOpen, setIsModalNewSprintOpen] = useState(false);
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const isSidebarCollapsed = useAppSelector((state) => state.global.isSidebarCollapsed);
  const impersonatedUser = useAppSelector(
    (state) => state.global.impersonatedUser,
  );
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();

  const { data: projects } = useGetProjectsQuery();
  const { data: sprints } = useGetSprintsQuery();
  const [updateTask] = useUpdateTaskMutation();
  const [addTaskToSprint] = useAddTaskToSprintMutation();
  const [reorderProjects] = useReorderProjectsMutation();

  // Filter sprints based on active toggle and sort by end date (dueDate)
  const filteredSprints = sprints
    ?.filter((sprint) =>
      showActiveSprintsOnly ? sprint.isActive !== false : true,
    )
    .sort((a, b) => {
      // Sort by dueDate descending (most recent first)
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });

  // Filter boards based on active toggle
  const filteredBoards = projects?.filter((project) =>
    showActiveBoardsOnly ? project.isActive !== false : true,
  );

  const { data: currentUser } = useAuthUser();
  const userId = currentUser?.userDetails?.userId;
  // For admin check, use the real user's email (not impersonated)
  const realUserEmail = impersonatedUser
    ? undefined
    : currentUser?.userDetails?.email;
  const isAdmin = isAdminUser(realUserEmail) || !!impersonatedUser; // If impersonating, user is admin

  // Fetch unread notification count
  const { data: unreadCountData } = useGetUnreadCountQuery(userId!, {
    skip: !userId,
  });
  const unreadCount = unreadCountData?.count ?? 0;

  const handleStopImpersonating = () => {
    dispatch(setImpersonatedUser(null));
  };
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // Close create menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(event.target as Node)
      ) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Shift+A keyboard shortcut to toggle Create menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (event.target as HTMLElement)?.isContentEditable) return;
      if (event.shiftKey && event.key === "A") {
        event.preventDefault();
        setShowCreateMenu((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreateOption = (option: "task" | "sprint" | "board") => {
    setShowCreateMenu(false);
    if (option === "task") setIsModalNewTaskOpen(true);
    else if (option === "sprint") setIsModalNewSprintOpen(true);
    else if (option === "board") setIsModalNewBoardOpen(true);
  };

  // Handler for moving task to a different board
  const handleMoveTaskToBoard = async (
    taskId: number,
    projectId: number,
    currentProjectId: number,
  ) => {
    if (projectId === currentProjectId) return; // Already on this board
    try {
      await updateTask({ id: taskId, projectId, userId }).unwrap();
      router.push(`/boards/${projectId}`);
    } catch (error) {
      console.error("Failed to move task to board:", error);
    }
  };

  // Handler for adding task to a sprint
  const handleAddTaskToSprint = async (taskId: number, sprintId: number) => {
    try {
      await addTaskToSprint({ sprintId, taskId }).unwrap();
    } catch (error) {
      console.error("Failed to add task to sprint:", error);
    }
  };

  // Handler for reordering boards
  const handleReorderBoards = async (dragIndex: number, hoverIndex: number) => {
    if (!filteredBoards || dragIndex === hoverIndex) return;
    const newOrder = [...filteredBoards];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);
    const orderedIds = newOrder.map((p) => p.id);
    try {
      await reorderProjects(orderedIds).unwrap();
    } catch (error) {
      console.error("Failed to reorder boards:", error);
    }
  };

  if (!currentUser) return null;
  const currentUserDetails = currentUser?.userDetails;

  return (
    <div className={`dark:bg-dark-secondary fixed z-20 flex h-full flex-col bg-white shadow-xl transition-all duration-300 ${isSidebarCollapsed ? "w-16" : "w-64"}`}>
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

      {/* Impersonation banner - fixed at top */}
      {impersonatedUser && !isSidebarCollapsed && (
        <div className="shrink-0 flex items-center justify-between bg-amber-100 px-3 py-1.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          <span className="truncate">
            Viewing as <strong>{impersonatedUser.username}</strong>
          </span>
          <button
            onClick={handleStopImpersonating}
            className="ml-2 flex shrink-0 items-center gap-1 rounded bg-amber-600 px-2 py-0.5 text-white hover:bg-amber-700"
            title="Stop impersonating"
          >
            <LogOut className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* LOGO & TITLE - fixed at top */}
      <div className={`shrink-0 flex items-center border-b border-gray-100 dark:border-gray-800 ${isSidebarCollapsed ? "justify-center px-2 py-4" : "gap-3 px-6 py-4"}`}>
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

      {/* CREATE BUTTON - fixed at top */}
      <div className={`shrink-0 relative ${isSidebarCollapsed ? "px-2 py-3" : "px-6 py-3"}`} ref={createMenuRef}>
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
          <div className={`dark:bg-dark-tertiary absolute z-50 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 ${isSidebarCollapsed ? "top-0 left-full ml-1" : "top-full right-6 left-6 w-auto"}`}>
            <button
              onClick={() => handleCreateOption("task")}
              className="dark:hover:bg-dark-secondary flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200"
            >
              <ClipboardList className="h-4 w-4" />
              Task
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

      {!isSidebarCollapsed && (
      <>
      {/* OVERVIEW - fixed */}
      <div className="shrink-0">
        {/* ADMIN LINK - Above Overview */}
        {isAdmin && (
          <SidebarLink
            icon={Settings}
            label="Admin"
            href="/admin/users"
            isDarkMode={isDarkMode}
            variant="admin"
          />
        )}
        {/* OVERVIEW HEADER */}
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
        {/* OVERVIEW LIST */}
        {showOverview && (
          <div className="overflow-hidden">
            <div className="animate-slide-down opacity-0" style={{ animationDelay: "0ms" }}>
              <SidebarSubLinkWithIcon
                icon={BarChart3}
                label="Dashboard"
                href="/dashboard"
                isDarkMode={isDarkMode}
              />
            </div>
            <div className="animate-slide-down opacity-0" style={{ animationDelay: "50ms" }}>
              <SidebarSubLinkWithIcon
                icon={ClipboardList}
                label="My Tasks"
                href={userId ? `/users/${userId}` : "/users"}
                isDarkMode={isDarkMode}
                isActiveOverride={userId ? pathname === `/users/${userId}` : false}
              />
            </div>
            <div className="animate-slide-down opacity-0" style={{ animationDelay: "100ms" }}>
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

      {/* WORKSPACE - fixed */}
      <div className="shrink-0 relative z-0">
        <button
          onClick={() => setShowWorkspace((prev) => !prev)}
          className="flex w-full items-center justify-between px-6 py-2 text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
        >
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            <span>Workspace</span>
          </div>
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-300 ${showWorkspace ? "rotate-180" : "rotate-0"}`}
          />
        </button>
        {/* WORKSPACE LIST */}
        {showWorkspace && (
          <div className="overflow-hidden">
            <div className="animate-slide-down opacity-0" style={{ animationDelay: "0ms" }}>
              <SidebarSubLinkWithIcon
                icon={Search}
                label="Search"
                href="/search"
                isDarkMode={isDarkMode}
              />
            </div>
            <div className="animate-slide-down opacity-0" style={{ animationDelay: "50ms" }}>
              <SidebarSubLinkWithIcon
                icon={Tag}
                label="Tags"
                href="/tags"
                isDarkMode={isDarkMode}
              />
            </div>
            <div className="animate-slide-down opacity-0" style={{ animationDelay: "100ms" }}>
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

      {/* BOARDS & SPRINTS - each with restricted height */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* BOARDS SECTION */}
        <div className="flex min-h-0 flex-col" style={{ maxHeight: showBoards ? "50%" : "auto" }}>
          {/* BOARDS HEADER */}
          <button
            onClick={() => setShowBoards((prev) => !prev)}
            className="shrink-0 relative z-20 flex w-full items-center justify-between overflow-visible bg-white px-6 py-2 text-gray-500 transition-colors hover:text-gray-700 dark:bg-dark-secondary dark:hover:text-gray-300"
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
                className="group relative dark:hover:bg-dark-tertiary rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95"
              >
                {showActiveBoardsOnly ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                <span className="pointer-events-none absolute left-1/2 bottom-full z-[100] mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-950">
                  {showActiveBoardsOnly ? "Show archived boards" : "Show active only"}
                </span>
              </span>
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalNewBoardOpen(true);
                }}
                className="dark:hover:bg-dark-tertiary rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </span>
              <ChevronDown
                className={`h-5 w-5 transition-transform duration-300 ${showBoards ? "rotate-180" : "rotate-0"}`}
              />
            </div>
          </button>
          {/* BOARDS LIST */}
          {showBoards && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {filteredBoards?.map((project, index) => (
                <div
                  key={project.id}
                  className="animate-slide-down opacity-0"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <DraggableBoardLink
                    projectId={project.id}
                    index={index}
                    label={project.name}
                    href={`/boards/${project.id}`}
                    isInactive={project.isActive === false}
                    onDropTask={handleMoveTaskToBoard}
                    onReorder={handleReorderBoards}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SPRINTS SECTION */}
        <div className="flex min-h-0 flex-col" style={{ maxHeight: showSprints ? "50%" : "auto" }}>
          {/* SPRINTS HEADER */}
          <button
            onClick={() => setShowSprints((prev) => !prev)}
            className="shrink-0 relative z-10 flex w-full items-center justify-between overflow-visible bg-white px-6 py-2 text-gray-500 transition-colors hover:text-gray-700 dark:bg-dark-secondary dark:hover:text-gray-300"
          >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: SPRINT_MAIN_COLOR }} />
            <span>Sprints</span>
          </div>
          <div className="flex items-center gap-1 overflow-visible">
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowActiveSprintsOnly((prev) => !prev);
              }}
              className="group relative dark:hover:bg-dark-tertiary rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95"
            >
              {showActiveSprintsOnly ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              <span className="pointer-events-none absolute left-1/2 bottom-full z-[100] mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-950">
                {showActiveSprintsOnly ? "Show archived sprints" : "Show active only"}
              </span>
            </span>
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalNewSprintOpen(true);
              }}
              className="dark:hover:bg-dark-tertiary rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </span>
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-300 ${showSprints ? "rotate-180" : "rotate-0"}`}
            />
          </div>
        </button>
          {/* SPRINTS LIST */}
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

      {/* BOTTOM SECTION - User, Dark Mode, Sign Out - fixed at bottom */}
      <div className={`dark:bg-dark-secondary mt-auto shrink-0 border-t border-gray-100 bg-white py-4 dark:border-gray-800 ${isSidebarCollapsed ? "px-2" : "px-4"}`}>
        <div className={`flex items-center ${isSidebarCollapsed ? "flex-col gap-2" : "gap-1"}`}>
          {/* Collapse toggle */}
          <button
            onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
            className="dark:hover:bg-dark-tertiary rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          {/* User icon */}
          <Link
            href="/profile"
            className="dark:hover:bg-dark-tertiary rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400"
          >
            {currentUserDetails?.userId &&
            currentUserDetails?.profilePictureExt ? (
              <S3Image
                key={`profile-${currentUserDetails.userId}`}
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

          {/* Dark mode toggle */}
          <button
            onClick={() => dispatch(setIsDarkMode(!isDarkMode))}
            className="dark:hover:bg-dark-tertiary rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Sign out */}
          {!isSidebarCollapsed && (
            <button
              onClick={handleSignOut}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
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
    ? "#dc2626" // red-600
    : isDarkMode
      ? APP_ACCENT_LIGHT
      : APP_ACCENT_DARK;
  const iconColor = isAdmin ? "#ef4444" : undefined; // red-500 for admin

  return (
    <Link href={href} className="w-full">
      <div
        className={`dark:hover:bg-dark-tertiary relative flex cursor-pointer items-center gap-3 transition-colors hover:bg-gray-100 ${
          isActive ? "dark:bg-dark-tertiary bg-gray-100 text-white" : ""
        } ${isAdmin ? "hover:bg-red-50 dark:hover:bg-red-900/20" : ""} justify-start px-6 py-2`}
      >
        {isActive && (
          <div
            className="absolute top-0 left-0 h-[100%] w-[3px]"
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

interface DroppableBoardLinkProps {
  projectId: number;
  href: string;
  label: string;
  isInactive?: boolean;
  onDropTask: (
    taskId: number,
    projectId: number,
    currentProjectId: number,
  ) => void;
}

// Keep for backwards compatibility but not used anymore
const DroppableBoardLink = ({
  projectId,
  href,
  label,
  isInactive,
  onDropTask,
}: DroppableBoardLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: DND_ITEM_TYPES.TASK,
      drop: (item: DraggedTask) => {
        onDropTask(item.id, projectId, item.projectId);
      },
      canDrop: (item: DraggedTask) => item.projectId !== projectId,
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [projectId, onDropTask],
  );

  return (
    <div
      ref={(instance) => {
        drop(instance);
      }}
    >
      <Link href={href} className="w-full">
        <div
          className={`dark:hover:bg-dark-tertiary relative flex cursor-pointer items-center transition-colors hover:bg-gray-100 ${
            isActive ? "dark:bg-dark-tertiary bg-gray-100" : ""
          } ${
            isOver && canDrop
              ? "bg-blue-100 ring-2 ring-blue-400 ring-inset dark:bg-blue-900/30"
              : ""
          } justify-start px-6 py-2 pl-10`}
        >
          {isActive && (
            <div
              className="absolute top-0 left-0 h-[100%] w-[3px]"
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
    </div>
  );
};

interface DraggableBoardLinkProps {
  projectId: number;
  index: number;
  href: string;
  label: string;
  isInactive?: boolean;
  onDropTask: (taskId: number, projectId: number, currentProjectId: number) => void;
  onReorder: (dragIndex: number, dropIndex: number) => void;
}

const DraggableBoardLink = ({
  projectId,
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
  const [dropPosition, setDropPosition] = useState<"above" | "below" | null>(null);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: DND_ITEM_TYPES.SIDEBAR_BOARD,
      item: { id: projectId, index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      end: () => {
        setDropPosition(null);
      },
    }),
    [projectId, index],
  );

  const [{ isOver: isOverTask, canDrop: canDropTask }, dropTask] = useDrop(
    () => ({
      accept: DND_ITEM_TYPES.TASK,
      drop: (item: DraggedTask) => {
        onDropTask(item.id, projectId, item.projectId);
      },
      canDrop: (item: DraggedTask) => item.projectId !== projectId,
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [projectId, onDropTask],
  );

  const [{ isOver: isOverBoard }, dropBoard] = useDrop(
    () => ({
      accept: DND_ITEM_TYPES.SIDEBAR_BOARD,
      hover: (item: DraggedSidebarBoard, monitor) => {
        if (item.id === projectId) {
          setDropPosition(null);
          return;
        }
        const hoverBoundingRect = ref.current?.getBoundingClientRect();
        if (!hoverBoundingRect) return;
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset) return;
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        setDropPosition(hoverClientY < hoverMiddleY ? "above" : "below");
      },
      drop: (item: DraggedSidebarBoard) => {
        if (item.id === projectId || dropPosition === null) return;
        const targetIndex = dropPosition === "above" ? index : index + 1;
        const adjustedIndex = item.index < index ? targetIndex - 1 : targetIndex;
        if (item.index !== adjustedIndex) {
          onReorder(item.index, adjustedIndex);
        }
        setDropPosition(null);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [index, projectId, onReorder, dropPosition],
  );

  // Reset drop position when not hovering
  useEffect(() => {
    if (!isOverBoard) {
      setDropPosition(null);
    }
  }, [isOverBoard]);

  // Combine drag and drop refs
  drag(dropTask(dropBoard(ref)));

  return (
    <div
      ref={ref}
      className="relative"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {/* Drop indicator line - above */}
      {dropPosition === "above" && (
        <div className="absolute top-0 left-6 right-2 h-0.5 -translate-y-0.5 rounded-full bg-blue-500" />
      )}
      <Link href={href} className="w-full">
        <div
          className={`dark:hover:bg-dark-tertiary relative flex cursor-grab items-center transition-colors hover:bg-gray-100 ${
            isActive ? "dark:bg-dark-tertiary bg-gray-100" : ""
          } ${
            isOverTask && canDropTask
              ? "bg-blue-100 ring-2 ring-blue-400 ring-inset dark:bg-blue-900/30"
              : ""
          } justify-start px-6 py-2 pl-10`}
        >
          {isActive && (
            <div
              className="absolute top-0 left-0 h-[100%] w-[3px]"
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
      {/* Drop indicator line - below */}
      {dropPosition === "below" && (
        <div className="absolute bottom-0 left-6 right-2 h-0.5 translate-y-0.5 rounded-full bg-blue-500" />
      )}
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
          className={`dark:hover:bg-dark-tertiary relative flex cursor-pointer items-center transition-colors hover:bg-gray-100 ${
            isActive ? "dark:bg-dark-tertiary bg-gray-100" : ""
          } ${
            isOver
              ? "bg-purple-100 ring-2 ring-purple-400 ring-inset dark:bg-purple-900/30"
              : ""
          } justify-start px-6 py-2 pl-10`}
        >
          {isActive && (
            <div
              className="absolute top-0 left-0 h-[100%] w-[3px]"
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

interface SidebarSubLinkWithIconProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isDarkMode: boolean;
  badge?: number;
  /** Optional custom active check - if provided, overrides default pathname === href check */
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
  // Use override if provided, otherwise fall back to default href comparison
  const isActive = isActiveOverride !== undefined ? isActiveOverride : pathname === href;

  const activeColor = isDarkMode ? APP_ACCENT_LIGHT : APP_ACCENT_DARK;

  return (
    <Link href={href} className="w-full">
      <div
        className={`dark:hover:bg-dark-tertiary relative flex cursor-pointer items-center gap-2 transition-colors hover:bg-gray-100 ${
          isActive ? "dark:bg-dark-tertiary bg-gray-100" : ""
        } justify-start px-6 py-2 pl-10`}
      >
        {isActive && (
          <div
            className="absolute top-0 left-0 h-[100%] w-[3px]"
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

export default Sidebar;

"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setImpersonatedUser } from "@/state";
import {
  useGetProjectsQuery,
  useGetSprintsQuery,
  useGetUnreadCountQuery,
  useUpdateTaskMutation,
  useAddTaskToSprintMutation,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { signOut } from "aws-amplify/auth";
import {
  Bell,
  ChevronDown,
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
import { useDrop } from "react-dnd";
import ModalNewBoard from "@/app/boards/ModalNewBoard";
import ModalNewSprint from "@/app/sprints/ModalNewSprint";
import ModalNewTask from "@/components/ModalNewTask";
import S3Image from "@/components/S3Image";
import {
  BOARD_MAIN_COLOR,
  SPRINT_MAIN_COLOR,
  APP_ACCENT_LIGHT,
  APP_ACCENT_DARK,
} from "@/lib/entityColors";
import { DND_ITEM_TYPES, DraggedTask } from "@/lib/dndTypes";
import { isAdminUser } from "@/lib/adminAllowlist";

const Sidebar = () => {
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
  const impersonatedUser = useAppSelector(
    (state) => state.global.impersonatedUser,
  );
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { data: projects } = useGetProjectsQuery();
  const { data: sprints } = useGetSprintsQuery();
  const [updateTask] = useUpdateTaskMutation();
  const [addTaskToSprint] = useAddTaskToSprintMutation();

  // Filter sprints based on active toggle
  const filteredSprints = sprints?.filter((sprint) =>
    showActiveSprintsOnly ? sprint.isActive !== false : true,
  );

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

  if (!currentUser) return null;
  const currentUserDetails = currentUser?.userDetails;

  return (
    <div className="dark:bg-dark-secondary fixed z-20 flex h-full w-64 flex-col justify-between overflow-y-auto bg-white shadow-xl transition-all duration-300">
      <ModalNewBoard
        isOpen={isModalNewBoardOpen}
        onClose={() => setIsModalNewBoardOpen(false)}
      />
      <ModalNewSprint
        isOpen={isModalNewSprintOpen}
        onClose={() => setIsModalNewSprintOpen(false)}
      />
      <ModalNewTask
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-col">
        {/* TOP LOGO & HEADER */}
        <div className="dark:bg-dark-secondary sticky top-0 z-50 flex w-full flex-col border-b border-gray-100 bg-white dark:border-gray-800">
          {impersonatedUser && (
            <div className="flex items-center justify-between bg-amber-100 px-3 py-1.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
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
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Image
                src="/favicon.ico"
                alt="Logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                Crest
              </span>
            </div>
          </div>
        </div>

        {/* CREATE BUTTON */}
        <div className="relative px-6 py-3" ref={createMenuRef}>
          <button
            onClick={() => setShowCreateMenu((prev) => !prev)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
            style={{
              backgroundColor: isDarkMode ? APP_ACCENT_LIGHT : APP_ACCENT_DARK,
              color: isDarkMode ? "#1f2937" : "#ffffff",
            }}
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
          {showCreateMenu && (
            <div className="dark:bg-dark-tertiary absolute top-full right-6 left-6 z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700">
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

        {/* NAVBAR LINKS */}
        <nav className="flex w-full flex-col gap-y-1">
          <SidebarLink
            icon={Home}
            label="Overview"
            href="/"
            isDarkMode={isDarkMode}
          />
          <SidebarLink
            icon={Bell}
            label="Inbox"
            href="/inbox"
            isDarkMode={isDarkMode}
            badge={unreadCount > 0 ? unreadCount : undefined}
          />
          {isAdmin && (
            <SidebarLink
              icon={Settings}
              label="Admin"
              href="/admin/users"
              isDarkMode={isDarkMode}
              variant="admin"
            />
          )}
        </nav>

        {/* WORKSPACE HEADER */}
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
              href="/users"
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {/* BOARDS HEADER */}
        <button
          onClick={() => setShowBoards((prev) => !prev)}
          className="flex w-full items-center justify-between px-6 py-2 text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
        >
          <div className="flex items-center gap-2">
            <BiColumns
              className="h-4 w-4"
              style={{ color: BOARD_MAIN_COLOR }}
            />
            <span>Boards</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowActiveBoardsOnly((prev) => !prev);
              }}
              className="dark:hover:bg-dark-tertiary rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95"
              title={
                showActiveBoardsOnly ? "Show all boards" : "Show active only"
              }
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
          <div className="overflow-hidden">
            {filteredBoards?.map((project, index) => (
              <div
                key={project.id}
                className="animate-slide-down opacity-0"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <DroppableBoardLink
                  projectId={project.id}
                  label={project.name}
                  href={`/boards/${project.id}`}
                  isDarkMode={isDarkMode}
                  isInactive={project.isActive === false}
                  onDropTask={handleMoveTaskToBoard}
                />
              </div>
            ))}
          </div>
        )}

        {/* SPRINTS HEADER */}
        <button
          onClick={() => setShowSprints((prev) => !prev)}
          className="flex w-full items-center justify-between px-6 py-2 text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: SPRINT_MAIN_COLOR }} />
            <span>Sprints</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowActiveSprintsOnly((prev) => !prev);
              }}
              className="dark:hover:bg-dark-tertiary rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95"
              title={
                showActiveSprintsOnly ? "Show all sprints" : "Show active only"
              }
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
          <div className="overflow-hidden">
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
                  isDarkMode={isDarkMode}
                  isInactive={sprint.isActive === false}
                  onDropTask={handleAddTaskToSprint}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM SECTION - User, Dark Mode, Sign Out */}
      <div className="dark:bg-dark-secondary border-t border-gray-100 bg-white px-4 py-4 dark:border-gray-800">
        <div className="flex items-center gap-1">
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
          <button
            onClick={handleSignOut}
            className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Sign out
          </button>
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
  isDarkMode: boolean;
  isInactive?: boolean;
  onDropTask: (
    taskId: number,
    projectId: number,
    currentProjectId: number,
  ) => void;
}

const DroppableBoardLink = ({
  projectId,
  href,
  label,
  isDarkMode,
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

interface DroppableSprintLinkProps {
  sprintId: number;
  href: string;
  label: string;
  isDarkMode: boolean;
  isInactive?: boolean;
  onDropTask: (taskId: number, sprintId: number) => void;
}

const DroppableSprintLink = ({
  sprintId,
  href,
  label,
  isDarkMode,
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
}

const SidebarSubLinkWithIcon = ({
  href,
  label,
  icon: Icon,
  isDarkMode,
}: SidebarSubLinkWithIconProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

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
      </div>
    </Link>
  );
};

export default Sidebar;

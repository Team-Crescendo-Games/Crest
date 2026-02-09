"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { useGetAuthUserQuery, useGetProjectsQuery, useGetSprintsQuery } from "@/state/api";
import { signOut } from "aws-amplify/auth";
import {
    ChevronDown,
    ClipboardList,
    Eye,
    EyeOff,
    Folder,
    Home,
    LucideIcon,
    Menu,
    Moon,
    Plus,
    Search,
    Sun,
    Tag,
    User,
    Users,
    X,
    Zap,
} from "lucide-react";
import { BiColumns } from "react-icons/bi";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ModalNewBoard from "@/app/boards/ModalNewBoard";
import ModalNewSprint from "@/app/sprints/ModalNewSprint";
import ModalNewTask from "@/components/ModalNewTask";
import S3Image from "@/components/S3Image";
import { BOARD_MAIN_COLOR, SPRINT_MAIN_COLOR, APP_ACCENT_LIGHT, APP_ACCENT_DARK } from "@/lib/entityColors";

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
    const dispatch = useAppDispatch();
    const isSidebarCollapsed = useAppSelector(
        (state) => state.global.isSidebarCollapsed,
    );

    const { data: projects } = useGetProjectsQuery();
    const { data: sprints } = useGetSprintsQuery();

    // Filter sprints based on active toggle
    const filteredSprints = sprints?.filter(sprint => 
        showActiveSprintsOnly ? sprint.isActive !== false : true
    );

    // Filter boards based on active toggle
    const filteredBoards = projects?.filter(project => 
        showActiveBoardsOnly ? project.isActive !== false : true
    );

    const { data: currentUser } = useGetAuthUserQuery({});
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
            if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
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

    if (!currentUser) return null;
    const currentUserDetails = currentUser?.userDetails;

    // Collapsed sidebar - just show menu button
    if (isSidebarCollapsed) {
        return (
            <div className="fixed left-0 top-0 z-40 p-4">
                <button
                    onClick={() => dispatch(setIsSidebarCollapsed(false))}
                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-tertiary"
                >
                    <Menu className="h-6 w-6" />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed flex h-full w-64 flex-col justify-between overflow-y-auto bg-white shadow-xl transition-all duration-300 dark:bg-dark-secondary z-40">
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
                <div className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-dark-secondary">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/favicon.ico"
                            alt="Logo"
                            width={32}
                            height={32}
                            className="h-8 w-8 object-contain"
                        />
                        <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Crest
                        </span>
                    </div>

                    {/* Collapse Button */}
                    <button
                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        onClick={() => dispatch(setIsSidebarCollapsed(true))}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* CREATE BUTTON */}
                <div className="relative px-6 py-3" ref={createMenuRef}>
                    <button
                        onClick={() => setShowCreateMenu((prev) => !prev)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
                        style={{ 
                            backgroundColor: isDarkMode ? APP_ACCENT_LIGHT : APP_ACCENT_DARK,
                            color: isDarkMode ? "#1f2937" : "#ffffff"
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        Create
                    </button>
                    {showCreateMenu && (
                        <div className="absolute left-6 right-6 top-full z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-tertiary">
                            <button
                                onClick={() => handleCreateOption("task")}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-secondary"
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
                                <BiColumns className="h-4 w-4" style={{ color: BOARD_MAIN_COLOR }} />
                                Board
                            </button>
                        </div>
                    )}
                </div>

                {/* NAVBAR LINKS */}
                <nav className="flex w-full flex-col gap-y-1">
                    <SidebarLink icon={Home} label="Overview" href="/" isDarkMode={isDarkMode} />
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
                        <BiColumns className="h-4 w-4" style={{ color: BOARD_MAIN_COLOR }} />
                        <span>Boards</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span
                            role="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowActiveBoardsOnly((prev) => !prev);
                            }}
                            className="rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                            title={showActiveBoardsOnly ? "Show all boards" : "Show active only"}
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
                {/* BOARDS LIST */}
                {showBoards && (
                    <div className="overflow-hidden">
                        {filteredBoards?.map((project, index) => (
                            <div
                                key={project.id}
                                className="animate-slide-down opacity-0"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <SidebarSubLink
                                    label={project.name}
                                    href={`/boards/${project.id}`}
                                    isDarkMode={isDarkMode}
                                    isInactive={project.isActive === false}
                                    category="board"
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
                            className="rounded p-0.5 transition-all duration-200 hover:scale-110 hover:bg-gray-200 active:scale-95 dark:hover:bg-dark-tertiary"
                            title={showActiveSprintsOnly ? "Show all sprints" : "Show active only"}
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
                {/* SPRINTS LIST */}
                {showSprints && (
                    <div className="overflow-hidden">
                        {filteredSprints?.map((sprint, index) => (
                            <div
                                key={sprint.id}
                                className="animate-slide-down opacity-0"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <SidebarSubLink
                                    label={sprint.title}
                                    href={`/sprints/${sprint.id}`}
                                    isDarkMode={isDarkMode}
                                    isInactive={sprint.isActive === false}
                                    category="sprint"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* BOTTOM SECTION - User, Dark Mode, Sign Out */}
            <div className="border-t border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-dark-secondary">
                <div className="flex items-center gap-1">
                    {/* User icon */}
                    <Link
                        href="/profile"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-tertiary"
                    >
                        {currentUserDetails?.userId && currentUserDetails?.profilePictureExt ? (
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
                        {/* Dark mode toggle */}
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
}

const SidebarLink = ({ href, icon: Icon, label, isDarkMode }: SidebarLinkProps) => {
    const pathname = usePathname();
    const isActive =
        pathname === href || (pathname === "/" && href === "/dashboard");

    const activeColor = isDarkMode ? APP_ACCENT_LIGHT : APP_ACCENT_DARK;

    return (
        <Link href={href} className="w-full">
            <div
                className={`relative flex cursor-pointer items-center gap-3 transition-colors hover:bg-gray-100 dark:hover:bg-dark-tertiary ${
                    isActive ? "bg-gray-100 text-white dark:bg-dark-tertiary" : ""
                } justify-start px-6 py-2`}
            >
                {isActive && (
                    <div 
                        className="absolute left-0 top-0 h-[100%] w-[3px]" 
                        style={{ backgroundColor: activeColor }}
                    />
                )}

                <Icon className="h-5 w-5 text-gray-800 dark:text-gray-100" />
                <span className={`text-sm font-medium text-gray-800 dark:text-gray-100`}>
                    {label}
                </span>
            </div>
        </Link>
    );
};

interface SidebarSubLinkProps {
    href: string;
    label: string;
    isDarkMode: boolean;
    isInactive?: boolean;
    category?: "board" | "sprint";
}

const SidebarSubLink = ({ href, label, isDarkMode, isInactive, category }: SidebarSubLinkProps) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    // Use category-specific color for active indicator
    const getActiveColor = () => {
        if (category === "board") return BOARD_MAIN_COLOR;
        if (category === "sprint") return SPRINT_MAIN_COLOR;
        return isDarkMode ? APP_ACCENT_LIGHT : APP_ACCENT_DARK;
    };

    return (
        <Link href={href} className="w-full">
            <div
                className={`relative flex cursor-pointer items-center transition-colors hover:bg-gray-100 dark:hover:bg-dark-tertiary ${
                    isActive ? "bg-gray-100 dark:bg-dark-tertiary" : ""
                } justify-start px-6 py-2 pl-10`}
            >
                {isActive && (
                    <div 
                        className="absolute left-0 top-0 h-[100%] w-[3px]" 
                        style={{ backgroundColor: getActiveColor() }}
                    />
                )}
                <span className={`text-sm ${isInactive ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-200"}`}>
                    {label}
                </span>
            </div>
        </Link>
    );
};

interface SidebarSubLinkWithIconProps {
    href: string;
    label: string;
    icon: LucideIcon;
    isDarkMode: boolean;
}

const SidebarSubLinkWithIcon = ({ href, label, icon: Icon, isDarkMode }: SidebarSubLinkWithIconProps) => {
    const pathname = usePathname();
    const isActive = pathname === href;

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
                        className="absolute left-0 top-0 h-[100%] w-[3px]" 
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

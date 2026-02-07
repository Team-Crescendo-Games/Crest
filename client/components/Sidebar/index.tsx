"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { useGetAuthUserQuery, useGetProjectsQuery, useGetSprintsQuery } from "@/state/api";
import { signOut } from "aws-amplify/auth";
import {
    Briefcase,
    Calendar,
    ChevronDown,
    Home,
    LucideIcon,
    Menu,
    Moon,
    Plus,
    Search,
    Sun,
    Tag,
    User,
    X,
} from "lucide-react";
import { BiColumns } from "react-icons/bi";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ModalNewBoard from "@/app/boards/ModalNewBoard";
import ModalNewSprint from "@/app/sprints/ModalNewSprint";
import S3Image from "@/components/S3Image";

const Sidebar = () => {
    const [showBoards, setShowBoards] = useState(true);
    const [showSprints, setShowSprints] = useState(true);
    const [isModalNewBoardOpen, setIsModalNewBoardOpen] = useState(false);
    const [isModalNewSprintOpen, setIsModalNewSprintOpen] = useState(false);
    const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
    const dispatch = useAppDispatch();
    const isSidebarCollapsed = useAppSelector(
        (state) => state.global.isSidebarCollapsed,
    );

    const { data: projects } = useGetProjectsQuery();
    const { data: sprints } = useGetSprintsQuery();

    const { data: currentUser } = useGetAuthUserQuery({});
    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Error signing out: ", error);
        }
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
            
            {/* Main content area */}
            <div className="flex flex-col">
                {/* TOP LOGO & HEADER */}
                <div className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-dark-secondary">
                    <div className="flex items-center gap-3">
                        <Image
                            src={isDarkMode ? "/tc_logo_rounded_w_on_b.png" : "/tc_logo_rounded_b_on_w.png"}
                            alt="Logo"
                            width={32}
                            height={32}
                            className="h-8 w-8 object-contain"
                        />
                        <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Quest
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

                {/* NAVBAR LINKS */}
                <nav className="mt-6 flex w-full flex-col gap-y-1 px-4">
                    <SidebarLink icon={Home} label="Overview" href="/" />
                    <SidebarLink icon={Search} label="Search" href="/search" />
                    <SidebarLink icon={Tag} label="Tags" href="/tags" />
                    <SidebarLink icon={User} label="Team" href="/users" />
                </nav>

                {/* BOARDS HEADER */}
                <button
                    onClick={() => setShowBoards((prev) => !prev)}
                    className="flex w-full items-center justify-between px-6 py-2 text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
                >
                    <div className="flex items-center gap-2">
                        <BiColumns className="h-4 w-4" />
                        <span>Boards</span>
                    </div>
                    <div className="flex items-center gap-1">
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
                        {projects?.map((project, index) => (
                            <div
                                key={project.id}
                                className="animate-slide-down opacity-0"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <SidebarSubLink
                                    label={project.name}
                                    href={`/boards/${project.id}`}
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
                        <Calendar className="h-4 w-4" />
                        <span>Sprints</span>
                    </div>
                    <div className="flex items-center gap-1">
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
                        {sprints?.map((sprint, index) => (
                            <div
                                key={sprint.id}
                                className="animate-slide-down opacity-0"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <SidebarSubLink
                                    label={sprint.title}
                                    href={`/sprints/${sprint.id}`}
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
}

const SidebarLink = ({ href, icon: Icon, label }: SidebarLinkProps) => {
    const pathname = usePathname();
    const isActive =
        pathname === href || (pathname === "/" && href === "/dashboard");

    return (
        <Link href={href} className="w-full">
            <div
                className={`relative flex cursor-pointer items-center gap-3 transition-colors hover:bg-gray-100 dark:hover:bg-dark-tertiary ${
                    isActive ? "bg-gray-100 text-white dark:bg-dark-tertiary" : ""
                } justify-start px-6 py-2`}
            >
                {isActive && (
                    <div className="absolute left-0 top-0 h-[100%] w-[3px] bg-gray-800 dark:bg-white" />
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
}

const SidebarSubLink = ({ href, label }: SidebarSubLinkProps) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link href={href} className="w-full">
            <div
                className={`relative flex cursor-pointer items-center transition-colors hover:bg-gray-100 dark:hover:bg-dark-tertiary ${
                    isActive ? "bg-gray-100 dark:bg-dark-tertiary" : ""
                } justify-start px-6 py-2 pl-10`}
            >
                {isActive && (
                    <div className="absolute left-0 top-0 h-[100%] w-[3px] bg-gray-800 dark:bg-white" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-200">
                    {label}
                </span>
            </div>
        </Link>
    );
};

export default Sidebar;

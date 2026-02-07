"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { useGetAuthUserQuery, useGetProjectsQuery } from "@/state/api";
import { signOut } from "aws-amplify/auth";
import {
    Briefcase,
    ChevronDown,
    Home,
    LockIcon,
    LucideIcon,
    Plus,
    Search,
    Tag,
    User,
    X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ModalNewBoard from "@/app/boards/ModalNewBoard";
import S3Image from "@/components/S3Image";

const Sidebar = () => {
    const [showBoards, setShowBoards] = useState(true);
    const [isModalNewBoardOpen, setIsModalNewBoardOpen] = useState(false);
    const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

    const { data: projects } = useGetProjectsQuery();
    const dispatch = useAppDispatch();
    const isSidebarCollapsed = useAppSelector(
        (state) => state.global.isSidebarCollapsed,
    );

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

    const sidebarClassNames = `fixed flex flex-col h-[100%] justify-between shadow-xl
    transition-all duration-300 h-full z-40 dark:bg-dark-secondary overflow-y-auto bg-white
    ${isSidebarCollapsed ? "w-0 hidden" : "w-64"}`;

    return (
        <div className={sidebarClassNames}>
            <ModalNewBoard
                isOpen={isModalNewBoardOpen}
                onClose={() => setIsModalNewBoardOpen(false)}
            />
            <div className="flex h-full w-full flex-col justify-start">
                {/* TOP LOGO & HEADER */}
                {/* Added border-b for separation and uniform vertical padding (py-4) */}
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
                    {!isSidebarCollapsed && (
                        <button
                            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                            onClick={() => {
                                dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))
                            }}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* NAVBAR LINKS */}
                {/* Added flex-col, gap for rhythm, and margin-top */}
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
                    <span>Boards</span>
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
                                <SidebarLink
                                    icon={Briefcase}
                                    label={project.name}
                                    href={`/boards/${project.id}`}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="z-10 mt-32 flex w-full flex-col items-center gap-4 bg-white px-8 py-4 dark:bg-dark-secondary md:hidden">
                <div className="flex w-full items-center">
                    <div className="align-center flex h-9 w-9 justify-center">
                        {currentUserDetails?.userId && currentUserDetails?.profilePictureExt ? (
                            <S3Image
                                s3Key={`users/${currentUserDetails.userId}/profile.${currentUserDetails.profilePictureExt}`}
                                alt={currentUserDetails?.username || "User Profile Picture"}
                                width={100}
                                height={50}
                                className="h-full rounded-full object-cover"
                            />
                        ) : (
                            <User className="h-6 w-6 cursor-pointer self-center rounded-full dark:text-white" />
                        )}
                    </div>
                    <span className="mx-3 text-gray-800 dark:text-white">
            {currentUserDetails?.username}
          </span>
                    <button
                        className="self-start rounded bg-gray-800 px-4 py-2 text-xs font-bold text-white hover:bg-gray-700 md:block"
                        onClick={handleSignOut}
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

export default Sidebar;

import { Menu, Moon, Sun, User } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { useGetAuthUserQuery } from "@/state/api";
import { signOut } from "aws-amplify/auth";
import Link from "next/link";
import S3Image from "@/components/S3Image";

const Navbar = () => {
    const dispatch = useAppDispatch();
    const isSidebarCollapsed = useAppSelector(
        (state) => state.global.isSidebarCollapsed,
    );
    const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

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

    return (
        <div className="flex items-center justify-between bg-white px-4 py-1.5 dark:bg-dark-secondary">
            {/* Menu toggle */}
            <div className="flex items-center gap-8">
                {!isSidebarCollapsed ? null : (
                    <button
                        onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
                    >
                        <Menu className="h-6 w-6 dark:text-white" />
                    </button>
                )}
            </div>

            {/* Icons */}
            <div className="flex items-center">
                <button
                    onClick={() => dispatch(setIsDarkMode(!isDarkMode))}
                    className={
                        isDarkMode
                            ? `rounded p-2 dark:hover:bg-dark-tertiary`
                            : `rounded p-2 hover:bg-gray-100`
                    }
                >
                    {isDarkMode ? (
                        <Sun className="h-6 w-6 cursor-pointer dark:text-white" />
                    ) : (
                        <Moon className="h-6 w-6 cursor-pointer dark:text-white" />
                    )}
                </button>
                <div className="ml-2 mr-5 hidden min-h-[2em] w-[0.1rem] bg-gray-200 md:inline-block"></div>
                <div className="hidden items-center justify-between md:flex">
                    <Link href="/profile" className="align-center flex h-7 w-7 justify-center hover:opacity-80">
                        {currentUserDetails?.userId && currentUserDetails?.profilePictureExt ? (
                            <S3Image
                                s3Key={`users/${currentUserDetails.userId}/profile.${currentUserDetails.profilePictureExt}`}
                                alt={currentUserDetails?.username || "User Profile Picture"}
                                width={100}
                                height={50}
                                className="h-full rounded-full object-cover"
                            />
                        ) : (
                            <User className="h-5 w-5 cursor-pointer self-center rounded-full dark:text-white" />
                        )}
                    </Link>
                    <Link href="/profile" className="mx-2 text-sm text-gray-800 hover:underline dark:text-white">
                        {currentUserDetails?.username}
                    </Link>
                    <button
                        className="hidden rounded bg-gray-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-700 md:block"
                        onClick={handleSignOut}
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Navbar;

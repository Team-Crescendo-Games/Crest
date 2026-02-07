"use client";

import { useGetAuthUserQuery } from "@/state/api";
import { signOut } from "aws-amplify/auth";
import { User, Mail, Shield, Calendar } from "lucide-react";
import S3Image from "@/components/S3Image";

const ProfilePage = () => {
  const { data: authData, isLoading } = useGetAuthUserQuery({});

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  if (!authData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500 dark:text-neutral-400">Not authenticated</div>
      </div>
    );
  }

  const { userDetails, userSub } = authData;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold dark:text-white">Profile</h1>
      
      <div className="rounded-lg bg-white p-6 shadow dark:bg-dark-secondary">
        {/* Profile Header */}
        <div className="mb-6 flex items-center gap-4">
          {userDetails?.userId && userDetails?.profilePictureExt ? (
            <S3Image
              s3Key={`users/${userDetails.userId}/profile.${userDetails.profilePictureExt}`}
              alt={userDetails.username || "Profile"}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 dark:bg-dark-tertiary">
              <User className="h-10 w-10 text-gray-500 dark:text-neutral-400" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold dark:text-white">
              {userDetails?.username || "Unknown User"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              {userDetails?.email || "No email"}
            </p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-tertiary">
            <User className="h-5 w-5 text-gray-500 dark:text-neutral-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-neutral-400">Username</p>
              <p className="text-sm font-medium dark:text-white">{userDetails?.username || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-tertiary">
            <Mail className="h-5 w-5 text-gray-500 dark:text-neutral-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-neutral-400">Email</p>
              <p className="text-sm font-medium dark:text-white">{userDetails?.email || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-tertiary">
            <Shield className="h-5 w-5 text-gray-500 dark:text-neutral-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-neutral-400">User ID</p>
              <p className="text-sm font-medium dark:text-white">{userDetails?.userId || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-tertiary">
            <Calendar className="h-5 w-5 text-gray-500 dark:text-neutral-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-neutral-400">Cognito ID</p>
              <p className="truncate text-sm font-medium dark:text-white">{userSub || userDetails?.cognitoId || "—"}</p>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="mt-6 border-t border-gray-200 pt-6 dark:border-stroke-dark">
          <button
            onClick={handleSignOut}
            className="w-full rounded bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

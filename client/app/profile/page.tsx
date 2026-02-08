"use client";

import { useState, useRef } from "react";
import { useGetAuthUserQuery, useGetPresignedUploadUrlMutation, useUpdateUserProfilePictureMutation } from "@/state/api";
import { signOut } from "aws-amplify/auth";
import { User, Mail, Shield, Calendar, Camera, Loader2 } from "lucide-react";
import S3Image from "@/components/S3Image";

const ProfilePage = () => {
  const { data: authData, isLoading, refetch } = useGetAuthUserQuery({});
  const [getPresignedUploadUrl] = useGetPresignedUploadUrlMutation();
  const [updateProfilePicture] = useUpdateUserProfilePictureMutation();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authData?.userDetails?.userId || !authData?.userSub) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const s3Key = `users/${authData.userDetails.userId}/profile.${ext}`;

      // Get presigned upload URL
      const { url } = await getPresignedUploadUrl({
        key: s3Key,
        contentType: file.type,
      }).unwrap();

      // Upload to S3
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      // Update user profile picture extension in database
      await updateProfilePicture({
        cognitoId: authData.userSub,
        profilePictureExt: ext,
      }).unwrap();

      // Refetch user data to update the UI
      refetch();
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadError(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
        {/* Profile Header with Upload */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative">
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
            {/* Upload overlay button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-colors hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-600 dark:hover:bg-gray-500"
              title="Change profile picture"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold dark:text-white">
              {userDetails?.username || "Unknown User"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              {userDetails?.email || "No email"}
            </p>
            {uploadError && (
              <p className="mt-1 text-sm text-red-500">{uploadError}</p>
            )}
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

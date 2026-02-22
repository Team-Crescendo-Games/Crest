"use client";

import { useState, useRef, useEffect } from "react";
import {
  useGetPresignedUploadUrlMutation,
  useUpdateUserProfilePictureMutation,
  useUpdateUserProfileMutation,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { useAppDispatch } from "@/app/redux";
import { showNotification } from "@/state";
import { signOut, updateUserAttributes } from "aws-amplify/auth";
import {
  User,
  Mail,
  Camera,
  Loader2,
  LogOut,
  Pencil,
  Check,
  X,
} from "lucide-react";
import Header from "@/components/Header";
import S3Image from "@/components/S3Image";
import ImageCropModal from "@/components/ImageCropModal";

const ProfilePage = () => {
  const { data: authData, isLoading, refetch } = useAuthUser();
  const dispatch = useAppDispatch();
  const [getPresignedUploadUrl] = useGetPresignedUploadUrlMutation();
  const [updateProfilePicture] = useUpdateUserProfilePictureMutation();
  const [updateProfile] = useUpdateUserProfileMutation();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");

  // Initialize form when user data loads
  useEffect(() => {
    if (authData?.userDetails) {
      setEditFullName(authData.userDetails.fullName || "");
    }
  }, [authData?.userDetails]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        "Please select a valid image file (JPEG, PNG, GIF, or WebP)",
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be less than 5MB");
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropImageSrc(null);
    if (!authData?.userDetails?.userId || !authData?.userSub) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const ext = "jpg"; // cropped output is always JPEG
      const s3Key = `users/${authData.userDetails.userId}/profile.${ext}`;

      const { url } = await getPresignedUploadUrl({
        key: s3Key,
        contentType: "image/jpeg",
      }).unwrap();

      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: croppedBlob,
        headers: { "Content-Type": "image/jpeg" },
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload image");

      await updateProfilePicture({
        cognitoId: authData.userSub,
        profilePictureExt: ext,
      }).unwrap();

      refetch();
      setImageVersion((v) => v + 1);
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadError(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
    if (authData?.userDetails) {
      setEditFullName(authData.userDetails.fullName || "");
    }
  };

  const handleSaveProfile = async () => {
    if (!authData?.userSub) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Update Cognito user attributes (name)
      await updateUserAttributes({
        userAttributes: {
          name: editFullName,
        },
      });

      // Update our database
      await updateProfile({
        cognitoId: authData.userSub,
        fullName: editFullName || undefined,
      }).unwrap();

      refetch();
      setIsEditing(false);
      dispatch(
        showNotification({ message: "Profile updated", type: "success" }),
      );
    } catch (error: any) {
      console.error("Save error:", error);
      setSaveError(
        error.data?.message || error.message || "Failed to save profile",
      );
      dispatch(
        showNotification({
          message: "Failed to update profile",
          type: "error",
        }),
      );
    } finally {
      setIsSaving(false);
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
        <div className="text-gray-500 dark:text-neutral-400">
          Not authenticated
        </div>
      </div>
    );
  }

  const { userDetails, userSub } = authData;

  return (
    <div className="p-8">
      <Header name="Profile" />

      <ImageCropModal
        isOpen={!!cropImageSrc}
        onClose={() => setCropImageSrc(null)}
        imageSrc={cropImageSrc || ""}
        onCropComplete={handleCropComplete}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="dark:bg-dark-secondary rounded-lg bg-white p-6 shadow">
            {/* Avatar with Upload */}
            <div className="mb-6 flex flex-col items-center">
              <div className="relative mb-4">
                {userDetails?.userId && userDetails?.profilePictureExt ? (
                  <S3Image
                    s3Key={`users/${userDetails.userId}/profile.${userDetails.profilePictureExt}`}
                    alt={userDetails.username || "Profile"}
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-full object-cover"
                    version={imageVersion}
                    priority
                  />
                ) : (
                  <div className="dark:bg-dark-tertiary flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
                    <User className="h-12 w-12 text-gray-400 dark:text-neutral-500" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="dark:ring-dark-secondary absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg ring-2 ring-white transition-colors hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {userDetails?.fullName ||
                  userDetails?.username ||
                  "Unknown User"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                {userDetails?.email || "No email"}
              </p>
              {uploadError && (
                <p className="mt-2 text-sm text-red-500">{uploadError}</p>
              )}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="dark:border-dark-tertiary dark:hover:bg-dark-tertiary flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-neutral-300"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Account Details */}
        <div className="lg:col-span-2">
          <div className="dark:bg-dark-secondary rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Account Details
              </h3>
              {!isEditing ? (
                <button
                  onClick={handleStartEdit}
                  className="dark:hover:bg-dark-tertiary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-neutral-400"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="dark:hover:bg-dark-tertiary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-neutral-400"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save
                  </button>
                </div>
              )}
            </div>

            {saveError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {saveError}
              </div>
            )}

            <div className="space-y-4">
              {/* Full Name - editable */}
              <div className="dark:bg-dark-tertiary flex items-center gap-3 rounded-lg bg-gray-50 p-4">
                <User className="h-5 w-5 shrink-0 text-gray-500 dark:text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Full Name
                  </p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="dark:border-dark-secondary dark:bg-dark-secondary mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:text-white"
                    />
                  ) : (
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {userDetails?.fullName || "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* Username - read-only (synced from Cognito) */}
              <div className="dark:bg-dark-tertiary flex items-center gap-3 rounded-lg bg-gray-50 p-4">
                <User className="h-5 w-5 shrink-0 text-gray-500 dark:text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Username
                  </p>
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {userDetails?.username || "—"}
                  </p>
                </div>
              </div>

              {/* Email - read-only (synced from Cognito) */}
              <div className="dark:bg-dark-tertiary flex items-center gap-3 rounded-lg bg-gray-50 p-4">
                <Mail className="h-5 w-5 shrink-0 text-gray-500 dark:text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Email
                  </p>
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {userDetails?.email || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

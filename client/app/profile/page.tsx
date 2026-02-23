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
import {
  signOut,
  updateUserAttributes,
  confirmUserAttribute,
} from "aws-amplify/auth";
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

  // Per-field edit state
  const [editingField, setEditingField] = useState<"name" | "email" | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Email verification state
  const [pendingEmailVerification, setPendingEmailVerification] =
    useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Initialize form when user data loads
  useEffect(() => {
    if (authData?.userDetails) {
      setEditFullName(authData.userDetails.fullName || "");
      setEditEmail(authData.userDetails.email || "");
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
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError((error as Error).message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartEditName = () => {
    setEditingField("name");
    setSaveError(null);
    setEditFullName(authData?.userDetails?.fullName || "");
  };

  const handleStartEditEmail = () => {
    setEditingField("email");
    setSaveError(null);
    setEditEmail(authData?.userDetails?.email || "");
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setSaveError(null);
    if (authData?.userDetails) {
      setEditFullName(authData.userDetails.fullName || "");
      setEditEmail(authData.userDetails.email || "");
    }
  };

  const handleSaveName = async () => {
    if (!authData?.userSub) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      await updateUserAttributes({ userAttributes: { name: editFullName } });
      await updateProfile({
        cognitoId: authData.userSub,
        fullName: editFullName || undefined,
      }).unwrap();

      refetch();
      setEditingField(null);
      dispatch(showNotification({ message: "Name updated", type: "success" }));
    } catch (error) {
      console.error("Save error:", error);
      const err = error as { data?: { message?: string }; message?: string };
      setSaveError(err.data?.message || err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!authData?.userSub) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      await updateUserAttributes({ userAttributes: { email: editEmail } });

      // Cognito sends a verification code
      setPendingEmailVerification(true);
      setVerificationCode("");
      setVerifyError(null);
      setEditingField(null);
      dispatch(
        showNotification({
          message: "Verification code sent to your new email",
          type: "success",
        }),
      );
    } catch (error) {
      console.error("Save error:", error);
      const err = error as { data?: { message?: string }; message?: string };
      setSaveError(
        err.data?.message || err.message || "Failed to update email",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!authData?.userSub || !verificationCode) return;

    setIsVerifying(true);
    setVerifyError(null);

    try {
      await confirmUserAttribute({
        userAttributeKey: "email",
        confirmationCode: verificationCode,
      });

      // Now update the DB with the verified email
      await updateProfile({
        cognitoId: authData.userSub,
        email: editEmail,
      }).unwrap();

      refetch();
      setPendingEmailVerification(false);
      dispatch(
        showNotification({
          message: "Email verified and updated",
          type: "success",
        }),
      );
    } catch (error) {
      console.error("Verification error:", error);
      const err = error as { message?: string };
      setVerifyError(err.message || "Invalid verification code");
    } finally {
      setIsVerifying(false);
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

  const { userDetails } = authData;

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
          <div className="rounded-lg bg-white p-6 shadow dark:bg-dark-secondary">
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
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-tertiary">
                    <User className="h-12 w-12 text-gray-400 dark:text-neutral-500" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-800 text-white shadow-lg ring-2 ring-white transition-colors hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-800 dark:ring-dark-secondary dark:hover:bg-gray-200"
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-dark-tertiary dark:text-neutral-300 dark:hover:bg-dark-tertiary"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Account Details */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow dark:bg-dark-secondary">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Account Details
              </h3>
            </div>

            {saveError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {saveError}
              </div>
            )}

            <div className="space-y-4">
              {/* Full Name - editable */}
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-tertiary">
                <User className="h-5 w-5 shrink-0 text-gray-500 dark:text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Full Name
                  </p>
                  {editingField === "name" ? (
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-dark-secondary dark:bg-dark-secondary dark:text-white"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={isSaving}
                        className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/20"
                        title="Save"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-secondary"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {userDetails?.fullName || "—"}
                    </p>
                  )}
                </div>
                {editingField !== "name" && (
                  <button
                    onClick={handleStartEditName}
                    className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-secondary dark:hover:text-neutral-300"
                    title="Edit name"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Username - read-only (synced from Cognito) */}
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-tertiary">
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

              {/* Email - editable */}
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-dark-tertiary">
                <Mail className="h-5 w-5 shrink-0 text-gray-500 dark:text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Email
                  </p>
                  {editingField === "email" ? (
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-dark-secondary dark:bg-dark-secondary dark:text-white"
                      />
                      <button
                        onClick={handleSaveEmail}
                        disabled={isSaving}
                        className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/20"
                        title="Save"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-secondary"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {userDetails?.email || "—"}
                    </p>
                  )}
                </div>
                {editingField !== "email" && !pendingEmailVerification && (
                  <button
                    onClick={handleStartEditEmail}
                    className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-secondary dark:hover:text-neutral-300"
                    title="Edit email"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Email verification code */}
              {pendingEmailVerification && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="mb-2 text-sm text-amber-800 dark:text-amber-300">
                    A verification code was sent to {editEmail}. Enter it below
                    to confirm your new email.
                  </p>
                  {verifyError && (
                    <p className="mb-2 text-sm text-red-600 dark:text-red-400">
                      {verifyError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Verification code"
                      className="flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white"
                    />
                    <button
                      onClick={handleVerifyEmail}
                      disabled={isVerifying || !verificationCode}
                      className="rounded bg-gray-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
                    >
                      {isVerifying ? "Verifying..." : "Verify"}
                    </button>
                    <button
                      onClick={() => {
                        setPendingEmailVerification(false);
                        setEditEmail(authData?.userDetails?.email || "");
                      }}
                      className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-dark-tertiary dark:text-neutral-400 dark:hover:bg-dark-tertiary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

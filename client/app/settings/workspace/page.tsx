"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import { useWorkspace } from "@/lib/useWorkspace";
import {
  useGetWorkspacesQuery,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useUpdateWorkspaceIconMutation,
  useUpdateWorkspaceHeaderMutation,
  useGetPresignedUploadUrlMutation,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/usePermissions";
import S3Image from "@/components/S3Image";
import ImageCropModal from "@/components/ImageCropModal";
import { Building2, Camera, ImageIcon } from "lucide-react";

const WorkspaceSettingsPage = () => {
  const { activeWorkspaceId, setWorkspace } = useWorkspace();
  const { data: authData } = useAuthUser();
  const userId = authData?.userDetails?.userId;
  const router = useRouter();

  const { data: workspaces } = useGetWorkspacesQuery(userId!, {
    skip: !userId,
  });
  const [updateWorkspace, { isLoading: isSaving }] =
    useUpdateWorkspaceMutation();
  const [deleteWorkspace, { isLoading: isDeleting }] =
    useDeleteWorkspaceMutation();
  const [updateWorkspaceIcon] = useUpdateWorkspaceIconMutation();
  const [updateWorkspaceHeader] = useUpdateWorkspaceHeaderMutation();
  const [getPresignedUploadUrl] = useGetPresignedUploadUrlMutation();

  const activeWorkspace = workspaces?.find((w) => w.id === activeWorkspaceId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinPolicy, setJoinPolicy] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"icon" | "header">("icon");
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);
  const [iconVersion, setIconVersion] = useState(0);
  const [headerVersion, setHeaderVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerFileInputRef = useRef<HTMLInputElement>(null);

  const hasUnsavedChanges =
    !!activeWorkspace &&
    (name !== activeWorkspace.name ||
      description !== (activeWorkspace.description || "") ||
      joinPolicy !== (activeWorkspace.joinPolicy ?? 0));

  const { canEditInfo, canDelete } = usePermissions();

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name);
      setDescription(activeWorkspace.description || "");
      setJoinPolicy(activeWorkspace.joinPolicy ?? 0);
    }
  }, [activeWorkspace]);

  const handleSave = async () => {
    if (!activeWorkspaceId || !name.trim() || !userId) return;
    try {
      await updateWorkspace({
        workspaceId: activeWorkspaceId,
        userId,
        name: name.trim(),
        description: description.trim() || undefined,
        joinPolicy,
      }).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to update workspace:", err);
    }
  };

  const handleDelete = async () => {
    if (!activeWorkspaceId || !userId) return;
    try {
      await deleteWorkspace({ workspaceId: activeWorkspaceId, userId }).unwrap();
      setWorkspace(null);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to delete workspace:", err);
    }
  };

  const handleIconFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropTarget("icon");
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleHeaderFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 1 * 1024 * 1024) {
      alert("Header image must be under 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropTarget("header");
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (headerFileInputRef.current) headerFileInputRef.current.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropImageSrc(null);
    if (!activeWorkspaceId || !userId) return;

    if (cropTarget === "icon") {
      setIsUploadingIcon(true);
      try {
        const ext = "jpg";
        const s3Key = `workspaces/${activeWorkspaceId}/icon.${ext}`;
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
        await updateWorkspaceIcon({
          workspaceId: activeWorkspaceId,
          iconExt: ext,
          userId,
        }).unwrap();
        setIconVersion((v) => v + 1);
      } catch (err) {
        console.error("Failed to upload workspace icon:", err);
      } finally {
        setIsUploadingIcon(false);
      }
    } else {
      setIsUploadingHeader(true);
      try {
        const ext = "jpg";
        const s3Key = `workspaces/${activeWorkspaceId}/header.${ext}`;
        const { url } = await getPresignedUploadUrl({
          key: s3Key,
          contentType: "image/jpeg",
        }).unwrap();
        const uploadResponse = await fetch(url, {
          method: "PUT",
          body: croppedBlob,
          headers: { "Content-Type": "image/jpeg" },
        });
        if (!uploadResponse.ok) throw new Error("Failed to upload header");
        await updateWorkspaceHeader({
          workspaceId: activeWorkspaceId,
          headerExt: ext,
          userId,
        }).unwrap();
        setHeaderVersion((v) => v + 1);
      } catch (err) {
        console.error("Failed to upload workspace header:", err);
      } finally {
        setIsUploadingHeader(false);
      }
    }
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  if (!activeWorkspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500 dark:text-neutral-400">
          Loading workspace settings...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-8">
      <div className="mt-6 max-w-lg space-y-6">
        {/* Workspace Icon + Title */}
        <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {activeWorkspace.iconExt ? (
                <S3Image
                  s3Key={`workspaces/${activeWorkspace.id}/icon.${activeWorkspace.iconExt}`}
                  alt={activeWorkspace.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-xl object-cover"
                  fallbackType="image"
                  version={iconVersion}
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-200 dark:bg-dark-tertiary">
                  <Building2 className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
              )}
              {canEditInfo && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingIcon}
                  className="absolute -bottom-1 -right-1 rounded-full bg-gray-800 p-1.5 text-white shadow hover:bg-gray-700 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
                >
                  <Camera className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{activeWorkspace.name}</h1>
              {isUploadingIcon && (
                <span className="text-sm text-gray-500 dark:text-neutral-400">Uploading icon...</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleIconFileSelect}
              className="hidden"
            />
        </div>
        {/* Crop Modal */}
        {cropImageSrc && (
          <ImageCropModal
            isOpen={!!cropImageSrc}
            onClose={() => setCropImageSrc(null)}
            imageSrc={cropImageSrc}
            onCropComplete={handleCropComplete}
            aspectRatio={cropTarget === "header" ? 16 / 5 : 1}
            cropShape={cropTarget === "header" ? "rect" : "round"}
          />
        )}

        {/* Hero Header */}
        <div>
          <div
            className="relative cursor-pointer overflow-hidden rounded-lg"
            onClick={() => canEditInfo && headerFileInputRef.current?.click()}
          >
            {activeWorkspace.headerExt ? (
              <S3Image
                s3Key={`workspaces/${activeWorkspace.id}/header.${activeWorkspace.headerExt}`}
                alt="Workspace header"
                width={512}
                height={160}
                className="h-28 w-full rounded-lg object-cover"
                fallbackType="image"
                version={headerVersion}
              />
            ) : (
              <div className="flex h-28 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-stroke-dark dark:bg-dark-tertiary">
                <div className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-xs">Add hero header</span>
                </div>
              </div>
            )}
            {canEditInfo && activeWorkspace.headerExt && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all hover:bg-black/30 hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </div>
            )}
            {isUploadingHeader && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-sm text-white">Uploading...</span>
              </div>
            )}
          </div>
          <input
            ref={headerFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleHeaderFileSelect}
            className="hidden"
          />
        </div>

        <div>
          <input
            type="text"
            className={inputStyles}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
          />
        </div>
        <div>
          <textarea
            className={`${inputStyles} min-h-[100px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this workspace is for..."
          />
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500 dark:text-neutral-400">
            Controls how new members can join this workspace.
          </p>
          <div className="flex flex-col gap-2">
            {[
              { value: 0, label: "Invite Only", desc: "Members can only join via invitation" },
              { value: 1, label: "Apply to Join", desc: "Users can request to join, admins approve" },
              { value: 2, label: "Discoverable", desc: "Anyone can find and join this workspace" },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                  joinPolicy === option.value
                    ? "border-gray-800 bg-gray-50 dark:border-white dark:bg-dark-tertiary"
                    : "border-gray-200 hover:bg-gray-50 dark:border-stroke-dark dark:hover:bg-dark-tertiary"
                }`}
              >
                <input
                  type="radio"
                  name="joinPolicy"
                  value={option.value}
                  checked={joinPolicy === option.value}
                  onChange={() => setJoinPolicy(option.value)}
                  className="mt-0.5 h-4 w-4"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    {option.desc}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
        {canEditInfo && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!name.trim() || isSaving || !hasUnsavedChanges}
              className={`rounded bg-gray-800 px-4 py-2 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
                !name.trim() || isSaving || !hasUnsavedChanges ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            {hasUnsavedChanges && (
              <button
                onClick={() => {
                  setName(activeWorkspace.name);
                  setDescription(activeWorkspace.description || "");
                  setJoinPolicy(activeWorkspace.joinPolicy ?? 0);
                }}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-stroke-dark dark:text-gray-400 dark:hover:bg-dark-tertiary"
              >
                Reset
              </button>
            )}
            {saved && (
              <span className="text-sm text-green-600 dark:text-green-400">
                Saved
              </span>
            )}
          </div>
        )}

        {/* Danger Zone */}
        {canDelete && (
          <div className="mt-10 border-t border-gray-200 pt-6 dark:border-stroke-dark">
            <h3 className="text-sm font-medium text-red-600 dark:text-red-400">
              Danger Zone
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              Deleting a workspace removes all its boards, tasks, sprints, and
              tags permanently.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-3 rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Delete Workspace
              </button>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={`rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 ${
                    isDeleting ? "cursor-not-allowed opacity-50" : ""
                  }`}
                >
                  {isDeleting ? "Deleting..." : "Yes, delete this workspace"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceSettingsPage;

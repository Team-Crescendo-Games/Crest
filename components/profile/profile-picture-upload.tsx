"use client";

import { useState, useRef } from "react";
import { Camera } from "lucide-react";
import { updateProfilePicture } from "@/lib/actions/user";
import Image from "next/image";

export function ProfilePictureUpload({
  currentImage,
  userName,
}: {
  currentImage: string | null;
  userName: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => {
    if (!currentImage) return null;
    // currentImage may be a raw S3 key (new format) or a full URL (legacy)
    const match = currentImage.match(/avatars\/([^/]+)\//);
    return match ? `/api/profile-picture/${match[1]}` : null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Get presigned URL from our API
      const presignRes = await fetch("/api/profile-picture/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: file.type, fileSize: file.size }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error);

      // Upload directly to S3
      const uploadRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      // Save the S3 key to the user profile (key is stable; public URL may vary by env)
      const formData = new FormData();
      formData.set("imageUrl", presignData.key);
      const result = await updateProfilePicture(null, formData);
      if (result?.error) throw new Error(result.error);

      // Use proxy URL for preview
      const match = presignData.key.match(/avatars\/([^/]+)\//);
      setPreviewUrl(match ? `/api/profile-picture/${match[1]}` : presignData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const initial = userName?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="relative">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-border transition-colors hover:border-accent/40 disabled:opacity-50"
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={userName ?? "Profile"}
            width={64}
            height={64}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-accent/10 font-mono text-xl font-bold text-accent">
            {initial}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/60 opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          ) : (
            <Camera size={18} className="text-fg-primary" />
          )}
        </div>
      </button>

      {error && <p className="mt-1 text-[10px] text-accent-emphasis">{error}</p>}
    </div>
  );
}

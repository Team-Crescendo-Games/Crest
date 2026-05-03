"use client";

import { useState, useRef } from "react";
import { Paperclip, Upload, Trash2, FileText, Image as ImageIcon, File, X } from "lucide-react";

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  uploadedBy: { name: string | null };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon size={14} />;
  if (mimeType === "application/pdf") return <FileText size={14} />;
  return <File size={14} />;
}

export function AttachmentSection({
  taskId,
  attachments: initialAttachments,
}: {
  taskId: string;
  attachments: Attachment[];
}) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function openAttachment(attachmentId: string) {
    setLoadingId(attachmentId);
    try {
      const res = await fetch(`/api/attachments/${attachmentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get download URL");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open file");
    } finally {
      setLoadingId(null);
    }
  }

  async function uploadFile(file: globalThis.File) {
    setError(null);
    setUploading(true);

    try {
      // Step 1: Get presigned URL
      const presignRes = await fetch("/api/attachments/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(presignData.error || "Failed to get upload URL");
      }

      // Step 2: Upload directly to S3
      const uploadRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Content-Length": file.size.toString(),
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // Step 3: Save metadata
      const saveRes = await fetch("/api/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          fileName: file.name,
          fileUrl: presignData.publicUrl,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData.error || "Failed to save attachment");
      }

      // Add to local state
      setAttachments((prev) => [
        ...prev,
        {
          ...saveData.attachment,
          uploadedBy: { name: "You" },
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteAttachment(attachmentId: string) {
    if (!confirm("Delete this attachment?")) return;

    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) uploadFile(files[0]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) uploadFile(files[0]);
    // Reset input so the same file can be selected again
    e.target.value = "";
  }

  return (
    <div>
      <h3 className="flex items-center gap-2 font-mono text-xs font-medium text-fg-secondary">
        <Paperclip size={13} className="text-accent" />
        Attachments
        <span className="text-[11px] text-fg-muted">({attachments.length})</span>
      </h3>

      {error && (
        <div className="mt-2 flex items-center justify-between alert-error">
          {error}
          <button onClick={() => setError(null)}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Upload area */}
      <div
        className={`mt-3 cursor-pointer rounded-md border-2 border-dashed p-2.5 text-center transition-colors ${
          dragOver ? "border-accent/50 bg-accent/5" : "border-border hover:border-accent/30 hover:bg-accent/5"
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-xs text-fg-muted">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            Uploading...
          </div>
        ) : (
          <div>
            <Upload size={14} className="mx-auto text-fg-muted" />
            <p className="mt-1 text-[11px] text-fg-muted">
              Drop a file or <span className="font-medium text-accent">browse</span>: Max 10 MB
            </p>
          </div>
        )}
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between rounded-md border border-border bg-bg-elevated/60 px-3 py-2 backdrop-blur-sm"
            >
              <button
                onClick={() => openAttachment(att.id)}
                disabled={loadingId === att.id}
                className="flex items-center gap-2 text-xs text-fg-primary hover:text-accent disabled:opacity-50"
              >
                <FileIcon mimeType={att.mimeType} />
                <span className="font-mono">{att.fileName}</span>
                <span className="text-[11px] text-fg-muted">{formatFileSize(att.fileSize)}</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-fg-muted">{att.uploadedBy.name}</span>
                <button
                  onClick={() => deleteAttachment(att.id)}
                  className="rounded p-0.5 text-fg-muted transition-colors hover:text-accent-emphasis"
                  title="Delete attachment"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

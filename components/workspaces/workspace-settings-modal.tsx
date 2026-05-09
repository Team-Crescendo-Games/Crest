"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { WorkspaceSettingsForm } from "@/components/workspaces/settings-form";

interface WorkspaceProps {
  id: string;
  name: string;
  description: string | null;
  joinPolicy: string;
}

interface Props {
  workspace: WorkspaceProps;
  canManage: boolean;
}

export function WorkspaceSettingsModal({ workspace, canManage }: Props) {
  const [open, setOpen] = useState(false);

  if (!canManage) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-fg-secondary transition-colors hover:text-fg-primary"
      >
        <Settings size={12} />
        Settings
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Workspace Settings"
        description="Manage your workspace configuration."
      >
        <WorkspaceSettingsForm workspace={workspace} />
      </Modal>
    </>
  );
}

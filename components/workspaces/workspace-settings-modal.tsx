"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { Tooltip } from "@/components/common/tooltip";
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
      <Tooltip label="Workspace settings">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Workspace settings"
          className="cursor-pointer rounded p-1.5 text-fg-muted transition-colors hover:text-fg-secondary"
        >
          <Settings size={13} />
        </button>
      </Tooltip>

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

"use client";

import Modal from "@/components/Modal";
import {
  useGetDiscoverableWorkspacesQuery,
  useApplyToWorkspaceMutation,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { useState } from "react";
import { Building2, Users, Check, Clock, LogIn } from "lucide-react";
import S3Image from "@/components/S3Image";

type Props = { isOpen: boolean; onClose: () => void };

const ModalFindWorkspaces = ({ isOpen, onClose }: Props) => {
  const { data: authData } = useAuthUser();
  const userId = authData?.userDetails?.userId;

  const { data: workspaces, isLoading } = useGetDiscoverableWorkspacesQuery(
    userId!,
    { skip: !userId || !isOpen },
  );
  const [applyToWorkspace] = useApplyToWorkspaceMutation();
  const [actionState, setActionState] = useState<Record<number, string>>({});

  const handleJoinOrApply = async (wsId: number, joinPolicy: number) => {
    if (!userId) return;
    setActionState((s) => ({ ...s, [wsId]: "loading" }));
    try {
      const result = await applyToWorkspace({
        workspaceId: wsId,
        userId,
      }).unwrap();
      setActionState((s) => ({
        ...s,
        [wsId]: result.joined ? "joined" : "applied",
      }));
    } catch {
      setActionState((s) => ({ ...s, [wsId]: "error" }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Find Workspaces">
      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-neutral-400">
          Loading...
        </p>
      ) : !workspaces || workspaces.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-neutral-400">
          No workspaces available to join right now.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {workspaces.map((ws) => {
            const state = actionState[ws.id];
            return (
              <div
                key={ws.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-stroke-dark"
              >
                {ws.iconExt ? (
                  <S3Image
                    s3Key={`workspaces/${ws.id}/icon.${ws.iconExt}`}
                    alt={ws.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    fallbackType="image"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-dark-tertiary">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {ws.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-neutral-400">
                    <Users className="h-3 w-3" />
                    <span>{ws.memberCount} members</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>{ws.joinPolicy === 2 ? "Open" : "Apply to Join"}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {state === "joined" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Check className="h-3 w-3" /> Joined
                    </span>
                  ) : state === "applied" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Clock className="h-3 w-3" /> Applied
                    </span>
                  ) : ws.hasPendingApplication ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Clock className="h-3 w-3" /> Pending
                    </span>
                  ) : (
                    <button
                      onClick={() => handleJoinOrApply(ws.id, ws.joinPolicy ?? 0)}
                      disabled={state === "loading"}
                      className="inline-flex items-center gap-1 rounded bg-gray-800 px-3 py-1.5 text-xs text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
                    >
                      <LogIn className="h-3 w-3" />
                      {ws.joinPolicy === 2 ? "Join" : "Apply"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default ModalFindWorkspaces;

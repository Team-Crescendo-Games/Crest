"use client";

import Modal from "@/components/Modal";
import {
  useCreateWorkspaceMutation,
  useJoinByInvitationMutation,
  useGetDiscoverableWorkspacesQuery,
  useApplyToWorkspaceMutation,
} from "@/state/api";
import { useState } from "react";
import { useAuthUser } from "@/lib/useAuthUser";
import { useWorkspace } from "@/lib/useWorkspace";
import {
  Plus,
  Search,
  KeyRound,
  Building2,
  Users,
  Check,
  Clock,
  LogIn,
} from "lucide-react";
import S3Image from "@/components/S3Image";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  canCancel?: boolean;
};

type View = "choose" | "create" | "invitation" | "find";

const ModalNewWorkspace = ({ isOpen, onClose, canCancel = true }: Props) => {
  const [createWorkspace, { isLoading }] = useCreateWorkspaceMutation();
  const [joinByInvitation] = useJoinByInvitationMutation();
  const [applyToWorkspace] = useApplyToWorkspaceMutation();
  const { data: authData } = useAuthUser();
  const { setWorkspace } = useWorkspace();
  const userId = authData?.userDetails?.userId;

  const [name, setName] = useState("");
  const [view, setView] = useState<View>("choose");

  // Invitation state
  const [invitationId, setInvitationId] = useState("");
  const [invError, setInvError] = useState("");
  const [invSuccess, setInvSuccess] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Find state
  const { data: discoverableWorkspaces, isLoading: isLoadingDiscover } =
    useGetDiscoverableWorkspacesQuery(userId!, {
      skip: !userId || !isOpen || view !== "find",
    });
  const [actionState, setActionState] = useState<Record<number, string>>({});

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || !userId) return;
    try {
      const newWorkspace = await createWorkspace({
        name: trimmedName,
        userId,
      }).unwrap();
      setWorkspace(newWorkspace.id);
      setName("");
      onClose();
    } catch (error) {
      console.error("Failed to create workspace:", error);
    }
  };

  const handleJoinByInvitation = async () => {
    const trimmed = invitationId.trim();
    if (!trimmed || !userId) return;
    setInvError("");
    setInvSuccess("");
    setIsJoining(true);
    try {
      const result = await joinByInvitation({
        invitationId: trimmed,
        userId,
      }).unwrap();
      setInvSuccess(`Joined "${result.workspaceName}"!`);
      setWorkspace(result.workspaceId);
      setTimeout(() => resetAndClose(), 1500);
    } catch (err) {
      setInvError(
        (err as { data?: { error?: string } })?.data?.error ||
          "Failed to join workspace",
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinOrApply = async (wsId: number) => {
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

  const resetAndClose = () => {
    setName("");
    setInvitationId("");
    setInvError("");
    setInvSuccess("");
    setActionState({});
    setView("choose");
    onClose();
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  const fullName =
    authData?.userDetails?.fullName || authData?.userDetails?.username;

  const modalName =
    view === "choose"
      ? fullName
        ? `Welcome, ${fullName}`
        : "Add a Workspace"
      : view === "create"
        ? "Create Workspace"
        : view === "invitation"
          ? "Join by Invitation"
          : "Find Workspaces";

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      name={modalName}
      hideClose={!canCancel}
    >
      {/* Back button for sub-views */}
      {view !== "choose" && (
        <button
          onClick={() => setView("choose")}
          className="mb-3 cursor-pointer text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back
        </button>
      )}

      {/* CHOOSE view */}
      {view === "choose" && (
        <>
          <div className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
            Get started by choosing how you want to join a workspace.
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setView("create")}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-stroke-dark dark:hover:bg-dark-tertiary"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Create a Workspace
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">
                  Start fresh with your own workspace
                </p>
              </div>
            </button>
            <button
              onClick={() => setView("find")}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-stroke-dark dark:hover:bg-dark-tertiary"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Search className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Find a Workspace
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">
                  Browse and join existing workspaces
                </p>
              </div>
            </button>
            <button
              onClick={() => setView("invitation")}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-stroke-dark dark:hover:bg-dark-tertiary"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <KeyRound className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Join by Invitation
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">
                  Enter an invitation ID from a team member
                </p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* CREATE view */}
      {view === "create" && (
        <>
          <div className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
            Create a new workspace for your team.
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <input
              type="text"
              className={inputStyles}
              placeholder="e.g. Acme Corp, Personal, Side Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className={`flex w-full cursor-pointer justify-center rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 ${
                !name.trim() || isLoading ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              {isLoading ? "Creating..." : "Create Workspace"}
            </button>
          </form>
        </>
      )}

      {/* INVITATION view */}
      {view === "invitation" && (
        <>
          <div className="mb-3 text-sm text-gray-500 dark:text-neutral-400">
            Enter the invitation ID you received from a workspace member.
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleJoinByInvitation();
            }}
          >
            <div className="relative">
              <input
                type="text"
                className={`w-full rounded border p-2 pl-9 shadow-sm focus:outline-none dark:bg-dark-tertiary dark:text-white ${
                  invError
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-500 dark:border-gray-600"
                }`}
                placeholder="e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                value={invitationId}
                onChange={(e) => {
                  setInvitationId(e.target.value);
                  if (invError) setInvError("");
                }}
                autoFocus
              />
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            {invError && <p className="text-sm text-red-500">{invError}</p>}
            {invSuccess && (
              <p className="text-sm text-green-500">{invSuccess}</p>
            )}
            <button
              type="submit"
              disabled={!invitationId.trim() || isJoining || !!invSuccess}
              className={`flex w-full cursor-pointer justify-center rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 ${
                !invitationId.trim() || isJoining || invSuccess
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
            >
              {isJoining ? "Joining..." : "Join Workspace"}
            </button>
          </form>
        </>
      )}

      {/* FIND view */}
      {view === "find" && (
        <>
          {isLoadingDiscover ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-neutral-400">
              Loading...
            </p>
          ) : !discoverableWorkspaces || discoverableWorkspaces.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-neutral-400">
              No workspaces available to join right now.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {discoverableWorkspaces.map((ws) => {
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
                        <span className="text-gray-300 dark:text-gray-600">
                          ·
                        </span>
                        <span>
                          {ws.joinPolicy === 2 ? "Open" : "Apply to Join"}
                        </span>
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
                          onClick={() => handleJoinOrApply(ws.id)}
                          disabled={state === "loading"}
                          className="inline-flex cursor-pointer items-center gap-1 rounded bg-gray-800 px-3 py-1.5 text-xs text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
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
        </>
      )}
    </Modal>
  );
};

export default ModalNewWorkspace;

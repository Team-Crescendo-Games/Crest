import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setActiveWorkspaceId } from "@/state";

export const useWorkspace = () => {
  const dispatch = useAppDispatch();
  const activeWorkspaceId = useAppSelector(
    (state) => state.global.activeWorkspaceId,
  );

  const setWorkspace = (workspaceId: number | null) => {
    dispatch(setActiveWorkspaceId(workspaceId));
  };

  return {
    activeWorkspaceId,
    setWorkspace,
  };
};

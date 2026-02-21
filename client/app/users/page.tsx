"use client";

import { useGetWorkspaceMembersQuery } from "@/state/api";
import Header from "@/components/Header";
import UserCard from "@/components/UserCard";
import { useWorkspace } from "@/lib/useWorkspace";

const Users = () => {
  const { activeWorkspaceId } = useWorkspace();

  // Fetch only members of the current workspace
  const {
    data: members,
    isLoading,
    isError,
  } = useGetWorkspaceMembersQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (isError || !members)
    return <div className="p-8">Error fetching users</div>;

  return (
    <div className="flex w-full flex-col p-8">
      <Header name="Team Directory" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((member) => (
          <UserCard key={member.userId} user={member.user!} />
        ))}
      </div>
    </div>
  );
};

export default Users;

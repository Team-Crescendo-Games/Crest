"use client";

import { useGetUsersQuery } from "@/state/api";
import Header from "@/components/Header";
import UserCard from "@/components/UserCard";

const Users = () => {
  const { data: users, isLoading, isError } = useGetUsersQuery();

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (isError || !users) return <div className="p-8">Error fetching users</div>;

  return (
    <div className="flex w-full flex-col p-8">
      <Header name="Users" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {users.map((user) => (
          <UserCard key={user.userId} user={user} />
        ))}
      </div>
    </div>
  );
};

export default Users;

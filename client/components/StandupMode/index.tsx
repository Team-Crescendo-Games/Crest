"use client";

import { useState, useEffect } from "react";
import { useGetUsersQuery, getUserProfileS3Key, User as UserType } from "@/state/api";
import S3Image from "@/components/S3Image";
import { User, Shuffle } from "lucide-react";
import { SPRINT_MAIN_COLOR } from "@/lib/entityColors";

type Props = {
  selectedUserId: number | null;
  onSelectUser: (userId: number | null) => void;
};

const shuffleArray = <T,>(arr: T[]): T[] => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const StandupMode = ({ selectedUserId, onSelectUser }: Props) => {
  const { data: users = [] } = useGetUsersQuery();
  const [shuffledUsers, setShuffledUsers] = useState<UserType[]>([]);

  // Initialize shuffled list when users load
  useEffect(() => {
    if (users.length > 0 && shuffledUsers.length === 0) {
      setShuffledUsers(shuffleArray(users));
    }
  }, [users, shuffledUsers.length]);

  const handleShuffle = () => {
    setShuffledUsers(shuffleArray(users));
    onSelectUser(null);
  };

  return (
    <div className="flex items-center gap-2 px-4 pt-8 pb-3 xl:px-6">
      <span className="text-xs font-medium tracking-wide text-purple-600 uppercase dark:text-purple-400">
        Standup
      </span>
      <button
        type="button"
        onClick={handleShuffle}
        className="text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
        title="Shuffle order"
      >
        <Shuffle className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSelectUser(null)}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
            selectedUserId === null
              ? "ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-gray-900"
              : "dark:bg-dark-tertiary bg-gray-200 text-gray-600 opacity-50 hover:opacity-80 dark:text-gray-300"
          }`}
          style={
            selectedUserId === null
              ? { backgroundColor: SPRINT_MAIN_COLOR, color: "white" }
              : undefined
          }
          title="Show all tasks"
        >
          All
        </button>
        {shuffledUsers.map((user) => {
          const isSelected = selectedUserId === user.userId;
          const displayName = user.fullName || user.username;
          const s3Key =
            user.profilePictureExt && user.userId
              ? getUserProfileS3Key(user.userId, user.profilePictureExt)
              : undefined;
          return (
            <button
              type="button"
              key={user.userId}
              onClick={() => onSelectUser(user.userId ?? null)}
              className={`group relative z-0 rounded-full transition-all hover:z-20 ${
                isSelected
                  ? "ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-gray-900"
                  : selectedUserId !== null
                    ? "opacity-40 hover:opacity-80"
                    : "hover:opacity-80"
              }`}
              title={displayName}
            >
              <div className="pointer-events-none">
                {s3Key ? (
                  <S3Image
                    s3Key={s3Key}
                    alt={displayName || "User"}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="dark:bg-dark-tertiary flex items-center justify-center rounded-full bg-gray-200"
                    style={{ width: 32, height: 32 }}
                  >
                    <User className="text-gray-500 dark:text-gray-400" size={19} />
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute top-full left-1/2 z-30 mt-1 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                {displayName}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StandupMode;

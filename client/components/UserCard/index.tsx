import { User } from "@/state/api";
import { User as UserIcon } from "lucide-react";
import S3Image from "@/components/S3Image";
import Link from "next/link";

type Props = {
  user: User;
};

const UserCard = ({ user }: Props) => {
  return (
    <Link href={`/users/${user.userId}`}>
      <div className="dark:bg-dark-secondary flex items-center gap-4 rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md">
        {user.userId && user.profilePictureExt ? (
          <S3Image
            s3Key={`users/${user.userId}/profile.${user.profilePictureExt}`}
            alt={user.username}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="dark:bg-dark-tertiary flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <UserIcon className="h-6 w-6 text-gray-500 dark:text-neutral-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {user.fullName || user.username}
          </h3>
          {user.email && (
            <p className="mt-1 truncate text-sm text-gray-500 dark:text-neutral-400">
              {user.email}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default UserCard;

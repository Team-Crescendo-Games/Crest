"use client";

import { useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import S3Image from "@/components/S3Image";
import { getUserProfileS3Key } from "@/state/api";
import { APP_ACCENT_LIGHT } from "@/lib/entityColors";

type UserIconProps = {
  userId?: number;
  username?: string;
  profilePictureExt?: string;
  size?: number;
  className?: string;
  tooltipLabel?: string;
  opacity?: string;
};

const UserIcon = ({
  userId,
  username,
  profilePictureExt,
  size = 32,
  className = "",
  tooltipLabel = "User",
  opacity = "opacity-100",
}: UserIconProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverRingStyle = isHovered ? `0 0 0 2px ${APP_ACCENT_LIGHT}` : "none";

  const content = (
    <div
      className={`group relative ${opacity}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {profilePictureExt && userId ? (
        <S3Image
          s3Key={getUserProfileS3Key(userId, profilePictureExt)}
          alt={username || "User"}
          width={size}
          height={size}
          className={`cursor-pointer rounded-full object-cover transition-all duration-200 ${className}`}
          style={{ boxShadow: hoverRingStyle }}
        />
      ) : (
        <div
          className={`dark:bg-dark-tertiary flex cursor-pointer items-center justify-center rounded-full bg-gray-200 transition-all duration-200 ${className}`}
          style={{ width: size, height: size, boxShadow: hoverRingStyle }}
        >
          <User
            className="text-gray-500 dark:text-gray-400"
            size={size * 0.6}
          />
        </div>
      )}

      {/* Tooltip */}
      <div className="pointer-events-none absolute top-1/2 left-full z-10 ml-2 -translate-y-1/2 transform rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {tooltipLabel}: {username || "Unknown"}
      </div>
    </div>
  );

  // If we have a userId, wrap in Link for navigation
  if (userId) {
    return (
      <Link
        href={`/users/${userId}`}
        className="inline-block"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </Link>
    );
  }

  // Otherwise, just return the content without navigation
  return content;
};

export default UserIcon;

"use client";

import Link from "next/link";
import { User } from "lucide-react";
import S3Image from "@/components/S3Image";
import { getUserProfileS3Key } from "@/state/api";

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
  opacity = "opacity-100"
}: UserIconProps) => {
  const content = (
    <div className={`relative group ${opacity}`}>
      {profilePictureExt && userId ? (
        <S3Image
          s3Key={getUserProfileS3Key(userId, profilePictureExt)}
          alt={username || "User"}
          width={size}
          height={size}
          className={`rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all duration-200 ${className}`}
        />
      ) : (
        <div className={`flex items-center justify-center rounded-full bg-gray-200 dark:bg-dark-tertiary cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all duration-200 ${className}`} style={{ width: size, height: size }}>
          <User className="text-gray-500 dark:text-gray-400" size={size * 0.6} />
        </div>
      )}
      
      {/* Tooltip */}
      <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
        {tooltipLabel}: {username || "Unknown"}
      </div>
    </div>
  );

  // If we have a userId, wrap in Link for navigation
  if (userId) {
    return (
      <Link href={`/users/${userId}`} className="inline-block" onClick={(e) => e.stopPropagation()}>
        {content}
      </Link>
    );
  }

  // Otherwise, just return the content without navigation
  return content;
};

export default UserIcon;
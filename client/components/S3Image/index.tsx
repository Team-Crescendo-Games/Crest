"use client";

import Image from "next/image";
import { useState } from "react";
import { User, FileImage, File } from "lucide-react";
import { useGetPresignedUrlQuery } from "@/state/api";

type FallbackType = "user" | "image" | "file";

type Props = {
  s3Key: string | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackClassName?: string;
  fallbackType?: FallbackType;
};

const S3Image = ({ 
  s3Key, 
  alt, 
  width, 
  height, 
  className, 
  fallbackClassName, 
  fallbackType = "user" 
}: Props) => {
  const [hasError, setHasError] = useState(false);
  const { data, isLoading, error } = useGetPresignedUrlQuery(s3Key!, {
    skip: !s3Key,
  });

  // Choose appropriate fallback icon based on type
  const getFallbackIcon = () => {
    // For large containers (like attachment previews), use a fixed reasonable size
    // For small containers (like profile pictures), scale with container
    const isLargeContainer = width > 100 || height > 100;
    const iconSize = isLargeContainer ? 48 : Math.min(width, height) * 0.6;
    const iconClass = "text-gray-500 dark:text-gray-400";
    
    switch (fallbackType) {
      case "image":
        return <FileImage className={iconClass} size={iconSize} />;
      case "file":
        return <File className={iconClass} size={iconSize} />;
      case "user":
      default:
        return <User className={iconClass} size={iconSize} />;
    }
  };

  // Show fallback if no s3Key, loading, no URL, error from API, or image load error
  if (!s3Key || isLoading || !data?.url || error || hasError) {
    // For large containers (like attachment previews), use a smaller, centered fallback
    const isLargeContainer = width > 100 || height > 100;
    const fallbackWidth = isLargeContainer ? 120 : width;
    const fallbackHeight = isLargeContainer ? 80 : height;
    
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height }}
      >
        <div 
          className={fallbackClassName || `flex items-center justify-center rounded-lg bg-gray-200 dark:bg-dark-tertiary ${className}`} 
          style={{ width: fallbackWidth, height: fallbackHeight }}
        >
          {getFallbackIcon()}
        </div>
      </div>
    );
  }

  return (
    <Image
      src={data.url}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
      onError={() => setHasError(true)}
    />
  );
};

export default S3Image;

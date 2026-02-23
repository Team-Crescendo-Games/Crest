"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
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
  version?: number; // Cache buster - change to force refetch
  style?: React.CSSProperties;
  priority?: boolean;
};

// Cache for presigned URLs
// Key: s3Key, Value: { url: string, expiresAt: number }
const presignedUrlCache = new Map<string, { url: string; expiresAt: number }>();

// Presigned URL cache duration: 50 minutes (URLs typically expire in 1 hour)
const PRESIGNED_CACHE_DURATION_MS = 50 * 60 * 1000;

// Get cached presigned URL if still valid
const getCachedPresignedUrl = (s3Key: string): string | null => {
  const cached = presignedUrlCache.get(s3Key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }
  if (cached) {
    presignedUrlCache.delete(s3Key);
  }
  return null;
};

// Store presigned URL in cache
const setCachedPresignedUrl = (s3Key: string, url: string): void => {
  presignedUrlCache.set(s3Key, {
    url,
    expiresAt: Date.now() + PRESIGNED_CACHE_DURATION_MS,
  });
};

const S3Image = ({
  s3Key,
  alt,
  width,
  height,
  className,
  fallbackClassName,
  fallbackType = "user",
  version = 0,
  style,
  priority,
}: Props) => {
  const [hasError, setHasError] = useState(false);

  // Check cache first
  const cachedPresignedUrl = s3Key ? getCachedPresignedUrl(s3Key) : null;
  const shouldFetchPresigned = !cachedPresignedUrl && !!s3Key;

  const { data, isLoading, error } = useGetPresignedUrlQuery(s3Key!, {
    skip: !shouldFetchPresigned,
    refetchOnMountOrArgChange: version,
  });

  // Cache presigned URL when received
  useEffect(() => {
    if (data?.url && s3Key) {
      setCachedPresignedUrl(s3Key, data.url);
    }
  }, [data?.url, s3Key]);

  // Handle version change (cache bust)
  useEffect(() => {
    if (version > 0 && s3Key) {
      presignedUrlCache.delete(s3Key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasError(false);
    }
  }, [version, s3Key]);

  // Determine the final URL to use
  const imageUrl = data?.url || cachedPresignedUrl;

  // Choose appropriate fallback icon based on type
  const getFallbackIcon = () => {
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

  // Show fallback if no s3Key, loading, no URL, error, or image load error
  const showFallback =
    !s3Key ||
    (isLoading && !cachedPresignedUrl) ||
    !imageUrl ||
    error ||
    hasError;

  if (showFallback) {
    const isLargeContainer = width > 100 || height > 100;
    const fallbackWidth = isLargeContainer ? 120 : width;
    const fallbackHeight = isLargeContainer ? 80 : height;

    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height }}
      >
        <div
          className={
            fallbackClassName ||
            `flex items-center justify-center rounded-lg bg-gray-200 dark:bg-dark-tertiary ${className}`
          }
          style={{ width: fallbackWidth, height: fallbackHeight }}
        >
          {getFallbackIcon()}
        </div>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ width, height, ...style }}
      unoptimized
      priority={priority}
      onError={() => setHasError(true)}
    />
  );
};

export default S3Image;

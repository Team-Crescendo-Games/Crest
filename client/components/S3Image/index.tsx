"use client";

import Image from "next/image";
import { useGetPresignedUrlQuery } from "@/state/api";

type Props = {
  s3Key: string | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackClassName?: string;
};

const S3Image = ({ s3Key, alt, width, height, className, fallbackClassName }: Props) => {
  const { data, isLoading } = useGetPresignedUrlQuery(s3Key!, {
    skip: !s3Key,
  });

  if (!s3Key || isLoading || !data?.url) {
    return (
      <div 
        className={fallbackClassName || `rounded-full bg-gray-200 dark:bg-dark-tertiary ${className}`} 
        style={{ width, height }} 
      />
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
    />
  );
};

export default S3Image;

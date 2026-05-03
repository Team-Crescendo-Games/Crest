import Image from "next/image";

interface UserAvatarProps {
  name: string | null | undefined;
  image: string | null | undefined;
  size?: number;
  className?: string;
}

/**
 * Convert a raw S3 image URL to our proxy endpoint URL.
 * Extracts the userId from the key pattern avatars/{userId}/...
 */
function toProxyUrl(image: string | null | undefined): string | null {
  if (!image) return null;
  const match = image.match(/avatars\/([^/]+)\//);
  if (match) return `/api/profile-picture/${match[1]}`;
  return image; // fallback for non-S3 URLs (e.g. OAuth provider images)
}

/**
 * Reusable avatar component. Shows the profile picture if available,
 * otherwise shows the first letter of the name on an accent background.
 */
export function UserAvatar({
  name,
  image,
  size = 28,
  className = "",
}: UserAvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";
  const fontSize =
    size <= 20 ? "text-[8px]" : size <= 28 ? "text-xs" : "text-sm";
  const src = toProxyUrl(image);

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? "User"}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-accent/10 font-mono font-bold text-accent ${fontSize}`}
        >
          {initial}
        </div>
      )}
    </div>
  );
}

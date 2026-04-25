import Image from "next/image";

interface UserAvatarProps {
  name: string | null | undefined;
  image: string | null | undefined;
  size?: number;
  className?: string;
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

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {image ? (
        <Image
          src={image}
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

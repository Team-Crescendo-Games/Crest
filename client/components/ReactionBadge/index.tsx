"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getEmojiSrc, getEmojiLabel } from "@/lib/emojiConstants";

interface ReactionUser {
  userId: number;
  username: string;
}

interface ReactionBadgeProps {
  emoji: string;
  count: number;
  users: ReactionUser[];
  isReactedByCurrentUser: boolean;
  onClick: () => void;
}

const ReactionBadge = ({
  emoji,
  count,
  users,
  isReactedByCurrentUser,
  onClick,
}: ReactionBadgeProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAppeared, setHasAppeared] = useState(false);
  const emojiSrc = getEmojiSrc(emoji);
  const emojiLabel = getEmojiLabel(emoji);

  // Trigger appear animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setHasAppeared(true), 10);
    return () => clearTimeout(timer);
  }, []);

  if (!emojiSrc) return null;

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    onClick();
  };

  return (
    <div
      className="relative"
      style={{
        opacity: hasAppeared ? 1 : 0,
        transform: hasAppeared ? "scale(1)" : "scale(0.5)",
        transition:
          "opacity 0.2s ease-out, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-all ${
          isReactedByCurrentUser
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-tertiary dark:text-gray-400 dark:hover:bg-gray-600"
        } ${isAnimating ? "scale-125" : "scale-100"}`}
        style={{
          transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <Image
          src={emojiSrc}
          alt={emojiLabel || emoji}
          width={16}
          height={16}
          className={`h-4 w-4 rounded object-cover transition-transform ${isAnimating ? "rotate-12" : ""}`}
          style={{ transition: "transform 0.15s ease-out" }}
        />
        <span>{count}</span>
      </button>

      {/* Tooltip showing usernames */}
      {showTooltip && users.length > 0 && (
        <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-gray-700">
          {users.map((u) => u.username).join(", ")}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      )}
    </div>
  );
};

export default ReactionBadge;

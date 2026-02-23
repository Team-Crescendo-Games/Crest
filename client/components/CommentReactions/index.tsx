"use client";

import { useState, useMemo, useRef } from "react";
import { Smile } from "lucide-react";
import EmojiPicker from "@/components/EmojiPicker";
import ReactionBadge from "@/components/ReactionBadge";
import {
  CommentReaction,
  GroupedReaction,
  useToggleReactionMutation,
} from "@/state/api";

interface CommentReactionsProps {
  commentId: number;
  reactions: CommentReaction[];
  currentUserId: number | undefined;
  /** Hide the inline add button (use when FloatingReactionButton is used separately) */
  hideAddButton?: boolean;
}

const CommentReactions = ({
  commentId,
  reactions,
  currentUserId,
  hideAddButton,
}: CommentReactionsProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [toggleReaction] = useToggleReactionMutation();
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Group reactions by emoji and sort by count descending (Requirement 2.5)
  const groupedReactions = useMemo((): GroupedReaction[] => {
    const groups: Record<
      string,
      { users: { userId: number; username: string }[] }
    > = {};

    for (const reaction of reactions) {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = { users: [] };
      }
      if (reaction.user) {
        groups[reaction.emoji].users.push({
          userId: reaction.userId,
          username: reaction.user.username,
        });
      }
    }

    return Object.entries(groups)
      .map(([emoji, data]) => ({
        emoji,
        count: data.users.length,
        users: data.users,
        reactedByCurrentUser: currentUserId
          ? data.users.some((u) => u.userId === currentUserId)
          : false,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [reactions, currentUserId]);

  const handleToggleReaction = async (emoji: string) => {
    if (!currentUserId) return;
    await toggleReaction({ commentId, userId: currentUserId, emoji });
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {/* Existing reaction badges */}
      {groupedReactions.map((group) => (
        <ReactionBadge
          key={group.emoji}
          emoji={group.emoji}
          count={group.count}
          users={group.users}
          isReactedByCurrentUser={group.reactedByCurrentUser}
          onClick={() => handleToggleReaction(group.emoji)}
        />
      ))}

      {/* Add reaction button - inline with badges (hidden when FloatingReactionButton is used) */}
      {!hideAddButton && (
        <div className="relative">
          <button
            ref={triggerRef}
            onClick={() => setShowPicker(!showPicker)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-tertiary dark:hover:text-gray-300"
            title="Add reaction"
          >
            <Smile size={14} />
          </button>

          {showPicker && (
            <EmojiPicker
              onSelect={handleToggleReaction}
              onClose={() => setShowPicker(false)}
              triggerRef={triggerRef}
            />
          )}
        </div>
      )}
    </div>
  );
};

/** Floating add reaction button to be placed on comment bubble corner */
export const FloatingReactionButton = ({
  commentId,
  currentUserId,
  position,
  inline = false,
}: {
  commentId: number;
  currentUserId: number | undefined;
  position: "left" | "right";
  /** When true, renders without absolute positioning (for use in a container) */
  inline?: boolean;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [toggleReaction] = useToggleReactionMutation();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleToggleReaction = async (emoji: string) => {
    if (!currentUserId) return;
    await toggleReaction({ commentId, userId: currentUserId, emoji });
    setShowPicker(false);
  };

  const positionClasses =
    position === "left" ? "-left-2 -top-2" : "-right-2 -top-2";

  const wrapperClasses = inline
    ? "relative"
    : `absolute ${positionClasses} z-10`;

  const buttonClasses = inline
    ? "flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-400 shadow-md hover:bg-gray-100 hover:text-gray-600 dark:bg-dark-secondary dark:hover:bg-dark-tertiary dark:hover:text-gray-300 transition-all duration-200 hover:scale-110"
    : "flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600 dark:bg-dark-secondary dark:hover:bg-dark-tertiary dark:hover:text-gray-300 transition-opacity";

  return (
    <div className={wrapperClasses}>
      <button
        ref={triggerRef}
        onClick={() => setShowPicker(!showPicker)}
        className={buttonClasses}
        title="Add reaction"
      >
        <Smile size={14} />
      </button>

      {showPicker && (
        <EmojiPicker
          onSelect={handleToggleReaction}
          onClose={() => setShowPicker(false)}
          triggerRef={triggerRef}
        />
      )}
    </div>
  );
};

export default CommentReactions;

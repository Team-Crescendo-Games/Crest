"use client";

import { useState, useRef } from "react";
import { MessageSquareMore, CheckCircle } from "lucide-react";
import { format, isToday } from "date-fns";
import S3Image from "@/components/S3Image";
import CommentReactions, { FloatingReactionButton } from "@/components/CommentReactions";
import { 
  Comment, 
  User as UserType, 
  getUserProfileS3Key, 
  useCreateCommentMutation, 
  useToggleReactionMutation, 
  useToggleCommentResolvedMutation 
} from "@/state/api";
import { DEFAULT_QUICK_REACTION } from "@/lib/emojiConstants";

// Format comment timestamp: "1/28/26, 11:56 AM" or just "11:56 AM" if today
const formatCommentTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, "h:mm a");
  }
  return format(date, "M/d/yy, h:mm a");
};

// Render comment text with @mentions as pills
const renderCommentWithMentions = (
  text: string, 
  users: { userId?: number; username: string }[] | undefined
): React.ReactNode => {
  if (!users || users.length === 0) return text;
  
  const usernames = new Set(users.map(u => u.username.toLowerCase()));
  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    const isValidUser = usernames.has(username.toLowerCase());
    
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    if (isValidUser) {
      parts.push(
        <span
          key={match.index}
          className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
        >
          @{username}
        </span>
      );
    } else {
      parts.push(match[0]);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

interface CommentsPanelProps {
  taskId: number;
  comments: Comment[];
  users?: UserType[];
  currentUser?: {
    userId?: number;
    username?: string;
    profilePictureExt?: string;
  };
}

const CommentsPanel = ({ taskId, comments, users, currentUser }: CommentsPanelProps) => {
  const [newComment, setNewComment] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const [createComment, { isLoading: isAddingComment }] = useCreateCommentMutation();
  const [toggleReaction] = useToggleReactionMutation();
  const [toggleCommentResolved] = useToggleCommentResolvedMutation();

  const numberOfComments = comments?.length || 0;

  // Mention helper functions
  const filteredMentionUsers = users?.filter(user => {
    const searchLower = mentionSearch.toLowerCase();
    return user.username.toLowerCase().includes(searchLower) ||
      (user.email?.toLowerCase().includes(searchLower) ?? false);
  }).slice(0, 5) || [];

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setNewComment(value);
    
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(" ")) {
        setMentionStartIndex(lastAtIndex);
        setMentionSearch(textAfterAt);
        setShowMentionDropdown(true);
        return;
      }
    }
    
    setShowMentionDropdown(false);
    setMentionSearch("");
    setMentionStartIndex(null);
  };

  const selectMention = (username: string) => {
    if (mentionStartIndex === null) return;
    
    const beforeMention = newComment.slice(0, mentionStartIndex);
    const afterMention = newComment.slice(mentionStartIndex + mentionSearch.length + 1);
    const newValue = `${beforeMention}@${username} ${afterMention}`;
    
    setNewComment(newValue);
    setShowMentionDropdown(false);
    setMentionSearch("");
    setMentionStartIndex(null);
    commentInputRef.current?.focus();
  };

  const handleSubmitComment = () => {
    if (newComment.trim() && currentUser?.userId && typeof currentUser.userId === 'number') {
      createComment({
        taskId,
        userId: currentUser.userId,
        text: newComment.trim(),
      });
      setNewComment("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionDropdown && filteredMentionUsers.length > 0) {
      if (e.key === "Escape") {
        setShowMentionDropdown(false);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && filteredMentionUsers.length > 0)) {
        e.preventDefault();
        selectMention(filteredMentionUsers[0].username);
        return;
      }
    }
    
    if (e.key === "Enter" && !showMentionDropdown && newComment.trim()) {
      handleSubmitComment();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(70vh-4rem)]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-stroke-dark">
        <MessageSquareMore className="h-4 w-4 text-gray-600 dark:text-neutral-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {numberOfComments} {numberOfComments === 1 ? "comment" : "comments"}
        </span>
      </div>
      
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
        {comments && comments.length > 0 ? (
          comments.map((comment) => {
            const isCurrentUser = comment.user?.userId === currentUser?.userId;
            
            return (
              <div 
                key={comment.id} 
                className="group transition-transform"
                style={{ transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                onDoubleClick={(e) => {
                  if (currentUser?.userId && typeof currentUser.userId === 'number') {
                    const target = e.currentTarget;
                    target.style.transform = "scale(1.02)";
                    setTimeout(() => {
                      target.style.transform = "scale(1)";
                    }, 150);
                    
                    toggleReaction({
                      commentId: comment.id,
                      userId: currentUser.userId,
                      emoji: DEFAULT_QUICK_REACTION,
                    });
                  }
                }}
              >
                <div className="flex gap-2 max-w-[85%]">
                  {comment.user?.profilePictureExt && comment.user?.userId ? (
                    <S3Image
                      s3Key={getUserProfileS3Key(comment.user.userId, comment.user.profilePictureExt)}
                      alt={comment.user.username}
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full object-cover flex-shrink-0 mt-1"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-medium flex-shrink-0 mt-1">
                      {comment.user?.username?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {isCurrentUser ? "You" : (comment.user?.username || "Unknown")}
                      </span>
                      {comment.createdAt && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatCommentTimestamp(comment.createdAt)}
                        </span>
                      )}
                    </div>
                    <div 
                      className={`relative inline-block rounded-2xl px-3 py-2 bg-gray-100 dark:bg-dark-tertiary ${
                        comment.isResolved ? "ring-2 ring-green-500" : ""
                      }`}
                    >
                      {/* Floating buttons on bubble corner */}
                      <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                        <button
                          onClick={() => toggleCommentResolved({ commentId: comment.id })}
                          className={`flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-200 hover:scale-110 ${
                            comment.isResolved
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-white text-gray-400 hover:bg-gray-100 hover:text-green-500 dark:bg-dark-secondary dark:text-gray-500 dark:hover:bg-dark-tertiary dark:hover:text-green-400"
                          }`}
                          title={comment.isResolved ? "Mark as unresolved" : "Mark as resolved"}
                        >
                          <CheckCircle size={14} />
                        </button>
                        <FloatingReactionButton
                          commentId={comment.id}
                          currentUserId={currentUser?.userId}
                          position="right"
                          inline
                        />
                      </div>
                      <p 
                        className="text-sm break-all text-gray-800 dark:text-neutral-200"
                        style={{ overflowWrap: 'anywhere' }}
                      >
                        {renderCommentWithMentions(comment.text, users)}
                      </p>
                    </div>
                    <CommentReactions
                      commentId={comment.id}
                      reactions={comment.reactions || []}
                      currentUserId={currentUser?.userId}
                      hideAddButton
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquareMore className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-neutral-400">No comments yet</p>
            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">Be the first to comment</p>
          </div>
        )}
      </div>
      
      {/* Add comment input */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3 dark:border-stroke-dark">
        <div className="flex gap-2">
          {currentUser?.profilePictureExt && currentUser?.userId ? (
            <S3Image
              s3Key={getUserProfileS3Key(currentUser.userId, currentUser.profilePictureExt)}
              alt="You"
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-400 text-white text-xs font-medium flex-shrink-0">
              {currentUser?.username?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          <div className="flex-1 relative">
            <input
              ref={commentInputRef}
              type="text"
              className="w-full rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-dark-secondary dark:text-white dark:placeholder-gray-500"
              placeholder="Add a comment..."
              value={newComment}
              onChange={handleCommentChange}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                setTimeout(() => setShowMentionDropdown(false), 150);
              }}
            />
            
            {/* Mention dropdown */}
            {showMentionDropdown && filteredMentionUsers.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-secondary z-50">
                {filteredMentionUsers.map((user) => (
                  <button
                    key={user.userId}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectMention(user.username);
                    }}
                  >
                    {user.profilePictureExt && user.userId ? (
                      <S3Image
                        s3Key={getUserProfileS3Key(user.userId, user.profilePictureExt)}
                        alt={user.username}
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.username}
                      </p>
                      {user.email && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {newComment.trim() && (
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setNewComment("")}
                  className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitComment}
                  disabled={isAddingComment || !currentUser?.userId || typeof currentUser?.userId !== 'number'}
                  className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  Comment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsPanel;

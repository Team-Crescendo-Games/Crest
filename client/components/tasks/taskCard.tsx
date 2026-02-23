"use client";

import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import {
  Task,
  Priority,
  useUpdateTaskMutation,
  useGetTagsQuery,
} from "@/state/api";
import { useWorkspace } from "@/lib/useWorkspace";
import { localDateToUTC } from "@/lib/dateUtils";
import { PRIORITY_COLORS_BY_NAME } from "@/lib/priorityColors";
import { APP_ACCENT_LIGHT } from "@/lib/entityColors";
import RadialProgress from "@/components/RadialProgress";
import DatePicker from "@/components/DatePicker";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/dateUtils";
import { MessageSquareMore, X, Plus, Diamond, Calendar } from "lucide-react";
import { Paperclip } from "lucide-react";
import UserIcon from "@/components/UserIcon";

type Props = {
  task: Task;
  onClick?: () => void;
  className?: string;
  highlighted?: boolean;
  collaboratorBorderColor?: string;
};

type DropdownPortalProps = {
  children: React.ReactNode;
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  animate?: boolean;
};

type DropdownPortalHandle = {
  contains: (target: Node) => boolean;
};

const DropdownPortal = forwardRef<DropdownPortalHandle, DropdownPortalProps>(
  ({ children, anchorRef, isOpen, animate = false }, ref) => {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [isVisible, setIsVisible] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Keep mounted while opening/closing animation is in progress
    const shouldRender = animate ? isOpen || isVisible : isOpen;
    const EXIT_ANIMATION_MS = 150; // keep in sync with CSS transition duration

    useImperativeHandle(ref, () => ({
      contains: (target: Node) => contentRef.current?.contains(target) ?? false,
    }));

    useEffect(() => {
      if (isOpen && anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
        });
      }
    }, [isOpen, anchorRef]);

    // Handle animation states without synchronous setState in effect body
    useEffect(() => {
      if (!animate) return;

      let timer: number;
      if (isOpen) {
        timer = window.setTimeout(() => setIsVisible(true), 10); // trigger enter transition
      } else {
        timer = window.setTimeout(() => setIsVisible(false), EXIT_ANIMATION_MS); // unmount after exit
      }

      return () => window.clearTimeout(timer);
    }, [isOpen, animate]);

    if (!shouldRender || typeof document === "undefined") return null;

    const animationStyle = animate
      ? {
          opacity: isVisible ? 1 : 0,
          transform: isVisible
            ? "scale(1) translateY(0)"
            : "scale(0.9) translateY(-4px)",
          transformOrigin: "top left",
          transition:
            "opacity 0.15s ease-out, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }
      : {};

    return createPortal(
      <div
        ref={contentRef}
        style={{
          position: "absolute",
          top: position.top,
          left: position.left,
          zIndex: 50,
          ...animationStyle,
        }}
      >
        {children}
      </div>,
      document.body,
    );
  },
);
DropdownPortal.displayName = "DropdownPortal";

type AnimatedTagPillProps = {
  tag: { id: number; name: string; color?: string | null };
  onRemove: (tagId: number) => void;
  isRemoving?: boolean;
};

const AnimatedTagPill = ({
  tag,
  onRemove,
  isRemoving = false,
}: AnimatedTagPillProps) => {
  const [hasAppeared, setHasAppeared] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasAppeared(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="group flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs"
      style={{
        backgroundColor: tag.color ? `${tag.color}30` : "#e5e7eb",
        color: tag.color || "#374151",
        opacity: hasAppeared && !isRemoving ? 1 : 0,
        transform: hasAppeared && !isRemoving ? "scale(1)" : "scale(0.5)",
        transition:
          "opacity 0.2s ease-out, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <span>{tag.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(tag.id);
        }}
        className="ml-0.5 rounded-full p-0.5 opacity-60 transition-all hover:opacity-100 hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-500"
      >
        <X size={10} />
      </button>
    </div>
  );
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const getAverageTagColor = (task: Task): string | null => {
  const colors = task.taskTags
    ?.map((tt) => tt.tag.color)
    .filter((c): c is string => !!c)
    .map(hexToRgb)
    .filter((c): c is { r: number; g: number; b: number } => c !== null);
  if (!colors || colors.length === 0) return null;
  const avg = {
    r: Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length),
    g: Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length),
    b: Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length),
  };
  return `rgba(${avg.r}, ${avg.g}, ${avg.b}, 0.15)`;
};

const TaskCard = ({
  task,
  onClick,
  className = "",
  highlighted = false,
  collaboratorBorderColor,
}: Props) => {
  const { activeWorkspaceId } = useWorkspace(); // ADDED
  const [updateTask] = useUpdateTaskMutation();

  // Scoped to current workspace
  const { data: allTags } = useGetTagsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });

  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [isHoveringDueDate, setIsHoveringDueDate] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [removingTagIds, setRemovingTagIds] = useState<Set<number>>(new Set());
  const priorityRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const dueDateRef = useRef<HTMLDivElement>(null);
  const priorityPortalRef = useRef<DropdownPortalHandle>(null);
  const tagPortalRef = useRef<DropdownPortalHandle>(null);

  const tags = task.taskTags?.map((tt) => tt.tag) || [];
  const tagIds = tags.map((t) => t.id);
  const avgColor = getAverageTagColor(task);

  const dueDate = task.dueDate
    ? parseLocalDate(task.dueDate.split("T")[0])
    : null;
  const formattedDueDate = dueDate ? format(dueDate, "P") : "";
  const dueDateValue = task.dueDate ? task.dueDate.split("T")[0] : "";
  const numberOfComments = task.comments?.length || 0;
  const numberOfAttachments = task.attachments?.length || 0;
  const subtasks = task.subtasks ?? [];
  const totalCount = subtasks.length;
  const completedCount = subtasks.filter((s) => s.status === "Done").length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        priorityRef.current &&
        !priorityRef.current.contains(target) &&
        !priorityPortalRef.current?.contains(target)
      ) {
        setShowPriorityMenu(false);
      }
      if (
        tagRef.current &&
        !tagRef.current.contains(target) &&
        !tagPortalRef.current?.contains(target)
      ) {
        setShowTagMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePriorityChange = async (priority: Priority | null) => {
    await updateTask({ id: task.id, priority: priority ?? undefined });
    setShowPriorityMenu(false);
  };

  const handleRemoveTag = async (tagId: number) => {
    setRemovingTagIds((prev) => new Set(prev).add(tagId));
    setTimeout(async () => {
      await updateTask({
        id: task.id,
        tagIds: tagIds.filter((id) => id !== tagId),
      });
      setRemovingTagIds((prev) => {
        const next = new Set(prev);
        next.delete(tagId);
        return next;
      });
    }, 200);
  };

  const handleAddTag = async (tagId: number) => {
    await updateTask({ id: task.id, tagIds: [...tagIds, tagId] });
    setShowTagMenu(false);
  };

  const handleDueDateChange = async (newDate: string) => {
    await updateTask({
      id: task.id,
      dueDate: newDate ? localDateToUTC(newDate) : undefined,
    });
    setIsEditingDueDate(false);
  };

  const availableTags = allTags?.filter((t) => !tagIds.includes(t.id)) || [];

  return (
    <div
      onClick={onClick}
      className={`relative flex overflow-hidden rounded-md bg-white shadow transition-all hover:outline-2 hover:outline-gray-300 dark:bg-dark-tertiary dark:hover:outline-gray-600 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        ...(avgColor ? { backgroundColor: avgColor } : {}),
        ...(collaboratorBorderColor
          ? {
              outline: `2.5px solid ${collaboratorBorderColor}`,
              outlineOffset: "-1px",
            }
          : highlighted
            ? {
                outline: `2px solid ${APP_ACCENT_LIGHT}`,
                outlineOffset: "-1px",
              }
            : {}),
      }}
    >
      {/* Priority bar on left side */}
      <div
        ref={priorityRef}
        className="relative w-1.5 shrink-0 cursor-pointer"
        style={{
          backgroundColor: task.priority
            ? `${PRIORITY_COLORS_BY_NAME[task.priority]}99`
            : undefined,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setShowPriorityMenu(!showPriorityMenu);
        }}
        title={task.priority || "Set priority"}
      />
      <DropdownPortal
        ref={priorityPortalRef}
        anchorRef={priorityRef}
        isOpen={showPriorityMenu}
        animate
      >
        <div className="ml-1 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
          {Object.values(Priority).map((p) => (
            <button
              key={p}
              onClick={(e) => {
                e.stopPropagation();
                handlePriorityChange(p);
              }}
              className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-dark-tertiary"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PRIORITY_COLORS_BY_NAME[p] }}
              />
              {p}
            </button>
          ))}
          {task.priority && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePriorityChange(null);
              }}
              className="block w-full px-3 py-1 text-left text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-tertiary"
            >
              Clear
            </button>
          )}
        </div>
      </DropdownPortal>

      {/* Comment indicator triangle */}
      {numberOfComments > 0 && (
        <div
          className="absolute right-0 top-0 h-0 w-0"
          style={{
            borderLeft: "10px solid transparent",
            borderTop: "10px solid rgb(240, 168, 102)",
          }}
          title={`${numberOfComments} comment${numberOfComments > 1 ? "s" : ""}`}
        />
      )}

      <div className="min-w-0 flex-1 overflow-hidden p-2 md:p-2.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="truncate text-sm dark:text-white">{task.title}</h4>
          {typeof task.points === "number" && (
            <div className="flex items-center gap-0.5 text-xs text-gray-400 dark:text-neutral-500">
              {task.points}
              <Diamond size={10} className="fill-current" />
            </div>
          )}
        </div>

        {/* Description preview */}
        {task.description && (
          <p className="mt-0.5 truncate text-xs text-gray-500/70 dark:text-neutral-500/70">
            {task.description}
          </p>
        )}

        {/* Tags with inline edit */}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <AnimatedTagPill
              key={tag.id}
              tag={tag}
              onRemove={handleRemoveTag}
              isRemoving={removingTagIds.has(tag.id)}
            />
          ))}
          <div ref={tagRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTagMenu(!showTagMenu);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-dark-tertiary dark:text-gray-400 dark:hover:bg-gray-600"
            >
              <Plus size={12} />
            </button>
          </div>
          <DropdownPortal
            ref={tagPortalRef}
            anchorRef={tagRef}
            isOpen={showTagMenu && availableTags.length > 0}
            animate
          >
            <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddTag(tag.id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color || "#3b82f6" }}
                  />
                  {tag.name}
                </button>
              ))}
            </div>
          </DropdownPortal>
        </div>

        <div className="mt-2 border-t border-gray-200 dark:border-stroke-dark" />

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {task.taskAssignments?.slice(0, 3).map((ta) => (
                <UserIcon
                  key={ta.userId}
                  userId={ta.user.userId}
                  username={ta.user.username}
                  fullName={ta.user.fullName}
                  profilePictureExt={ta.user.profilePictureExt}
                  size={24}
                  className="ring-2 ring-white dark:ring-dark-tertiary"
                  tooltipLabel="Assignee"
                />
              ))}
              {(task.taskAssignments?.length ?? 0) > 3 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600 dark:border-dark-tertiary dark:bg-dark-surface dark:text-gray-300">
                  +{(task.taskAssignments?.length ?? 0) - 3}
                </div>
              )}
            </div>
            {formattedDueDate && (
              <div
                ref={dueDateRef}
                className="relative"
                onMouseEnter={() => setIsHoveringDueDate(true)}
                onMouseLeave={() =>
                  !isEditingDueDate && setIsHoveringDueDate(false)
                }
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingDueDate(true);
                  }}
                  className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs transition-all ${
                    isHoveringDueDate
                      ? "bg-gray-100 text-gray-700 dark:bg-dark-tertiary dark:text-white"
                      : "text-gray-500 dark:text-neutral-500"
                  }`}
                  title="Click to edit due date"
                >
                  {isHoveringDueDate && <Calendar size={10} />}
                  {formattedDueDate}
                </button>
              </div>
            )}
            <DropdownPortal
              anchorRef={dueDateRef}
              isOpen={isEditingDueDate && !!formattedDueDate}
            >
              <DatePicker
                value={dueDateValue}
                onChange={(date) => handleDueDateChange(date || "")}
                onClose={() => {
                  setIsEditingDueDate(false);
                  setIsHoveringDueDate(false);
                }}
                className="relative mt-0"
              />
            </DropdownPortal>
            {!formattedDueDate && (
              <div
                ref={dueDateRef}
                className="relative"
                onMouseEnter={() => setIsHoveringDueDate(true)}
                onMouseLeave={() =>
                  !isEditingDueDate && setIsHoveringDueDate(false)
                }
              >
                {isHoveringDueDate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingDueDate(true);
                    }}
                    className="flex items-center gap-1 rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-500 dark:bg-dark-tertiary dark:text-neutral-400"
                    title="Set due date"
                  >
                    <Calendar size={10} />
                    Due
                  </button>
                )}
              </div>
            )}
            <DropdownPortal
              anchorRef={dueDateRef}
              isOpen={isEditingDueDate && !formattedDueDate}
            >
              <DatePicker
                value={undefined}
                onChange={(date) => handleDueDateChange(date || "")}
                onClose={() => {
                  setIsEditingDueDate(false);
                  setIsHoveringDueDate(false);
                }}
                className="relative mt-0"
              />
            </DropdownPortal>
          </div>
          <div className="flex items-center gap-2">
            {numberOfAttachments > 0 && (
              <div className="flex items-center text-gray-500 dark:text-neutral-500">
                <Paperclip size={16} />
                <span className="ml-1 text-xs dark:text-neutral-400">
                  {numberOfAttachments}
                </span>
              </div>
            )}
            {numberOfComments > 0 && (
              <div className="flex items-center text-gray-500 dark:text-neutral-500">
                <MessageSquareMore size={16} />
                <span className="ml-1 text-xs dark:text-neutral-400">
                  {numberOfComments}
                </span>
              </div>
            )}
            {totalCount > 0 && (
              <div className="flex items-center gap-1 text-gray-500 dark:text-neutral-500">
                <RadialProgress completed={completedCount} total={totalCount} />
                <span className="text-xs dark:text-neutral-400">
                  {completedCount}/{totalCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;

import { Task } from "@/state/api";
import RadialProgress from "@/components/RadialProgress";
import { format } from "date-fns";
import { MessageSquareMore } from "lucide-react";
import Image from "next/image";

type Props = {
  task: Task;
  onClick?: () => void;
  className?: string;
};

const PriorityTag = ({ priority }: { priority: Task["priority"] }) => (
  <div
    className={`rounded-full px-2 py-1 text-xs font-semibold ${
      priority === "Urgent"
        ? "bg-red-200 text-red-700"
        : priority === "High"
          ? "bg-yellow-200 text-yellow-700"
          : priority === "Medium"
            ? "bg-green-200 text-green-700"
            : priority === "Low"
              ? "bg-gray-300 text-gray-700"
              : "bg-gray-200 text-gray-700"
    }`}
  >
    {priority}
  </div>
);

const TaskCard = ({ task, onClick, className = "" }: Props) => {
  const tags = task.taskTags?.map((tt) => tt.tag.name) || [];

  const formattedDueDate = task.dueDate
    ? format(new Date(task.dueDate), "P")
    : "";

  const numberOfComments = (task.comments && task.comments.length) || 0;

  const subtasks = task.subtasks ?? [];
  const totalCount = subtasks.length;
  const completedCount = subtasks.filter(
    (s) => s.status === "Completed",
  ).length;

  return (
    <div
      onClick={onClick}
      className={`rounded-md bg-white shadow dark:bg-dark-secondary ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="p-2 md:p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold dark:text-white">{task.title}</h4>
            {task.priority && <PriorityTag priority={task.priority} />}
          </div>
          {typeof task.points === "number" && (
            <div className="text-xs font-semibold dark:text-white">
              {task.points} pts
            </div>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <div
                key={tag}
                className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-dark-tertiary"
              >
                {tag}
              </div>
            ))}
          </div>
        )}

        {formattedDueDate && (
          <div className="mt-1.5 text-xs text-gray-500 dark:text-neutral-500">
            DueDate: {formattedDueDate}
          </div>
        )}
        <div className="mt-2 border-t border-gray-200 dark:border-stroke-dark" />

        {/* Users */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex -space-x-1 overflow-hidden">
            {task.assignee && task.assignee.profilePictureUrl && (
              <Image
                key={`assignee-${task.assignee.userId}`}
                src={`https://ninghuax-tm-demo-bucket-us-west-2.s3.us-east-1.amazonaws.com/${task.assignee.profilePictureUrl}`}
                alt={task.assignee.username}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-dark-secondary"
              />
            )}
            {task.author && task.author.profilePictureUrl && (
              <Image
                key={`author-${task.author.userId}`}
                src={`https://ninghuax-tm-demo-bucket-us-west-2.s3.us-east-1.amazonaws.com/${task.author.profilePictureUrl}`}
                alt={task.author.username}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-dark-secondary"
              />
            )}
          </div>
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
  );
};

export default TaskCard;

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Activity } from "@/state/api";
import { formatActivityMessage, formatRelativeTime } from "@/lib/activityUtils";

interface ActivityListProps {
  activities: Activity[];
  initiallyExpanded?: boolean;
}

const ActivityList = ({
  activities,
  initiallyExpanded = false,
}: ActivityListProps) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  // Sort activities by createdAt in descending order (newest first)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const activityCount = activities.length;

  return (
    <div className="w-full">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-dark-tertiary"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Activity ({activityCount})
        </span>
      </button>

      {/* Expanded Activity List */}
      {isExpanded && (
        <div className="mt-2 space-y-2 pl-6">
          {sortedActivities.length > 0 ? (
            sortedActivities.map((activity) => {
              const formattedActivity = formatActivityMessage(activity);
              const relativeTime = formatRelativeTime(activity.createdAt);

              return (
                <div
                  key={activity.id}
                  className="text-sm"
                >
                  {/* Username - high contrast */}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formattedActivity.username}
                  </span>
                  {" "}
                  {/* Action text - grayed */}
                  <span className="text-gray-500 dark:text-gray-400">
                    {formattedActivity.action}
                  </span>
                  {/* Highlighted parts for Move activities (status values) */}
                  {formattedActivity.highlightedParts && (
                    <>
                      {" "}
                      {formattedActivity.highlightedParts.map((part, index) => (
                        <span
                          key={index}
                          className={
                            part.highlight
                              ? "font-medium text-gray-900 dark:text-white"
                              : "text-gray-500 dark:text-gray-400"
                          }
                        >
                          {part.text}
                        </span>
                      ))}
                    </>
                  )}
                  {" · "}
                  {/* Timestamp - faint gray */}
                  <span className="text-gray-400 dark:text-gray-500">
                    {relativeTime}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              No activities yet
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityList;

"use client";

import { Activity } from "@/state/api";
import { formatActivityMessage, formatRelativeTime } from "@/lib/activityUtils";
import CollapsibleSection from "@/components/CollapsibleSection";

interface ActivityListProps {
  activities: Activity[];
  initiallyExpanded?: boolean;
}

const ActivityList = ({
  activities,
  initiallyExpanded = false,
}: ActivityListProps) => {
  // Sort activities by createdAt in descending order (newest first)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <CollapsibleSection
      title="Activities"
      count={activities.length}
      initiallyExpanded={initiallyExpanded}
    >
      <div className="space-y-2">
        {sortedActivities.length > 0 ? (
          sortedActivities.map((activity) => {
            const formattedActivity = formatActivityMessage(activity);
            const relativeTime = formatRelativeTime(activity.createdAt);

            return (
              <div key={activity.id} className="text-sm">
                <span className="font-medium text-gray-900 dark:text-white">
                  {formattedActivity.username}
                </span>{" "}
                <span className="text-gray-500 dark:text-gray-400">
                  {formattedActivity.action}
                </span>
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
    </CollapsibleSection>
  );
};

export default ActivityList;

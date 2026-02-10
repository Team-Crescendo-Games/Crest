"use client";

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  children: ReactNode;
  initiallyExpanded?: boolean;
}

const CollapsibleSection = ({
  title,
  count,
  children,
  initiallyExpanded = false,
}: CollapsibleSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="dark:hover:bg-dark-tertiary flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-gray-100"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
          {count !== undefined ? ` (${count})` : ""}
        </span>
      </button>
      {isExpanded && <div className="mt-1 pl-6">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;

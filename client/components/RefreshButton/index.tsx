"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAppDispatch } from "@/app/redux";
import { showNotification } from "@/state";

type Props = {
  onRefresh: () => unknown;
  label?: string;
  className?: string;
};

const RefreshButton = ({
  onRefresh,
  label = "Data",
  className = "",
}: Props) => {
  const dispatch = useAppDispatch();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleClick = async () => {
    setIsSpinning(true);
    try {
      await onRefresh();
      dispatch(
        showNotification({ message: `${label} up to date`, type: "success" }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refresh failed";
      dispatch(showNotification({ message, type: "error" }));
    } finally {
      setTimeout(() => setIsSpinning(false), 500);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isSpinning}
      className={`text-gray-500 hover:text-gray-700 disabled:opacity-70 dark:text-neutral-400 dark:hover:text-neutral-200 ${className}`}
      aria-label="Refresh"
      title="Refresh"
    >
      <RefreshCw
        className={`h-5 w-5 transition-transform ${isSpinning ? "animate-spin" : ""}`}
      />
    </button>
  );
};

export default RefreshButton;

"use client";

interface RadialProgressProps {
  completed: number;
  total: number;
  size?: number;
}

const RadialProgress = ({ completed, total, size = 20 }: RadialProgressProps) => {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? completed / total : 0;
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-label={`${completed} of ${total} completed`}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-gray-300 dark:stroke-gray-600"
      />
      {/* Foreground arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className={
          ratio >= 1
            ? "stroke-emerald-500 dark:stroke-emerald-400"
            : "stroke-blue-500 dark:stroke-blue-400"
        }
      />
    </svg>
  );
};

export default RadialProgress;

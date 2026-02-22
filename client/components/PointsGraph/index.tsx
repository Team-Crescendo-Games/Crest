"use client";

import React, { useState, useRef, useEffect } from "react";
import { BarChart3, LineChart, Calendar } from "lucide-react";
import { format } from "date-fns";
import { formatUTCDate } from "@/lib/dateUtils";
import DatePicker from "@/components/DatePicker";

interface PointsDataPoint {
  date: string;
  points: number;
  label: string;
}

type GroupBy = "week" | "month" | "year";

interface PointsGraphProps {
  data: PointsDataPoint[];
  groupBy: GroupBy;
  startDate: string;
  endDate: string;
  onGroupByChange: (groupBy: GroupBy) => void;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  isLoading?: boolean;
}

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const PointsGraph: React.FC<PointsGraphProps> = ({
  data,
  groupBy,
  startDate,
  endDate,
  onGroupByChange,
  onDateRangeChange,
  isLoading = false,
}) => {
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const startPickerRef = useRef<HTMLDivElement>(null);
  const endPickerRef = useRef<HTMLDivElement>(null);

  const maxPoints = Math.max(...data.map((d) => d.points), 1);

  const yAxisLabels = [
    Math.ceil(maxPoints),
    Math.ceil(maxPoints * 0.75),
    Math.ceil(maxPoints * 0.5),
    Math.ceil(maxPoints * 0.25),
    0,
  ];

  const hasData = data.length > 0 && data.some((d) => d.points > 0);

  // Calculate x position to align with flex-1 centered labels
  const getXPosition = (index: number) => {
    if (data.length === 0) return 50;
    // Each item takes 100/n% of width, centered in its slot
    const slotWidth = 100 / data.length;
    return slotWidth * index + slotWidth / 2;
  };

  const generateLinePath = () => {
    if (data.length === 0) return "";
    const chartHeight = 256;
    const padding = 20;
    const effectiveHeight = chartHeight - padding * 2;
    return data
      .map((point, index) => {
        const x = getXPosition(index);
        const y = padding + effectiveHeight * (1 - point.points / maxPoints);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const generateAreaPath = () => {
    if (data.length === 0) return "";
    const chartHeight = 256;
    const padding = 20;
    const effectiveHeight = chartHeight - padding * 2;
    let path = data
      .map((point, index) => {
        const x = getXPosition(index);
        const y = padding + effectiveHeight * (1 - point.points / maxPoints);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
    const firstX = getXPosition(0);
    const lastX = getXPosition(data.length - 1);
    path += ` L ${lastX} ${chartHeight - padding} L ${firstX} ${chartHeight - padding} Z`;
    return path;
  };

  const formatDisplayDate = (dateStr: string) => {
    return formatUTCDate(dateStr);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        startPickerRef.current &&
        !startPickerRef.current.contains(e.target as Node)
      ) {
        setShowStartPicker(false);
      }
      if (
        endPickerRef.current &&
        !endPickerRef.current.contains(e.target as Node)
      ) {
        setShowEndPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="rounded-lg bg-white p-6 shadow dark:bg-dark-secondary">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Points Completed Over Time
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-dark-tertiary">
              <button
                onClick={() => setChartType("line")}
                className={`rounded-md p-1.5 transition-colors ${
                  chartType === "line"
                    ? "bg-white text-gray-800 shadow dark:bg-gray-700 dark:text-white"
                    : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
                title="Line chart"
              >
                <LineChart size={16} />
              </button>
              <button
                onClick={() => setChartType("bar")}
                className={`rounded-md p-1.5 transition-colors ${
                  chartType === "bar"
                    ? "bg-white text-gray-800 shadow dark:bg-gray-700 dark:text-white"
                    : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
                title="Bar chart"
              >
                <BarChart3 size={16} />
              </button>
            </div>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-dark-tertiary">
              {GROUP_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onGroupByChange(value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    groupBy === value
                      ? "bg-white text-gray-800 shadow dark:bg-gray-700 dark:text-white"
                      : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">From:</span>
          <div className="relative" ref={startPickerRef}>
            <button
              onClick={() => {
                setShowStartPicker(!showStartPicker);
                setShowEndPicker(false);
              }}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Calendar size={14} />
              {formatDisplayDate(startDate)}
            </button>
            {showStartPicker && (
              <div className="absolute left-0 top-full z-50 mt-1">
                <DatePicker
                  value={startDate}
                  onChange={(date) => {
                    if (date) onDateRangeChange(date, endDate);
                    setShowStartPicker(false);
                  }}
                  onClose={() => setShowStartPicker(false)}
                />
              </div>
            )}
          </div>
          <span className="text-gray-500 dark:text-gray-400">To:</span>
          <div className="relative" ref={endPickerRef}>
            <button
              onClick={() => {
                setShowEndPicker(!showEndPicker);
                setShowStartPicker(false);
              }}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Calendar size={14} />
              {formatDisplayDate(endDate)}
            </button>
            {showEndPicker && (
              <div className="absolute left-0 top-full z-50 mt-1">
                <DatePicker
                  value={endDate}
                  onChange={(date) => {
                    if (date) onDateRangeChange(startDate, date);
                    setShowEndPicker(false);
                  }}
                  onClose={() => setShowEndPicker(false)}
                  minDate={startDate}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500 dark:border-gray-600 dark:border-t-blue-400" />
        </div>
      )}

      {!isLoading && !hasData && (
        <div className="flex h-64 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <svg
            className="mb-3 h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-sm">No completed tasks in this period</p>
        </div>
      )}

      {!isLoading && hasData && (
        <div className="flex h-64">
          <div className="flex w-10 flex-col justify-between pr-2 text-right text-xs text-gray-500 dark:text-gray-400">
            {yAxisLabels.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
          <div className="relative flex flex-1 flex-col">
            <div className="absolute inset-0 flex flex-col justify-between">
              {yAxisLabels.map((_, index) => (
                <div
                  key={index}
                  className="border-t border-gray-200 dark:border-gray-700"
                />
              ))}
            </div>
            {chartType === "line" && (
              <div className="relative h-full w-full">
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 256"
                  preserveAspectRatio="none"
                >
                  <path
                    d={generateAreaPath()}
                    className="fill-blue-500/20 dark:fill-blue-400/20"
                  />
                  <path
                    d={generateLinePath()}
                    className="fill-none stroke-blue-500 dark:stroke-blue-400"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="absolute inset-0 flex items-end justify-around px-1">
                  {data.map((point, index) => {
                    const bottomPercent = (point.points / maxPoints) * 100;
                    return (
                      <div
                        key={point.date || index}
                        className="group relative flex flex-1 justify-center"
                        style={{ height: "100%" }}
                      >
                        <div
                          className="absolute h-4 w-4 -translate-x-1/2 cursor-pointer"
                          style={{
                            bottom: `calc(${bottomPercent}% - 8px)`,
                            left: "50%",
                          }}
                        >
                          <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700">
                            {point.points} pts
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {chartType === "bar" && (
              <div className="relative flex h-full items-end justify-around gap-1 px-1">
                {data.map((point, index) => {
                  const heightPercent =
                    maxPoints > 0 ? (point.points / maxPoints) * 100 : 0;
                  return (
                    <div
                      key={point.date || index}
                      className="group relative flex-1"
                      style={{ height: "100%" }}
                    >
                      <div
                        className="absolute bottom-0 left-1/2 w-full max-w-12 -translate-x-1/2 rounded-t bg-blue-500 transition-all duration-300 hover:bg-blue-600 dark:bg-blue-400 dark:hover:bg-blue-300"
                        style={{
                          height: `${heightPercent}%`,
                          minHeight: point.points > 0 ? "4px" : "0px",
                        }}
                      >
                        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700">
                          {point.points} pts
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex justify-around">
              {data.map((point, index) => (
                <span
                  key={point.date || index}
                  className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400"
                >
                  {point.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsGraph;

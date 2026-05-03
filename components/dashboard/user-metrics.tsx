"use client";

import { useState, useTransition } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getWeeklyCompletedPoints } from "@/lib/actions/metrics";

export interface WeeklyPoint {
  weekLabel: string;
  weekStart: string;
  points: number;
}

export interface TagSlice {
  name: string;
  color: string;
  count: number;
  percent: number;
}

type WeekRange = 4 | 8 | 12 | 26 | 52;

const WEEK_OPTIONS: { value: WeekRange; label: string }[] = [
  { value: 4, label: "4 weeks" },
  { value: 8, label: "8 weeks" },
  { value: 12, label: "12 weeks" },
  { value: 26, label: "6 months" },
  { value: 52, label: "1 year" },
];

export function UserMetrics({
  userId,
  initialWeeklyData,
  initialTagData,
}: {
  userId: string;
  initialWeeklyData: WeeklyPoint[];
  initialTagData: TagSlice[];
}) {
  const [weeks, setWeeks] = useState<WeekRange>(8);
  const [weeklyData, setWeeklyData] = useState<WeeklyPoint[]>(initialWeeklyData);
  const [tagData] = useState<TagSlice[]>(initialTagData);
  const [isPending, startTransition] = useTransition();

  function handleWeekChange(newWeeks: WeekRange) {
    if (newWeeks === weeks) return;
    setWeeks(newWeeks);
    startTransition(async () => {
      const data = await getWeeklyCompletedPoints(userId, newWeeks);
      setWeeklyData(data);
    });
  }

  return (
    <div className="space-y-6">
      {/* Completed Points Line Chart */}
      <div className="rounded-md border border-border bg-bg-elevated/60 p-4 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-mono text-xs font-medium text-fg-primary">
              Completed Points
            </h3>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              Task points completed per week
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-md bg-bg-secondary p-0.5">
            {WEEK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleWeekChange(opt.value)}
                disabled={isPending}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  weeks === opt.value
                    ? "bg-accent/15 text-accent"
                    : "text-fg-muted hover:text-fg-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className={isPending ? "opacity-50 transition-opacity" : ""}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={weeklyData}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: "var(--fg-primary)",
                }}
                labelStyle={{ color: "var(--fg-secondary)", marginBottom: 2 }}
                formatter={(value) => [`${value} pts`, "Points"]}
              />
              <Line
                type="monotone"
                dataKey="points"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{
                  r: 3,
                  fill: "var(--accent)",
                  stroke: "var(--bg-elevated)",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 5,
                  fill: "var(--accent)",
                  stroke: "var(--bg-elevated)",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tasks by Tag Pie Chart */}
      <div className="rounded-md border border-border bg-bg-elevated/60 p-4 backdrop-blur-sm">
        <div className="mb-4">
          <h3 className="font-mono text-xs font-medium text-fg-primary">
            Tasks by Tag
          </h3>
          <p className="mt-0.5 text-[11px] text-fg-muted">
            Distribution of tags across all assigned tasks
          </p>
        </div>

        {tagData.length === 0 ? (
          <div className="flex h-[120px] items-center justify-center">
            <p className="text-[11px] text-fg-muted">
              No tagged tasks found.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ResponsiveContainer width="100%" height={220} className="max-w-[260px] shrink-0">
              <PieChart>
                <Pie
                  data={tagData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {tagData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: "var(--fg-primary)",
                  }}
                  formatter={(value, name) => [
                    `${value} task${value !== 1 ? "s" : ""} (${tagData.find((t) => t.name === name)?.percent ?? 0}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend list */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 sm:flex-col sm:gap-y-2">
              {tagData.map((tag) => (
                <div key={tag.name} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-[11px] text-fg-secondary">
                    {tag.name}
                  </span>
                  <span className="text-[10px] text-fg-muted">
                    {tag.count} ({tag.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

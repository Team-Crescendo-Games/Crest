"use client";

import { createPortal } from "react-dom";
import { parseLocalDate } from "@/lib/dateUtils";
import { useState, useRef, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parse,
  isValid,
} from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type DatePickerProps = {
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange: (date: string | undefined) => void;
  onClose?: () => void;
  placeholder?: string;
  className?: string;
  minDate?: string; // ISO date string - dates before this will be disabled
  anchorRef?: React.RefObject<HTMLElement | null>; // Reference to anchor element for portal positioning
};

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DatePicker = ({
  value,
  onChange,
  onClose,
  className = "",
  minDate,
  anchorRef,
}: DatePickerProps) => {
  const [isReady, setIsReady] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    return value ? parseLocalDate(value) : new Date();
  });
  const [inputValue, setInputValue] = useState(() => {
    return value ? format(parseLocalDate(value), "MM/dd/yyyy") : "";
  });
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedDate = value ? parseLocalDate(value) : null;

  // Position the picker relative to the anchor button using fixed positioning.
  // Prefer below; flip above only when the picker would clip the viewport bottom.
  useEffect(() => {
    if (!anchorRef?.current) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const pickerWidth = 256;
      const pickerHeight = containerRef.current?.offsetHeight || 320;

      let top: number;
      if (rect.bottom + 4 + pickerHeight <= window.innerHeight) {
        // Fits below
        top = rect.bottom + 4;
      } else if (rect.top - 4 - pickerHeight >= 0) {
        // Doesn't fit below, but fits above
        top = rect.top - pickerHeight - 4;
      } else {
        // Doesn't fit either way — pin to bottom edge
        top = window.innerHeight - pickerHeight - 8;
      }

      let left = rect.left;
      if (left + pickerWidth > window.innerWidth) {
        left = window.innerWidth - pickerWidth - 8;
      }

      setPosition({ top, left });
    };

    // Run after a frame so containerRef has measured the actual height
    const frame = requestAnimationFrame(updatePosition);

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorRef]);

  // Delay visibility until after first render to prevent position flicker
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Update input value when value prop changes
  useEffect(() => {
    if (value) {
      setInputValue(format(parseLocalDate(value), "MM/dd/yyyy"));
      setViewDate(parseLocalDate(value));
    } else {
      setInputValue("");
    }
  }, [value]);

  // Get calendar days for current month view
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to align with day of week
  const startPadding = monthStart.getDay();
  const paddedDays = [...Array(startPadding).fill(null), ...calendarDays];

  const handleDateSelect = (date: Date) => {
    const isoDate = format(date, "yyyy-MM-dd");
    onChange(isoDate);
    onClose?.();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Try to parse the date in various formats
    const formats = [
      "MM/dd/yyyy",
      "M/d/yyyy",
      "MM-dd-yyyy",
      "M-d-yyyy",
      "yyyy-MM-dd",
    ];
    for (const fmt of formats) {
      const parsed = parse(newValue, fmt, new Date());
      if (
        isValid(parsed) &&
        parsed.getFullYear() > 1900 &&
        parsed.getFullYear() < 2100
      ) {
        const isoDate = format(parsed, "yyyy-MM-dd");
        onChange(isoDate);
        setViewDate(parsed);
        return;
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onClose?.();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    setInputValue("");
    onClose?.();
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(subMonths(viewDate, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(addMonths(viewDate, 1));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (!anchorRef?.current || !anchorRef.current.contains(e.target as Node))
      ) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, anchorRef]);

  const pickerContent = (
    <div
      ref={containerRef}
      style={anchorRef ? { position: "fixed", top: position.top, left: position.left, zIndex: 9999 } : undefined}
      className={`dark:border-dark-tertiary dark:bg-dark-secondary w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg transition-opacity duration-75 ${isReady ? "opacity-100" : "opacity-0"} ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Manual input field */}
      <div className="mb-3">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder="MM/DD/YYYY"
          className="dark:border-dark-tertiary dark:bg-dark-tertiary w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:text-white dark:placeholder-gray-500"
        />
      </div>

      {/* Header with month/year navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="dark:hover:bg-dark-tertiary rounded p-1 hover:bg-gray-100"
        >
          <ChevronLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <span className="text-sm font-medium text-gray-800 dark:text-white">
          {format(viewDate, "MMMM yyyy")}
        </span>
        <button
          onClick={handleNextMonth}
          className="dark:hover:bg-dark-tertiary rounded p-1 hover:bg-gray-100"
        >
          <ChevronRight
            size={16}
            className="text-gray-600 dark:text-gray-300"
          />
        </button>
      </div>

      {/* Day of week headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddedDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-7 w-7" />;
          }

          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isTodayDate = isToday(day);
          const isBeforeMinDate = minDate
            ? day < parseLocalDate(minDate)
            : false;
          const isDisabled = isBeforeMinDate;

          return (
            <button
              key={day.toISOString()}
              onClick={() => !isDisabled && handleDateSelect(day)}
              disabled={isDisabled}
              className={`h-7 w-7 rounded text-xs transition-colors ${
                isDisabled
                  ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
                  : isSelected
                    ? "bg-blue-600 text-white"
                    : isTodayDate
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : isCurrentMonth
                        ? "dark:hover:bg-dark-tertiary text-gray-700 hover:bg-gray-100 dark:text-gray-200"
                        : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Footer with clear button */}
      {selectedDate && (
        <div className="dark:border-dark-tertiary mt-2 border-t border-gray-200 pt-2">
          <button
            onClick={handleClear}
            className="flex w-full items-center justify-center gap-1 rounded py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <X size={12} />
            Clear date
          </button>
        </div>
      )}
    </div>
  );

  // Use portal when anchorRef is provided (for overflow scenarios like modals)
  if (anchorRef && typeof document !== "undefined") {
    return createPortal(pickerContent, document.body);
  }

  return pickerContent;
};

export default DatePicker;

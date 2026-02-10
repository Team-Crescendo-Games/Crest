"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AVAILABLE_EMOJIS } from "@/lib/emojiConstants";

interface EmojiPickerProps {
  onSelect: (emojiId: string) => void;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const EmojiPicker = ({ onSelect, onClose, triggerRef }: EmojiPickerProps) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Calculate position based on trigger element - run immediately on mount
  useEffect(() => {
    const calculatePosition = () => {
      if (triggerRef?.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const pickerHeight = 220; // approximate height of picker
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;

        // Prefer opening upward, but open downward if not enough space
        if (spaceAbove >= pickerHeight || spaceAbove > spaceBelow) {
          // Open upward
          setPosition({
            top: rect.top - pickerHeight - 4,
            left: rect.left,
          });
        } else {
          // Open downward
          setPosition({
            top: rect.bottom + 4,
            left: rect.left,
          });
        }
      }
    };

    // Calculate immediately
    calculatePosition();

    // Also recalculate on scroll/resize
    window.addEventListener("scroll", calculatePosition, true);
    window.addEventListener("resize", calculatePosition);
    return () => {
      window.removeEventListener("scroll", calculatePosition, true);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [triggerRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        // Also check if click was on the trigger
        if (
          triggerRef?.current &&
          triggerRef.current.contains(event.target as Node)
        ) {
          return;
        }
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, triggerRef]);

  // Don't render until we have position
  if (!position) return null;

  const pickerContent = (
    <div
      ref={pickerRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
      className="dark:border-stroke-dark dark:bg-dark-secondary rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      <div className="max-h-52 overflow-y-auto p-2">
        <table className="border-collapse">
          <tbody>
            {Array.from({ length: Math.ceil(AVAILABLE_EMOJIS.length / 6) }).map(
              (_, rowIndex) => (
                <tr key={rowIndex}>
                  {AVAILABLE_EMOJIS.slice(rowIndex * 6, rowIndex * 6 + 6).map(
                    (emoji) => (
                      <td key={emoji.id} className="p-0.5">
                        <button
                          onClick={() => {
                            onSelect(emoji.id);
                            onClose();
                          }}
                          className="dark:hover:bg-dark-tertiary flex h-9 w-9 items-center justify-center rounded hover:bg-gray-100"
                          title={emoji.label}
                        >
                          <Image
                            src={emoji.src}
                            alt={emoji.label}
                            width={28}
                            height={28}
                            className="h-7 w-7 rounded object-cover"
                          />
                        </button>
                      </td>
                    ),
                  )}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Use portal to render outside overflow containers
  return createPortal(pickerContent, document.body);
};

export default EmojiPicker;

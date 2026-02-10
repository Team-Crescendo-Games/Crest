"use client";

import Header from "@/components/Header";
import {
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  Tag,
} from "@/state/api";
import { Pencil, Plus, Trash2, X, Check, ChevronDown, Pipette } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#64748b", // slate
  "#78716c", // stone
];

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  size?: "sm" | "md";
};

const ColorPicker = ({ value, onChange, size = "md" }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const isUsingColorPicker = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if currently using the native color picker
      if (isUsingColorPicker.current) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sizeClasses = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  const handleCustomColorClick = () => {
    isUsingColorPicker.current = true;
    customInputRef.current?.click();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${sizeClasses} dark:border-dark-tertiary flex cursor-pointer items-center justify-center rounded border border-gray-300 transition-colors hover:border-gray-400`}
        style={{ backgroundColor: value }}
        title="Select color"
      >
        <ChevronDown
          size={12}
          className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
        />
      </button>
      {isOpen && (
        <div className="dark:border-dark-tertiary dark:bg-dark-secondary absolute top-full left-0 z-50 mt-2 w-44 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <div className="grid grid-cols-4 gap-4">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
                className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                  value === color
                    ? "ring-2 ring-gray-800 ring-offset-2 dark:ring-white"
                    : ""
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          {/* Custom color picker */}
          <div className="dark:border-dark-tertiary mt-3 border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={handleCustomColorClick}
              className="dark:hover:bg-dark-tertiary flex w-full items-center justify-center gap-2 rounded px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400"
            >
              <Pipette size={14} />
              <span>Custom color</span>
            </button>
            <input
              ref={customInputRef}
              type="color"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
              }}
              onBlur={() => {
                isUsingColorPicker.current = false;
                setIsOpen(false);
              }}
              className="invisible absolute h-0 w-0"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const TagsPage = () => {
  const { data: tags, isLoading } = useGetTagsQuery();
  const [createTag] = useCreateTagMutation();
  const [updateTag] = useUpdateTagMutation();
  const [deleteTag] = useDeleteTagMutation();

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("");

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    await createTag({ name: newTagName.trim(), color: newTagColor });
    setNewTagName("");
    setNewTagColor("#3b82f6");
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditingName(tag.name);
    setEditingColor(tag.color || "#3b82f6");
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim() || editingId === null) return;
    await updateTag({
      tagId: editingId,
      name: editingName.trim(),
      color: editingColor,
    });
    setEditingId(null);
    setEditingName("");
    setEditingColor("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingColor("");
  };

  const handleDelete = async (tagId: number, tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"?`)) return;
    await deleteTag(tagId);
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <Header name="Tags" />

      {/* Create new tag */}
      <div className="mt-4 mb-6 flex max-w-md items-center gap-2">
        <input
          type="text"
          placeholder="New tag name..."
          className="dark:border-dark-tertiary dark:bg-dark-tertiary flex-1 rounded border border-gray-300 p-2 shadow-sm focus:border-gray-400 focus:outline-none dark:text-white"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <ColorPicker value={newTagColor} onChange={setNewTagColor} />
        <button
          onClick={handleCreate}
          disabled={!newTagName.trim()}
          className="flex items-center gap-1 rounded-md bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Tag list */}
      <div className="max-w-md space-y-2">
        {tags && tags.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            No tags yet. Create one above.
          </p>
        )}
        {tags?.map((tag) => (
          <div
            key={tag.id}
            className="dark:bg-dark-secondary flex items-center justify-between rounded-lg bg-white p-3 shadow"
          >
            {editingId === tag.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  className="dark:border-dark-tertiary dark:bg-dark-tertiary flex-1 rounded border border-gray-300 p-1.5 text-sm focus:border-gray-400 focus:outline-none dark:text-white"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  autoFocus
                />
                <ColorPicker
                  value={editingColor}
                  onChange={setEditingColor}
                  size="sm"
                />
                <button
                  onClick={handleSaveEdit}
                  className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: tag.color || "#3b82f6" }}
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-white">
                    {tag.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEdit(tag)}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id, tag.name)}
                    className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TagsPage;

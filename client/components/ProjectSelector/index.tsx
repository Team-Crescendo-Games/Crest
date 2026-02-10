"use client";

import { useState, useRef, useEffect } from "react";
import { Project } from "@/state/api";
import { X, ChevronDown } from "lucide-react";
import { BiColumns } from "react-icons/bi";

type ProjectSelectorProps = {
  projects: Project[];
  selectedProject: Project | null;
  onSelect: (project: Project | null) => void;
  label?: string;
  placeholder?: string;
  inputClassName?: string;
  showIcon?: boolean;
};

const ProjectSelector = ({
  projects,
  selectedProject,
  onSelect,
  label = "Board",
  placeholder = "Search boards...",
  inputClassName = "",
  showIcon = true,
}: ProjectSelectorProps) => {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredProjects = projects.filter((project) => {
    const searchLower = search.toLowerCase();
    return project.name.toLowerCase().includes(searchLower);
  });

  const handleSelect = (project: Project) => {
    onSelect(project);
    setSearch("");
    setShowDropdown(false);
  };

  const handleClear = () => {
    onSelect(null);
    setSearch("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const defaultInputClass =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";
  const inputClass = inputClassName || defaultInputClass;

  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
          <span className="flex items-center gap-1.5">
            {showIcon && <BiColumns className="h-4 w-4" />}
            {label}
          </span>
        </label>
      )}
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <input
            type="text"
            className={inputClass}
            placeholder={placeholder}
            value={search || selectedProject?.name || ""}
            onChange={(e) => {
              setSearch(e.target.value);
              if (selectedProject && e.target.value !== selectedProject.name) {
                onSelect(null);
              }
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {selectedProject ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          ) : (
            <ChevronDown
              size={16}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400"
            />
          )}
        </div>
        {showDropdown && (
          <div className="dark:border-dark-tertiary dark:bg-dark-secondary absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => {
                const isCurrentlySelected = selectedProject?.id === project.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() =>
                      !isCurrentlySelected && handleSelect(project)
                    }
                    disabled={isCurrentlySelected}
                    className={`flex w-full flex-col px-3 py-2 text-left ${
                      isCurrentlySelected
                        ? "dark:bg-dark-tertiary/50 cursor-not-allowed bg-gray-50"
                        : "dark:hover:bg-dark-tertiary hover:bg-gray-100"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        isCurrentlySelected
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {project.name}
                    </span>
                    {project.description && (
                      <span
                        className={`truncate text-xs ${
                          isCurrentlySelected
                            ? "text-gray-300 dark:text-gray-600"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {project.description}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No boards found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSelector;

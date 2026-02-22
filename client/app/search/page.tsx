"use client";

import Header from "@/components/Header";
import BoardCard from "@/components/boards/boardCard";
import UserCard from "@/components/UserCard";
import TaskDetailModal from "@/components/tasks/taskDetailModal";
import TaskCard from "@/components/tasks/taskCard";
import { Task, useSearchQuery } from "@/state/api";
import { useWorkspace } from "@/lib/useWorkspace";
import { formatUTCDate } from "@/lib/dateUtils";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search as SearchIcon,
  Calendar,
  Zap,
  Clock,
  X,
  Users,
  CheckSquare,
} from "lucide-react";
import { BiColumns } from "react-icons/bi";
import Link from "next/link";
import { BOARD_MAIN_COLOR, SPRINT_MAIN_COLOR } from "@/lib/entityColors";

const RECENT_SEARCHES_KEY = "recentSearches";
const MAX_RECENT_SEARCHES = 5;

type Category = "tasks" | "boards" | "users" | "sprints";

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode }[] = [
  { id: "tasks", label: "Tasks", icon: <CheckSquare className="h-4 w-4" /> },
  {
    id: "boards",
    label: "Boards",
    icon: <BiColumns className="h-4 w-4" style={{ color: BOARD_MAIN_COLOR }} />,
  },
  { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
  {
    id: "sprints",
    label: "Sprints",
    icon: <Zap className="h-4 w-4" style={{ color: SPRINT_MAIN_COLOR }} />,
  },
];

// Helper functions for localStorage
const getRecentSearches = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (term: string) => {
  if (typeof window === "undefined" || term.length < 3) return;
  try {
    const searches = getRecentSearches();
    const filtered = searches.filter(
      (s) => s.toLowerCase() !== term.toLowerCase(),
    );
    const updated = [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
};

const removeRecentSearch = (term: string) => {
  if (typeof window === "undefined") return;
  try {
    const searches = getRecentSearches();
    const updated = searches.filter((s) => s !== term);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
};

const CategoryToggle = ({
  activeCategories,
  toggleCategory,
  centered = false,
}: {
  activeCategories: Category[];
  toggleCategory: (category: Category) => void;
  centered?: boolean;
}) => (
  <div className={`flex flex-wrap gap-4 ${centered ? "justify-center" : ""}`}>
    {CATEGORIES.map((cat) => {
      const isActive = activeCategories.includes(cat.id);
      return (
        <label
          key={cat.id}
          className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-neutral-300"
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => toggleCategory(cat.id)}
            className="h-4 w-4 rounded border-gray-300 accent-gray-800 dark:border-neutral-600 dark:accent-white"
          />
          <span className="flex items-center gap-1.5">
            {cat.icon}
            {cat.label}
          </span>
        </label>
      );
    })}
  </div>
);

const Search = () => {
  const { activeWorkspaceId } = useWorkspace();

  const [inputValue, setInputValue] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState<{
    query: string;
    categories: Category[];
  } | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Category[]>([
    "tasks",
    "boards",
    "users",
    "sprints",
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const lastSavedQuery = useRef<string | null>(null);

  const {
    data: searchResults,
    isLoading,
    isError,
  } = useSearchQuery(
    {
      query: submittedSearch?.query || "",
      categories: submittedSearch?.categories,
      workspaceId: activeWorkspaceId!,
    },
    {
      skip:
        !submittedSearch ||
        submittedSearch.query.length < 3 ||
        !activeWorkspaceId,
    },
  );

  // Load recent searches on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentSearches(getRecentSearches());
  }, []);

  // Save successful searches
  useEffect(() => {
    if (submittedSearch && submittedSearch.query.length >= 3 && searchResults) {
      // Check if we've already saved this exact query to prevent loops
      if (lastSavedQuery.current === submittedSearch.query) return;

      const hasResultsCheck =
        (searchResults.tasks?.length ?? 0) > 0 ||
        (searchResults.boards?.length ?? 0) > 0 ||
        (searchResults.users?.length ?? 0) > 0 ||
        (searchResults.sprints?.length ?? 0) > 0;

      if (hasResultsCheck) {
        saveRecentSearch(submittedSearch.query);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecentSearches(getRecentSearches());
        lastSavedQuery.current = submittedSearch.query; // Mark as saved
      }
    }
  }, [submittedSearch, searchResults]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSearch = useCallback(() => {
    if (inputValue.length >= 3 && activeCategories.length > 0) {
      setSubmittedSearch({ query: inputValue, categories: activeCategories });
      setShowSuggestions(false);
    }
  }, [inputValue, activeCategories]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectRecentSearch = (term: string) => {
    setInputValue(term);
    setSubmittedSearch({ query: term, categories: activeCategories });
    setShowSuggestions(false);
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeRecentSearch(term);
    setRecentSearches(getRecentSearches());
  };

  const toggleCategory = (category: Category) => {
    setActiveCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleBackToSearch = () => {
    setSubmittedSearch(null);
    setInputValue("");
  };

  const hasResults =
    searchResults &&
    ((searchResults.tasks && searchResults.tasks.length > 0) ||
      (searchResults.boards && searchResults.boards.length > 0) ||
      (searchResults.users && searchResults.users.length > 0) ||
      (searchResults.sprints && searchResults.sprints.length > 0));

  const noResults =
    submittedSearch &&
    submittedSearch.query.length >= 3 &&
    !isLoading &&
    !hasResults;

  const showCentered = !submittedSearch;

  const shouldShowSuggestions =
    showSuggestions && recentSearches.length > 0 && inputValue.length < 3;

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return formatUTCDate(dateString);
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col p-8">
      {/* Centered layout when no search submitted */}
      {showCentered ? (
        <div className="flex flex-1 flex-col items-center justify-center pb-32">
          <div className="mb-6 text-center">
            <SearchIcon className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-neutral-600" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Search
            </h1>
            <p className="mt-1 text-gray-500 dark:text-neutral-400">
              Find tasks, boards, users, or sprints
            </p>
          </div>

          {/* Centered Search Input */}
          <div className="relative w-full max-w-lg">
            <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              placeholder="Press Enter to search..."
              className="w-full rounded-xl border border-gray-300 bg-white py-4 pl-12 pr-4 text-lg shadow-sm transition-colors focus:border-gray-400 focus:outline-none dark:border-dark-tertiary dark:bg-dark-secondary dark:text-white dark:placeholder-neutral-400"
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              autoFocus
            />

            {/* Recent Searches Dropdown */}
            {shouldShowSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 top-full z-10 mt-2 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary"
              >
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-neutral-400">
                  Recent Searches
                </div>
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    onClick={() => handleSelectRecentSearch(term)}
                    className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700 dark:text-white">
                        {term}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleRemoveRecentSearch(e, term)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-bg dark:hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {inputValue.length > 0 &&
              inputValue.length < 3 &&
              !shouldShowSuggestions && (
                <p className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-400">
                  Type at least 3 characters to search
                </p>
              )}
          </div>

          {/* Category Toggles */}
          <div className="mt-6">
            <p className="mb-3 text-center text-sm text-gray-500 dark:text-neutral-400">
              Search in:
            </p>
            {/* UPDATED: Pass required props down */}
            <CategoryToggle
              centered
              activeCategories={activeCategories}
              toggleCategory={toggleCategory}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Top-left layout when showing results */}
          <Header name="Search" />

          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="relative max-w-xl flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                placeholder="Search..."
                className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 shadow-sm transition-colors focus:border-gray-400 focus:outline-none dark:border-dark-tertiary dark:bg-dark-secondary dark:text-white dark:placeholder-neutral-400"
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
              />

              {/* Recent Searches Dropdown */}
              {shouldShowSuggestions && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary"
                >
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-neutral-400">
                    Recent Searches
                  </div>
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      onClick={() => handleSelectRecentSearch(term)}
                      className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-white">
                          {term}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleRemoveRecentSearch(e, term)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-bg dark:hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSearch}
              disabled={inputValue.length < 3 || activeCategories.length === 0}
              className="rounded-lg bg-gray-800 px-4 py-3 text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Search
            </button>

            <button
              onClick={handleBackToSearch}
              className="rounded-lg border border-gray-300 px-4 py-3 text-gray-600 transition-colors hover:bg-gray-50 dark:border-dark-tertiary dark:text-neutral-300 dark:hover:bg-dark-tertiary"
            >
              Clear
            </button>
          </div>

          {/* Category Toggles */}
          <div className="mb-6">
            {/* UPDATED: Pass required props down */}
            <CategoryToggle
              activeCategories={activeCategories}
              toggleCategory={toggleCategory}
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-neutral-400">
                Searching...
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              Error occurred while fetching search results. Please try again.
            </div>
          )}

          {/* No Results */}
          {noResults && (
            <div className="py-12 text-center text-gray-500 dark:text-neutral-400">
              No results found for &quot;{submittedSearch.query}&quot;
            </div>
          )}

          {/* Results */}
          {!isLoading && !isError && hasResults && (
            <div className="space-y-8">
              {/* Tasks Section */}
              {searchResults.tasks && searchResults.tasks.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    Tasks ({searchResults.tasks.length})
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Sprints Section */}
              {searchResults.sprints && searchResults.sprints.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    Sprints ({searchResults.sprints.length})
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.sprints.map((sprint) => (
                      <Link
                        key={sprint.id}
                        href={`/sprints/${sprint.id}`}
                        className="rounded-md bg-white p-4 shadow transition-all hover:outline-2 hover:outline-purple-300 dark:bg-dark-secondary dark:hover:outline-purple-600"
                      >
                        <div className="flex items-center gap-2">
                          <Zap
                            className="h-5 w-5"
                            style={{ color: SPRINT_MAIN_COLOR }}
                          />
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {sprint.title}
                          </h3>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-neutral-400">
                          {sprint._count && (
                            <span>{sprint._count.sprintTasks} tasks</span>
                          )}
                          {sprint.startDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDate(sprint.startDate)}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Boards Section */}
              {searchResults.boards && searchResults.boards.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    Boards ({searchResults.boards.length})
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.boards.map((board) => (
                      <BoardCard key={board.id} board={board} />
                    ))}
                  </div>
                </section>
              )}

              {/* Users Section */}
              {searchResults.users && searchResults.users.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    Users ({searchResults.users.length})
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.users.map((user) => (
                      <UserCard key={user.userId} user={user} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        tasks={searchResults?.tasks}
      />
    </div>
  );
};

export default Search;

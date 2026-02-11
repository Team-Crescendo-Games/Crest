"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useGetUsersQuery, User as UserType } from "@/state/api";
import { FilterState } from "@/lib/filterTypes";

type SearchInputProps = {
  filterState: FilterState;
  onFilterChange: (newState: FilterState) => void;
  accentColor?: string;
};

const SearchInput = ({
  filterState,
  onFilterChange,
  accentColor = "#3b82f6",
}: SearchInputProps) => {
  const [searchInput, setSearchInput] = useState(filterState.searchText);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const isUserSearch = searchInput.startsWith("@");
  const userSearchTerm = isUserSearch ? searchInput.slice(1) : "";

  const { data: users = [] } = useGetUsersQuery();

  // Sync local input with filter state searchText (for external changes like clear all)
  useEffect(() => {
    if (!isUserSearch) {
      setSearchInput(filterState.searchText);
    }
  }, [filterState.searchText, isUserSearch]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
        setHighlightedIndex(0);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter users for @mention dropdown
  const filteredUsers = users
    .filter((user) => {
      if (!userSearchTerm) return true;
      const term = userSearchTerm.toLowerCase();
      return (
        (user.username?.toLowerCase().includes(term) ?? false) ||
        (user.fullName?.toLowerCase().includes(term) ?? false) ||
        (user.email?.toLowerCase().includes(term) ?? false)
      );
    })
    .slice(0, 8);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredUsers.length]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);

    if (value.startsWith("@")) {
      setShowUserDropdown(true);
    } else {
      setShowUserDropdown(false);
      onFilterChange({ ...filterState, searchText: value });
    }
  };

  const addUserFilter = (user: UserType) => {
    if (user.userId && !filterState.selectedAssigneeIds.includes(user.userId)) {
      onFilterChange({
        ...filterState,
        selectedAssigneeIds: [...filterState.selectedAssigneeIds, user.userId],
      });
    }
    setSearchInput("");
    setShowUserDropdown(false);
    setHighlightedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showUserDropdown || !isUserSearch) return;

    const maxIndex = filteredUsers.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredUsers[highlightedIndex]) {
          addUserFilter(filteredUsers[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowUserDropdown(false);
        setHighlightedIndex(0);
        break;
    }
  };

  const clearSearchText = () => {
    setSearchInput("");
    onFilterChange({ ...filterState, searchText: "" });
  };

  return (
    <div className="relative" ref={searchDropdownRef}>
      <div className="relative">
        <Search className="absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="dark:border-dark-tertiary dark:bg-dark-secondary w-80 rounded-md border border-gray-200 bg-white py-1.5 pr-7 pl-7 text-sm text-gray-700 placeholder-gray-400 focus:ring-1 focus:outline-none sm:w-96 dark:text-white dark:placeholder-gray-500"
          style={{
            borderColor: searchInput ? accentColor : undefined,
            boxShadow: searchInput ? `0 0 0 1px ${accentColor}` : undefined,
          }}
        />
        {searchInput && !isUserSearch && (
          <button
            onClick={clearSearchText}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {/* User dropdown */}
      {showUserDropdown && isUserSearch && (
        <div className="animate-dropdown dark:border-dark-tertiary dark:bg-dark-secondary absolute top-full left-0 z-20 mt-1 max-h-48 w-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400">
            Filter by assignee
          </div>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user, index) => (
              <button
                key={user.userId}
                onClick={() => addUserFilter(user)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  index === highlightedIndex
                    ? "dark:bg-dark-tertiary bg-gray-100"
                    : "dark:hover:bg-dark-tertiary hover:bg-gray-100"
                }`}
              >
                <span className="font-medium text-gray-900 dark:text-white">
                  {user.fullName || user.username}
                </span>
                {user.email && (
                  <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchInput;

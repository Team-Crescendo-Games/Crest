"use client";

import React from "react";

type Props = {
  onClick?: () => void;
  href?: string;
  icon: React.ReactNode;
  tooltip: string;
  disabled?: boolean;
  active?: boolean;
  activeClassName?: string;
  className?: string;
};

const HeaderButton = ({
  onClick,
  href,
  icon,
  tooltip,
  disabled = false,
  active = false,
  activeClassName,
  className = "",
}: Props) => {
  const baseClass = `cursor-pointer text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200 disabled:opacity-50 ${className}`;
  const resolvedClass = active && activeClassName ? activeClassName : baseClass;

  const content = (
    <>
      {icon}
      <div className="pointer-events-none absolute top-full left-1/2 z-30 mt-1 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs font-normal whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
        {tooltip}
      </div>
    </>
  );

  if (href) {
    // Dynamic import to avoid pulling in next/link when not needed
    const Link = require("next/link").default;
    return (
      <div className="group relative cursor-pointer">
        <Link href={href} className={`inline-flex ${resolvedClass}`} aria-label={tooltip}>
          {content}
        </Link>
      </div>
    );
  }

  return (
    <div className="group relative cursor-pointer">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={resolvedClass}
        aria-label={tooltip}
      >
        {content}
      </button>
    </div>
  );
};

export default HeaderButton;

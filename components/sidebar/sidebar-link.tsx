"use client";

import Link from "next/link";

interface Props {
  href: string;
  icon: React.ComponentType<{ size: number }>;
  label: string;
  active: boolean;
}

export function SidebarLink({ href, icon: Icon, label, active }: Props) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-accent/10 text-accent" : "text-fg-secondary hover:bg-bg-secondary hover:text-fg-primary"
      }`}
    >
      <Icon size={13} />
      {label}
    </Link>
  );
}

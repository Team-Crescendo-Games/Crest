"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { UserAvatar } from "@/components/common/user-avatar";

interface UserFooterProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserFooter({ user }: UserFooterProps) {
  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2.5">
        <Link
          href="/profile"
          className="shrink-0 transition-opacity hover:opacity-80"
        >
          <UserAvatar name={user.name} image={user.image} size={28} />
        </Link>
        <Link href="/profile" className="min-w-0 flex-1 group">
          <p className="truncate text-xs font-medium text-fg-primary group-hover:text-accent">
            {user.name}
          </p>
          <p className="truncate text-[11px] text-fg-muted">{user.email}</p>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="shrink-0 rounded-md p-1 text-fg-muted transition-colors hover:bg-bg-secondary hover:text-accent-emphasis"
          aria-label="Sign out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

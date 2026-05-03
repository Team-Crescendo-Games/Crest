"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { Users, Shuffle } from "lucide-react";
import { UserAvatar } from "@/components/common/user-avatar";

interface Member {
  id: string;
  name: string | null;
  image?: string | null;
}

function getStorageKey(pathname: string) {
  return `standupOrder:${pathname}`;
}

function readOrder(pathname: string, members: Member[]): Member[] {
  if (typeof window === "undefined") return members;
  try {
    const raw = sessionStorage.getItem(getStorageKey(pathname));
    if (!raw) return members;
    const ids: string[] = JSON.parse(raw);
    const byId = new Map(members.map((m) => [m.id, m]));
    const ordered: Member[] = [];
    for (const id of ids) {
      const m = byId.get(id);
      if (m) {
        ordered.push(m);
        byId.delete(id);
      }
    }
    // Append any members not in storage (e.g. newly added)
    for (const m of byId.values()) ordered.push(m);
    return ordered;
  } catch {
    return members;
  }
}

function writeOrder(pathname: string, ids: string[]) {
  try {
    sessionStorage.setItem(getStorageKey(pathname), JSON.stringify(ids));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function StandupModeFilter({ members }: { members: Member[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentAssignee = searchParams.get("assignee");

  const [order, setOrder] = useState<Member[]>(members);

  // Restore shuffled order from sessionStorage after hydration
  useEffect(() => {
    const stored = readOrder(pathname, members);
    // Only update if the stored order differs from the default
    if (stored.map((m) => m.id).join() !== members.map((m) => m.id).join()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrder(stored);
    }
  }, [pathname, members]);

  const select = useCallback(
    (memberId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (memberId === null || memberId === currentAssignee) {
        params.delete("assignee");
      } else {
        params.set("assignee", memberId);
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [router, pathname, searchParams, currentAssignee],
  );

  function shuffle() {
    const shuffled = [...order];
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrder(shuffled);
    writeOrder(
      pathname,
      shuffled.map((m) => m.id),
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={shuffle}
        disabled={members.length < 2}
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-bg-secondary text-fg-muted transition-all hover:bg-accent/10 hover:text-accent disabled:opacity-40"
        title="Shuffle order"
      >
        <Shuffle size={12} />
      </button>
      <button
        type="button"
        onClick={() => select(null)}
        className={`flex cursor-pointer items-center justify-center rounded-full transition-all ${
          !currentAssignee ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-primary" : "opacity-60 hover:opacity-100"
        }`}
        title="All members"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-secondary">
          <Users size={12} className="text-fg-muted" />
        </span>
      </button>
      {order.map((member) => {
        const isActive = currentAssignee === member.id;
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => select(member.id)}
            className={`cursor-pointer rounded-full transition-all ${
              isActive ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-primary" : "opacity-60 hover:opacity-100"
            }`}
            title={member.name ?? "Member"}
          >
            <UserAvatar name={member.name} image={member.image} size={24} />
          </button>
        );
      })}
    </div>
  );
}

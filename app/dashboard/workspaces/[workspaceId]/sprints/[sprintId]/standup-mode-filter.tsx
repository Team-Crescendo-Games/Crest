"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Users, Shuffle } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";

interface Member {
  id: string;
  name: string | null;
  image?: string | null;
}

export function StandupModeFilter({ members }: { members: Member[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Member[]>(members);

  const currentAssignee = searchParams.get("assignee");

  function select(memberId: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (memberId === null || memberId === currentAssignee) {
      params.delete("assignee");
    } else {
      params.set("assignee", memberId);
    }

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function shuffle() {
    setOrder((prev) => {
      const shuffled = [...prev];
      // Fisher-Yates shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-fg-muted mr-0.5">Standup</span>
      <button
        type="button"
        onClick={shuffle}
        disabled={members.length < 2}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-secondary text-fg-muted transition-all hover:bg-accent/10 hover:text-accent disabled:opacity-40"
        title="Shuffle order"
      >
        <Shuffle size={12} />
      </button>
      <button
        type="button"
        onClick={() => select(null)}
        className={`flex items-center justify-center rounded-full transition-all ${
          !currentAssignee
            ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-primary"
            : "opacity-60 hover:opacity-100"
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
            className={`rounded-full transition-all ${
              isActive
                ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-primary"
                : "opacity-60 hover:opacity-100"
            }`}
            title={member.name ?? "Member"}
          >
            <UserAvatar
              name={member.name}
              image={member.image}
              size={24}
            />
          </button>
        );
      })}
    </div>
  );
}

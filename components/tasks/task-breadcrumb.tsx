import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function TaskBreadcrumb({ boardName, boardHref }: { boardName: string; boardHref: string }) {
  return (
    <div className="mb-4">
      <Link
        href={boardHref}
        className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Go to <span className="underline underline-offset-2">{boardName}</span>
      </Link>
    </div>
  );
}

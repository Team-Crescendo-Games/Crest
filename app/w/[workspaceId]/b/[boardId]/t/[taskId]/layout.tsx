"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

export default function TaskModalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const close = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal content */}
      <div className="relative z-10 mx-4 w-full max-w-3xl rounded-lg border border-border bg-bg-elevated p-6 shadow-xl">
        <button
          onClick={close}
          className="absolute right-4 top-4 rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-secondary"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

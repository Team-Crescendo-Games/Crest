"use client";

import { useEffect } from "react";
import ReactDOM from "react-dom";
import { AlertTriangle, Copy, Trash2, X } from "lucide-react";

export type ConfirmationVariant = "danger" | "warning" | "info";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: ConfirmationVariant;
  children?: React.ReactNode;
};

const variantStyles: Record<
  ConfirmationVariant,
  { icon: React.ReactNode; buttonClass: string }
> = {
  danger: {
    icon: <Trash2 className="h-5 w-5 text-red-500" />,
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    buttonClass: "bg-yellow-600 hover:bg-yellow-700 text-white",
  },
  info: {
    icon: <Copy className="h-5 w-5 text-blue-500" />,
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

const ConfirmationMenu = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  variant = "info",
  children,
}: Props) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { icon, buttonClass } = variantStyles[variant];

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm animate-scale-in rounded-lg bg-white p-6 shadow-lg dark:bg-dark-secondary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">{icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              {message}
            </p>
            {children && <div className="mt-3">{children}</div>}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-stroke-dark dark:text-gray-300 dark:hover:bg-dark-tertiary"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${buttonClass}`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmationMenu;

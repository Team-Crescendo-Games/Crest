"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/app/redux";
import { dismissNotification } from "@/state";

const AppNotification = () => {
  const dispatch = useAppDispatch();
  const notifications =
    useAppSelector((state) => state.global.notifications) ?? [];

  if (notifications.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          id={notification.id}
          message={notification.message}
          type={notification.type}
          onDismiss={() => dispatch(dismissNotification(notification.id))}
        />
      ))}
    </div>
  );
};

type ToastProps = {
  id: string;
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
};

const NotificationToast = ({ message, type, onDismiss }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger fade in
    requestAnimationFrame(() => setIsVisible(true));

    // Start fade out before dismiss
    const fadeOutTimer = setTimeout(() => setIsLeaving(true), 2000);
    const dismissTimer = setTimeout(onDismiss, 2300);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(onDismiss, 300);
  };

  const isSuccess = type === "success";

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border-l-4 px-5 py-4 shadow-xl transition-all duration-300 ${
        isVisible && !isLeaving
          ? "translate-x-0 opacity-100"
          : "translate-x-4 opacity-0"
      } ${
        isSuccess
          ? "border-green-500 bg-green-100 text-green-900 dark:border-green-400 dark:bg-green-900/50 dark:text-green-200"
          : "border-red-500 bg-red-100 text-red-900 dark:border-red-400 dark:bg-red-900/50 dark:text-red-200"
      }`}
    >
      {isSuccess ? (
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 flex-shrink-0" />
      )}
      <span className="text-sm font-semibold">{message}</span>
      <button
        onClick={handleDismiss}
        className="ml-2 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AppNotification;

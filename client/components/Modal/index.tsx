import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import Header from "../Header";
import { X } from "lucide-react";

type Props = {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  name: React.ReactNode;
  headerRight?: React.ReactNode;
  hideClose?: boolean;
  hideHeader?: boolean;
  rightPanel?: React.ReactNode;
  leftPanel?: React.ReactNode;
  floatingActions?: React.ReactNode;
};

const Modal = ({
  children,
  isOpen,
  onClose,
  name,
  headerRight,
  hideClose,
  hideHeader,
  rightPanel,
  leftPanel,
  floatingActions,
}: Props) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`flex flex-col gap-3 ${rightPanel || leftPanel ? "max-w-5xl" : "max-w-2xl"} w-full`}
      >
        {/* Floating action buttons above - aligned with middle panel */}
        {floatingActions && (
          <div className={`flex w-full items-start gap-3`}>
            {/* Spacer for left panel */}
            {leftPanel && <div className="w-48 flex-shrink-0" />}
            {/* Floating actions */}
            <div
              className="animate-scale-in flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {floatingActions}
            </div>
          </div>
        )}
        {/* Main row with panels */}
        <div
          className={`flex max-h-[calc(90vh-48px)] w-full items-start gap-3`}
        >
          {/* Left floating panel */}
          {leftPanel && (
            <div
              className="animate-scale-in max-h-full w-48 flex-shrink-0 overflow-visible"
              onClick={(e) => e.stopPropagation()}
            >
              {leftPanel}
            </div>
          )}
          {/* Main modal */}
          <div
            className="dark:bg-dark-secondary animate-scale-in flex max-h-full min-w-0 flex-1 flex-col rounded-lg bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {!hideHeader && (
              <div className="dark:border-stroke-dark flex-shrink-0 border-b border-gray-200 px-4 py-3">
                <Header
                  name={name}
                  buttonComponent={
                    <div className="flex items-center gap-2">
                      {headerRight}
                      {!hideClose && (
                        <button
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
                          onClick={onClose}
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  }
                  isSmallText
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </div>
          {/* Right floating panel */}
          {rightPanel && (
            <div
              className="dark:bg-dark-secondary animate-scale-in max-h-[70vh] w-80 flex-shrink-0 overflow-hidden rounded-lg bg-white shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {rightPanel}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;

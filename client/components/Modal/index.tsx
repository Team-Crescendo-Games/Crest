import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import Header from "../Header";
import { X } from "lucide-react";

type Props = {
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    name: string;
    headerRight?: React.ReactNode;
    hideClose?: boolean;
    hideHeader?: boolean;
    rightPanel?: React.ReactNode;
    leftPanel?: React.ReactNode;
};

const Modal = ({ children, isOpen, onClose, name, headerRight, hideClose, hideHeader, rightPanel, leftPanel }: Props) => {
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

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
            onClick={onClose}
        >
            <div className={`flex items-start gap-3 ${rightPanel || leftPanel ? "max-w-5xl" : "max-w-2xl"} w-full max-h-[90vh]`}>
                {/* Left floating panel */}
                {leftPanel && (
                    <div 
                        className="w-48 flex-shrink-0 max-h-[90vh] animate-scale-in overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {leftPanel}
                    </div>
                )}
                {/* Main modal */}
                <div 
                    className="flex-1 min-w-0 flex flex-col max-h-[90vh] rounded-lg bg-white shadow-lg dark:bg-dark-secondary animate-scale-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {!hideHeader && (
                        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-stroke-dark">
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
                    <div className="flex-1 overflow-y-auto p-4">
                        {children}
                    </div>
                </div>
                {/* Right floating panel */}
                {rightPanel && (
                    <div 
                        className="w-72 flex-shrink-0 max-h-[90vh] rounded-lg bg-white shadow-lg dark:bg-dark-secondary animate-scale-in overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {rightPanel}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};

export default Modal;

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
};

const Modal = ({ children, isOpen, onClose, name, headerRight, hideClose }: Props) => {
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
            className="fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-lg dark:bg-dark-secondary animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
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
                {children}
            </div>
        </div>,
        document.body,
    );
};

export default Modal;

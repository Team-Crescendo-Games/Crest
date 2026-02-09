"use client";

import React, {useEffect} from "react";
import Sidebar from "@/components/Sidebar"
import StoreProvider, {useAppSelector} from "@/app/redux";
import AuthProvider from "@/app/authProvider";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
    const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDarkMode);
    }, [isDarkMode]);

    return (
        <div className="flex min-h-screen w-full bg-gray-50 text-gray-900">
            <Sidebar />
            <main
                className="relative flex h-screen w-full flex-col bg-gray-50 dark:bg-dark-bg md:pl-64"
            >
                {/* Dot background pattern */}
                <div 
                    className="absolute inset-0 opacity-40 dark:opacity-25 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle, rgba(156, 163, 175, 0.4) 1px, transparent 1px)`,
                        backgroundSize: '20px 20px'
                    }}
                />
                <div className="relative z-10 flex h-full flex-col overflow-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
};

const DashboardWrapper = ({ children }: { children: React.ReactNode }) => (
    <StoreProvider>
        <AuthProvider>
            <DashboardLayout>{children}</DashboardLayout>
        </AuthProvider>
    </StoreProvider>
);

export default DashboardWrapper;

"use client";

import React, { useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Sidebar from "@/components/UI/structural/sidebar";
import AppNotification from "@/components/AppNotification";
import StoreProvider, { useAppSelector } from "@/app/redux";
import AuthProvider from "@/app/authProvider";
import { useWorkspace } from "@/lib/useWorkspace";
import { useAuthUser } from "@/lib/useAuthUser";
import { useGetWorkspacesQuery } from "@/state/api";
import ModalNewWorkspace from "@/components/workspaces/ModalNewWorkspace";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );
  const { activeWorkspaceId, setWorkspace } = useWorkspace();
  const { data: authData } = useAuthUser();
  const userId = authData?.userDetails?.userId;

  const { data: workspaces, isLoading } = useGetWorkspacesQuery(userId!, {
    skip: !userId,
  });

  const hasNoWorkspaces = !isLoading && workspaces && workspaces.length === 0;

  // Clear stale workspace ID
  useEffect(() => {
    if (hasNoWorkspaces && activeWorkspaceId) {
      setWorkspace(null);
    }
  }, [hasNoWorkspaces, activeWorkspaceId, setWorkspace]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // No workspace state — show only the welcome modal, nothing else
  if (hasNoWorkspaces) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div
          className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(156, 163, 175, 0.5) 1.2px, transparent 1.2px)`,
            backgroundSize: "20px 20px",
          }}
        />
        <ModalNewWorkspace isOpen={true} onClose={() => {}} canCancel={false} />
        <AppNotification />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex min-h-screen w-full bg-gray-50 text-gray-900">
        <Sidebar />
        <main
          className={`relative flex h-screen w-full flex-col bg-gray-50 transition-all duration-300 dark:bg-dark-bg ${isSidebarCollapsed ? "pl-16" : "pl-64"}`}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(156, 163, 175, 0.5) 1.2px, transparent 1.2px)`,
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative z-10 flex h-full flex-col overflow-hidden">
            {children}
          </div>
          <AppNotification />
        </main>
      </div>
    </DndProvider>
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

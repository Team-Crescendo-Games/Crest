import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/common/theme-provider";
import { GridBackground } from "@/components/common/grid-background";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/cached-auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crest — Project Management",
  description: "Open-source project management for teams",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (session?.user) {
    // Single query for both the sidebar shell data and the user's own
    // name/email/image, so the session callback needs no DB round trip.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id! },
      select: {
        name: true,
        email: true,
        image: true,
        memberships: {
          select: {
            workspace: {
              select: {
                id: true,
                name: true,
                boards: {
                  select: { id: true, name: true, isActive: true },
                  orderBy: { displayOrder: "asc" },
                },
                sprints: {
                  select: {
                    id: true,
                    title: true,
                    isActive: true,
                    startDate: true,
                  },
                  orderBy: { startDate: "desc" },
                },
              },
            },
          },
          orderBy: { joinedAt: "desc" },
        },
      },
    });

    if (!user) redirect("/sign-in");

    const workspaces = user.memberships.map((m) => m.workspace);

    return (
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full">
          <ThemeProvider>
            <GridBackground />
            <div className="relative z-10">
              <div className="flex min-h-screen">
                <Sidebar user={user} workspaces={workspaces} />
                <main className="flex-1 overflow-y-auto p-8">{children}</main>
              </div>
            </div>
          </ThemeProvider>
        </body>
      </html>
    );
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider>
          <GridBackground />
          <div className="relative z-10">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}

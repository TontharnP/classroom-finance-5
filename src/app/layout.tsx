import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { HydrationGate } from "@/components/layout/HydrationGate";
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
  title: "Classroom Finance 5.0",
  description:
    "Dashboard, Transactions, Schedule, and Students management for classroom finances",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Toaster position="top-right" />
        <HydrationGate fallback={<LoadingScreen />}>
          <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr]">
            <aside className="hidden md:block border-r bg-white/60 dark:bg-black/40 backdrop-blur">
              <Sidebar />
            </aside>
            <div className="flex min-h-screen flex-col">
              <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white/70 px-4 backdrop-blur dark:bg-black/40 md:hidden">
                <Link href="/dashboard" className="font-semibold">
                  Classroom Finance 5.0
                </Link>
                <nav className="flex gap-3 text-sm">
                  <Link href="/dashboard">Dashboard</Link>
                  <Link href="/transactions">Transactions</Link>
                  <Link href="/schedule">Schedule</Link>
                  <Link href="/students">Students</Link>
                </nav>
              </header>
              {/* Suspense fallback is also handled via route-level loading.tsx */}
              <main className="flex-1 p-4 md:p-6">{children}</main>
            </div>
          </div>
        </HydrationGate>
      </body>
    </html>
  );
}

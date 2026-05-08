import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import BottomTabNav from "../components/layout/BottomTabNav";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { HydrationGate } from "@/components/layout/HydrationGate";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

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
    <html lang="th" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <div className="ambient-bg" aria-hidden="true" />
          <Toaster position="top-right" toastOptions={{
            style: {
              borderRadius: "18px",
              background: "var(--panel-solid)",
              color: "var(--foreground)",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow-float)",
            },
          }} />
          <HydrationGate fallback={<LoadingScreen />}>
            <div className="relative min-h-dvh p-0 md:p-4 xl:p-5">
              <div className="app-shell min-h-dvh md:grid md:grid-cols-[104px_1fr] lg:grid-cols-[220px_1fr] md:rounded-[26px] xl:rounded-[30px]">
                <aside className="hidden md:block border-r" style={{ borderColor: "var(--line)" }}>
                  <Sidebar />
                </aside>
                <div className="flex min-h-dvh min-w-0 flex-col">
                  <MobileNav />
                  <main className="flex-1 w-full max-w-[1420px] min-w-0 mx-auto px-3 py-4 pb-24 sm:px-4 md:px-5 md:py-6 lg:px-7 xl:px-8 xl:py-8">{children}</main>
                  <BottomTabNav />
                </div>
              </div>
            </div>
          </HydrationGate>
        </ThemeProvider>
      </body>
    </html>
  );
}

// MobileNav is a client component rendered only on small screens

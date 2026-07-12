import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบการเงินห้องเรียน 5.0",
  description:
    "ระบบจัดการการเงินห้องเรียน รายการเงิน กำหนดการ หมวดหมู่ และข้อมูลนักเรียน",
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
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}

"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, resolvedTheme, setMode, toggleTheme } = useTheme();

  if (compact) {
    const Icon = resolvedTheme === "dark" ? Moon : Sun;
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="apple-icon-button"
        aria-label="Toggle theme"
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="apple-segmented p-1">
      {[
        { key: "light", label: "Light", icon: Sun },
        { key: "system", label: "System", icon: Monitor },
        { key: "dark", label: "Dark", icon: Moon },
      ].map((item) => {
        const Icon = item.icon;
        const active = mode === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setMode(item.key as "light" | "system" | "dark")}
            className={`apple-segment ${active ? "apple-segment-active" : ""}`}
            aria-pressed={active}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}


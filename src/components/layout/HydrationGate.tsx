"use client";
import React from "react";
import { useAppStore } from "@/lib/store";
import { DataHydrator } from "@/components/providers/DataHydrator";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function HydrationGate({ children, fallback = null }: Props) {
  const isHydrated = useAppStore((s) => s.isHydrated);

  return (
    <>
      {/* Ensure global data fetch kicks off from client */}
      <DataHydrator />
      {!isHydrated && fallback}
      {isHydrated && children}
    </>
  );
}

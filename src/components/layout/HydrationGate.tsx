"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { getRequiredBootstrapResources } from "@/lib/bootstrap";
import { useAppStore } from "@/lib/store";
import { DataHydrator } from "@/components/providers/DataHydrator";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function HydrationGate({ children, fallback = null }: Props) {
  const pathname = usePathname();
  const loadedResources = useAppStore((s) => s.loadedResources);
  const isHydrated = getRequiredBootstrapResources(pathname).every((resource) =>
    loadedResources.includes(resource)
  );

  return (
    <>
      {/* Ensure global data fetch kicks off from client */}
      <DataHydrator />
      {!isHydrated && fallback}
      {isHydrated && children}
    </>
  );
}

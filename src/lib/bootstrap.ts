export const BOOTSTRAP_RESOURCES = [
  "students",
  "schedules",
  "scheduleFolders",
  "transactions",
  "categories",
  "additionalCosts",
] as const;

export type BootstrapResource = (typeof BOOTSTRAP_RESOURCES)[number];

const ALL_RESOURCES: BootstrapResource[] = [...BOOTSTRAP_RESOURCES];

export function getRequiredBootstrapResources(pathname: string): BootstrapResource[] {
  if (pathname.startsWith("/dashboard")) {
    return ["students", "schedules", "scheduleFolders", "transactions", "additionalCosts"];
  }
  if (pathname.startsWith("/categories")) {
    return ["categories", "transactions"];
  }
  if (pathname.startsWith("/notifications")) {
    return ["students", "schedules"];
  }
  if (pathname.startsWith("/schedule")) {
    return ["students", "schedules", "scheduleFolders", "transactions", "additionalCosts"];
  }
  if (pathname.startsWith("/students")) {
    return ["students", "schedules", "scheduleFolders", "transactions", "additionalCosts"];
  }
  if (pathname.startsWith("/additional-costs")) {
    return ["students", "schedules", "transactions", "additionalCosts"];
  }
  if (pathname.startsWith("/transactions")) {
    return ALL_RESOURCES;
  }
  return ALL_RESOURCES;
}

import type { DataBundle, Schedule, ScheduleFolder } from "@/types";

export function getSortedFolders(folders: ScheduleFolder[]) {
  return [...folders].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

export function getSortedSchedules(schedules: Schedule[]) {
  return [...schedules].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.startDate !== b.startDate) return b.startDate.localeCompare(a.startDate);
    return a.name.localeCompare(b.name);
  });
}

export function getFolderPath(folderId: string | undefined, folders: ScheduleFolder[]) {
  if (!folderId) return "";
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const names: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(folderId);

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return names.join(" / ");
}

export function getFolderTreeOrder(folders: ScheduleFolder[]) {
  const children = new Map<string, ScheduleFolder[]>();
  for (const folder of folders) {
    const key = folder.parentId || "root";
    children.set(key, [...(children.get(key) || []), folder]);
  }
  for (const [key, list] of children) {
    children.set(key, getSortedFolders(list));
  }

  const ordered: ScheduleFolder[] = [];
  const visit = (parentId = "root") => {
    for (const folder of children.get(parentId) || []) {
      ordered.push(folder);
      visit(folder.id);
    }
  };
  visit();
  return ordered;
}

export function getHiddenFolderIds(folders: ScheduleFolder[]) {
  const byParent = new Map<string, ScheduleFolder[]>();
  for (const folder of folders) {
    const key = folder.parentId || "root";
    byParent.set(key, [...(byParent.get(key) || []), folder]);
  }

  const hidden = new Set<string>();
  const visit = (folder: ScheduleFolder, inheritedHidden: boolean) => {
    const isHidden = inheritedHidden || Boolean(folder.isHidden);
    if (isHidden) hidden.add(folder.id);
    for (const child of byParent.get(folder.id) || []) {
      visit(child, isHidden);
    }
  };

  for (const folder of byParent.get("root") || []) {
    visit(folder, false);
  }
  return hidden;
}

export function getSchedulesInSystemOrder(data: DataBundle, options: { includeHidden?: boolean } = {}) {
  const folders = getFolderTreeOrder(data.scheduleFolders);
  const folderRank = new Map(folders.map((folder, index) => [folder.id, index]));
  const hiddenFolderIds = options.includeHidden ? new Set<string>() : getHiddenFolderIds(data.scheduleFolders);

  return data.schedules.filter((schedule) => !hiddenFolderIds.has(schedule.folderId)).sort((a, b) => {
    const aRank = folderRank.get(a.folderId) ?? Number.MAX_SAFE_INTEGER;
    const bRank = folderRank.get(b.folderId) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.startDate !== b.startDate) return b.startDate.localeCompare(a.startDate);
    return a.name.localeCompare(b.name);
  });
}

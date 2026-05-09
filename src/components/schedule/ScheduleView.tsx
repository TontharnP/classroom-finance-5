"use client";
import { useState, useEffect, memo, useCallback, use, useMemo, type DragEvent } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Folder, FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store";
import type { DataBundle, Schedule, ScheduleFolder } from "@/types";
import { countStudentPaymentStatus } from "@/lib/calculations";
import { getFolderPath, getSortedSchedules } from "@/lib/schedules/grouping";
import { createScheduleFolder, deleteScheduleFolder, updateScheduleFolder } from "@/lib/supabase/scheduleFolders";
import { updateSchedule as updateScheduleRemote } from "@/lib/supabase/schedules";
import { dbScheduleFolderToScheduleFolder, dbScheduleToSchedule } from "@/lib/supabase/adapter";
import { AddScheduleModal } from "./AddScheduleModal";
import { ScheduleDetailModal } from "./ScheduleDetailModal";
import { ScheduleCalendar } from "./ScheduleCalendar";

const ScheduleCard = memo(({
  schedule,
  data,
  onClick,
  onDragStart,
  onDropOnSchedule,
}: {
  schedule: Schedule;
  data: DataBundle;
  onClick: () => void;
  onDragStart: () => void;
  onDropOnSchedule: (targetScheduleId: string) => void;
}) => {
  const status = countStudentPaymentStatus(data, schedule.id);
  const totalAmount = schedule.amountPerItem * schedule.studentIds.length;
  const collectedAmount = data.transactions
    .filter((t) => t.source === "schedule" && t.scheduleId === schedule.id)
    .reduce((sum, t) => sum + t.amount, 0);

  function getTimeLeft(schedule: Schedule): { label: string; tone: "active" | "ended" | "upcoming" } {
    if (!schedule.endDate) return { label: "", tone: "active" };
    const now = new Date();
    const end = new Date(schedule.endDate + "T23:59:59");
    if (now > end) return { label: "สิ้นสุดแล้ว", tone: "ended" };
    const ms = end.getTime() - now.getTime();
    const days = Math.floor(ms / (24 * 3600 * 1000));
    const hours = Math.floor((ms % (24 * 3600 * 1000)) / (3600 * 1000));
    if (days > 0) return { label: `เหลือ ${days} วัน ${hours} ชม.`, tone: "active" };
    const minutes = Math.floor((ms % (3600 * 1000)) / (60 * 1000));
    return { label: `เหลือ ${hours} ชม. ${minutes} นาที`, tone: "active" };
  }

  const timeLeft = getTimeLeft(schedule);

  return (
    <div
      draggable
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        event.dataTransfer.setData("text/plain", schedule.id);
        onDragStart();
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDropOnSchedule(schedule.id);
      }}
      onClick={onClick}
      className="apple-card hover-lift min-w-0 cursor-grab rounded-[22px] p-3 hover:shadow-xl active:cursor-grabbing sm:p-4"
    >
      <h3 className="mb-2 truncate font-semibold" title={schedule.name}>{schedule.name}</h3>
      <div className="space-y-1 text-sm text-muted">
        <div>จำนวน/รายการ: {schedule.amountPerItem.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
        <div>
          เก็บได้: <span className="font-medium text-emerald-600">{collectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> / {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
        </div>
        <div className="text-xs">ชำระครบ {status.paid} / {schedule.studentIds.length} คน</div>
        {timeLeft.label && (
          <div className={`mt-1 text-xs font-medium ${timeLeft.tone === "ended" ? "text-rose-600" : "text-amber-600"}`}>
            {timeLeft.label}
          </div>
        )}
      </div>
    </div>
  );
});
ScheduleCard.displayName = "ScheduleCard";

const EXPANDED_FOLDERS_STORAGE_KEY = "schedule.expandedFolderIds";

interface ScheduleViewProps {
  searchParamsPromise?: Promise<{ scheduleId?: string; status?: string }>;
}

export function ScheduleView({ searchParamsPromise }: ScheduleViewProps) {
  const searchParams = searchParamsPromise ? use(searchParamsPromise) : undefined;
  const data = useAppStore((state) => state.data);
  const addScheduleFolder = useAppStore((state) => state.addScheduleFolder);
  const updateScheduleFolderLocal = useAppStore((state) => state.updateScheduleFolder);
  const deleteScheduleFolderLocal = useAppStore((state) => state.deleteScheduleFolder);
  const updateScheduleLocal = useAppStore((state) => state.updateSchedule);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [initialStatusFilter, setInitialStatusFilter] = useState<"paid" | "unpaid" | undefined>(undefined);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [draggedScheduleId, setDraggedScheduleId] = useState<string | null>(null);

  const foldersByParent = useMemo(() => {
    const map = new Map<string, ScheduleFolder[]>();
    for (const folder of data.scheduleFolders) {
      const key = folder.parentId || "root";
      map.set(key, [...(map.get(key) || []), folder]);
    }
    for (const [key, folders] of map) {
      map.set(key, [...folders].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
    }
    return map;
  }, [data.scheduleFolders]);

  useEffect(() => {
    const folderIds = new Set(data.scheduleFolders.map((folder) => folder.id));
    const saved = window.localStorage.getItem(EXPANDED_FOLDERS_STORAGE_KEY);
    if (!saved) {
      setExpandedFolders(folderIds);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Invalid expanded folder state");
      setExpandedFolders(new Set(parsed.filter((id): id is string => typeof id === "string" && folderIds.has(id))));
    } catch {
      setExpandedFolders(folderIds);
    }
  }, [data.scheduleFolders]);

  useEffect(() => {
    if (searchParams?.scheduleId && data.schedules.length > 0) {
      const schedule = data.schedules.find((s) => s.id === searchParams.scheduleId);
      if (schedule) {
        setSelectedSchedule(schedule);
        if (searchParams.status === "paid" || searchParams.status === "unpaid") {
          setInitialStatusFilter(searchParams.status);
        }
      }
    }
  }, [searchParams, data.schedules]);

  const handleSelectSchedule = useCallback((schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setInitialStatusFilter(undefined);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedSchedule(null);
    setInitialStatusFilter(undefined);
  }, []);

  const createFolder = async (parentId?: string) => {
    const name = window.prompt("ชื่อโฟลเดอร์");
    if (!name?.trim()) return;
    try {
      const siblings = data.scheduleFolders.filter((folder) => (folder.parentId || "") === (parentId || ""));
      const created = await createScheduleFolder({
        name: name.trim(),
        parent_id: parentId,
        sort_order: siblings.length,
      });
      addScheduleFolder(dbScheduleFolderToScheduleFolder(created));
      toast.success("สร้างโฟลเดอร์เรียบร้อย");
    } catch (error) {
      console.error(error);
      toast.error("สร้างโฟลเดอร์ไม่สำเร็จ");
    }
  };

  const renameFolder = async (folder: ScheduleFolder) => {
    const name = window.prompt("ชื่อโฟลเดอร์", folder.name);
    if (!name?.trim() || name.trim() === folder.name) return;
    try {
      const updated = await updateScheduleFolder(folder.id, { name: name.trim() });
      updateScheduleFolderLocal(folder.id, dbScheduleFolderToScheduleFolder(updated));
      toast.success("เปลี่ยนชื่อโฟลเดอร์เรียบร้อย");
    } catch (error) {
      console.error(error);
      toast.error("เปลี่ยนชื่อโฟลเดอร์ไม่สำเร็จ");
    }
  };

  const toggleFolderHidden = async (folder: ScheduleFolder) => {
    try {
      const updated = await updateScheduleFolder(folder.id, { is_hidden: !folder.isHidden });
      updateScheduleFolderLocal(folder.id, dbScheduleFolderToScheduleFolder(updated));
      toast.success(folder.isHidden ? "แสดงโฟลเดอร์แล้ว" : "ซ่อนโฟลเดอร์แล้ว");
    } catch (error) {
      console.error(error);
      toast.error("เปลี่ยนสถานะโฟลเดอร์ไม่สำเร็จ");
    }
  };

  const removeFolder = async (folder: ScheduleFolder) => {
    if (!window.confirm(`ลบโฟลเดอร์ "${folder.name}"? ต้องเป็นโฟลเดอร์ว่างเท่านั้น`)) return;
    try {
      await deleteScheduleFolder(folder.id);
      deleteScheduleFolderLocal(folder.id);
      toast.success("ลบโฟลเดอร์เรียบร้อย");
    } catch (error) {
      console.error(error);
      toast.error("ลบไม่ได้: ย้ายกำหนดการหรือโฟลเดอร์ย่อยออกก่อน");
    }
  };

  const moveScheduleToFolder = async (folderId: string, beforeScheduleId?: string) => {
    if (!draggedScheduleId) return;
    const dragged = data.schedules.find((schedule) => schedule.id === draggedScheduleId);
    if (!dragged) return;

    const folderSchedules = getSortedSchedules(data.schedules.filter((schedule) => schedule.folderId === folderId && schedule.id !== dragged.id));
    const insertAt = beforeScheduleId
      ? Math.max(0, folderSchedules.findIndex((schedule) => schedule.id === beforeScheduleId))
      : folderSchedules.length;
    const nextSchedules = [
      ...folderSchedules.slice(0, insertAt),
      { ...dragged, folderId },
      ...folderSchedules.slice(insertAt),
    ];

    try {
      await Promise.all(nextSchedules.map((schedule, index) =>
        updateScheduleRemote(schedule.id, {
          folder_id: folderId,
          sort_order: index,
        }).then((updated) => updateScheduleLocal(schedule.id, dbScheduleToSchedule(updated)))
      ));
      toast.success("ย้ายกำหนดการเรียบร้อย");
    } catch (error) {
      console.error(error);
      toast.error("ย้ายกำหนดการไม่สำเร็จ");
    } finally {
      setDraggedScheduleId(null);
    }
  };

  const renderFolder = (folder: ScheduleFolder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const schedules = getSortedSchedules(data.schedules.filter((schedule) => schedule.folderId === folder.id));
    const children = foldersByParent.get(folder.id) || [];

    return (
      <div key={folder.id} className="apple-card overflow-hidden rounded-[24px]">
        <div
          className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 border-b px-3 py-3 sm:flex"
          style={{ borderColor: "var(--line)", paddingLeft: `${12 + depth * 18}px` }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            moveScheduleToFolder(folder.id);
          }}
        >
          <button
            type="button"
            onClick={() => {
              const next = new Set(expandedFolders);
              if (next.has(folder.id)) next.delete(folder.id);
              else next.add(folder.id);
              setExpandedFolders(next);
              window.localStorage.setItem(EXPANDED_FOLDERS_STORAGE_KEY, JSON.stringify([...next]));
            }}
            className="apple-icon-button h-8 w-8 rounded-xl"
            aria-label="เปิดปิดโฟลเดอร์"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <Folder className={`h-4 w-4 ${folder.isHidden ? "text-zinc-400" : "text-amber-500"}`} />
          <div className="min-w-0 flex-1 truncate font-medium" title={getFolderPath(folder.id, data.scheduleFolders)}>
            {folder.name}
          </div>
          {folder.isHidden && (
            <span className="rounded-full px-2 py-0.5 text-xs text-muted" style={{ background: "var(--panel-soft)" }}>
              ซ่อน
            </span>
          )}
          <div className="col-span-full flex justify-end gap-1 sm:ml-auto">
            <button onClick={() => toggleFolderHidden(folder)} className="apple-icon-button h-8 w-8 rounded-xl" aria-label={folder.isHidden ? "แสดงโฟลเดอร์" : "ซ่อนโฟลเดอร์"}>
              {folder.isHidden ? <EyeOff className="h-4 w-4 text-zinc-500" /> : <Eye className="h-4 w-4" />}
            </button>
            <button onClick={() => createFolder(folder.id)} className="apple-icon-button h-8 w-8 rounded-xl" aria-label="เพิ่มโฟลเดอร์ย่อย">
              <FolderPlus className="h-4 w-4" />
            </button>
            <button onClick={() => renameFolder(folder)} className="apple-icon-button h-8 w-8 rounded-xl" aria-label="แก้ไขชื่อ">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => removeFolder(folder)} className="apple-icon-button h-8 w-8 rounded-xl" aria-label="ลบโฟลเดอร์">
              <Trash2 className="h-4 w-4 text-rose-600" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-3 p-3">
            {children.map((child) => renderFolder(child, depth + 1))}
            <div
              className="grid min-h-24 gap-3 rounded-[20px] border border-dashed p-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
              style={{ borderColor: "var(--line-strong)", background: "var(--panel-soft)" }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                moveScheduleToFolder(folder.id);
              }}
            >
              {schedules.length === 0 && (
                <div className="col-span-full flex items-center justify-center text-sm text-zinc-500">
                  ลากกำหนดการมาวางในโฟลเดอร์นี้
                </div>
              )}
              {schedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  data={data}
                  onClick={() => handleSelectSchedule(schedule)}
                  onDragStart={() => setDraggedScheduleId(schedule.id)}
                  onDropOnSchedule={(targetScheduleId) => moveScheduleToFolder(folder.id, targetScheduleId)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const rootFolders = foldersByParent.get("root") || [];

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:gap-5 md:gap-6">
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <button
          onClick={() => createFolder()}
          className="apple-ghost-button px-3 py-2 text-sm"
        >
          <FolderPlus className="h-4 w-4" />
          เพิ่มโฟลเดอร์
        </button>
        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={data.scheduleFolders.length === 0}
          className="apple-button px-3 py-2 text-sm disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          เพิ่มกำหนดการ
        </button>
      </div>

      <AddScheduleModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      {selectedSchedule && (
        <ScheduleDetailModal
          isOpen={!!selectedSchedule}
          onClose={handleCloseModal}
          schedule={data.schedules.find((schedule) => schedule.id === selectedSchedule.id) || selectedSchedule}
          initialStatusFilter={initialStatusFilter}
        />
      )}

      <div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)]">
          <div className="order-2 space-y-2 sm:space-y-3 xl:order-1">
            {rootFolders.length === 0 ? (
              <div className="apple-card p-6 text-center text-muted">
                ยังไม่มีโฟลเดอร์ — กดเพิ่มโฟลเดอร์เพื่อเริ่มจัดกลุ่มกำหนดการ
              </div>
            ) : (
              rootFolders.map((folder) => renderFolder(folder))
            )}
          </div>

          <div className="apple-card order-1 p-3 sm:p-5 xl:order-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold sm:text-lg">ปฏิทินกำหนดการ</h2>
                <p className="text-xs text-muted">เลือกวันเพื่อดูรายการและสถานะการเก็บเงิน</p>
              </div>
            </div>
            <ScheduleCalendar onScheduleClick={(schedule) => setSelectedSchedule(schedule)} />
          </div>
        </div>
      </div>
    </div>
  );
}

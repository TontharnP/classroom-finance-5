"use client";
import { useState, memo, useMemo } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Bell,
  CheckCircle2,
  CheckSquare,
  FileDown,
  MessageCircleWarning,
  Plus,
  Search,
  Square,
  Upload,
  User,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store";
import { sendScheduleLineReminders } from "@/lib/supabase/schedules";
import type { Student } from "@/types";
import { AddStudentModal } from "./AddStudentModal";
import { StudentDetailModal } from "./StudentDetailModal";

type StudentStats = {
  paidTotal: number;
  leftTotal: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  totalSchedules: number;
  unpaidScheduleIds: string[];
  hasLineId: boolean;
};

type StatusFilter = "all" | "owing" | "paid" | "overdue" | "missing-line";
type SortMode = "number" | "owed" | "overdue" | "name";

const emptyStats: StudentStats = {
  paidTotal: 0,
  leftTotal: 0,
  paidCount: 0,
  unpaidCount: 0,
  overdueCount: 0,
  totalSchedules: 0,
  unpaidScheduleIds: [],
  hasLineId: false,
};

const statusFilters: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "ทั้งหมด" },
  { key: "owing", label: "ค้างชำระ" },
  { key: "overdue", label: "เลยกำหนด" },
  { key: "missing-line", label: "ไม่มี LINE" },
  { key: "paid", label: "ครบแล้ว" },
];

const sortOptions: Array<{ key: SortMode; label: string }> = [
  { key: "number", label: "เลขที่" },
  { key: "owed", label: "ยอดค้างสูงสุด" },
  { key: "overdue", label: "เลยกำหนดมากสุด" },
  { key: "name", label: "ชื่อ" },
];

const StudentCard = memo(({
  student,
  stats,
  isSelected,
  selectMode,
  onClick,
  onToggleSelect,
}: {
  student: Student;
  stats: StudentStats;
  isSelected: boolean;
  selectMode: boolean;
  onClick: () => void;
  onToggleSelect: () => void;
}) => {
  const statusTone = stats.overdueCount > 0 ? "overdue" : stats.leftTotal > 0 ? "owing" : "paid";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={selectMode ? onToggleSelect : onClick}
      className={`apple-card hover-lift group min-w-0 cursor-pointer p-3 hover:shadow-xl ${
        isSelected ? "ring-2 ring-blue-500/70" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {student.avatarUrl ? (
            <img
              src={student.avatarUrl}
              alt={student.firstName}
              className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16" style={{ background: "var(--primary-soft)" }}>
              <User className="h-7 w-7 text-[var(--primary)]" />
            </div>
          )}
          {selectMode && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleSelect();
              }}
              className="absolute -right-2 -top-2 rounded-full bg-[var(--panel-solid)] text-blue-600 shadow-lg"
              aria-label={isSelected ? "ยกเลิกเลือกนักเรียน" : "เลือกนักเรียน"}
            >
              {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-[var(--muted-strong)]">เลขที่ {student.number}</div>
            {!stats.hasLineId && (
              <MessageCircleWarning className="h-4 w-4 shrink-0 text-amber-500" aria-label="ไม่มี LINE ID" />
            )}
          </div>
          <div className="truncate text-sm font-semibold sm:text-base" title={`${student.prefix} ${student.firstName} ${student.lastName}`}>
            {student.prefix} {student.firstName} {student.lastName}
          </div>
          <div className="truncate text-xs font-medium text-[var(--muted-strong)]">{student.nickName || "ไม่มีชื่อเล่น"}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div
          className="rounded-2xl p-2"
          style={{
            background:
              statusTone === "paid"
                ? "color-mix(in srgb, var(--success) 18%, transparent)"
                : statusTone === "overdue"
                  ? "color-mix(in srgb, var(--danger) 16%, transparent)"
                  : "color-mix(in srgb, var(--warning) 18%, transparent)",
          }}
        >
          <div className="font-semibold text-[var(--muted-strong)]">ยอดค้าง</div>
          <div className={statusTone === "paid" ? "font-bold text-emerald-600" : statusTone === "overdue" ? "font-bold text-rose-600" : "font-bold text-amber-600"}>
            {stats.leftTotal.toLocaleString()} ฿
          </div>
        </div>
        <div className="rounded-2xl p-2" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
          <div className="font-semibold text-[var(--muted-strong)]">กำหนดการ</div>
          <div className="font-bold text-[var(--primary)]">{stats.paidCount}/{stats.totalSchedules}</div>
        </div>
        <div className="apple-soft col-span-2 rounded-2xl p-2">
          <div className="flex items-center justify-between gap-2 text-[var(--muted-strong)]">
            <span className="font-medium">ค้าง {stats.unpaidCount} รายการ</span>
            <span className={stats.overdueCount > 0 ? "font-bold text-rose-600" : "font-bold text-emerald-600"}>
              เลยกำหนด {stats.overdueCount}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
StudentCard.displayName = "StudentCard";

export function StudentsGrid() {
  const storeData = useAppStore((s) => s.data);
  const addStudent = useAppStore((s) => s.addStudent);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("number");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  const statsByStudent = useMemo(() => {
    const paidBySchedule: Record<string, Record<string, number>> = {};
    for (const t of storeData.transactions) {
      if (t.source !== "schedule" || !t.scheduleId || !t.studentId) continue;
      paidBySchedule[t.scheduleId] ||= {};
      paidBySchedule[t.scheduleId][t.studentId] = (paidBySchedule[t.scheduleId][t.studentId] || 0) + t.amount;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result: Record<string, StudentStats> = {};
    for (const student of storeData.students) {
      let targetTotal = 0;
      let paidCappedTotal = 0;
      let paidCount = 0;
      let overdueCount = 0;
      const unpaidScheduleIds: string[] = [];
      const schedulesForStudent = storeData.schedules.filter((s) => s.studentIds.includes(student.id));

      for (const schedule of schedulesForStudent) {
        targetTotal += schedule.amountPerItem;
        const paidForThis = paidBySchedule[schedule.id]?.[student.id] || 0;
        const remaining = Math.max(0, schedule.amountPerItem - paidForThis);
        paidCappedTotal += Math.min(paidForThis, schedule.amountPerItem);

        if (remaining === 0) {
          paidCount += 1;
        } else {
          unpaidScheduleIds.push(schedule.id);
          if (schedule.endDate) {
            const dueDate = new Date(schedule.endDate);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate < today) overdueCount += 1;
          }
        }
      }

      const leftTotal = Math.max(0, Math.round((targetTotal - paidCappedTotal) * 100) / 100);
      result[student.id] = {
        paidTotal: Math.round(paidCappedTotal * 100) / 100,
        leftTotal,
        paidCount,
        unpaidCount: unpaidScheduleIds.length,
        overdueCount,
        totalSchedules: schedulesForStudent.length,
        unpaidScheduleIds,
        hasLineId: Boolean(student.lineUserId),
      };
    }
    return result;
  }, [storeData.transactions, storeData.students, storeData.schedules]);

  const summary = useMemo(() => {
    const stats = storeData.students.map((student) => statsByStudent[student.id] || { ...emptyStats, hasLineId: Boolean(student.lineUserId) });
    return {
      totalStudents: storeData.students.length,
      owingStudents: stats.filter((item) => item.leftTotal > 0).length,
      overdueStudents: stats.filter((item) => item.overdueCount > 0).length,
      totalOutstanding: stats.reduce((sum, item) => sum + item.leftTotal, 0),
      lineReadyUnpaid: storeData.students.filter((student) => {
        const statsForStudent = statsByStudent[student.id];
        return Boolean(student.lineUserId) && Boolean(statsForStudent && statsForStudent.leftTotal > 0);
      }).length,
    };
  }, [storeData.students, statsByStudent]);

  const visibleStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = storeData.students.filter((student) => {
      const stats = statsByStudent[student.id] || emptyStats;
      const searchable = `${student.number} ${student.prefix} ${student.firstName} ${student.lastName} ${student.nickName || ""}`.toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      if (!matchesQuery) return false;

      if (statusFilter === "owing") return stats.leftTotal > 0;
      if (statusFilter === "paid") return stats.totalSchedules > 0 && stats.leftTotal === 0;
      if (statusFilter === "overdue") return stats.overdueCount > 0;
      if (statusFilter === "missing-line") return stats.leftTotal > 0 && !student.lineUserId;
      return true;
    });

    return filtered.sort((a, b) => {
      const aStats = statsByStudent[a.id] || emptyStats;
      const bStats = statsByStudent[b.id] || emptyStats;
      if (sortMode === "owed") return bStats.leftTotal - aStats.leftTotal || a.number - b.number;
      if (sortMode === "overdue") return bStats.overdueCount - aStats.overdueCount || bStats.leftTotal - aStats.leftTotal || a.number - b.number;
      if (sortMode === "name") return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "th");
      return a.number - b.number;
    });
  }, [storeData.students, statsByStudent, searchTerm, statusFilter, sortMode]);

  const selectedVisibleCount = visibleStudents.filter((student) => selectedIds.has(student.id)).length;

  const toggleSelect = (studentId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortMode("number");
  };

  const handleBulkReminders = async () => {
    const selectedStudents = storeData.students.filter((student) => selectedIds.has(student.id));
    const groups: Record<string, string[]> = {};
    let skippedMissingLine = 0;
    let skippedNoDebt = 0;

    for (const student of selectedStudents) {
      const stats = statsByStudent[student.id] || emptyStats;
      if (!student.lineUserId) {
        skippedMissingLine += 1;
        continue;
      }
      if (stats.unpaidScheduleIds.length === 0) {
        skippedNoDebt += 1;
        continue;
      }
      for (const scheduleId of stats.unpaidScheduleIds) {
        groups[scheduleId] ||= [];
        groups[scheduleId].push(student.id);
      }
    }

    const entries = Object.entries(groups);
    if (entries.length === 0) {
      toast.error("ไม่มีนักเรียนที่พร้อมส่งแจ้งเตือน");
      return;
    }

    setIsSendingBulk(true);
    try {
      let sent = 0;
      let failed = 0;
      let apiSkipped = 0;
      for (const [scheduleId, studentIds] of entries) {
        const result = await sendScheduleLineReminders(scheduleId, studentIds);
        sent += result.sent;
        failed += result.failed;
        apiSkipped += result.skippedMissingLineId + result.alreadyPaid;
      }

      toast.success(
        `ส่งแจ้งเตือนแล้ว ${sent} รายการ` +
          (skippedMissingLine ? ` • ไม่มี LINE ${skippedMissingLine} คน` : "") +
          (skippedNoDebt ? ` • ไม่มีหนี้ ${skippedNoDebt} คน` : "") +
          (apiSkipped ? ` • ข้าม ${apiSkipped}` : "") +
          (failed ? ` • ล้มเหลว ${failed}` : "")
      );
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ส่งแจ้งเตือนไม่สำเร็จ");
    } finally {
      setIsSendingBulk(false);
    }
  };

  return (
    <div className="flex flex-col">
      <AddStudentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      {selectedStudent && (
        <StudentDetailModal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          student={selectedStudent}
        />
      )}

      <div className="grid shrink-0 gap-3 pb-3 sm:pb-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard icon={<UsersRound className="h-5 w-5" />} label="นักเรียนทั้งหมด" value={`${summary.totalStudents} คน`} tone="blue" />
          <SummaryCard icon={<WalletCards className="h-5 w-5" />} label="ค้างชำระ" value={`${summary.owingStudents} คน`} detail={`${summary.totalOutstanding.toLocaleString()} ฿`} tone="amber" />
          <SummaryCard icon={<AlertTriangle className="h-5 w-5" />} label="เลยกำหนด" value={`${summary.overdueStudents} คน`} tone="rose" />
          <SummaryCard icon={<Bell className="h-5 w-5" />} label="พร้อมเตือน LINE" value={`${summary.lineReadyUnpaid} คน`} tone="cyan" />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="ชำระครบ" value={`${Math.max(0, summary.totalStudents - summary.owingStudents)} คน`} tone="emerald" />
        </div>

        <div className="apple-card grid gap-2 p-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto] lg:items-center">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ค้นหาชื่อ ชื่อเล่น หรือเลขที่"
              className="w-full rounded-full border py-2 pl-9 pr-9 text-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="ล้างคำค้นหา"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="apple-segmented overflow-x-auto p-1">
            {statusFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`apple-segment whitespace-nowrap px-3 py-1.5 text-xs ${statusFilter === filter.key ? "active" : ""}`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="apple-ghost-button gap-2 px-3 py-2 text-sm">
              <ArrowUpDown className="h-4 w-4" />
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="border-0 bg-transparent p-0 text-sm font-semibold outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setSelectMode((current) => !current);
                setSelectedIds(new Set());
              }}
              className={selectMode ? "apple-button px-3 py-2 text-sm" : "apple-ghost-button px-3 py-2 text-sm"}
            >
              {selectMode ? "เลือกอยู่" : "เลือกหลายคน"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="apple-button col-span-2 px-4 py-2 text-sm sm:col-span-1"
          >
            <Plus className="h-4 w-4" /> เพิ่มนักเรียนเดี่ยว
          </button>
          <label className="apple-ghost-button cursor-pointer px-3 py-2 text-sm">
            <Upload className="h-4 w-4" /> นำเข้า CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsImporting(true);
                try {
                  const text = await file.text();
                  const { parseCSV } = await import("@/lib/csv");
                  const rows = parseCSV(text);
                  if (rows.length < 2) throw new Error("ไฟล์ไม่มีข้อมูล");
                  const header = rows[0].map((h) => h.trim().toLowerCase());
                  const required = ["prefix", "first_name", "last_name", "nick_name", "number"];
                  const missing = required.filter((r) => !header.includes(r));
                  if (missing.length) throw new Error("หัวข้อคอลัมน์ไม่ถูกต้อง ต้องมี: " + required.join(","));
                  const prefixIdx = header.indexOf("prefix");
                  const firstIdx = header.indexOf("first_name");
                  const lastIdx = header.indexOf("last_name");
                  const nickIdx = header.indexOf("nick_name");
                  const numIdx = header.indexOf("number");

                  const existingNumbers = new Set(storeData.students.map((s) => s.number));
                  const seenNumbers = new Set<number>();
                  const toCreate: Student[] = [];
                  let invalid = 0;
                  let duplicates = 0;

                  for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length < header.length) { invalid++; continue; }
                    const numberVal = Number(row[numIdx]);
                    if (!Number.isFinite(numberVal) || numberVal <= 0) { invalid++; continue; }
                    if (existingNumbers.has(numberVal) || seenNumbers.has(numberVal)) { duplicates++; continue; }
                    seenNumbers.add(numberVal);
                    toCreate.push({
                      id: "",
                      prefix: row[prefixIdx].trim(),
                      firstName: row[firstIdx].trim(),
                      lastName: row[lastIdx].trim(),
                      nickName: row[nickIdx].trim() || undefined,
                      number: numberVal,
                    });
                  }

                  const { createStudents } = await import("@/lib/supabase/students");
                  const { dbStudentToStudent } = await import("@/lib/supabase/adapter");
                  const created = await createStudents(toCreate.map(s => ({
                    prefix: s.prefix,
                    first_name: s.firstName,
                    last_name: s.lastName,
                    nick_name: s.nickName,
                    number: s.number,
                    avatar_url: undefined,
                  })));
                  created.map(dbStudentToStudent).forEach(addStudent);
                  const msg = `นำเข้า ${created.length} คนสำเร็จ` + (duplicates ? ` • ข้ามซ้ำ ${duplicates}` : "") + (invalid ? ` • ไม่ถูกต้อง ${invalid}` : "");
                  toast.success(msg);
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "นำเข้าไม่สำเร็จ");
                } finally {
                  setIsImporting(false);
                  e.target.value = "";
                }
              }}
              disabled={isImporting}
            />
          </label>
          <button
            onClick={async () => {
              const { toCSV } = await import("@/lib/csv");
              const rows = [
                ["prefix","first_name","last_name","nick_name","number"],
                ["นาย","สมชาย","ใจดี","บอล","1"],
                ["นางสาว","สมศรี","ใจงาม","ฝน","2"],
              ];
              const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "students-template.csv";
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
            className="apple-ghost-button px-3 py-2 text-sm"
          >
            <FileDown className="h-4 w-4" /> ดาวน์โหลดเทมเพลต CSV
          </button>
          {isImporting && <span className="col-span-2 self-center text-center text-sm text-blue-600 sm:col-span-1">กำลังนำเข้า...</span>}

          {selectMode && (
            <div className="apple-soft col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2 sm:ml-auto">
              <span className="text-sm font-semibold">เลือก {selectedIds.size} คน • แสดงอยู่ {selectedVisibleCount} คน</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set(visibleStudents.map((student) => student.id)))}
                  className="apple-ghost-button px-3 py-2 text-sm"
                >
                  เลือกที่แสดง
                </button>
                <button
                  type="button"
                  onClick={handleBulkReminders}
                  disabled={selectedIds.size === 0 || isSendingBulk}
                  className="apple-button px-3 py-2 text-sm disabled:opacity-50"
                >
                  <Bell className="h-4 w-4" />
                  {isSendingBulk ? "กำลังส่ง..." : "เตือน LINE"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="-mx-1 px-1 pb-4">
        <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsAddModalOpen(true)}
            className="apple-card hover-lift flex min-h-[160px] cursor-pointer flex-col items-center justify-center border-2 border-dashed p-3 hover:shadow-xl"
          >
            <Plus className="mb-2 h-8 w-8 text-zinc-400" />
            <div className="text-sm font-medium text-muted">เพิ่มนักเรียน</div>
          </motion.div>

          {storeData.students.length === 0 && (
            <div className="apple-card col-span-full p-6 text-center text-muted">
              ยังไม่มีนักเรียนในระบบ กดปุ่มเพิ่มนักเรียนหรือนำเข้า CSV เพื่อเริ่มต้น
            </div>
          )}

          {storeData.students.length > 0 && visibleStudents.length === 0 && (
            <div className="apple-card col-span-full p-6 text-center">
              <div className="font-semibold">ไม่พบนักเรียนตามเงื่อนไข</div>
              <div className="mt-1 text-sm text-muted">ลองล้างคำค้นหา ตัวกรอง หรือการเรียงลำดับ</div>
              <button type="button" onClick={clearFilters} className="apple-button mt-4 px-4 py-2 text-sm">
                ล้างตัวกรอง
              </button>
            </div>
          )}

          {visibleStudents.map((student) => {
            const stats = statsByStudent[student.id] || { ...emptyStats, hasLineId: Boolean(student.lineUserId) };
            return (
              <StudentCard
                key={student.id}
                student={student}
                stats={stats}
                isSelected={selectedIds.has(student.id)}
                selectMode={selectMode}
                onToggleSelect={() => toggleSelect(student.id)}
                onClick={() => setSelectedStudent(student)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  tone: "blue" | "amber" | "rose" | "cyan" | "emerald";
}) {
  const toneClass = {
    blue: "text-blue-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    cyan: "text-cyan-600",
    emerald: "text-emerald-600",
  }[tone];

  return (
    <div className="apple-card flex min-w-0 items-center gap-2 p-2.5 sm:gap-3 sm:p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl sm:h-10 sm:w-10 ${toneClass}`} style={{ background: "var(--primary-soft)" }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold text-[var(--muted-strong)] sm:text-xs">{label}</div>
        <div className={`truncate text-base font-bold sm:text-lg ${toneClass}`}>{value}</div>
        {detail && <div className="truncate text-[11px] font-medium text-[var(--muted)] sm:text-xs">{detail}</div>}
      </div>
    </div>
  );
}

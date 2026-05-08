"use client";
import { useState, memo, useMemo } from "react";
import { Plus, User, Upload, FileDown } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { Student } from "@/types";
import { AddStudentModal } from "./AddStudentModal";
import { StudentDetailModal } from "./StudentDetailModal";

type StudentStats = {
  paidTotal: number;
  leftTotal: number;
  paidCount: number;
  totalSchedules: number;
};

const StudentCard = memo(({ student, stats, onClick }: { student: Student; stats: StudentStats; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className="apple-card hover-lift group min-w-0 cursor-pointer p-3 sm:p-4 hover:shadow-xl"
  >
    <div className="mb-3 flex items-center justify-center">
      {student.avatarUrl ? (
        <img
          src={student.avatarUrl}
          alt={student.firstName}
          className="h-16 w-16 rounded-full object-cover sm:h-20 sm:w-20"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl sm:h-20 sm:w-20" style={{ background: "var(--primary-soft)" }}>
          <User className="h-8 w-8 text-[var(--primary)] sm:h-10 sm:w-10" />
        </div>
      )}
    </div>
    <div className="min-w-0 text-center">
      <div className="text-xs text-muted">เลขที่ {student.number}</div>
      <div className="truncate font-medium" title={`${student.prefix} ${student.firstName} ${student.lastName}`}>
        {student.prefix} {student.firstName}
      </div>
      <div className="truncate text-sm text-muted">{student.nickName}</div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-2xl p-2 text-emerald-700 dark:text-emerald-300" style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)" }}>
        <div className="opacity-80">จ่ายแล้ว</div>
        <div className="font-semibold">{stats.paidTotal.toLocaleString()} ฿</div>
      </div>
      <div className="rounded-2xl p-2 text-amber-700 dark:text-amber-300" style={{ background: "color-mix(in srgb, var(--warning) 12%, transparent)" }}>
        <div className="opacity-80">ค้าง</div>
        <div className="font-semibold">{stats.leftTotal.toLocaleString()} ฿</div>
      </div>
      <div className="apple-soft col-span-2 rounded-2xl p-2 text-muted">
        <div className="flex items-center justify-between">
          <span className="opacity-80">สถานะกำหนดการ</span>
          <span className="shrink-0 pl-2 font-semibold">{stats.paidCount}/{stats.totalSchedules}</span>
        </div>
      </div>
    </div>
  </motion.div>
));
StudentCard.displayName = "StudentCard";

export function StudentsGrid() {
  const storeData = useAppStore((s) => s.data);
  const sortedStudents = [...storeData.students].sort((a, b) => a.number - b.number);

  // Precompute payment aggregates per student across schedules
  const statsByStudent = useMemo(() => {
    const paidBySchedule: Record<string, Record<string, number>> = {};
    for (const t of storeData.transactions) {
      if (t.source !== "schedule" || !t.scheduleId || !t.studentId) continue;
      paidBySchedule[t.scheduleId] ||= {};
      paidBySchedule[t.scheduleId][t.studentId] = (paidBySchedule[t.scheduleId][t.studentId] || 0) + t.amount;
    }

    const result: Record<string, StudentStats> = {};
    for (const student of storeData.students) {
      let targetTotal = 0;
      let paidCappedTotal = 0;
      let paidCount = 0;
      const schedulesForStudent = storeData.schedules.filter((s) => s.studentIds.includes(student.id));
      for (const s of schedulesForStudent) {
        targetTotal += s.amountPerItem;
        const paidForThis = paidBySchedule[s.id]?.[student.id] || 0;
        if (paidForThis >= s.amountPerItem) paidCount += 1;
        paidCappedTotal += Math.min(paidForThis, s.amountPerItem);
      }
      const leftTotal = Math.max(0, Math.round((targetTotal - paidCappedTotal) * 100) / 100);
      result[student.id] = {
        paidTotal: Math.round(paidCappedTotal * 100) / 100,
        leftTotal,
        paidCount,
        totalSchedules: schedulesForStudent.length,
      };
    }
    return result;
  }, [storeData.transactions, storeData.students, storeData.schedules]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const addStudent = useAppStore((s) => s.addStudent);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  return (
    <div>
      <AddStudentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      {selectedStudent && (
        <StudentDetailModal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          student={selectedStudent}
        />
      )}
      
      <div className="responsive-actions mb-4">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="apple-button px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" /> เพิ่มนักเรียนเดี่ยว
        </button>
        <label className="apple-ghost-button cursor-pointer px-4 py-2 text-sm">
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
                const required = ["prefix", "first_name", "last_name", "nick_name", "number"]; // nick_name value optional but header required
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
                    id: "", // will be replaced by remote id after insert
                    prefix: row[prefixIdx].trim(),
                    firstName: row[firstIdx].trim(),
                    lastName: row[lastIdx].trim(),
                    nickName: row[nickIdx].trim() || undefined,
                    number: numberVal,
                  });
                }

                // Remote-first bulk create then update local store
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
                const toastMod = await import("react-hot-toast");
                const msg = `นำเข้า ${created.length} คนสำเร็จ` + (duplicates ? ` • ข้ามซ้ำ ${duplicates}` : "") + (invalid ? ` • ไม่ถูกต้อง ${invalid}` : "");
                toastMod.toast.success(msg);
              } catch (err: unknown) {
                const toastMod = await import("react-hot-toast");
                toastMod.toast.error(err instanceof Error ? err.message : "นำเข้าไม่สำเร็จ");
              } finally {
                setIsImporting(false);
                e.target.value = ""; // reset file input
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
          className="apple-ghost-button px-4 py-2 text-sm"
        >
          <FileDown className="h-4 w-4" /> ดาวน์โหลดเทมเพลต CSV
        </button>
        {isImporting && <span className="self-center text-sm text-blue-600">กำลังนำเข้า...</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {/* Add Student Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsAddModalOpen(true)}
          className="apple-card hover-lift flex min-h-[170px] cursor-pointer flex-col items-center justify-center border-2 border-dashed p-4 hover:shadow-xl sm:min-h-[200px]"
        >
          <Plus className="mb-2 h-10 w-10 text-zinc-400" />
          <div className="text-sm font-medium text-muted">เพิ่มนักเรียน</div>
        </motion.div>

        {sortedStudents.length === 0 && (
          <div className="apple-card col-span-full p-6 text-center text-muted">
            ยังไม่มีนักเรียนในระบบ — กดปุ่มเพิ่มนักเรียนเพื่อเริ่มสร้างการ์ด
          </div>
        )}

        {/* Student Cards */}
        {sortedStudents.map((student) => {
          const stats = statsByStudent[student.id] || { paidTotal: 0, leftTotal: 0, paidCount: 0, totalSchedules: 0 };
          return (
            <StudentCard
              key={student.id}
              student={student}
              stats={stats}
              onClick={() => setSelectedStudent(student)}
            />
          );
        })}
      </div>
    </div>
  );
}

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
    className="group cursor-pointer rounded-xl border bg-white p-4 hover:shadow-lg dark:bg-black/40"
  >
    <div className="mb-3 flex items-center justify-center">
      {student.avatarUrl ? (
        <img
          src={student.avatarUrl}
          alt={student.firstName}
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
          <User className="h-10 w-10 text-blue-600 dark:text-blue-300" />
        </div>
      )}
    </div>
    <div className="text-center">
      <div className="text-xs text-zinc-500">เลขที่ {student.number}</div>
      <div className="font-medium">
        {student.prefix} {student.firstName}
      </div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{student.nickName}</div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-md bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
        <div className="opacity-80">จ่ายแล้ว</div>
        <div className="font-semibold">{stats.paidTotal.toLocaleString()} ฿</div>
      </div>
      <div className="rounded-md bg-amber-50 p-2 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
        <div className="opacity-80">ค้าง</div>
        <div className="font-semibold">{stats.leftTotal.toLocaleString()} ฿</div>
      </div>
      <div className="col-span-2 rounded-md bg-zinc-50 p-2 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200">
        <div className="flex items-center justify-between">
          <span className="opacity-80">สถานะกำหนดการ</span>
          <span className="font-semibold">{stats.paidCount}/{stats.totalSchedules} ชำระแล้ว</span>
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
      
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" /> เพิ่มนักเรียนเดี่ยว
        </button>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
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
              } catch (err: any) {
                const toastMod = await import("react-hot-toast");
                toastMod.toast.error(err.message || "นำเข้าไม่สำเร็จ");
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
          className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <FileDown className="h-4 w-4" /> ดาวน์โหลดเทมเพลต CSV
        </button>
        {isImporting && <span className="text-sm text-blue-600">กำลังนำเข้า...</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {/* Add Student Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsAddModalOpen(true)}
          className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 hover:border-blue-400 hover:bg-blue-50/30 dark:border-zinc-700 dark:bg-zinc-900/30 dark:hover:border-blue-600"
        >
          <Plus className="mb-2 h-10 w-10 text-zinc-400" />
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">เพิ่มนักเรียน</div>
        </motion.div>

        {sortedStudents.length === 0 && (
          <div className="col-span-full rounded-xl border p-6 text-center text-zinc-500 dark:border-zinc-800">
            ยังไม่มีนักเรียนในระบบ — กดปุ่ม "เพิ่มนักเรียน" เพื่อเริ่มสร้างการ์ด
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

import { badRequest, notFound, ok, serverError } from "@/lib/api/response";
import { getRecord, listRecords, type Row } from "@/lib/supabase/server";
import { mapSchedule, mapStudent, mapTransaction } from "@/lib/supabase/mappers";

type RouteContext = { params: Promise<{ id: string }> };

type ReminderStatus = "sent" | "missing_line_id" | "already_paid" | "failed";

type ReminderRecipient = {
  studentId: string;
  studentName: string;
  status: ReminderStatus;
  remaining: number;
  error?: string;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return badRequest("Missing LINE_CHANNEL_ACCESS_TOKEN");

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { studentIds?: string[] };
    const selectedStudentIds = Array.isArray(body.studentIds) && body.studentIds.length > 0
      ? new Set(body.studentIds.filter((studentId): studentId is string => typeof studentId === "string"))
      : null;

    const scheduleRow = await getRecord<Row>("schedules", id);
    if (!scheduleRow) return notFound("Schedule not found");

    const schedule = mapSchedule(scheduleRow);
    const [studentRows, transactionRows] = await Promise.all([
      listRecords<Row>("students"),
      listRecords<Row>("transactions"),
    ]);
    const students = studentRows.map(mapStudent);
    const transactions = transactionRows.map(mapTransaction);
    const paidByStudent = new Map<string, number>();

    for (const transaction of transactions) {
      if (transaction.source !== "schedule" || transaction.schedule_id !== schedule.id || !transaction.student_id) continue;
      paidByStudent.set(transaction.student_id, (paidByStudent.get(transaction.student_id) || 0) + transaction.amount);
    }

    const recipients: ReminderRecipient[] = [];
    const targetStudents = students
      .filter((student) => schedule.student_ids.includes(student.id))
      .filter((student) => !selectedStudentIds || selectedStudentIds.has(student.id))
      .sort((a, b) => a.number - b.number);

    for (const student of targetStudents) {
      const paid = paidByStudent.get(student.id) || 0;
      const remaining = Math.max(0, Math.round((schedule.amount_per_item - paid) * 100) / 100);
      const studentName = `${student.prefix} ${student.first_name} ${student.last_name}`.trim();

      if (remaining <= 0) {
        recipients.push({ studentId: student.id, studentName, status: "already_paid", remaining: 0 });
        continue;
      }

      if (!student.line_user_id) {
        recipients.push({ studentId: student.id, studentName, status: "missing_line_id", remaining });
        continue;
      }

      try {
        await pushLineMessage({
          token,
          to: student.line_user_id,
          text: buildReminderMessage({
            studentName,
            scheduleName: schedule.name,
            remaining,
            dueDate: schedule.end_date,
          }),
        });
        recipients.push({ studentId: student.id, studentName, status: "sent", remaining });
      } catch (error) {
        recipients.push({
          studentId: student.id,
          studentName,
          status: "failed",
          remaining,
          error: error instanceof Error ? error.message : "LINE send failed",
        });
      }
    }

    return ok({
      scheduleId: schedule.id,
      sent: recipients.filter((recipient) => recipient.status === "sent").length,
      skippedMissingLineId: recipients.filter((recipient) => recipient.status === "missing_line_id").length,
      alreadyPaid: recipients.filter((recipient) => recipient.status === "already_paid").length,
      failed: recipients.filter((recipient) => recipient.status === "failed").length,
      recipients,
    });
  } catch (error) {
    return serverError(error);
  }
}

function buildReminderMessage({
  studentName,
  scheduleName,
  remaining,
  dueDate,
}: {
  studentName: string;
  scheduleName: string;
  remaining: number;
  dueDate?: string;
}) {
  const dueLine = dueDate ? `ครบกำหนด: ${formatThaiDate(dueDate)}` : "ครบกำหนด: ยังไม่ระบุ";
  return [
    `แจ้งเตือนการชำระเงินครับ 🔔`,
    "",
    `เรียน ${studentName}`,
    "",
    `รายการ: ${scheduleName}`,
    `ยอดค้างชำระ: ${remaining.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`,
    dueLine,
    "",
    `อย่าลืมชำระเงินตามกำหนดนะครับ`,
    `ขอบคุณครับ/ค่ะ 🙏`,
  ].join("\n");
}

function formatThaiDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

async function pushLineMessage({ token, to, text }: { token: string; to: string; text: string }) {
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LINE API ${response.status}${body ? `: ${body}` : ""}`);
  }
}

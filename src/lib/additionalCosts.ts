import type { AdditionalCostItem, DataBundle, Schedule } from "@/types";

export type AdditionalCostPreviewItem = {
  scheduleId: string;
  studentId: string;
  baseOutstanding: number;
  additionalAmount: number;
  totalAfterCharge: number;
};

export type AdditionalCostPreview = {
  items: AdditionalCostPreviewItem[];
  affectedStudentCount: number;
  overdueItemCount: number;
  baseTotal: number;
  additionalTotal: number;
  grandTotal: number;
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getAdditionalCostAmount(
  items: AdditionalCostItem[],
  scheduleId: string,
  studentId: string
) {
  return roundMoney(
    items
      .filter((item) => item.scheduleId === scheduleId && item.studentId === studentId)
      .reduce((sum, item) => sum + item.amount, 0)
  );
}

export function getStudentScheduleTarget(
  data: Pick<DataBundle, "additionalCostItems">,
  schedule: Schedule,
  studentId: string
) {
  return roundMoney(
    schedule.amountPerItem + getAdditionalCostAmount(data.additionalCostItems, schedule.id, studentId)
  );
}

export function getStudentSchedulePaid(
  data: Pick<DataBundle, "transactions">,
  scheduleId: string,
  studentId: string
) {
  return roundMoney(
    data.transactions
      .filter(
        (transaction) =>
          transaction.source === "schedule" &&
          transaction.kind === "income" &&
          transaction.scheduleId === scheduleId &&
          transaction.studentId === studentId
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  );
}

export function getStudentScheduleRemaining(
  data: Pick<DataBundle, "transactions" | "additionalCostItems">,
  schedule: Schedule,
  studentId: string
) {
  return Math.max(
    0,
    roundMoney(
      getStudentScheduleTarget(data, schedule, studentId) -
        getStudentSchedulePaid(data, schedule.id, studentId)
    )
  );
}

export function getScheduleTargetTotal(
  data: Pick<DataBundle, "additionalCostItems">,
  schedule: Schedule
) {
  return roundMoney(
    schedule.studentIds.reduce(
      (sum, studentId) => sum + getStudentScheduleTarget(data, schedule, studentId),
      0
    )
  );
}

export function buildAdditionalCostPreview(
  data: Pick<DataBundle, "schedules" | "transactions" | "additionalCostItems">,
  percentage: number,
  today = new Date()
): AdditionalCostPreview {
  const todayKey = toBangkokDateKey(today);
  const items: AdditionalCostPreviewItem[] = [];

  if (!Number.isFinite(percentage) || percentage <= 0) return emptyPreview();

  for (const schedule of data.schedules) {
    if (!schedule.endDate || schedule.endDate >= todayKey) continue;

    for (const studentId of schedule.studentIds) {
      const baseOutstanding = getStudentScheduleRemaining(data, schedule, studentId);
      if (baseOutstanding <= 0) continue;

      // Currency rounding happens for every overdue schedule before aggregation.
      const additionalAmount = roundMoney(baseOutstanding * (percentage / 100));
      if (additionalAmount <= 0) continue;

      items.push({
        scheduleId: schedule.id,
        studentId,
        baseOutstanding,
        additionalAmount,
        totalAfterCharge: roundMoney(baseOutstanding + additionalAmount),
      });
    }
  }

  const baseTotal = roundMoney(items.reduce((sum, item) => sum + item.baseOutstanding, 0));
  const additionalTotal = roundMoney(items.reduce((sum, item) => sum + item.additionalAmount, 0));

  return {
    items,
    affectedStudentCount: new Set(items.map((item) => item.studentId)).size,
    overdueItemCount: items.length,
    baseTotal,
    additionalTotal,
    grandTotal: roundMoney(baseTotal + additionalTotal),
  };
}

function emptyPreview(): AdditionalCostPreview {
  return {
    items: [],
    affectedStudentCount: 0,
    overdueItemCount: 0,
    baseTotal: 0,
    additionalTotal: 0,
    grandTotal: 0,
  };
}

function toBangkokDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

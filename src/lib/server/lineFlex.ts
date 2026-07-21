import "server-only";

export type LineFlexBox = Record<string, unknown>;
export type LineMessage = Record<string, unknown>;

export type FlexAccentKey =
  | "pay"
  | "cash"
  | "kplus"
  | "truemoney"
  | "status"
  | "history"
  | "total"
  | "announcement"
  | "reminder";

export const FLEX_ACCENTS: Record<FlexAccentKey, { from: string; to: string; subtitleColor: string }> = {
  pay: { from: "#2563EB", to: "#1D4ED8", subtitleColor: "#DBEAFE" },
  cash: { from: "#475569", to: "#1E293B", subtitleColor: "#E2E8F0" },
  kplus: { from: "#059669", to: "#047857", subtitleColor: "#D1FAE5" },
  truemoney: { from: "#EA580C", to: "#C2410C", subtitleColor: "#FFEDD5" },
  status: { from: "#4F46E5", to: "#4338CA", subtitleColor: "#E0E7FF" },
  history: { from: "#0891B2", to: "#0E7490", subtitleColor: "#CFFAFE" },
  total: { from: "#1E3A8A", to: "#1D4ED8", subtitleColor: "#BFDBFE" },
  announcement: { from: "#2563EB", to: "#06B6D4", subtitleColor: "#E0F2FE" },
  reminder: { from: "#DC2626", to: "#EA580C", subtitleColor: "#FEE2E2" },
};

export function createFlexMessage(altText: string, bubble: LineFlexBox): LineMessage {
  return {
    type: "flex",
    altText: truncateLabel(altText, 390),
    contents: bubble,
  };
}

export function flexBubble(bodyContents: LineFlexBox[]): LineFlexBox {
  return {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "18px",
      contents: bodyContents,
    },
  };
}

export function flexHero(title: string, subtitle: string, accentKey: FlexAccentKey): LineFlexBox {
  const accent = FLEX_ACCENTS[accentKey];
  return {
    type: "box",
    layout: "vertical",
    spacing: "xs",
    paddingAll: "18px",
    cornerRadius: "20px",
    backgroundColor: accent.from,
    background: {
      type: "linearGradient",
      angle: "135deg",
      startColor: accent.from,
      endColor: accent.to,
    },
    contents: [
      { type: "text", text: title, weight: "bold", size: "xl", color: "#FFFFFF", wrap: true },
      { type: "text", text: subtitle, size: "sm", color: accent.subtitleColor, wrap: true },
    ],
  };
}

export function flexText(text: string, color: string, size: string): LineFlexBox {
  return { type: "text", text, color, size, wrap: true };
}

export function flexSectionTitle(text: string): LineFlexBox {
  return { type: "text", text, weight: "bold", size: "md", color: "#111827", margin: "md" };
}

export function flexButton(
  text: string,
  action: Record<string, unknown>,
  style: "primary" | "secondary",
  color: string
): LineFlexBox {
  return {
    type: "button",
    style,
    height: "md",
    color,
    margin: "sm",
    action: {
      ...action,
      label: truncateLabel(text, 40),
    },
  };
}

export function metricBox(label: string, value: string, color: string, backgroundColor: string, size = "lg"): LineFlexBox {
  return {
    type: "box",
    layout: "vertical",
    flex: 1,
    paddingAll: "12px",
    cornerRadius: "16px",
    backgroundColor,
    contents: [
      { type: "text", text: label, size: "xs", color: "#6B7280", wrap: true },
      { type: "text", text: value, size, weight: "bold", color, wrap: true },
    ],
  };
}

export function metricGrid(contents: LineFlexBox[]): LineFlexBox {
  return { type: "box", layout: "horizontal", spacing: "sm", contents };
}

export function emptyStateBox(title: string, subtitle: string): LineFlexBox {
  return {
    type: "box",
    layout: "vertical",
    spacing: "xs",
    paddingAll: "18px",
    cornerRadius: "20px",
    backgroundColor: "#F8FAFC",
    contents: [
      { type: "text", text: title, weight: "bold", size: "md", color: "#111827", align: "center", wrap: true },
      { type: "text", text: subtitle, size: "sm", color: "#6B7280", align: "center", wrap: true },
    ],
  };
}

export function paymentDebtButton(name: string, amount: number, dueDate: string | undefined, data: string): LineFlexBox {
  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    paddingAll: "14px",
    cornerRadius: "16px",
    borderWidth: "1px",
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    action: {
      type: "postback",
      label: truncateLabel(`ชำระ ${name}`, 40),
      data,
      displayText: `ชำระ ${name}`,
    },
    contents: [
      { type: "text", text: name, size: "md", weight: "bold", color: "#111827", wrap: true },
      {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          { type: "text", text: `ครบกำหนด: ${formatDateThai(dueDate)}`, size: "xs", color: "#6B7280", wrap: true, flex: 1 },
          { type: "text", text: formatBaht(amount), size: "sm", weight: "bold", color: "#DC2626", align: "end", flex: 0 },
        ],
      },
      { type: "text", text: "แตะเพื่อเลือกจ่ายรายการนี้", size: "xs", color: "#2563EB", weight: "bold", wrap: true },
    ],
  };
}

export function historyRow(name: string, amount: number, methodLabel: string, createdAt: string): LineFlexBox {
  return {
    type: "box",
    layout: "vertical",
    spacing: "xs",
    paddingAll: "12px",
    cornerRadius: "16px",
    borderWidth: "1px",
    borderColor: "#E5E7EB",
    contents: [
      {
        type: "box",
        layout: "horizontal",
        spacing: "md",
        contents: [
          { type: "text", text: name, size: "sm", weight: "bold", color: "#111827", wrap: true, flex: 1 },
          { type: "text", text: formatBaht(amount), size: "sm", weight: "bold", color: "#059669", align: "end", flex: 0 },
        ],
      },
      { type: "text", text: `${methodLabel} • ${formatDateTimeThai(createdAt)}`, size: "xs", color: "#6B7280", wrap: true },
    ],
  };
}

export function truncateLabel(label: string, maxLength: number) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

export function formatBaht(amount: number) {
  return `${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`;
}

export function formatDateThai(value: string | undefined) {
  if (!value) return "ยังไม่ระบุ";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "ยังไม่ระบุ";
  return date.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTimeThai(value: string) {
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

import { createHmac, timingSafeEqual } from "crypto";
import generatePayload from "promptpay-qr";
import { badRequest, ok, serverError } from "@/lib/api/response";
import { createRecord, listRecords, updateRecord, type Row } from "@/lib/supabase/server";
import { mapLinePaymentRequest, mapSchedule, mapStudent, mapTransaction } from "@/lib/supabase/mappers";
import { storePaymentProofImage } from "@/lib/server/paymentProofStorage";
import { linkLineRichMenuByName } from "@/lib/server/line";

const PROMPTPAY_ID = "004666006046829";
const REGISTERED_RICH_MENU_NAME = "Classroom Finance Student Menu";
const REGISTER_RICH_MENU_NAME = "Classroom Finance Register Menu";

type LineWebhookBody = {
  events?: LineWebhookEvent[];
};

type LineWebhookEvent = {
  type?: string;
  replyToken?: string;
  postback?: {
    data?: string;
  };
  source?: {
    type?: string;
    userId?: string;
  };
  message?: {
    type?: string;
    text?: string;
    id?: string;
  };
};

const studentColumns = ["line_user_id"];

export async function GET() {
  return ok({
    status: "ok",
    service: "line-webhook",
    usage: "Set this endpoint as your LINE Messaging API webhook URL.",
  });
}

export async function POST(request: Request) {
  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) return badRequest("Missing LINE_CHANNEL_SECRET");

    const bodyText = await request.text();
    const signature = request.headers.get("x-line-signature") || "";
    if (!isValidLineSignature(bodyText, signature, channelSecret)) {
      return badRequest("Invalid LINE signature");
    }

    const body = JSON.parse(bodyText) as LineWebhookBody;
    const events = Array.isArray(body.events) ? body.events : [];
    await Promise.all(events.map(handleLineEvent));

    return ok({ status: "ok" });
  } catch (error) {
    return serverError(error);
  }
}

async function handleLineEvent(event: LineWebhookEvent) {
  if (event.source?.type !== "user" || !event.source.userId) return;

  if (event.type === "postback") {
    await handleAction(event, event.postback?.data || "");
    return;
  }

  if (event.type !== "message") return;

  if (event.message?.type === "image" && event.message.id) {
    await handleSlipImage(event, event.message.id);
    return;
  }

  if (event.message?.type !== "text") return;

  const text = event.message.text?.trim() || "";
  if (isPayCommand(text)) {
    await showPayMenu(event);
    return;
  }
  if (isCancelCommand(text)) {
    await cancelActivePayment(event);
    return;
  }

  if (isCoreTextCommand(text) || isRegistrationText(text) || text.startsWith("pay:")) {
    await handleAction(event, text);
  }
}

async function handleAction(event: LineWebhookEvent, action: string) {
  if (!event.source?.userId) return;
  const normalized = action.trim();
  const number = parseRegistrationNumber(normalized);

  if (!number) {
    if (isRegistrationHelpCommand(normalized)) {
      const registeredStudent = await getStudentByLineUserId(event.source.userId);
      if (registeredStudent) {
        const menuLink = await linkLineRichMenuByName(event.source.userId, REGISTERED_RICH_MENU_NAME);
        await replyLineText(event.replyToken, [
          "บัญชี LINE นี้ลงทะเบียนไว้แล้วครับ ✅",
          "ไม่ต้องสมัครซ้ำ บอทจำได้อยู่น้า",
          "",
          `${registeredStudent.prefix} ${registeredStudent.first_name} ${registeredStudent.last_name}`,
          `เลขที่ ${registeredStudent.number}`,
          "",
          menuLink.ok ? "เมนูถูกเปลี่ยนเป็น ชำระเงิน / สถานะ / ประวัติ แล้วครับ" : "ยังเปลี่ยนเมนูไม่ได้ กรุณาให้เหรัญญิกรันตั้งค่า Rich Menu อีกครั้งนะครับ",
          "ถ้าต้องการเปลี่ยนเป็นคนอื่น ต้องให้เหรัญญิกลบ LINE User ID ในระบบก่อนนะครับ",
        ].join("\n"));
        return;
      }

      await linkLineRichMenuByName(event.source.userId, REGISTER_RICH_MENU_NAME);
      await replyLineText(event.replyToken, [
        "มาลงทะเบียน LINE กับระบบการเงินห้องเรียนกันครับ ✨",
        "พิมพ์เลขที่ของตัวเองตามตัวอย่างนี้ได้เลย",
        "",
        "ลงทะเบียน 24",
        "",
        "พอลงทะเบียนเสร็จ จะกดเมนู ชำระเงิน ต่อได้ทันทีครับ 🚀",
      ].join("\n"));
      return;
    }
    if (isPlaceholderMenuCommand(normalized)) {
      const student = await getStudentByLineUserId(event.source.userId);
      if (!student) {
        await replyRegisterPrompt(event);
        return;
      }
      await replyLineText(event.replyToken, [
        "เมนูนี้กำลังอยู่ระหว่างเตรียมเปิดใช้งานครับ 🚧",
        "ทีมงานกำลังปั้นอยู่ ยังไม่สุกดี",
        "",
        "ตอนนี้ใช้เมนู ชำระเงิน เพื่อดูรายการค้างชำระและส่งสลิปไปก่อนได้เลยครับ 💸",
      ].join("\n"));
      return;
    }
    if (normalized.startsWith("pay:schedule:")) {
      await handleScheduleSelection(event, normalized.replace("pay:schedule:", ""));
      return;
    }
    if (normalized.startsWith("pay:method:")) {
      const [, , requestId, method] = normalized.split(":");
      await handleMethodSelection(event, requestId, method);
      return;
    }

    return;
  }

  const studentRows = await listRecords<Row>("students");
  const students = studentRows.map(mapStudent);
  const registeredStudent = students.find((item) => item.line_user_id === event.source?.userId);
  if (registeredStudent) {
    const menuLink = await linkLineRichMenuByName(event.source.userId, REGISTERED_RICH_MENU_NAME);
    const isSameNumber = registeredStudent.number === number;
    await replyLineText(event.replyToken, [
      "บัญชี LINE นี้ลงทะเบียนไว้แล้วครับ ✅",
      isSameNumber ? "คนนี้แหละ ใช่เลย ไม่ต้องลงซ้ำแล้วน้า" : "ตอนนี้ผูกอยู่กับ",
      "",
      `${registeredStudent.prefix} ${registeredStudent.first_name} ${registeredStudent.last_name}`,
      `เลขที่ ${registeredStudent.number}`,
      "",
      menuLink.ok ? (isSameNumber ? "กดเมนู ชำระเงิน ใช้งานต่อได้เลยครับ 💸" : "เมนูถูกเปลี่ยนเป็น ชำระเงิน / สถานะ / ประวัติ แล้วครับ") : "ยังเปลี่ยนเมนูไม่ได้ กรุณาให้เหรัญญิกรันตั้งค่า Rich Menu อีกครั้งนะครับ",
      isSameNumber
        ? ""
        : "เพื่อความปลอดภัย บัญชี LINE เดียวจะเปลี่ยนไปเป็นคนอื่นเองไม่ได้ครับ 🔐\nถ้าต้องการเปลี่ยนจริง ๆ ให้เหรัญญิกลบ LINE User ID ในระบบก่อนนะครับ",
    ].join("\n"));
    return;
  }

  const student = students.find((item) => item.number === number);

  if (!student) {
    await replyLineText(event.replyToken, [
      `ไม่พบนักเรียนเลขที่ ${number} ครับ 🧐`,
      "เหมือนเลขที่จะยังไม่อยู่ในระบบ หรืออาจพิมพ์ผิดนิดนึง",
      "",
      "ลองตรวจสอบเลขที่ แล้วส่งใหม่แบบนี้ได้เลย",
      `ลงทะเบียน ${number}`,
    ].join("\n"));
    return;
  }

  if (student.line_user_id && student.line_user_id !== event.source.userId) {
    await replyLineText(event.replyToken, [
      `เลขที่ ${student.number} มีบัญชี LINE ลงทะเบียนไว้แล้วครับ 👀`,
      "",
      "ถ้าต้องการเปลี่ยนไปใช้บัญชี LINE นี้แทน",
      "ให้เหรัญญิกลบ LINE User ID เดิมของนักเรียนคนนี้ในระบบก่อนนะครับ 🔐",
    ].join("\n"));
    return;
  }

  await updateRecord<Row>("students", student.id, { line_user_id: event.source.userId }, studentColumns);
  const menuLink = await linkLineRichMenuByName(event.source.userId, REGISTERED_RICH_MENU_NAME);

  await replyLineText(event.replyToken, [
    "ลงทะเบียนสำเร็จแล้วครับ 🎉",
    menuLink.ok
      ? "ยินดีต้อนรับเข้าสู่ระบบการเงินห้องเรียนแบบดิจิทัลสุด ๆ"
      : "ข้อมูลเข้าระบบเรียบร้อย แต่เมนูยังไม่ยอมเปลี่ยนตามนิดนึง 😅",
    "",
    `${student.prefix} ${student.first_name} ${student.last_name}`,
    `เลขที่ ${student.number}${student.nick_name ? ` (${student.nick_name})` : ""}`,
    "",
    menuLink.ok
      ? "เปลี่ยนเมนูเป็น ชำระเงิน / สถานะ / ประวัติ ให้เรียบร้อยแล้วครับ"
      : "รบกวนให้เหรัญญิกช่วยรันตั้งค่า Rich Menu อีกครั้งนะครับ",
    menuLink.ok
      ? "ต่อไปแจ้งเตือนเรื่องชำระเงินจะส่งมาที่บัญชีนี้นะครับ 🔔"
      : "ส่วนบัญชีนี้ ระบบจะใช้แจ้งเตือนกำหนดการชำระเงินได้ตามปกติครับ 🔔",
  ].join("\n"));
}

async function showPayMenu(event: LineWebhookEvent) {
  const student = await getStudentByLineUserId(event.source?.userId);
  if (!student) {
    await replyRegisterPrompt(event);
    return;
  }

  const debts = await getUnpaidSchedulesForStudent(student.id);
  if (debts.length === 0) {
    await replyLineText(event.replyToken, [
      "ตอนนี้ไม่มีรายการค้างชำระครับ ✅",
      "กระเป๋าสตางค์รอดแล้ววันนี้ 😆",
    ].join("\n"));
    return;
  }

  await replyLineMessages(event.replyToken, [
    {
      type: "text",
      text: [
        "มีรายการที่ต้องชำระอยู่ครับ 💸",
        "เลือกรายการที่ต้องการจ่ายได้เลย",
      ].join("\n"),
      quickReply: {
        items: [
          ...debts.slice(0, 12).map(({ schedule, remaining }) => ({
            type: "action",
            action: {
              type: "postback",
              label: truncateLabel(`${schedule.name} ${remaining.toLocaleString()}฿`, 20),
              data: `pay:schedule:${schedule.id}`,
              displayText: `ชำระ ${schedule.name}`,
            },
          })),
          quickMessage("ยกเลิก", "ยกเลิก"),
        ],
      },
    },
  ]);
}

async function handleScheduleSelection(event: LineWebhookEvent, scheduleId: string) {
  const student = await getStudentByLineUserId(event.source?.userId);
  if (!student) {
    await replyLineText(event.replyToken, [
      "ต้องลงทะเบียนก่อนใช้งานครับ 👀",
      "ระบบจะได้รู้ว่าใครกำลังจะจ่าย",
      "",
      "ตัวอย่าง: ลงทะเบียน 24",
    ].join("\n"));
    return;
  }

  const debt = (await getUnpaidSchedulesForStudent(student.id)).find((item) => item.schedule.id === scheduleId);
  if (!debt) {
    await replyLineText(event.replyToken, [
      "รายการนี้ชำระครบแล้ว หรือไม่อยู่ในรายการของคุณครับ 🧐",
      "",
      "ลองกดเมนู ชำระเงิน เพื่อดูรายการล่าสุดอีกครั้งนะครับ",
    ].join("\n"));
    return;
  }

  const existingRequests = (await listRecords<Row>("line_payment_requests"))
    .map(mapLinePaymentRequest)
    .filter((request) =>
      request.line_user_id === event.source?.userId &&
      request.student_id === student.id &&
      request.schedule_id === scheduleId &&
      ["selecting", "awaiting_slip", "pending_review", "cash_pending"].includes(request.status)
    );

  await Promise.all(existingRequests.map((request) =>
    updateRecord<Row>("line_payment_requests", request.id, { status: "expired", note: "Replaced by newer LINE payment request" }, ["status", "note"])
  ));

  const request = await createRecord<Row>("line_payment_requests", {
    line_user_id: event.source?.userId,
    student_id: student.id,
    schedule_id: debt.schedule.id,
    amount: debt.remaining,
    status: "selecting",
  });

  await replyLineMessages(event.replyToken, [
    {
      type: "text",
      text: [
        `รายการ: ${debt.schedule.name}`,
        `ยอดค้าง: ${debt.remaining.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`,
        "",
        "เลือกวิธีชำระเงินได้เลยครับ",
        "จะโอน จะวอลเล็ต หรือจะเงินสดก็จัดไป 😎",
      ].join("\n"),
      quickReply: {
        items: [
          quickPostback("K PLUS", `pay:method:${request.id}:kplus`),
          quickPostback("TrueMoney", `pay:method:${request.id}:truemoney`),
          quickPostback("เงินสด", `pay:method:${request.id}:cash`),
          quickMessage("ยกเลิก", "ยกเลิก"),
        ],
      },
    },
  ]);
}

async function handleMethodSelection(event: LineWebhookEvent, requestId: string, method: string) {
  if (!["kplus", "truemoney", "cash"].includes(method)) {
    await replyLineText(event.replyToken, [
      "วิธีชำระเงินนี้ยังไม่ถูกต้องครับ 🧐",
      "ลองเลือกจากปุ่มที่ระบบแสดงให้อีกครั้งนะครับ",
    ].join("\n"));
    return;
  }

  const requests = await listRecords<Row>("line_payment_requests");
  const row = requests.find((request) => request.id === requestId);
  if (!row) {
    await replyLineText(event.replyToken, [
      "ไม่พบรายการชำระเงินครับ 😅",
      "รายการอาจหมดอายุ หรือถูกยกเลิกไปแล้ว",
      "",
      "เริ่มใหม่ได้โดยพิมพ์ ชำระเงิน",
    ].join("\n"));
    return;
  }

  const request = mapLinePaymentRequest(row);
  if (request.line_user_id !== event.source?.userId) {
    await replyLineText(event.replyToken, [
      "รายการนี้ไม่ตรงกับบัญชี LINE ของคุณครับ 🔐",
      "ระบบเลยไปต่อให้ไม่ได้ เพื่อความปลอดภัยนะครับ",
    ].join("\n"));
    return;
  }

  if (method === "cash") {
    await updateRecord<Row>("line_payment_requests", request.id, { method, status: "cash_pending" }, ["method", "status"]);
    await replyLineText(event.replyToken, [
      "รับเรื่องชำระเงินสดไว้แล้วครับ 💵",
      "สายเงินสดมาเอง",
      "",
      `ยอดเงิน: ${request.amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`,
      "",
      "นำเงินไปชำระกับเหรัญญิกได้เลยครับ",
      "ระบบจะบันทึกยอดให้หลังจากเหรัญญิกยืนยันนะครับ",
    ].join("\n"));
    return;
  }

  await updateRecord<Row>("line_payment_requests", request.id, { method, status: "awaiting_slip" }, ["method", "status"]);
  const payload = generatePayload(PROMPTPAY_ID, { amount: request.amount });
  const qrUrl = `https://quickchart.io/qr?size=600&margin=2&text=${encodeURIComponent(payload)}`;

  await replyLineMessages(event.replyToken, [
    {
      type: "text",
      text: [
        method === "kplus" ? "สแกนจ่ายผ่าน K PLUS ได้เลยครับ 🟢" : "สแกนจ่ายผ่าน TrueMoney ได้เลยครับ 🧡",
        "",
        `ยอดเงิน: ${request.amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`,
        "",
        "จ่ายเสร็จแล้ว ส่งรูปสลิปกลับมาในแชทนี้ได้เลยครับ 📸",
        "บอทรอสลิปอยู่น้า",
      ].join("\n"),
    },
    {
      type: "image",
      originalContentUrl: qrUrl,
      previewImageUrl: qrUrl,
    },
  ]);
}

async function handleSlipImage(event: LineWebhookEvent, messageId: string) {
  const activeRequest = (await listRecords<Row>("line_payment_requests"))
    .map(mapLinePaymentRequest)
    .filter((request) => request.line_user_id === event.source?.userId && request.status === "awaiting_slip")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  if (!activeRequest) {
    await replyLineText(event.replyToken, [
      "ตอนนี้ยังไม่มีรายการที่รอสลิปครับ 👀",
      "บอทงงนิดนึงว่าสลิปนี้ของรายการไหน",
      "",
      "เริ่มจากเมนู ชำระเงิน ก่อน แล้วค่อยส่งสลิปเข้ามานะครับ",
    ].join("\n"));
    return;
  }

  const image = await downloadLineMessageContent(messageId);
  const proof = await storePaymentProofImage({
    requestId: activeRequest.id,
    contentType: image.contentType,
    data: image.data,
  });

  await updateRecord<Row>(
    "line_payment_requests",
    activeRequest.id,
    {
      status: "pending_review",
      slip_url: proof.url,
      slip_pathname: proof.pathname,
    },
    ["status", "slip_url", "slip_pathname"]
  );

  await replyLineText(event.replyToken, [
    "ได้รับสลิปแล้วครับ 📸✨",
    "บอทเก็บไว้ให้เรียบร้อย",
    "",
    "รอเหรัญญิกตรวจสอบและยืนยันในระบบนะครับ",
  ].join("\n"));
}

async function cancelActivePayment(event: LineWebhookEvent) {
  const student = await getStudentByLineUserId(event.source?.userId);
  if (!student) {
    await replyRegisterPrompt(event);
    return;
  }

  const activeRequests = (await listRecords<Row>("line_payment_requests"))
    .map(mapLinePaymentRequest)
    .filter((request) =>
      request.line_user_id === event.source?.userId &&
      ["selecting", "awaiting_slip", "cash_pending"].includes(request.status)
    );

  if (activeRequests.length === 0) {
    await replyLineText(event.replyToken, [
      "ตอนนี้ไม่มีรายการชำระเงินที่กำลังดำเนินการอยู่ครับ 👀",
      "ไม่มีอะไรให้ยกเลิกแล้วน้า",
    ].join("\n"));
    return;
  }

  await Promise.all(activeRequests.map((request) =>
    updateRecord<Row>("line_payment_requests", request.id, { status: "expired", note: "Cancelled by LINE user" }, ["status", "note"])
  ));
  await replyLineText(event.replyToken, [
    "ยกเลิกรายการชำระเงินให้เรียบร้อยแล้วครับ ✅",
    "รายการนี้พักก่อน",
  ].join("\n"));
}

function parseRegistrationNumber(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(?:ลงทะเบียน)?\s*(\d{1,3})$/i);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function isPayCommand(text: string) {
  return ["ชำระเงิน", "จ่ายเงิน", "pay", "PAY_MENU"].includes(text.trim());
}

function isCancelCommand(text: string) {
  return ["ยกเลิก", "cancel", "CANCEL_PAYMENT"].includes(text.trim());
}

function isRegistrationHelpCommand(text: string) {
  return ["ลงทะเบียน"].includes(text.trim());
}

function isPlaceholderMenuCommand(text: string) {
  return ["เมนูสถานะ", "สถานะ", "เมนูประวัติ", "ประวัติ"].includes(text.trim());
}

function isCoreTextCommand(text: string) {
  return isPayCommand(text) || isCancelCommand(text) || isPlaceholderMenuCommand(text);
}

function isRegistrationText(text: string) {
  return isRegistrationHelpCommand(text) || parseRegistrationNumber(text) !== null;
}

async function replyRegisterPrompt(event: LineWebhookEvent) {
  await linkLineRichMenuByName(event.source?.userId, REGISTER_RICH_MENU_NAME);
  await replyLineText(event.replyToken, [
    "ยังไม่ได้ลงทะเบียน LINE กับระบบการเงินห้องเรียนนะครับ 👀",
    "กดเมนู ลงทะเบียน แล้วพิมพ์เลขที่ของตัวเองได้เลย",
    "",
    "เช่น ลงทะเบียน 24",
    "",
    "ลงทะเบียนแป๊บเดียว แล้วค่อยไปจ่ายเงินกันต่อครับ 💸",
  ].join("\n"));
}

async function getStudentByLineUserId(lineUserId: string | undefined) {
  if (!lineUserId) return null;
  const students = (await listRecords<Row>("students")).map(mapStudent);
  return students.find((student) => student.line_user_id === lineUserId) || null;
}

async function getUnpaidSchedulesForStudent(studentId: string) {
  const [scheduleRows, transactionRows] = await Promise.all([
    listRecords<Row>("schedules"),
    listRecords<Row>("transactions"),
  ]);
  const schedules = scheduleRows.map(mapSchedule).filter((schedule) => schedule.student_ids.includes(studentId));
  const transactions = transactionRows.map(mapTransaction);

  return schedules
    .map((schedule) => {
      const paid = transactions
        .filter((transaction) => transaction.source === "schedule" && transaction.schedule_id === schedule.id && transaction.student_id === studentId)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      return {
        schedule,
        paid,
        remaining: Math.max(0, Math.round((schedule.amount_per_item - paid) * 100) / 100),
      };
    })
    .filter((item) => item.remaining > 0)
    .sort((a, b) => String(a.schedule.end_date || a.schedule.start_date).localeCompare(String(b.schedule.end_date || b.schedule.start_date)));
}

function quickPostback(label: string, data: string) {
  return {
    type: "action",
    action: {
      type: "postback",
      label,
      data,
      displayText: label,
    },
  };
}

function quickMessage(label: string, text: string) {
  return {
    type: "action",
    action: {
      type: "message",
      label,
      text,
    },
  };
}

function truncateLabel(label: string, maxLength: number) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function isValidLineSignature(bodyText: string, signature: string, channelSecret: string) {
  if (!signature) return false;

  const digest = createHmac("sha256", channelSecret).update(bodyText).digest("base64");
  const signatureBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  return signatureBuffer.length === digestBuffer.length && timingSafeEqual(signatureBuffer, digestBuffer);
}

async function replyLineText(replyToken: string | undefined, text: string) {
  return replyLineMessages(replyToken, [{ type: "text", text }]);
}

async function replyLineMessages(replyToken: string | undefined, messages: Array<Record<string, unknown>>) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !replyToken) return;

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LINE reply API ${response.status}${body ? `: ${body}` : ""}`);
  }
}

async function downloadLineMessageContent(messageId: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN");

  const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LINE content API ${response.status}${body ? `: ${body}` : ""}`);
  }

  return {
    contentType: response.headers.get("content-type") || "image/jpeg",
    data: await response.arrayBuffer(),
  };
}

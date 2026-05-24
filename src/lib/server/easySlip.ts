import "server-only";

const EASYSLIP_BASE_URL = "https://api.easyslip.com/v2";
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

export type EasySlipVerifyData = {
  isDuplicate?: boolean;
  matchedAccount?: unknown;
  amountInOrder?: number;
  amountInSlip?: number;
  isAmountMatched?: boolean;
  rawSlip?: {
    payload?: string;
    transRef?: string;
    transactionId?: string;
    amount?: number | { amount?: number; local?: { amount?: number; currency?: string } };
    sender?: unknown;
    receiver?: unknown;
  };
};

export type EasySlipVerifyResult =
  | {
      ok: true;
      provider: "easyslip";
      method: "payload" | "image";
      data: EasySlipVerifyData;
      message?: string;
    }
  | {
      ok: false;
      provider: "easyslip";
      method: "payload" | "image";
      status: number;
      code?: string;
      message: string;
      retryable: boolean;
    }
  | {
      ok: false;
      provider: "none";
      status: 0;
      code: "EASYSLIP_NOT_CONFIGURED";
      message: string;
      retryable: false;
    };

type EasySlipResponse = {
  success?: boolean;
  data?: EasySlipVerifyData;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

export async function verifySlipWithEasySlip({
  data,
  contentType,
  qrPayload,
  expectedAmount,
  paymentMethod,
  remark,
}: {
  data: Buffer;
  contentType?: string;
  qrPayload?: string;
  expectedAmount: number;
  paymentMethod?: string;
  remark?: string;
}): Promise<EasySlipVerifyResult> {
  const apiKey = process.env.EASYSLIP_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      provider: "none",
      status: 0,
      code: "EASYSLIP_NOT_CONFIGURED",
      message: "EasySlip API key is not configured",
      retryable: false,
    };
  }

  if (paymentMethod !== "truemoney" && qrPayload) {
    const payloadResult = await verifyBankPayloadWithEasySlip({
      apiKey,
      qrPayload,
      expectedAmount,
      remark,
    });
    if (payloadResult.ok || !payloadResult.retryable) return payloadResult;
  }

  return verifyImageWithEasySlip({
    apiKey,
    data,
    contentType,
    expectedAmount,
    paymentMethod,
    remark,
  });
}

async function verifyBankPayloadWithEasySlip({
  apiKey,
  qrPayload,
  expectedAmount,
  remark,
}: {
  apiKey: string;
  qrPayload: string;
  expectedAmount: number;
  remark?: string;
}): Promise<EasySlipVerifyResult> {
  const body = JSON.stringify({
    payload: qrPayload,
    matchAmount: expectedAmount,
    checkDuplicate: process.env.EASYSLIP_CHECK_DUPLICATE !== "false",
    matchAccount: process.env.EASYSLIP_MATCH_ACCOUNT !== "false",
    ...(remark ? { remark: remark.slice(0, 255) } : {}),
  });

  return requestEasySlip({
    apiKey,
    endpoint: "/verify/bank",
    method: "payload",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

async function verifyImageWithEasySlip({
  apiKey,
  data,
  contentType,
  expectedAmount,
  paymentMethod,
  remark,
}: {
  apiKey: string;
  data: Buffer;
  contentType?: string;
  expectedAmount: number;
  paymentMethod?: string;
  remark?: string;
}): Promise<EasySlipVerifyResult> {
  if (data.byteLength > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      provider: "easyslip",
      method: "image",
      status: 400,
      code: "IMAGE_SIZE_TOO_LARGE",
      message: "Slip image exceeds EasySlip 4MB limit",
      retryable: false,
    };
  }

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(data)], { type: contentType || "image/jpeg" });
  formData.append("image", blob, filenameFromContentType(contentType));
  formData.append("matchAmount", String(expectedAmount));
  formData.append("checkDuplicate", process.env.EASYSLIP_CHECK_DUPLICATE === "false" ? "false" : "true");
  formData.append("matchAccount", process.env.EASYSLIP_MATCH_ACCOUNT === "false" ? "false" : "true");
  if (remark) formData.append("remark", remark.slice(0, 255));

  const endpoint = paymentMethod === "truemoney" ? "/verify/truewallet" : "/verify/bank";
  return requestEasySlip({
    apiKey,
    endpoint,
    method: "image",
    body: formData,
  });
}

async function requestEasySlip({
  apiKey,
  endpoint,
  method,
  headers,
  body,
}: {
  apiKey: string;
  endpoint: "/verify/bank" | "/verify/truewallet";
  method: "payload" | "image";
  headers?: HeadersInit;
  body: BodyInit;
}): Promise<EasySlipVerifyResult> {
  try {
    const response = await fetch(`${EASYSLIP_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        ...headers,
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });
    const payload = await parseEasySlipResponse(response);

    if (response.ok && payload.success && payload.data) {
      return {
        ok: true,
        provider: "easyslip",
        method,
        data: payload.data,
        message: payload.message,
      };
    }

    return {
      ok: false,
      provider: "easyslip",
      method,
      status: response.status,
      code: payload.error?.code,
      message: payload.error?.message || payload.message || "EasySlip verification failed",
      retryable: isRetryableEasySlipError(response.status, payload.error?.code),
    };
  } catch (error) {
    return {
      ok: false,
      provider: "easyslip",
      method,
      status: 0,
      code: "EASYSLIP_REQUEST_FAILED",
      message: error instanceof Error ? error.message : "EasySlip request failed",
      retryable: true,
    };
  }
}

async function parseEasySlipResponse(response: Response): Promise<EasySlipResponse> {
  try {
    return await response.json() as EasySlipResponse;
  } catch {
    return {
      success: false,
      error: {
        code: "INVALID_EASYSLIP_RESPONSE",
        message: "EasySlip returned a non-JSON response",
      },
    };
  }
}

function isRetryableEasySlipError(status: number, code: string | undefined) {
  if (code === "SLIP_PENDING") return true;
  if (status === 0 || status === 408 || status === 429) return true;
  return status >= 500;
}

function filenameFromContentType(contentType: string | undefined) {
  if (contentType?.includes("png")) return "slip.png";
  if (contentType?.includes("webp")) return "slip.webp";
  if (contentType?.includes("gif")) return "slip.gif";
  return "slip.jpg";
}

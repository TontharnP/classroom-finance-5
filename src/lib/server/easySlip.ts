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
      data: EasySlipVerifyData;
      message?: string;
    }
  | {
      ok: false;
      provider: "easyslip";
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
  expectedAmount,
  paymentMethod,
  remark,
}: {
  data: Buffer;
  contentType?: string;
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

  if (data.byteLength > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      provider: "easyslip",
      status: 400,
      code: "IMAGE_SIZE_TOO_LARGE",
      message: "Slip image exceeds EasySlip 4MB limit",
      retryable: false,
    };
  }

  const endpoint = paymentMethod === "truemoney" ? "/verify/truewallet" : "/verify/bank";
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(data)], { type: contentType || "image/jpeg" });
  formData.append("image", blob, filenameFromContentType(contentType));
  formData.append("matchAmount", String(expectedAmount));
  formData.append("checkDuplicate", process.env.EASYSLIP_CHECK_DUPLICATE === "false" ? "false" : "true");
  formData.append("matchAccount", process.env.EASYSLIP_MATCH_ACCOUNT === "false" ? "false" : "true");
  if (remark) formData.append("remark", remark.slice(0, 255));

  try {
    const response = await fetch(`${EASYSLIP_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });
    const payload = await parseEasySlipResponse(response);

    if (response.ok && payload.success && payload.data) {
      return {
        ok: true,
        provider: "easyslip",
        data: payload.data,
        message: payload.message,
      };
    }

    return {
      ok: false,
      provider: "easyslip",
      status: response.status,
      code: payload.error?.code,
      message: payload.error?.message || payload.message || "EasySlip verification failed",
      retryable: isRetryableEasySlipError(response.status, payload.error?.code),
    };
  } catch (error) {
    return {
      ok: false,
      provider: "easyslip",
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

import "server-only";

import { createHash } from "crypto";
import jsQR from "jsqr";
import sharp from "sharp";

export type SlipCheckResult = {
  imageHash: string;
  qrPayload?: string;
  qrAmount?: number;
  qrReadable: boolean;
  amountMatches: boolean | null;
};

export async function analyzeSlipImage(data: Buffer, expectedAmount: number): Promise<SlipCheckResult> {
  const imageHash = createHash("sha256").update(data).digest("hex");
  const qrPayload = await readQrPayload(data);
  const qrAmount = qrPayload ? extractEmvAmount(qrPayload) : undefined;
  const amountMatches =
    typeof qrAmount === "number"
      ? Math.abs(qrAmount - expectedAmount) < 0.01
      : null;

  return {
    imageHash,
    qrPayload,
    qrAmount,
    qrReadable: Boolean(qrPayload),
    amountMatches,
  };
}

async function readQrPayload(data: Buffer) {
  try {
    const image = await sharp(data)
      .rotate()
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = new Uint8ClampedArray(
      image.data.buffer,
      image.data.byteOffset,
      image.data.byteLength
    );
    return jsQR(pixels, image.info.width, image.info.height)?.data;
  } catch (error) {
    console.error("Failed to read slip QR payload", error);
    return undefined;
  }
}

function extractEmvAmount(payload: string) {
  let index = 0;
  while (index + 4 <= payload.length) {
    const tag = payload.slice(index, index + 2);
    const length = Number(payload.slice(index + 2, index + 4));
    if (!Number.isFinite(length) || length < 0) return undefined;
    const valueStart = index + 4;
    const valueEnd = valueStart + length;
    if (valueEnd > payload.length) return undefined;
    if (tag === "54") {
      const amount = Number(payload.slice(valueStart, valueEnd));
      return Number.isFinite(amount) ? amount : undefined;
    }
    index = valueEnd;
  }
  return undefined;
}

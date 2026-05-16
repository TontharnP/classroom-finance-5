import "server-only";

import { createHash } from "crypto";
import jsQR from "jsqr";
import sharp from "sharp";

export type SlipCheckResult = {
  imageHash: string;
  qrPayload?: string;
  qrAmount?: number;
  slipTransactionId?: string;
  qrReadable: boolean;
  amountMatches: boolean | null;
  receiverAccountMatches: boolean | null;
  receiverNameMatches: boolean | null;
};

export type SlipCheckOptions = {
  expectedReceiverAccounts?: string[];
  expectedReceiverName?: string;
};

export async function analyzeSlipImage(
  data: Buffer,
  expectedAmount: number,
  options: SlipCheckOptions = {}
): Promise<SlipCheckResult> {
  const imageHash = createHash("sha256").update(data).digest("hex");
  const qrPayload = await readQrPayload(data);
  const qrAmount = qrPayload ? extractEmvAmount(qrPayload) : undefined;
  const expectedAccounts = normalizeExpectedAccounts(options.expectedReceiverAccounts);
  const expectedReceiverName = options.expectedReceiverName?.trim();
  const amountMatches =
    typeof qrAmount === "number"
      ? Math.abs(qrAmount - expectedAmount) < 0.01
      : null;
  const receiverAccountMatches = qrPayload && expectedAccounts.length > 0
    ? containsExpectedAccount(qrPayload, expectedAccounts)
    : null;
  const receiverNameMatches = qrPayload && expectedReceiverName
    ? containsExpectedName(qrPayload, expectedReceiverName)
    : null;
  const slipTransactionId = qrPayload
    ? extractSlipTransactionId(qrPayload, expectedAccounts, qrAmount)
    : undefined;

  return {
    imageHash,
    qrPayload,
    qrAmount,
    slipTransactionId,
    qrReadable: Boolean(qrPayload),
    amountMatches,
    receiverAccountMatches,
    receiverNameMatches,
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
  const parsed = parseTlv(payload);
  for (const node of flattenTlv(parsed.nodes)) {
    if (node.tag === "54") {
      const amount = Number(node.value);
      return Number.isFinite(amount) ? amount : undefined;
    }
  }
  return undefined;
}

type TlvNode = {
  tag: string;
  path: string;
  value: string;
  children: TlvNode[];
};

type ExpectedReceiverAccount = {
  raw: string;
  digits: string;
  hasMask: boolean;
};

function parseTlv(input: string, prefix = ""): { nodes: TlvNode[]; complete: boolean } {
  const nodes: TlvNode[] = [];
  let index = 0;

  while (index + 4 <= input.length) {
    const tag = input.slice(index, index + 2);
    const lengthText = input.slice(index + 2, index + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) return { nodes, complete: false };

    const length = Number(lengthText);
    const valueStart = index + 4;
    const valueEnd = valueStart + length;
    if (valueEnd > input.length) return { nodes, complete: false };

    const value = input.slice(valueStart, valueEnd);
    const path = prefix ? `${prefix}.${tag}` : tag;
    const childResult = parseTlv(value, path);
    const children = childResult.complete && childResult.nodes.length > 0 ? childResult.nodes : [];
    nodes.push({ tag, path, value, children });
    index = valueEnd;
  }

  return { nodes, complete: index === input.length };
}

function flattenTlv(nodes: TlvNode[]): TlvNode[] {
  return nodes.flatMap((node) => [node, ...flattenTlv(node.children)]);
}

function normalizeExpectedAccounts(accounts: string[] | undefined) {
  return (accounts || [])
    .map((account) => ({
      raw: account.trim(),
      digits: normalizeDigits(account),
      hasMask: /x/i.test(account),
    }))
    .filter((account) => account.raw.length > 0 && (account.digits.length >= 4 || account.hasMask));
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function removeLeadingZeros(value: string) {
  return value.replace(/^0+/, "");
}

function containsExpectedAccount(payload: string, expectedAccounts: ExpectedReceiverAccount[]) {
  const payloadDigits = normalizeDigits(payload);
  const normalizedPayload = normalizeTextForSearch(payload);
  return expectedAccounts.some((account) => {
    const withoutLeadingZeros = removeLeadingZeros(account.digits);
    const normalizedRaw = normalizeTextForSearch(account.raw);
    return (
      (account.digits.length >= 4 && payloadDigits.includes(account.digits)) ||
      (withoutLeadingZeros.length >= 4 && payloadDigits.includes(withoutLeadingZeros)) ||
      (account.hasMask && normalizedRaw.length >= 4 && normalizedPayload.includes(normalizedRaw))
    );
  });
}

function containsExpectedName(payload: string, expectedName: string) {
  const normalizedPayload = normalizeTextForSearch(payload);
  const normalizedName = normalizeTextForSearch(expectedName);
  return normalizedName.length >= 2 && normalizedPayload.includes(normalizedName);
}

function normalizeTextForSearch(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/[\s._\-:|/\\()[\]{}]+/g, "");
}

function extractSlipTransactionId(payload: string, expectedAccounts: ExpectedReceiverAccount[], amount: number | undefined) {
  const parsed = parseTlv(payload);
  const nodes = flattenTlv(parsed.nodes);
  const preferredValues = nodes
    .filter((node) => node.path.startsWith("62.") && ["05", "07", "08", "09"].includes(node.tag))
    .map((node) => node.value);
  const tlvValues = nodes.map((node) => node.value);
  const rawValues = payload.match(/[A-Za-z0-9]{10,}/g) || [];

  return [...preferredValues, ...tlvValues, ...rawValues]
    .map(cleanTransactionCandidate)
    .find((candidate) => isLikelyTransactionId(candidate, expectedAccounts, amount));
}

function cleanTransactionCandidate(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function isLikelyTransactionId(candidate: string, expectedAccounts: ExpectedReceiverAccount[], amount: number | undefined) {
  if (candidate.length < 10 || candidate.length > 80) return false;
  if (/^A0{3,}/.test(candidate)) return false;
  if (/^0+$/.test(candidate)) return false;

  const candidateDigits = normalizeDigits(candidate);
  if (candidateDigits.length >= 6) {
    if (expectedAccounts.some((account) =>
      (account.digits.length >= 4 && candidateDigits.includes(account.digits)) ||
      (removeLeadingZeros(account.digits).length >= 4 && candidateDigits.includes(removeLeadingZeros(account.digits)))
    )) {
      return false;
    }
    if (typeof amount === "number") {
      const amountDigits = normalizeDigits(amount.toFixed(2));
      if (candidateDigits === amountDigits) return false;
    }
  }

  return true;
}

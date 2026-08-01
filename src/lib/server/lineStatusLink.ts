import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const STATUS_LINK_TTL_MS = 24 * 60 * 60 * 1000;

type StatusLinkPayload = { userId: string; expiresAt: number };

function getSigningSecret() {
  return process.env.LINE_CHANNEL_SECRET?.trim();
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function getAppUrl() {
  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  return vercelUrl ? `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}` : undefined;
}

export function createLineHistoryUrl(lineUserId: string) {
  const secret = getSigningSecret();
  const appUrl = getAppUrl();
  if (!secret || !appUrl || !lineUserId) return undefined;

  const payload: StatusLinkPayload = { userId: lineUserId, expiresAt: Date.now() + STATUS_LINK_TTL_MS };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${encodedPayload}.${sign(encodedPayload, secret)}`;
  return `${appUrl}/line-history?token=${encodeURIComponent(token)}`;
}

export function verifyLineStatusToken(token: string | undefined): StatusLinkPayload | null {
  const secret = getSigningSecret();
  if (!secret || !token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as StatusLinkPayload;
    if (!payload.userId || !Number.isFinite(payload.expiresAt) || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

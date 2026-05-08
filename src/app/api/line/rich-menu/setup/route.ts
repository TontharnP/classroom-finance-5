import { badRequest, ok, serverError } from "@/lib/api/response";

const RICH_MENU_SIZE = { width: 2500, height: 843 };
const MAX_RICH_MENU_IMAGE_BYTES = 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

class RichMenuSetupError extends Error {}

type RichMenuImageResult =
  | { uploaded: true }
  | { uploaded: false; warning: string };

export async function POST() {
  let richMenuId: string | null = null;

  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return badRequest("Missing LINE_CHANNEL_ACCESS_TOKEN");

    richMenuId = await createRichMenu(token);
    const imageUrl = process.env.LINE_RICH_MENU_IMAGE_URL;
    let imageResult: RichMenuImageResult = {
      uploaded: false,
      warning: "Add LINE_RICH_MENU_IMAGE_URL to upload a visual image.",
    };

    if (imageUrl) {
      imageResult = await uploadRichMenuImage(token, richMenuId, imageUrl);
    }

    await setDefaultRichMenu(token, richMenuId);

    return ok({
      richMenuId,
      imageUploaded: imageResult.uploaded,
      imageWarning: imageResult.uploaded ? undefined : imageResult.warning,
      note: imageResult.uploaded
        ? "Rich menu created and set as default."
        : "Rich menu created and set as default. Upload a LINE image under 1 MB for the visual menu.",
    });
  } catch (error) {
    if (richMenuId) await deleteRichMenu(process.env.LINE_CHANNEL_ACCESS_TOKEN, richMenuId);
    if (error instanceof RichMenuSetupError) return badRequest(error.message);
    return serverError(error);
  }
}

async function createRichMenu(token: string) {
  const response = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      size: RICH_MENU_SIZE,
      selected: true,
      name: "Classroom Finance Menu",
      chatBarText: "เมนูการเงิน",
      areas: [
        {
          bounds: { x: 0, y: 0, width: 500, height: 843 },
          action: {
            type: "message",
            label: "ชำระเงิน",
            text: "ชำระเงิน",
          },
        },
        {
          bounds: { x: 500, y: 0, width: 500, height: 843 },
          action: {
            type: "message",
            label: "สถานะ",
            text: "เมนูสถานะ",
          },
        },
        {
          bounds: { x: 1000, y: 0, width: 500, height: 843 },
          action: {
            type: "message",
            label: "ประวัติ",
            text: "เมนูประวัติ",
          },
        },
        {
          bounds: { x: 1500, y: 0, width: 500, height: 843 },
          action: {
            type: "message",
            label: "ลงทะเบียน",
            text: "ลงทะเบียน",
          },
        },
        {
          bounds: { x: 2000, y: 0, width: 500, height: 843 },
          action: {
            type: "uri",
            label: "เว็บแอป",
            uri: process.env.NEXT_PUBLIC_APP_URL || "https://classroom-finance-5.vercel.app",
          },
        },
      ],
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`LINE rich menu API ${response.status}: ${JSON.stringify(body)}`);
  if (!body?.richMenuId) throw new Error("LINE did not return richMenuId");
  return String(body.richMenuId);
}

async function uploadRichMenuImage(token: string, richMenuId: string, imageUrl: string): Promise<RichMenuImageResult> {
  const image = await fetch(imageUrl);
  if (!image.ok) throw new Error(`Failed to fetch rich menu image: ${image.status}`);
  const contentType = normalizeImageContentType(image.headers.get("content-type"));
  if (!SUPPORTED_IMAGE_TYPES.has(contentType)) {
    return {
      uploaded: false,
      warning: `Skipped rich menu image because LINE only accepts JPEG or PNG. The image URL returned "${contentType || "unknown"}".`,
    };
  }

  const contentLength = image.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_RICH_MENU_IMAGE_BYTES) {
    return {
      uploaded: false,
      warning: `Skipped rich menu image because it is too large (${formatBytes(Number(contentLength))}). Use a JPEG or PNG under ${formatBytes(
        MAX_RICH_MENU_IMAGE_BYTES
      )}.`,
    };
  }

  const data = await image.arrayBuffer();
  if (data.byteLength > MAX_RICH_MENU_IMAGE_BYTES) {
    return {
      uploaded: false,
      warning: `Skipped rich menu image because it is too large (${formatBytes(data.byteLength)}). Use a JPEG or PNG under ${formatBytes(
        MAX_RICH_MENU_IMAGE_BYTES
      )}.`,
    };
  }

  const response = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": contentType,
    },
    body: data,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LINE rich menu image API ${response.status}${body ? `: ${body}` : ""}`);
  }

  return { uploaded: true };
}

async function deleteRichMenu(token: string | undefined, richMenuId: string) {
  if (!token) return;

  await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`,
    },
  }).catch(() => null);
}

function normalizeImageContentType(contentType: string | null) {
  return (contentType || "").split(";")[0].trim().toLowerCase();
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function setDefaultRichMenu(token: string, richMenuId: string) {
  const response = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LINE default rich menu API ${response.status}${body ? `: ${body}` : ""}`);
  }
}

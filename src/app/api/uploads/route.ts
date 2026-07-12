import sharp from "sharp";
import { del, get, put } from "@vercel/blob";
import { badRequest, noContent, notFound, ok, serverError } from "@/lib/api/response";

const uploadFolders = {
  student: "avatars",
  category: "category-icons",
} as const;

type UploadKind = keyof typeof uploadFolders;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB, before resizing
const AVATAR_MAX_DIMENSION = 512; // rendered at most 64px in the UI; 512px covers retina thumbnails

function isUploadKind(value: FormDataEntryValue | null): value is UploadKind {
  return value === "student" || value === "category";
}

function extensionFromName(name: string) {
  const extension = name.split(".").pop();
  return extension ? `.${extension}` : "";
}

/**
 * Avatars/icons are only ever rendered as small thumbnails, but phone-camera
 * uploads routinely come in at several MB. Resize + re-encode as webp at
 * upload time so every later read is cheap, instead of relying on next/image
 * (which can't proxy these: they sit behind the session-auth middleware and
 * Next's built-in image optimizer doesn't forward the request's cookies).
 */
async function processImage(file: File): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const original = Buffer.from(await file.arrayBuffer());
  try {
    const resized = await sharp(original)
      .rotate()
      .resize({ width: AVATAR_MAX_DIMENSION, height: AVATAR_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer: resized, contentType: "image/webp", extension: ".webp" };
  } catch {
    // Not a format sharp can decode (or not an image) — store the original untouched.
    return { buffer: original, contentType: file.type || "application/octet-stream", extension: extensionFromName(file.name) };
  }
}

function appUploadUrl(pathname: string) {
  return `/api/uploads?pathname=${encodeURIComponent(pathname)}`;
}

function pathnameFromStoredUrl(value: string) {
  try {
    const url = new URL(value, "http://local");
    const pathname = url.searchParams.get("pathname");
    if (url.pathname === "/api/uploads" && pathname) return pathname;
  } catch {
    // Keep falling through for raw URLs/pathnames.
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pathname = url.searchParams.get("pathname");
    if (!pathname) return badRequest("pathname is required");

    const blob = await get(pathname, { access: "private" });
    if (!blob?.stream) return notFound("File not found");

    const headers = new Headers();
    blob.headers.forEach((value, key) => headers.set(key, value));
    // Each upload gets a fresh, timestamped pathname, so a cached response
    // for a given pathname is valid forever — a changed avatar is a new URL.
    headers.set("Cache-Control", "private, max-age=31536000, immutable");
    if (blob.blob.contentType) headers.set("Content-Type", blob.blob.contentType);

    return new Response(blob.stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");
    const ownerId = formData.get("ownerId");

    if (!(file instanceof File)) return badRequest("A file is required");
    if (!isUploadKind(kind)) return badRequest("Upload kind must be student or category");
    if (typeof ownerId !== "string" || !ownerId) return badRequest("ownerId is required");
    if (file.size > MAX_UPLOAD_BYTES) return badRequest("File is too large (max 10MB)");

    const { buffer, contentType, extension } = await processImage(file);
    const pathname = `${uploadFolders[kind]}/${ownerId}-${Date.now()}${extension}`;
    const blob = await put(pathname, buffer, {
      access: "private",
      contentType,
      allowOverwrite: true,
    });

    return ok({ url: appUploadUrl(blob.pathname), pathname: blob.pathname }, 201);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url) return badRequest("url is required");
    await del(pathnameFromStoredUrl(body.url));
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}

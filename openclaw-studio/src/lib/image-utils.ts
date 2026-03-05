import type { ImageAttachment } from "./types";

const MAX_INPUT_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const COMPRESS_MAX_DIM = 1024;
const COMPRESS_QUALITY = 0.8;

let imgId = 0;

export function validateImage(file: File): { ok: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: `不支持的格式: ${file.type}` };
  }
  if (file.size > MAX_INPUT_SIZE) {
    return { ok: false, error: `图片过大 (${(file.size / 1024 / 1024).toFixed(1)}MB)，最大 10MB` };
  }
  return { ok: true };
}

function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const longest = Math.max(width, height);
      if (longest > COMPRESS_MAX_DIM) {
        const scale = COMPRESS_MAX_DIM / longest;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", COMPRESS_QUALITY));
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = dataUrl;
  });
}

export function fileToAttachment(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const raw = reader.result as string;
        const dataUrl = await compressImage(raw);
        resolve({
          id: `img-${++imgId}-${Date.now()}`,
          dataUrl,
          name: file.name,
          size: file.size,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

export function extractImagesFromPaste(
  e: ClipboardEvent,
): File[] {
  const files: File[] = [];
  const items = e.clipboardData?.items;
  if (!items) return files;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith("image/")) {
      const file = items[i].getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}

export function extractImagesFromDrop(
  e: DragEvent,
): File[] {
  const files: File[] = [];
  const dt = e.dataTransfer;
  if (!dt) return files;
  for (let i = 0; i < dt.files.length; i++) {
    if (dt.files[i].type.startsWith("image/")) {
      files.push(dt.files[i]);
    }
  }
  return files;
}

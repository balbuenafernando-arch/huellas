"use client";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;
const targetBytes = 500 * 1024;
const outputSizes = [1280, 1120, 960];
const outputQualities = [0.72, 0.64, 0.56, 0.48];

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function drawImageToCanvas(image: HTMLImageElement, maxSize: number) {
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

export async function compressImage(file: File) {
  if (!allowedTypes.has(file.type)) throw new Error("Formato de imagen no permitido.");
  if (file.size > maxBytes) throw new Error("La imagen supera el tamano maximo permitido.");

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.src = objectUrl;

  try {
    await image.decode();
    let bestBlob: Blob | null = null;

    for (const size of outputSizes) {
      const canvas = drawImageToCanvas(image, size);
      if (!canvas) return file;

      for (const quality of outputQualities) {
        const blob = await canvasToBlob(canvas, quality);
        if (!blob) continue;
        bestBlob = blob;
        if (blob.size <= targetBytes) {
          return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
        }
      }
    }

    if (!bestBlob) return file;
    return new File([bestBlob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function fileToDataUrl(file: File) {
  const compressed = await compressImage(file);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(compressed);
  });
}

export function coverRect(imageWidth: number, imageHeight: number, boxWidth: number, boxHeight: number) {
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return { width, height, x: (boxWidth - width) / 2, y: (boxHeight - height) / 2 };
}

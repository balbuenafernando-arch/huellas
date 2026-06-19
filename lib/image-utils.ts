"use client";

export async function compressImage(file: File, maxSize = 1400, quality = 0.78) {
  const image = new Image();
  image.src = URL.createObjectURL(file);
  await image.decode();

  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(image.src);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
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

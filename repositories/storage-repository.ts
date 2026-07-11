import { getSupabaseClient, isSupabaseConfigured } from "@/repositories/supabase-client";

export type UploadedImage = {
  path: string;
  publicUrl: string;
};

const publicImageBuckets = new Set(["pet-photos"]);
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 5 * 1024 * 1024;

function assertValidImageUpload(bucket: string, file: File) {
  if (!publicImageBuckets.has(bucket)) throw new Error("Bucket de imagen no permitido.");
  if (!allowedImageTypes.has(file.type)) throw new Error("Formato de imagen no permitido.");
  if (file.size <= 0 || file.size > maxImageBytes) throw new Error("La imagen supera el tamano maximo permitido.");
}

function sanitizeStorageName(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, "-").replace(/-+/g, "-").slice(0, 120);
  return safeName || "imagen";
}

export async function uploadPublicImage(bucket: string, file: File): Promise<UploadedImage | null> {
  assertValidImageUpload(bucket, file);
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabaseClient();
  const path = `${crypto.randomUUID()}-${sanitizeStorageName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return { path, publicUrl: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

export async function removePublicImages(bucket: string, paths: string[]) {
  if (!publicImageBuckets.has(bucket)) throw new Error("Bucket de imagen no permitido.");
  if (!isSupabaseConfigured || paths.length === 0) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(bucket).remove(paths.filter((path) => path && !path.includes("..")));
  if (error) throw error;
}

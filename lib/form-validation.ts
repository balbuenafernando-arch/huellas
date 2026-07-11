"use client";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 5 * 1024 * 1024;

export function friendlyError(error: unknown, fallback = "No se pudo completar la acción. Inténtalo otra vez.") {
  console.error("[HUELLA]", error);

  if (!(error instanceof Error)) return fallback;

  const message = error.message || "";
  const status = "status" in error ? String((error as { status?: unknown }).status ?? "") : "";
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const hint = "hint" in error ? String((error as { hint?: unknown }).hint ?? "") : "";
  const details = `${message} ${status} ${code} ${hint}`;
  const technical = [code, status, message, hint].filter(Boolean).join(" · ");
  const withTechnical = (text: string) => technical ? `${text} (${technical})` : text;

  if (/network|fetch|offline|failed to fetch|load failed|internet/i.test(details)) {
    return withTechnical("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo otra vez.");
  }
  if (/auth|login|sesion|session|jwt|token|not authenticated|unauthorized|401/i.test(details)) {
    return withTechnical("Tu sesión necesita validarse de nuevo. Inicia sesión e inténtalo otra vez.");
  }
  if (/permission|rls|policy|forbidden|denied|403/i.test(details)) {
    return withTechnical("No tienes permisos para realizar esta acción.");
  }
  if (/validation|required|invalid|constraint|check|23502|23514|23503|22P02/i.test(details)) {
    return withTechnical("Hay datos incompletos o con un formato incorrecto. Revisa el formulario.");
  }
  if (/storage|bucket|upload|imagen|image|mime|formato/i.test(details)) {
    return withTechnical(message || "No se pudo procesar la imagen. Intenta con otra foto.");
  }
  if (/supabase|postgrest|database|duplicate|23505|PGRST/i.test(details)) {
    return withTechnical("No se pudo guardar la información en este momento. Inténtalo otra vez.");
  }

  return withTechnical(fallback);
}

function errorField(error: unknown, field: string) {
  if (!error || typeof error !== "object" || !(field in error)) return "";
  const value = (error as Record<string, unknown>)[field];
  return value == null ? "" : String(value);
}

export function operationError(error: unknown, operation: string, title?: string) {
  console.error("[HUELLA]", operation, error);

  const message = error instanceof Error ? error.message : errorField(error, "message") || "Error desconocido";
  const code = errorField(error, "code") || errorField(error, "status") || "Sin codigo";
  const detail = errorField(error, "details") || errorField(error, "detail") || "Sin detalle";
  const hint = errorField(error, "hint") || "Sin hint";

  return [
    title ?? `Error al ${operation}`,
    "",
    "Codigo:",
    code,
    "",
    "Mensaje:",
    message,
    "",
    "Detalle:",
    detail,
    "",
    "Hint:",
    hint,
    "",
    "Operación:",
    operation,
  ].join("\n");
}

export function validateImageFile(file?: File | null) {
  if (!file || file.size === 0) return null;
  if (!allowedImageTypes.has(file.type)) return "Usa una imagen en formato JPG, PNG o WebP.";
  if (file.size > maxImageBytes) return "La imagen no puede superar 5 MB.";
  return null;
}

export function validateImageFiles(files: File[]) {
  if (files.length > 5) return "Puedes subir hasta 5 fotos.";
  for (const file of files) {
    const error = validateImageFile(file);
    if (error) return error;
  }
  return null;
}

export function validateNotFuture(value: string, label = "La fecha") {
  if (!value) return `${label} es obligatoria.`;
  if (new Date(value).getTime() > Date.now() + 60_000) return `${label} no puede estar en el futuro.`;
  return null;
}

export function requiredText(value: FormDataEntryValue | null, label: string, max = 500) {
  const text = String(value ?? "").trim();
  if (!text) return `${label} es obligatorio.`;
  if (text.length > max) return `${label} debe tener máximo ${max} caracteres.`;
  return null;
}

export function validateCoordinate(value: number | null, min: number, max: number) {
  if (value == null) return true;
  return Number.isFinite(value) && value >= min && value <= max;
}

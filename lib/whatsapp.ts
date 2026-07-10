export function normalizePeruWhatsapp(value?: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("51") && digits.length === 11) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `51${digits.slice(1)}`;
  if (digits.length === 9) return `51${digits}`;
  return digits;
}

export function isValidPeruWhatsapp(value?: string | null) {
  return /^51[9]\d{8}$/.test(normalizePeruWhatsapp(value));
}

export function peruWhatsappUrl(value: string, message: string) {
  return `https://wa.me/${normalizePeruWhatsapp(value)}?text=${encodeURIComponent(message)}`;
}

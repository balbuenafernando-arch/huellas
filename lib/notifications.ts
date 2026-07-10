"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { demoNotifications } from "@/lib/demo-data";
import { getCurrentUser } from "@/lib/sprint14-store";

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  caseId: string | null;
  type: string;
  read: boolean;
  createdAt: string;
};

const KEY = "huella:notifications";

function readLocal(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Array<Record<string, unknown>>;
    return raw.map(normalizeNotification).filter(Boolean) as AppNotification[];
  } catch {
    return [];
  }
}

function writeLocal(items: AppNotification[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

function titleFor(type: string) {
  if (type.includes("contact")) return "Solicitud de contacto";
  if (type.includes("avistamiento") || type.includes("sighting")) return "Nuevo avistamiento";
  if (type.includes("coincidencia") || type.includes("match")) return "Nueva coincidencia";
  if (type.includes("cerrado") || type.includes("reunida") || type.includes("reunited")) return "Mascota reunida";
  return "Caso actualizado";
}

function normalizeNotification(item: Record<string, unknown>): AppNotification {
  const type = String(item.type ?? item.tipo ?? "reporte_actualizado");
  const description = String(item.message ?? item.mensaje ?? "Tienes una novedad en HUELLA.");
  return {
    id: String(item.id ?? crypto.randomUUID()),
    title: titleFor(type),
    description,
    caseId: item.report_id ? String(item.report_id) : item.pet_id ? String(item.pet_id) : null,
    type,
    read: Boolean(item.read_at ?? item.leido),
    createdAt: String(item.created_at ?? item.creado_en ?? new Date().toISOString()),
  };
}

export async function listNotifications(): Promise<AppNotification[]> {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && supabase && user) {
    console.info("[HUELLA Supabase] select notifications", { user_id: user.id });
    const { data, error } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (!error && data) return data.map((item) => normalizeNotification(item as Record<string, unknown>));
  }
  const local = readLocal();
  return local.length ? local : demoNotifications.map((item) => normalizeNotification(item as unknown as Record<string, unknown>));
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && supabase && user) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  }
  writeLocal(readLocal().map((item) => ({ ...item, read: true })));
}

export async function createLocalNotification(input: Omit<AppNotification, "id" | "read" | "createdAt">) {
  const notification: AppNotification = { ...input, id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString() };
  writeLocal([notification, ...readLocal()]);
  return notification;
}

"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/sprint14-store";

export type NotificationPreferences = {
  notifyByEmail: boolean;
  notifyByWhatsapp: boolean;
};

const KEY = "huella:notification-preferences";
const defaults: NotificationPreferences = { notifyByEmail: true, notifyByWhatsapp: false };

function readLocal() {
  if (typeof window === "undefined") return defaults;
  try {
    return { ...defaults, ...JSON.parse(window.localStorage.getItem(KEY) ?? "{}") } as NotificationPreferences;
  } catch {
    return defaults;
  }
}

function writeLocal(preferences: NotificationPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(preferences));
}

export async function getNotificationPreferences() {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && supabase && user) {
    const { data, error } = await supabase.from("user_settings").select("notify_by_email, notify_by_whatsapp").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (data) return { notifyByEmail: Boolean(data.notify_by_email), notifyByWhatsapp: Boolean(data.notify_by_whatsapp) };
  }
  return readLocal();
}

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && supabase && user) {
    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      notify_by_email: preferences.notifyByEmail,
      notify_by_whatsapp: preferences.notifyByWhatsapp,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
  writeLocal(preferences);
}

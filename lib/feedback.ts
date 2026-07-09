"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type FeedbackType = "Sugerencia" | "Error" | "Algo no se entiende" | "Experiencia";

export const APP_VERSION = "beta-ready";

export async function submitFeedback(input: { tipo: FeedbackType; comentario: string; screenshot_url?: string | null }) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase no está configurado.");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Necesitas iniciar sesión.");
  const { error } = await supabase.from("feedback").insert({
    user_id: userData.user.id,
    tipo: input.tipo,
    comentario: input.comentario,
    screenshot_url: input.screenshot_url ?? null,
    app_version: APP_VERSION,
  });
  if (error) throw error;
}

export async function submitErrorReport(error: Error, stack = "") {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  await supabase.from("feedback").insert({
    user_id: userData.user?.id ?? null,
    tipo: "Error",
    comentario: [
      `mensaje: ${error.message}`,
      `stack: ${error.stack ?? stack}`,
      `usuario: ${userData.user?.id ?? "sin sesion"}`,
      `navegador: ${typeof navigator !== "undefined" ? navigator.userAgent : "desconocido"}`,
      `version: ${APP_VERSION}`,
    ].join("\n"),
    screenshot_url: null,
    app_version: APP_VERSION,
  });
}

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) throw new Error("No se pudo conectar con Supabase.");
  return supabase;
}

export { isSupabaseConfigured };

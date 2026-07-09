import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) throw new Error("No pudimos conectar con el servicio.");
  return supabase;
}

export { isSupabaseConfigured };

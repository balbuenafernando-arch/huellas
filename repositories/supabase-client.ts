import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase no esta configurado.");
  return supabase;
}

export { isSupabaseConfigured };

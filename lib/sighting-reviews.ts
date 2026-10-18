"use client";

import type { Sighting } from "@/lib/demo-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/sprint14-store";
import { getSpeciesSightings } from "@/lib/pet-store";

export type ReviewDecision = "podria_ser" | "descartado";
export type SightingReview = { sighting: Sighting; decision: ReviewDecision | null };

export async function listSightingReviews(reportId: string, species: string): Promise<SightingReview[]> {
  if (!isSupabaseConfigured || !supabase || !species.trim()) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: report, error: reportError } = await supabase.from("lost_reports")
    .select("id, owner_id, status, report_type, pet_id")
    .eq("id", reportId).maybeSingle();
  if (reportError) throw reportError;
  if (!report || report.owner_id !== user.id || report.status !== "active" || report.report_type !== "lost") return [];

  const [{ data: decisions, error: decisionError }, sightings] = await Promise.all([
    supabase.from("sighting_matches").select("sighting_id, decision").eq("report_id", reportId),
    getSpeciesSightings(species),
  ]);
  if (decisionError) throw decisionError;
  const byId = new Map((decisions ?? []).map((row) => [row.sighting_id as string, row.decision as ReviewDecision]));
  const normalizedSpecies = species.trim().toLocaleLowerCase("es-PE");
  const sourceReportIds = Array.from(new Set(sightings
    .map((sighting) => sighting.report_id)
    .filter((id): id is string => Boolean(id))));
  const foundReportIds = new Set<string>();
  if (sourceReportIds.length > 0) {
    const { data: foundReports, error: foundReportsError } = await supabase.from("lost_reports")
      .select("id")
      .in("id", sourceReportIds)
      .eq("report_type", "found");
    if (foundReportsError) throw foundReportsError;
    for (const sourceReport of foundReports ?? []) foundReportIds.add(sourceReport.id as string);
  }
  return sightings
    .filter((sighting) => sighting.especie?.trim().toLocaleLowerCase("es-PE") === normalizedSpecies)
    .filter((sighting) => Boolean(sighting.report_id) && foundReportIds.has(sighting.report_id as string))
    .filter((sighting) => sighting.report_id !== reportId && sighting.pet_id !== report.pet_id)
    .map((sighting) => ({ sighting, decision: byId.get(sighting.id) ?? null }));
}

export async function saveSightingDecision(reportId: string, sightingId: string, decision: ReviewDecision | null) {
  if (!isSupabaseConfigured || !supabase) throw new Error("La revisión requiere conexión a HUELLA.");
  const user = await getCurrentUser();
  if (!user) throw new Error("Inicia sesión para revisar avistamientos.");
  const { data: report, error: reportError } = await supabase.from("lost_reports")
    .select("owner_id, status, report_type").eq("id", reportId).maybeSingle();
  if (reportError) throw reportError;
  if (!report || report.owner_id !== user.id || report.status !== "active" || report.report_type !== "lost") throw new Error("La búsqueda ya no está activa o no te pertenece.");

  if (decision === null) {
    const { error } = await supabase.from("sighting_matches").delete()
      .eq("report_id", reportId).eq("sighting_id", sightingId);
    if (error) throw error;
    return;
  }
  const { data: existing, error: readError } = await supabase.from("sighting_matches")
    .select("sighting_id").eq("report_id", reportId).eq("sighting_id", sightingId).maybeSingle();
  if (readError) throw readError;
  const { error } = existing
    ? await supabase.from("sighting_matches").update({ decision }).eq("report_id", reportId).eq("sighting_id", sightingId)
    : await supabase.from("sighting_matches").insert({ report_id: reportId, sighting_id: sightingId, decision });
  if (error) throw error;
}

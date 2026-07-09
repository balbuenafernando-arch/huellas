"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/sprint14-store";

export type ReunionStory = {
  id?: string;
  caseId?: string;
  reportId?: string;
  petId?: string | null;
  ownerId?: string | null;
  photoUrl?: string | null;
  story?: string | null;
  reunitedAt: string;
  searchDurationDays?: number | null;
  createdAt: string;
};

const KEY = "huella:reunion-stories";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value?: string | null) {
  return Boolean(value && UUID_RE.test(value));
}

function toLegacyMap(items: ReunionStory[]) {
  return Object.fromEntries(items.map((story) => [story.caseId ?? story.reportId ?? story.petId ?? story.id ?? crypto.randomUUID(), story]));
}

export function readLocalReunionStories(): Record<string, ReunionStory> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, ReunionStory>;
  } catch {
    return {};
  }
}

function writeLocalReunionStory(caseId: string, story: ReunionStory) {
  if (typeof window === "undefined") return;
  const current = readLocalReunionStories();
  current[caseId] = story;
  window.localStorage.setItem(KEY, JSON.stringify(current));
}

export async function listReunionStories(): Promise<Record<string, ReunionStory>> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("reunion_stories").select("*").order("reunited_at", { ascending: false });
    if (!error && data) {
      return toLegacyMap(data.map((item) => ({
        id: item.id,
        caseId: item.case_id ?? item.report_id ?? item.pet_id,
        reportId: item.report_id,
        petId: item.pet_id,
        ownerId: item.owner_id,
        photoUrl: item.photo_url,
        story: item.story,
        reunitedAt: item.reunited_at,
        searchDurationDays: item.search_duration_days,
        createdAt: item.created_at,
      })));
    }
  }
  return readLocalReunionStories();
}

export async function saveReunionStory(caseId: string, story: Omit<ReunionStory, "createdAt" | "reunitedAt"> & { reunitedAt?: string; createdAt?: string }) {
  const user = await getCurrentUser();
  const reunitedAt = story.reunitedAt ?? new Date().toISOString();
  const payload: ReunionStory = {
    ...story,
    caseId,
    reportId: story.reportId ?? caseId,
    ownerId: story.ownerId ?? user?.id ?? null,
    story: story.story?.trim().slice(0, 200) || null,
    reunitedAt,
    createdAt: story.createdAt ?? new Date().toISOString(),
  };
  if (isSupabaseConfigured && supabase && isUuid(payload.caseId) && (!payload.reportId || isUuid(payload.reportId)) && (!payload.petId || isUuid(payload.petId)) && (!payload.ownerId || isUuid(payload.ownerId))) {
    const { error } = await supabase.from("reunion_stories").upsert({
      case_id: payload.caseId,
      report_id: payload.reportId,
      pet_id: payload.petId,
      owner_id: payload.ownerId,
      photo_url: payload.photoUrl,
      story: payload.story,
      reunited_at: payload.reunitedAt,
      search_duration_days: payload.searchDurationDays,
    }, { onConflict: "case_id" });
    if (error) throw error;
  }
  writeLocalReunionStory(caseId, payload);
}

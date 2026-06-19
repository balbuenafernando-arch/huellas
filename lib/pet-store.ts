"use client";

import { demoNotifications, demoPets, demoSightings, type Notification, type Pet, type PetStatus, type Sighting } from "@/lib/demo-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const PETS_KEY = "huella:pets";
const SIGHTINGS_KEY = "huella:sightings";
const NOTIFICATIONS_KEY = "huella:notifications";
const OWNER_TOKEN_KEY = "huella:owner-token";
const OWNED_PETS_KEY = "huella:owned-pets";
const CONTENT_REPORTS_KEY = "huella:content-reports";

export type ContentReportReason = "spam" | "informacion_falsa" | "foto_incorrecta" | "broma";

export type ContentReport = {
  id: string;
  target_type: "pet" | "sighting";
  target_id: string;
  motivo: ContentReportReason;
  detalle?: string | null;
  creado_en: string;
};

export const distinctiveFeatures = [
  "Collar rojo",
  "Collar azul",
  "Collar negro",
  "Collar verde",
  "Sin collar",
  "Mancha en el ojo",
  "Mancha en la oreja",
  "Cola corta",
  "Cola larga",
  "Esterilizado",
  "Microchip",
];

export const specialConditions = [
  "Necesita medicación",
  "Cachorro",
  "Adulto mayor",
  "Muy sociable",
  "Tímido",
  "Asustadizo",
  "Puede morder",
  "Tiene microchip",
  "Tiene collar",
];

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? JSON.parse(raw) as T : fallback;
}

function writeLocal<T>(key: string, value: T) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
}

export function getOwnerToken() {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(OWNER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(OWNER_TOKEN_KEY, token);
  }
  return token;
}

function rememberOwnedPet(id: string) {
  const ids = readLocal<string[]>(OWNED_PETS_KEY, []);
  if (!ids.includes(id)) writeLocal(OWNED_PETS_KEY, [...ids, id]);
}

export function isOwnedPet(pet?: Pet) {
  if (!pet || typeof window === "undefined") return false;
  const token = getOwnerToken();
  const ids = readLocal<string[]>(OWNED_PETS_KEY, []);
  return pet.owner_token === token || ids.includes(pet.id);
}

export function isOwnedSighting(sighting?: Sighting) {
  if (!sighting || typeof window === "undefined") return false;
  return sighting.owner_token === getOwnerToken();
}

export async function getPets(): Promise<Pet[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("pets").select("*").order("creado_en", { ascending: false });
    if (!error && data?.length) return data as Pet[];
  }
  return readLocal(PETS_KEY, demoPets);
}

export async function getPet(id: string): Promise<Pet | undefined> {
  const pets = await getPets();
  return pets.find((pet) => pet.id === id);
}

export async function getSightings(petId?: string | null, relatedId?: string | null): Promise<Sighting[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from("sightings").select("*").order("creado_en", { ascending: false });
    if (petId && relatedId) query = query.or(`pet_id.eq.${petId},report_id.eq.${petId},pet_id.eq.${relatedId},report_id.eq.${relatedId}`);
    else if (petId) query = query.or(`pet_id.eq.${petId},report_id.eq.${petId}`);
    const { data, error } = await query;
    if (!error && data) return data as Sighting[];
  }
  const sightings = readLocal(SIGHTINGS_KEY, demoSightings);
  return petId ? sightings.filter((sighting) => sighting.pet_id === petId || sighting.report_id === petId || sighting.pet_id === relatedId || sighting.report_id === relatedId) : sightings;
}

export async function getSighting(id: string): Promise<Sighting | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("sightings").select("*").eq("id", id).single();
    if (!error && data) return data as Sighting;
  }
  return readLocal(SIGHTINGS_KEY, demoSightings).find((sighting) => sighting.id === id);
}

export async function getNotifications(): Promise<Notification[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("notifications").select("*").order("creado_en", { ascending: false });
    if (!error && data) return data as Notification[];
  }
  return readLocal(NOTIFICATIONS_KEY, demoNotifications);
}

export async function createNotification(input: Omit<Notification, "id" | "leido" | "creado_en">) {
  const notification: Notification = { ...input, id: crypto.randomUUID(), leido: false, creado_en: new Date().toISOString() };
  if (isSupabaseConfigured && supabase) {
    await supabase.from("notifications").insert(notification);
  }
  writeLocal(NOTIFICATIONS_KEY, [notification, ...readLocal(NOTIFICATIONS_KEY, demoNotifications)]);
  return notification;
}

export async function markNotificationsRead() {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("notifications").update({ leido: true }).eq("leido", false);
  }
  writeLocal(NOTIFICATIONS_KEY, readLocal(NOTIFICATIONS_KEY, demoNotifications).map((item) => ({ ...item, leido: true })));
}

export async function createContentReport(input: Omit<ContentReport, "id" | "creado_en">) {
  const report: ContentReport = { ...input, id: crypto.randomUUID(), creado_en: new Date().toISOString() };
  if (isSupabaseConfigured && supabase) {
    await supabase.from("content_reports").insert(report);
  }
  writeLocal(CONTENT_REPORTS_KEY, [report, ...readLocal<ContentReport[]>(CONTENT_REPORTS_KEY, [])]);
  return report;
}

export async function createPet(input: Omit<Pet, "id" | "creado_en" | "fecha_reporte">) {
  const pet: Pet = {
    ...input,
    id: crypto.randomUUID(),
    creado_en: new Date().toISOString(),
    fecha_reporte: new Date().toISOString(),
    owner_token: getOwnerToken(),
  };
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("pets").insert(pet).select().single();
    if (!error && data) {
      rememberOwnedPet((data as Pet).id);
      return data as Pet;
    }
  }
  const pets = [pet, ...readLocal(PETS_KEY, demoPets)];
  writeLocal(PETS_KEY, pets);
  rememberOwnedPet(pet.id);
  await createNotification({ pet_id: pet.id, tipo: "reporte_actualizado", mensaje: `Reporte creado para ${pet.nombre}` });
  return pet;
}

export async function updatePet(id: string, input: Partial<Pet>) {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("pets").update(input).eq("id", id);
  }
  const pets = readLocal(PETS_KEY, demoPets).map((pet) => pet.id === id ? { ...pet, ...input } : pet);
  writeLocal(PETS_KEY, pets);
  await createNotification({ pet_id: id, tipo: "reporte_actualizado", mensaje: "Reporte actualizado" });
}

export async function deletePet(id: string) {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("pets").delete().eq("id", id);
  }
  writeLocal(PETS_KEY, readLocal(PETS_KEY, demoPets).filter((pet) => pet.id !== id));
  writeLocal(SIGHTINGS_KEY, readLocal(SIGHTINGS_KEY, demoSightings).filter((sighting) => sighting.pet_id !== id));
  writeLocal(OWNED_PETS_KEY, readLocal<string[]>(OWNED_PETS_KEY, []).filter((petId) => petId !== id));
}

export async function createSighting(input: Omit<Sighting, "id" | "creado_en" | "estado" | "estado_revision">) {
  const sighting: Sighting = { ...input, estado: "pendiente", estado_avistamiento: "pendiente", estado_revision: "por_revisar", owner_token: getOwnerToken(), id: crypto.randomUUID(), creado_en: new Date().toISOString() };
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("sightings").insert(sighting).select().single();
    if (!error && data) {
      if (input.pet_id) await createNotification({ pet_id: input.pet_id, tipo: "nuevo_avistamiento", mensaje: "Nuevo avistamiento recibido" });
      return data as Sighting;
    }
  }
  const sightings = [sighting, ...readLocal(SIGHTINGS_KEY, demoSightings)];
  writeLocal(SIGHTINGS_KEY, sightings);
  if (input.pet_id) await createNotification({ pet_id: input.pet_id, tipo: "nuevo_avistamiento", mensaje: "Nuevo avistamiento recibido" });
  return sighting;
}

export async function updateSightingReview(id: string, petId: string, estado_revision: NonNullable<Sighting["estado_revision"]>) {
  const patch: Partial<Sighting> = { estado_revision };
  if (estado_revision === "encontrada") {
    patch.estado = "confirmado";
    patch.estado_avistamiento = "confirmado";
    patch.feedback_reportero = "Tu avistamiento ayudó a reunir una mascota con su familia.";
  }
  if (isSupabaseConfigured && supabase) {
    await supabase.from("sightings").update(patch).eq("id", id);
  }
  const sightings = readLocal(SIGHTINGS_KEY, demoSightings).map((sighting) => sighting.id === id ? { ...sighting, ...patch } : sighting);
  writeLocal(SIGHTINGS_KEY, sightings);
  if (estado_revision === "encontrada") await markPetStatus(petId, "reunido");
}

export async function findPotentialDuplicateSightings(input: { petId: string; ubicacion: string; vistoEn: string }) {
  const sightings = await getSightings(input.petId);
  const targetDate = new Date(input.vistoEn).getTime();
  return sightings.filter((sighting) => {
    const samePlace = sighting.ubicacion?.toLowerCase().includes(input.ubicacion.toLowerCase()) || input.ubicacion.toLowerCase().includes((sighting.ubicacion ?? "").toLowerCase());
    const closeDate = Math.abs(new Date(sighting.visto_en ?? sighting.creado_en).getTime() - targetDate) < 1000 * 60 * 60 * 24 * 3;
    return samePlace && closeDate;
  }).slice(0, 3);
}

export async function updateSighting(id: string, input: Partial<Sighting>) {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("sightings").update(input).eq("id", id);
  }
  const sightings = readLocal(SIGHTINGS_KEY, demoSightings).map((sighting) => sighting.id === id ? { ...sighting, ...input } : sighting);
  writeLocal(SIGHTINGS_KEY, sightings);
}

export async function deleteSighting(id: string) {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("sightings").delete().eq("id", id);
  }
  writeLocal(SIGHTINGS_KEY, readLocal(SIGHTINGS_KEY, demoSightings).filter((sighting) => sighting.id !== id));
}

export async function updateSightingStatus(id: string, petId: string, estado: NonNullable<Sighting["estado"]>) {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("sightings").update({ estado, estado_avistamiento: estado }).eq("id", id);
  }
  const sightings = readLocal(SIGHTINGS_KEY, demoSightings).map((sighting) => sighting.id === id ? { ...sighting, estado, estado_avistamiento: estado } : sighting);
  writeLocal(SIGHTINGS_KEY, sightings);
  await createNotification({
    pet_id: petId,
    tipo: estado === "confirmado" ? "avistamiento_confirmado" : "reporte_actualizado",
    mensaje: estado === "confirmado" ? "Avistamiento confirmado" : "Avistamiento descartado",
  });
}

export async function markPetStatus(id: string, estado: PetStatus) {
  const cerrado_en = estado === "reunido" ? new Date().toISOString() : null;
  if (isSupabaseConfigured && supabase) {
    await supabase.from("pets").update({ estado, cerrado_en }).eq("id", id);
  }
  const pets = readLocal(PETS_KEY, demoPets).map((pet) => pet.id === id ? { ...pet, estado, cerrado_en } : pet);
  writeLocal(PETS_KEY, pets);
  if (estado === "reunido") await createNotification({ pet_id: id, tipo: "reporte_cerrado", mensaje: "Mascota reunida" });
}

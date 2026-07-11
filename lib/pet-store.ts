"use client";

import { demoNotifications, demoPets, demoSightings, type Notification, type Pet, type PetStatus, type Sighting } from "@/lib/demo-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const PETS_KEY = "huella:pets";
const SIGHTINGS_KEY = "huella:sightings";
const NOTIFICATIONS_KEY = "huella:notifications";
const OWNER_TOKEN_KEY = "huella:owner-token";
const OWNED_PETS_KEY = "huella:owned-pets";
const CONTENT_REPORTS_KEY = "huella:content-reports";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let sessionOwnerToken = "";

export type ContentReportReason = "spam" | "informacion_falsa" | "foto_incorrecta" | "broma";

export type ContentReport = {
  id: string;
  target_type: "pet" | "sighting";
  target_id: string;
  motivo: ContentReportReason;
  detalle?: string | null;
  creado_en: string;
};

type PetRow = {
  id: string;
  owner_id?: string | null;
  user_id?: string | null;
  nombre: string;
  alias?: string | string[] | null;
  especie?: string | null;
  tipo?: string | null;
  raza?: string | null;
  tamano?: string | null;
  color?: string | null;
  foto_url?: string | null;
  foto_principal?: string | null;
  fotos?: string[] | null;
  caracteristicas?: string[] | null;
  caracteristicas_personalizadas?: string | null;
  condiciones_especiales?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SightingRow = {
  id: string;
  report_id?: string | null;
  pet_id?: string | null;
  reporter_id?: string | null;
  reporter_name?: string | null;
  reporter_is_anonymous?: boolean | null;
  especie?: string | null;
  tamano?: string | null;
  color?: string | null;
  district?: string | null;
  approximate_address?: string | null;
  description?: string | null;
  photo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  observed_at?: string | null;
  status?: "pending" | "confirmed" | "dismissed" | null;
  estado_revision?: Sighting["estado_revision"];
  situacion?: Sighting["situacion"];
  created_at: string;
  updated_at?: string | null;
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
  "Necesita medicacion",
  "Cachorro",
  "Adulto mayor",
  "Muy sociable",
  "Timido",
  "Asustadizo",
  "Puede morder",
  "Tiene microchip",
  "Tiene collar",
];

function readLocal<T>(key: string, fallback: T): T {
  void key;
  return fallback;
}

function writeLocal<T>(key: string, value: T) {
  void key;
  void value;
}

function isUuid(value?: string | null) {
  return Boolean(value && UUID_RE.test(value));
}

async function currentUserId() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.user.id ?? null;
}

async function ensureCurrentProfile() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user ?? (await supabase.auth.getUser()).data.user ?? null;
  if (!user) return null;
  const { data: ensuredId, error: rpcError } = await supabase.rpc("ensure_current_profile");
  if (!rpcError && ensuredId === user.id) return user.id;
  if (rpcError && rpcError.code !== "PGRST202") throw rpcError;
  const { data: existing, error: readError } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (readError) throw readError;
  if (!existing) {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
  return user.id;
}

function sightingStatusToLegacy(status?: string | null): NonNullable<Sighting["estado"]> {
  if (status === "confirmed") return "confirmado";
  if (status === "dismissed") return "descartado";
  return "pendiente";
}

function legacySightingStatus(status?: Sighting["estado"]) {
  if (status === "confirmado") return "confirmed";
  if (status === "descartado") return "dismissed";
  return "pending";
}

function normalizePet(row: PetRow): Pet {
  const createdAt = row.created_at ?? row.updated_at ?? new Date().toISOString();
  const alias = Array.isArray(row.alias) ? row.alias : row.alias ? row.alias.split(",").map((item) => item.trim()).filter(Boolean) : [];
  return {
    id: row.id,
    nombre: row.nombre,
    tipo: row.especie ?? row.tipo ?? "Mascota",
    raza: row.raza ?? row.color ?? "",
    descripcion: row.caracteristicas_personalizadas ?? "",
    estado: "perdido",
    distrito: "",
    direccion: "",
    latitud: -12.105,
    longitud: -77.03,
    whatsapp: "",
    foto_principal: row.foto_principal ?? row.foto_url ?? row.fotos?.[0] ?? "",
    fotos: row.fotos ?? [row.foto_principal ?? row.foto_url ?? ""].filter(Boolean),
    caracteristicas: row.caracteristicas ?? [],
    caracteristicas_personalizadas: row.caracteristicas_personalizadas ?? "",
    condiciones_especiales: row.condiciones_especiales ?? [],
    alias,
    fecha_reporte: createdAt,
    creado_en: createdAt,
    owner_token: row.owner_id ?? row.user_id ?? null,
  };
}

function normalizeSighting(row: SightingRow): Sighting {
  const status = sightingStatusToLegacy(row.status);
  return {
    id: row.id,
    pet_id: row.pet_id ?? null,
    report_id: row.report_id ?? null,
    especie: row.especie ?? null,
    tamano: row.tamano ?? null,
    color: row.color ?? null,
    distrito: row.district ?? null,
    comentario: row.description ?? "",
    foto: row.photo_url ?? null,
    latitud: row.latitude ?? null,
    longitud: row.longitude ?? null,
    ubicacion: row.approximate_address ?? row.district ?? null,
    estado: status,
    estado_avistamiento: status,
    estado_revision: row.estado_revision ?? "por_revisar",
    situacion: row.situacion,
    visto_en: row.observed_at ?? row.created_at,
    owner_token: row.reporter_id ?? null,
    reporter_name: row.reporter_is_anonymous ? "Usuario anónimo" : row.reporter_name ?? "Usuario HUELLA",
    reporter_is_anonymous: Boolean(row.reporter_is_anonymous),
    creado_en: row.created_at,
  };
}

function userDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string | null }) {
  return String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Usuario HUELLA");
}

function petToInsert(input: Pet, userId: string | null) {
  return {
    owner_id: userId,
    user_id: userId,
    nombre: input.nombre,
    especie: input.tipo,
    tipo: input.tipo,
    raza: input.raza,
    color: input.raza,
    foto_url: input.foto_principal,
    foto_principal: input.foto_principal,
    fotos: input.fotos ?? [input.foto_principal].filter(Boolean),
    caracteristicas: input.caracteristicas ?? [],
    caracteristicas_personalizadas: input.caracteristicas_personalizadas ?? input.descripcion,
    condiciones_especiales: input.condiciones_especiales ?? [],
    is_public: true,
  };
}

function petPatch(input: Partial<Pet>, userId: string | null) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (userId) {
    patch.owner_id = userId;
    patch.user_id = userId;
  }
  if (input.nombre !== undefined) patch.nombre = input.nombre;
  if (input.tipo !== undefined) {
    patch.especie = input.tipo;
    patch.tipo = input.tipo;
  }
  if (input.raza !== undefined) patch.raza = input.raza;
  if (input.foto_principal !== undefined) {
    patch.foto_principal = input.foto_principal;
    patch.foto_url = input.foto_principal;
  }
  if (input.fotos !== undefined) patch.fotos = input.fotos;
  if (input.caracteristicas !== undefined) patch.caracteristicas = input.caracteristicas;
  if (input.caracteristicas_personalizadas !== undefined) patch.caracteristicas_personalizadas = input.caracteristicas_personalizadas;
  if (input.condiciones_especiales !== undefined) patch.condiciones_especiales = input.condiciones_especiales;
  return patch;
}

function sightingToInsert(input: Sighting, reporterId: string | null) {
  return {
    report_id: isUuid(input.report_id) ? input.report_id : null,
    pet_id: isUuid(input.pet_id) ? input.pet_id : null,
    reporter_id: reporterId,
    reporter_name: input.reporter_is_anonymous ? "Usuario anónimo" : input.reporter_name ?? "Usuario HUELLA",
    reporter_is_anonymous: Boolean(input.reporter_is_anonymous),
    especie: input.especie ?? null,
    tamano: input.tamano ?? null,
    color: input.color ?? null,
    district: input.distrito ?? null,
    approximate_address: input.ubicacion ?? null,
    description: input.comentario,
    photo_url: input.foto,
    latitude: input.latitud,
    longitude: input.longitud,
    observed_at: input.visto_en ?? input.creado_en,
    status: legacySightingStatus(input.estado),
    estado_revision: input.estado_revision ?? "por_revisar",
    situacion: input.situacion ?? null,
  };
}

function sightingPatch(input: Partial<Sighting>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.report_id !== undefined) patch.report_id = isUuid(input.report_id) ? input.report_id : null;
  if (input.pet_id !== undefined) patch.pet_id = isUuid(input.pet_id) ? input.pet_id : null;
  if (input.especie !== undefined) patch.especie = input.especie;
  if (input.tamano !== undefined) patch.tamano = input.tamano;
  if (input.color !== undefined) patch.color = input.color;
  if (input.distrito !== undefined) patch.district = input.distrito;
  if (input.ubicacion !== undefined) patch.approximate_address = input.ubicacion;
  if (input.comentario !== undefined) patch.description = input.comentario;
  if (input.foto !== undefined) patch.photo_url = input.foto;
  if (input.latitud !== undefined) patch.latitude = input.latitud;
  if (input.longitud !== undefined) patch.longitude = input.longitud;
  if (input.visto_en !== undefined) patch.observed_at = input.visto_en;
  if (input.estado !== undefined || input.estado_avistamiento !== undefined) patch.status = legacySightingStatus(input.estado_avistamiento ?? input.estado);
  if (input.estado_revision !== undefined) patch.estado_revision = input.estado_revision;
  if (input.situacion !== undefined) patch.situacion = input.situacion;
  return patch;
}

export function getOwnerToken() {
  if (typeof window === "undefined") return "";
  if (!sessionOwnerToken) sessionOwnerToken = crypto.randomUUID();
  return sessionOwnerToken;
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
    const { data, error } = await supabase.from("pets").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    if (data?.length) return (data as PetRow[]).map(normalizePet);
  }
  return readLocal(PETS_KEY, demoPets);
}

export async function getPet(id: string): Promise<Pet | undefined> {
  const pets = await getPets();
  return pets.find((pet) => pet.id === id);
}

export async function getSightings(petId?: string | null, relatedId?: string | null): Promise<Sighting[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from("sightings").select("*").order("created_at", { ascending: false });
    const filters = [petId, relatedId].filter(isUuid).flatMap((id) => [`pet_id.eq.${id}`, `report_id.eq.${id}`]);
    if (filters.length) query = query.or(filters.join(","));
    const { data, error } = await query;
    if (error) throw error;
    if (data) return (data as SightingRow[]).map(normalizeSighting);
  }
  const sightings = readLocal(SIGHTINGS_KEY, demoSightings);
  return petId ? sightings.filter((sighting) => sighting.pet_id === petId || sighting.report_id === petId || sighting.pet_id === relatedId || sighting.report_id === relatedId) : sightings;
}

export async function getSighting(id: string): Promise<Sighting | undefined> {
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { data, error } = await supabase.from("sightings").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (data) return normalizeSighting(data as SightingRow);
  }
  return readLocal(SIGHTINGS_KEY, demoSightings).find((sighting) => sighting.id === id);
}

export async function getNotifications(): Promise<Notification[]> {
  const userId = await currentUserId();
  if (isSupabaseConfigured && supabase && userId) {
    const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    if (data) {
      return data.map((item) => ({
        id: String(item.id),
        pet_id: String(item.report_id ?? ""),
        tipo: String(item.type ?? "reporte_actualizado") as Notification["tipo"],
        mensaje: String(item.message ?? "Caso actualizado"),
        leido: Boolean(item.read_at),
        creado_en: String(item.created_at),
      }));
    }
  }
  return readLocal(NOTIFICATIONS_KEY, demoNotifications);
}

export async function createNotification(input: Omit<Notification, "id" | "leido" | "creado_en">) {
  const notification: Notification = { ...input, id: crypto.randomUUID(), leido: false, creado_en: new Date().toISOString() };
  const userId = await currentUserId();
  if (isSupabaseConfigured && supabase && userId && isUuid(input.pet_id)) {
    const { data: report, error: reportError } = await supabase.from("lost_reports").select("id, owner_id").or(`pet_id.eq.${input.pet_id},id.eq.${input.pet_id}`).maybeSingle();
    if (reportError) throw reportError;
    if (report?.id && report?.owner_id === userId) {
      const { error } = await supabase.from("notifications").insert({
        user_id: report.owner_id,
        report_id: report.id,
        type: input.tipo,
        message: input.mensaje,
      });
      if (error) throw error;
    }
  }
  writeLocal(NOTIFICATIONS_KEY, [notification, ...readLocal(NOTIFICATIONS_KEY, demoNotifications)]);
  return notification;
}

export async function markNotificationsRead() {
  const userId = await currentUserId();
  if (isSupabaseConfigured && supabase && userId) {
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    if (error) throw error;
  }
  writeLocal(NOTIFICATIONS_KEY, readLocal(NOTIFICATIONS_KEY, demoNotifications).map((item) => ({ ...item, leido: true })));
}

export async function createContentReport(input: Omit<ContentReport, "id" | "creado_en">) {
  const report: ContentReport = { ...input, id: crypto.randomUUID(), creado_en: new Date().toISOString() };
  if (isSupabaseConfigured && supabase && isUuid(input.target_id)) {
    const { error } = await supabase.from("moderation_reports").insert({
      reporter_id: await ensureCurrentProfile(),
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.motivo,
      details: input.detalle ?? null,
      status: "open",
    });
    if (error) throw error;
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
    const userId = await ensureCurrentProfile();
    if (!userId) throw new Error("La sesión no está lista. Cierra sesión e ingresa de nuevo.");
    const insertable = petToInsert(pet, userId);
    const { data, error } = await supabase.from("pets").insert(insertable).select().single();
    if (!error && data) {
      rememberOwnedPet((data as PetRow).id);
      return { ...pet, ...normalizePet(data as PetRow), estado: input.estado };
    }
    if (error) throw error;
  }
  const pets = [pet, ...readLocal(PETS_KEY, demoPets)];
  writeLocal(PETS_KEY, pets);
  rememberOwnedPet(pet.id);
  await createNotification({ pet_id: pet.id, tipo: "reporte_actualizado", mensaje: `Busqueda activa para ${pet.nombre}` });
  return pet;
}

export async function updatePet(id: string, input: Partial<Pet>) {
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase.from("pets").update(petPatch(input, await ensureCurrentProfile())).eq("id", id);
    if (error) throw error;
  }
  const pets = readLocal(PETS_KEY, demoPets).map((pet) => pet.id === id ? { ...pet, ...input } : pet);
  writeLocal(PETS_KEY, pets);
  await createNotification({ pet_id: id, tipo: "reporte_actualizado", mensaje: "Caso actualizado" });
}

export async function deletePet(id: string) {
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase.from("pets").delete().eq("id", id);
    if (error) throw error;
  }
  writeLocal(PETS_KEY, readLocal(PETS_KEY, demoPets).filter((pet) => pet.id !== id));
  writeLocal(SIGHTINGS_KEY, readLocal(SIGHTINGS_KEY, demoSightings).filter((sighting) => sighting.pet_id !== id));
  writeLocal(OWNED_PETS_KEY, readLocal<string[]>(OWNED_PETS_KEY, []).filter((petId) => petId !== id));
}

export async function createSighting(input: Omit<Sighting, "id" | "creado_en" | "estado" | "estado_revision">) {
  const sighting: Sighting = { ...input, estado: "pendiente", estado_avistamiento: "pendiente", estado_revision: "por_revisar", owner_token: getOwnerToken(), id: crypto.randomUUID(), creado_en: new Date().toISOString() };
  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const reporterId = await ensureCurrentProfile();
    const reporter = sessionData.session?.user ?? (await supabase.auth.getUser()).data.user ?? null;
    const insertable = sightingToInsert({
      ...sighting,
      reporter_name: input.reporter_is_anonymous ? "Usuario anónimo" : reporter ? userDisplayName(reporter) : "Usuario HUELLA",
      reporter_is_anonymous: Boolean(input.reporter_is_anonymous),
    }, reporterId);
    const { data, error } = await supabase.from("sightings").insert(insertable).select().single();
    if (!error && data) {
      if (input.pet_id) await createNotification({ pet_id: input.pet_id, tipo: "nuevo_avistamiento", mensaje: "Nuevo reporte recibido" });
      return normalizeSighting(data as SightingRow);
    }
    if (error) throw error;
  }
  const sightings = [sighting, ...readLocal(SIGHTINGS_KEY, demoSightings)];
  writeLocal(SIGHTINGS_KEY, sightings);
  if (input.pet_id) await createNotification({ pet_id: input.pet_id, tipo: "nuevo_avistamiento", mensaje: "Nuevo reporte recibido" });
  return sighting;
}

export async function updateSightingReview(id: string, petId: string, estado_revision: NonNullable<Sighting["estado_revision"]>) {
  const patch: Partial<Sighting> = { estado_revision };
  if (estado_revision === "encontrada") {
    patch.estado = "confirmado";
    patch.estado_avistamiento = "confirmado";
    patch.feedback_reportero = "Tu reporte ayudó a reunir una mascota con su familia.";
  }
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase.from("sightings").update(sightingPatch(patch)).eq("id", id);
    if (error) throw error;
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
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase.from("sightings").update(sightingPatch(input)).eq("id", id);
    if (error) throw error;
  }
  const sightings = readLocal(SIGHTINGS_KEY, demoSightings).map((sighting) => sighting.id === id ? { ...sighting, ...input } : sighting);
  writeLocal(SIGHTINGS_KEY, sightings);
}

export async function deleteSighting(id: string) {
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase.from("sightings").delete().eq("id", id);
    if (error) throw error;
  }
  writeLocal(SIGHTINGS_KEY, readLocal(SIGHTINGS_KEY, demoSightings).filter((sighting) => sighting.id !== id));
}

export async function updateSightingStatus(id: string, petId: string, estado: NonNullable<Sighting["estado"]>) {
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase.from("sightings").update(sightingPatch({ estado, estado_avistamiento: estado })).eq("id", id);
    if (error) throw error;
  }
  const sightings = readLocal(SIGHTINGS_KEY, demoSightings).map((sighting) => sighting.id === id ? { ...sighting, estado, estado_avistamiento: estado } : sighting);
  writeLocal(SIGHTINGS_KEY, sightings);
  await createNotification({
    pet_id: petId,
    tipo: estado === "confirmado" ? "avistamiento_confirmado" : "reporte_actualizado",
    mensaje: estado === "confirmado" ? "Reporte confirmado" : "Reporte descartado",
  });
}

export async function markPetStatus(id: string, estado: PetStatus) {
  const cerrado_en = estado === "reunido" ? new Date().toISOString() : null;
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase
      .from("lost_reports")
      .update({ status: estado === "reunido" ? "reunited" : "active", reunited_at: cerrado_en, updated_at: new Date().toISOString() })
      .eq("pet_id", id);
    if (error) throw error;
  }
  const pets = readLocal(PETS_KEY, demoPets).map((pet) => pet.id === id ? { ...pet, estado, cerrado_en } : pet);
  writeLocal(PETS_KEY, pets);
  if (estado === "reunido") await createNotification({ pet_id: id, tipo: "reporte_cerrado", mensaje: "Mascota reunida" });
}

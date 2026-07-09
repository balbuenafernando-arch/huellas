"use client";

import type { Pet as LegacyPet, PetStatus } from "@/lib/demo-data";
import { demoPets, demoSightings } from "@/lib/demo-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { uploadImage } from "@/services/image-service";

export type RegisteredPet = {
  id: string;
  user_id: string;
  nombre: string;
  alias?: string | null;
  especie: string;
  raza: string;
  tamano?: string | null;
  color: string;
  sexo: string;
  edad: string;
  salud?: string | null;
  esterilizado?: boolean;
  placa_medalla?: string | null;
  caracteristicas?: string[] | null;
  telefono?: string | null;
  contacto_preferido?: "whatsapp" | "telefono" | "ambos" | string | null;
  fotos?: string[] | null;
  foto_principal?: string | null;
  rasgo_privado?: string | null;
  foto_url: string;
  created_at: string;
};

export type Report = {
  id: string;
  user_id: string;
  pet_id: string | null;
  tipo_reporte: "perdido" | "encontrado";
  estado: "activo" | "reunido";
  distrito: string;
  descripcion: string;
  foto_url: string;
  whatsapp?: string | null;
  latitude: number | null;
  longitude: number | null;
  views_count?: number;
  reunited_at?: string | null;
  created_at: string;
  updated_at: string;
  fecha_reporte: string;
  pet?: RegisteredPet | null;
};

export type ReportHistoryItem = {
  id: string;
  tipo_reporte: Report["tipo_reporte"];
  estado: Report["estado"];
  distrito: string;
  fecha_reporte: string;
  reunited_at?: string | null;
};

const DEMO_USER_KEY = "huella:demo-user";
const REGISTERED_PETS_KEY = "huella:v14:pets";
const REPORTS_KEY = "huella:v14:reports";
let sessionDemoUserId = "";

function readLocal<T>(key: string, fallback: T): T {
  return fallback;
}

function writeLocal<T>(key: string, value: T) {
  void key;
  void value;
}

export function getDemoUserId() {
  if (typeof window === "undefined") return "demo-user";
  if (!sessionDemoUserId) sessionDemoUserId = crypto.randomUUID();
  return sessionDemoUserId;
}

export async function getCurrentUser() {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }
  return { id: getDemoUserId(), email: "demo@huella.local" };
}

export async function signInWithEmail(email: string, password: string) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } else {
    getDemoUserId();
  }
}

export async function signUpWithEmail(email: string, password: string) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  } else {
    getDemoUserId();
  }
}

export async function signInWithGoogle() {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined } });
    if (error) throw error;
  } else {
    getDemoUserId();
  }
}

export async function signOut() {
  if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
}

export async function uploadMascotaImage(file: File, bucket = "mascotas") {
  return uploadImage(file, bucket === "mascotas" ? "pet-photos" : bucket);
}

export async function listMyRegisteredPets() {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && supabase && user) {
    const { data, error } = await supabase.from("pets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (!error && data) return data as RegisteredPet[];
  }
  return readLocal<RegisteredPet[]>(REGISTERED_PETS_KEY, []).filter((pet) => pet.user_id === user?.id);
}

export async function createRegisteredPet(input: Omit<RegisteredPet, "id" | "user_id" | "created_at">) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");
  const pet: RegisteredPet = { ...input, id: crypto.randomUUID(), user_id: user.id, created_at: new Date().toISOString() };
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("pets").insert(pet).select().single();
    if (error) throw error;
    return data as RegisteredPet;
  }
  writeLocal(REGISTERED_PETS_KEY, [pet, ...readLocal<RegisteredPet[]>(REGISTERED_PETS_KEY, [])]);
  return pet;
}

export async function updateRegisteredPet(id: string, input: Partial<RegisteredPet>) {
  if (isSupabaseConfigured && supabase) {
    const user = await getCurrentUser();
    await supabase.from("pets").update(input).eq("id", id).eq("user_id", user?.id);
  }
  writeLocal(REGISTERED_PETS_KEY, readLocal<RegisteredPet[]>(REGISTERED_PETS_KEY, []).map((pet) => pet.id === id ? { ...pet, ...input } : pet));
}

export async function deleteRegisteredPet(id: string) {
  if (isSupabaseConfigured && supabase) {
    const user = await getCurrentUser();
    await supabase.from("pets").delete().eq("id", id).eq("user_id", user?.id);
  }
  writeLocal(REGISTERED_PETS_KEY, readLocal<RegisteredPet[]>(REGISTERED_PETS_KEY, []).filter((pet) => pet.id !== id));
}

export async function listReports(includeReunidos = false) {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from("reports").select("*, pet:pets(*)").order("created_at", { ascending: false });
    if (!includeReunidos) query = query.eq("estado", "activo");
    const { data, error } = await query;
    if (!error && data?.length) return data as Report[];
  }
  const local = readLocal<Report[]>(REPORTS_KEY, []);
  if (local.length) return includeReunidos ? local : local.filter((report) => report.estado === "activo");
  return demoPets.filter((pet) => includeReunidos || pet.estado !== "reunido").map(legacyPetToReport);
}

export async function listMyReports() {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && supabase && user) {
    const { data, error } = await supabase.from("reports").select("*, pet:pets(*)").eq("user_id", user.id).order("created_at", { ascending: false });
    if (!error && data) return data as Report[];
  }
  return readLocal<Report[]>(REPORTS_KEY, []).filter((report) => report.user_id === user?.id);
}

export async function getReport(id: string) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("reports").select("*, pet:pets(*)").eq("id", id).single();
    if (!error && data) return data as Report;
  }
  const localReport = readLocal<Report[]>(REPORTS_KEY, []).find((report) => report.id === id);
  if (localReport) return localReport;
  const demoPet = demoPets.find((pet) => pet.id === id);
  return demoPet ? legacyPetToReport(demoPet) : undefined;
}

export async function incrementReportView(id: string) {
  const report = await getReport(id);
  if (!report) return;
  const next = (report.views_count ?? 0) + 1;
  if (isSupabaseConfigured && supabase) {
    await supabase.from("reports").update({ views_count: next }).eq("id", id);
  }
  writeLocal(REPORTS_KEY, readLocal<Report[]>(REPORTS_KEY, []).map((item) => item.id === id ? { ...item, views_count: next } : item));
}

export async function createReport(input: Omit<Report, "id" | "user_id" | "created_at" | "updated_at" | "fecha_reporte">) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");
  const now = new Date().toISOString();
  const report: Report = { ...input, id: crypto.randomUUID(), user_id: user.id, created_at: now, updated_at: now, fecha_reporte: now };
  if (isSupabaseConfigured && supabase) {
    const { pet, ...insertable } = report;
    const { data, error } = await supabase.from("reports").insert(insertable).select().single();
    if (error) throw error;
    return data as Report;
  }
  writeLocal(REPORTS_KEY, [report, ...readLocal<Report[]>(REPORTS_KEY, [])]);
  return report;
}

export async function updateReport(id: string, input: Partial<Report>) {
  const user = await getCurrentUser();
  const patch = { ...input, updated_at: new Date().toISOString() };
  if (input.estado === "reunido" && !input.reunited_at) patch.reunited_at = new Date().toISOString();
  if (input.estado === "activo") patch.reunited_at = null;
  if (isSupabaseConfigured && supabase) await supabase.from("reports").update(patch).eq("id", id).eq("user_id", user?.id);
  writeLocal(REPORTS_KEY, readLocal<Report[]>(REPORTS_KEY, []).map((report) => report.id === id ? { ...report, ...patch } : report));
}

export async function findPotentialDuplicateReports(input: { especie?: string; color?: string; distrito: string; latitude?: number | null; longitude?: number | null; fecha?: string }) {
  const reports = await listReports(true);
  const date = input.fecha ? new Date(input.fecha).getTime() : Date.now();
  return reports.filter((report) => {
    const sameDistrict = report.distrito === input.distrito;
    const sameSpecies = !input.especie || report.pet?.especie?.toLowerCase() === input.especie.toLowerCase();
    const sameColor = !input.color || report.pet?.color?.toLowerCase().includes(input.color.toLowerCase());
    const recent = Math.abs(new Date(report.fecha_reporte).getTime() - date) < 1000 * 60 * 60 * 24 * 14;
    return sameDistrict && recent && (sameSpecies || sameColor);
  }).slice(0, 3);
}

export async function getPetReportHistory(petId: string) {
  const reports = await listReports(true);
  return reports.filter((report) => report.pet_id === petId || report.pet?.id === petId).map((report): ReportHistoryItem => ({
    id: report.id,
    tipo_reporte: report.tipo_reporte,
    estado: report.estado,
    distrito: report.distrito,
    fecha_reporte: report.fecha_reporte,
    reunited_at: report.reunited_at,
  }));
}

export async function getBasicMetrics() {
  const [pets, reports] = await Promise.all([listMyRegisteredPets(), listReports(true)]);
  let sightingsCount = readLocal<typeof demoSightings>("huella:sightings", demoSightings).length;
  if (isSupabaseConfigured && supabase) {
    const { count } = await supabase.from("sightings").select("id", { count: "exact", head: true });
    sightingsCount = count ?? sightingsCount;
  }
  return {
    mascotasRegistradas: pets.length,
    reportesActivos: reports.filter((report) => report.estado === "activo").length,
    mascotasReunidas: reports.filter((report) => report.estado === "reunido").length,
    avistamientosEnviados: sightingsCount,
  };
}

export function reportToLegacyPet(report: Report): LegacyPet {
  return {
    id: report.id,
    nombre: report.pet?.nombre ?? (report.tipo_reporte === "encontrado" ? "Mascota encontrada" : "Mascota perdida"),
    tipo: report.pet?.especie ?? "Mascota",
    raza: report.pet?.raza ?? "",
    descripcion: report.descripcion,
    estado: report.estado === "reunido" ? "reunido" : report.tipo_reporte as PetStatus,
    distrito: report.distrito,
    direccion: report.distrito,
    latitud: report.latitude ?? -12.105,
    longitud: report.longitude ?? -77.03,
    whatsapp: report.whatsapp ?? "",
    foto_principal: report.pet?.foto_principal ?? report.pet?.foto_url ?? report.foto_url,
    fotos: report.pet?.fotos ?? [report.pet?.foto_principal ?? report.pet?.foto_url ?? report.foto_url],
    alias: report.pet?.alias ? report.pet.alias.split(",").map((item) => item.trim()).filter(Boolean) : [],
    caracteristicas: report.pet?.caracteristicas ?? [],
    caracteristicas_personalizadas: report.pet?.salud ?? "",
    fecha_reporte: report.fecha_reporte,
    creado_en: report.created_at,
    owner_token: report.user_id,
    cerrado_en: report.reunited_at ?? null,
  };
}

function legacyPetToReport(pet?: LegacyPet): Report {
  const fallback = demoPets[0];
  const source = pet ?? fallback;
  return {
    id: source.id,
    user_id: source.owner_token ?? "demo-public",
    pet_id: null,
    tipo_reporte: source.estado === "encontrado" ? "encontrado" : "perdido",
    estado: source.estado === "reunido" ? "reunido" : "activo",
    distrito: source.distrito,
    descripcion: source.descripcion,
    foto_url: source.foto_principal,
    whatsapp: source.whatsapp,
    latitude: source.latitud,
    longitude: source.longitud,
    views_count: 0,
    reunited_at: source.cerrado_en ?? null,
    created_at: source.creado_en,
    updated_at: source.creado_en,
    fecha_reporte: source.fecha_reporte,
    pet: {
      id: source.id,
      user_id: source.owner_token ?? "demo-public",
      nombre: source.nombre,
      especie: source.tipo,
      raza: source.raza,
      color: "",
      sexo: "",
      edad: "",
      foto_url: source.foto_principal,
      created_at: source.creado_en,
    },
  };
}

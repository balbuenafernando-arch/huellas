"use client";

import type { Pet as LegacyPet, PetStatus } from "@/lib/demo-data";
import { demoPets, demoSightings } from "@/lib/demo-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { uploadImage } from "@/services/image-service";
import type { User } from "@supabase/supabase-js";

export type RegisteredPet = {
  id: string;
  user_id: string;
  owner_id?: string | null;
  nombre: string;
  alias?: string | null;
  especie: string;
  tipo?: string | null;
  raza: string;
  tamano?: string | null;
  color: string;
  sexo: string;
  edad: string;
  salud?: string | null;
  esterilizado?: boolean;
  placa_medalla?: string | null;
  telefono?: string | null;
  contacto_preferido?: "whatsapp" | "telefono" | "ambos" | string | null;
  fotos?: string[] | null;
  foto_principal?: string | null;
  foto_url: string;
  caracteristicas?: string[] | null;
  caracteristicas_personalizadas?: string | null;
  condiciones_especiales?: string[] | null;
  rasgo_privado?: string | null;
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
  reporter_name?: string | null;
  reporter_is_anonymous?: boolean;
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

type LostReportRow = {
  id: string;
  pet_id: string | null;
  owner_id: string;
  status: "active" | "reunited" | "archived";
  district: string;
  approximate_address: string | null;
  description: string | null;
  reward_text: string | null;
  latitude: number | null;
  longitude: number | null;
  lost_at: string | null;
  reunited_at: string | null;
  views_count: number;
  is_public: boolean;
  reporter_name?: string | null;
  reporter_is_anonymous?: boolean | null;
  created_at: string;
  updated_at: string;
  pet?: RegisteredPet | null;
  private_contact?: { contact_whatsapp?: string | null; contact_phone?: string | null } | null;
};

type RegisteredPetRow = RegisteredPet & {
  private_details?: Array<{ telefono?: string | null; rasgo_privado?: string | null }> | { telefono?: string | null; rasgo_privado?: string | null } | null;
};

const REGISTERED_PETS_KEY = "huella:v14:pets";
const REPORTS_KEY = "huella:v14:reports";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let sessionDemoUserId = "";

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

function statusToLegacy(status?: string): Report["estado"] {
  return status === "reunited" ? "reunido" : "activo";
}

function legacyStatusToLost(status?: Report["estado"]) {
  return status === "reunido" ? "reunited" : "active";
}

function petPhoto(pet?: RegisteredPet | null) {
  return pet?.foto_principal ?? pet?.foto_url ?? pet?.fotos?.[0] ?? "";
}

async function ensureProfile(user: User) {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUserId = sessionData.session?.user.id ?? null;
  if (sessionUserId !== user.id) {
    throw new Error("La sesión no está lista. Cierra sesión e ingresa de nuevo.");
  }
}

async function ensureProfileRow(user: User) {
  await ensureProfile(user);
  if (!isSupabaseConfigured || !supabase) return;
  const { data: ensuredId, error: rpcError } = await supabase.rpc("ensure_current_profile");
  if (!rpcError && ensuredId === user.id) return;
  if (rpcError && rpcError.code !== "PGRST202") throw rpcError;
  const { data: existing, error: readError } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (readError) throw readError;
  if (existing) return;
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

function normalizeRegisteredPet(row: RegisteredPetRow): RegisteredPet {
  const privateDetails = Array.isArray(row.private_details) ? row.private_details[0] : row.private_details;
  return {
    ...row,
    telefono: privateDetails?.telefono ?? row.telefono ?? null,
    rasgo_privado: privateDetails?.rasgo_privado ?? row.rasgo_privado ?? null,
  };
}

function registeredPetInsert(input: RegisteredPet) {
  return {
    id: input.id,
    owner_id: input.owner_id,
    user_id: input.user_id,
    nombre: input.nombre,
    alias: input.alias ?? null,
    especie: input.especie,
    tipo: input.tipo ?? input.especie,
    raza: input.raza,
    tamano: input.tamano ?? null,
    color: input.color,
    sexo: input.sexo,
    edad: input.edad,
    salud: input.salud ?? null,
    esterilizado: Boolean(input.esterilizado),
    placa_medalla: input.placa_medalla ?? null,
    contacto_preferido: input.contacto_preferido ?? "whatsapp",
    fotos: input.fotos ?? [],
    foto_principal: input.foto_principal ?? input.foto_url ?? input.fotos?.[0] ?? null,
    foto_url: input.foto_url ?? input.foto_principal ?? input.fotos?.[0] ?? null,
    caracteristicas: input.caracteristicas ?? [],
    caracteristicas_personalizadas: input.caracteristicas_personalizadas ?? null,
    condiciones_especiales: input.condiciones_especiales ?? [],
    is_public: true,
    created_at: input.created_at,
  };
}

function registeredPetPatch(input: Partial<RegisteredPet>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.nombre !== undefined) patch.nombre = input.nombre;
  if (input.alias !== undefined) patch.alias = input.alias;
  if (input.especie !== undefined) {
    patch.especie = input.especie;
    patch.tipo = input.tipo ?? input.especie;
  }
  if (input.tipo !== undefined) patch.tipo = input.tipo;
  if (input.raza !== undefined) patch.raza = input.raza;
  if (input.tamano !== undefined) patch.tamano = input.tamano;
  if (input.color !== undefined) patch.color = input.color;
  if (input.sexo !== undefined) patch.sexo = input.sexo;
  if (input.edad !== undefined) patch.edad = input.edad;
  if (input.salud !== undefined) patch.salud = input.salud;
  if (input.esterilizado !== undefined) patch.esterilizado = input.esterilizado;
  if (input.placa_medalla !== undefined) patch.placa_medalla = input.placa_medalla;
  if (input.contacto_preferido !== undefined) patch.contacto_preferido = input.contacto_preferido;
  if (input.fotos !== undefined) patch.fotos = input.fotos;
  if (input.foto_principal !== undefined) patch.foto_principal = input.foto_principal;
  if (input.foto_url !== undefined) patch.foto_url = input.foto_url;
  if (input.caracteristicas !== undefined) patch.caracteristicas = input.caracteristicas;
  if (input.caracteristicas_personalizadas !== undefined) patch.caracteristicas_personalizadas = input.caracteristicas_personalizadas;
  if (input.condiciones_especiales !== undefined) patch.condiciones_especiales = input.condiciones_especiales;
  return patch;
}

function lostReportToReport(row: LostReportRow): Report {
  return {
    id: row.id,
    user_id: row.owner_id,
    pet_id: row.pet_id,
    tipo_reporte: "perdido",
    estado: statusToLegacy(row.status),
    distrito: row.district,
    descripcion: row.description ?? "",
    foto_url: petPhoto(row.pet),
    whatsapp: row.private_contact?.contact_whatsapp ?? row.private_contact?.contact_phone ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    views_count: row.views_count,
    reporter_name: row.reporter_is_anonymous ? "Usuario anónimo" : row.reporter_name ?? "Usuario HUELLA",
    reporter_is_anonymous: Boolean(row.reporter_is_anonymous),
    reunited_at: row.reunited_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    fecha_reporte: row.lost_at ?? row.created_at,
    pet: row.pet ?? null,
  };
}

function reportToLostInsert(report: Report, ownerId: string) {
  return {
    pet_id: report.pet_id,
    owner_id: ownerId,
    status: legacyStatusToLost(report.estado),
    district: report.distrito,
    approximate_address: report.distrito,
    description: report.descripcion,
    latitude: report.latitude,
    longitude: report.longitude,
    lost_at: report.fecha_reporte,
    reunited_at: report.reunited_at ?? null,
    is_public: true,
    reporter_name: report.reporter_is_anonymous ? "Usuario anónimo" : report.reporter_name ?? "Usuario HUELLA",
    reporter_is_anonymous: Boolean(report.reporter_is_anonymous),
  };
}

function authDisplayName(user: User) {
  return String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Usuario HUELLA");
}

function reportToLostPatch(input: Partial<Report>) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.estado) {
    patch.status = legacyStatusToLost(input.estado);
    patch.reunited_at = input.estado === "reunido" ? input.reunited_at ?? new Date().toISOString() : null;
  }
  if (input.distrito !== undefined) patch.district = input.distrito;
  if (input.descripcion !== undefined) patch.description = input.descripcion;
  if (input.latitude !== undefined) patch.latitude = input.latitude;
  if (input.longitude !== undefined) patch.longitude = input.longitude;
  if (input.fecha_reporte !== undefined) patch.lost_at = input.fecha_reporte;
  if (input.views_count !== undefined) patch.views_count = input.views_count;
  return patch;
}

export function getDemoUserId() {
  if (typeof window === "undefined") return "";
  if (!sessionDemoUserId) sessionDemoUserId = "";
  return sessionDemoUserId;
}

export async function getCurrentUser() {
  if (isSupabaseConfigured && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData.session?.user ?? null;
    if (sessionUser) return sessionUser;

    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  }
  return null;
}

export async function signInWithEmail(email: string, password: string) {
  void email;
  void password;
  throw new Error("HUELLA solo permite ingresar con Google.");
}

export async function signUpWithEmail(email: string, password: string) {
  void email;
  void password;
  throw new Error("HUELLA solo permite ingresar con Google.");
}

export async function signInWithGoogle() {
  if (isSupabaseConfigured && supabase) {
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    if (error) throw error;
  } else {
    throw new Error("No se pudo iniciar con Google.");
  }
}

export async function signOut() {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}

export async function uploadMascotaImage(file: File, bucket = "mascotas") {
  return uploadImage(file, bucket === "mascotas" ? "pet-photos" : bucket);
}

export async function listMyRegisteredPets() {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && supabase && user) {
    const { data, error } = await supabase
      .from("pets")
      .select("*, private_details:pet_private_details(telefono, rasgo_privado)")
      .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (data) return (data as RegisteredPetRow[]).map(normalizeRegisteredPet);
  }
  return readLocal<RegisteredPet[]>(REGISTERED_PETS_KEY, []).filter((pet) => pet.user_id === user?.id);
}

export async function createRegisteredPet(input: Omit<RegisteredPet, "id" | "user_id" | "created_at">) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");
  await ensureProfileRow(user);
  const now = new Date().toISOString();
  const pet: RegisteredPet = { ...input, id: crypto.randomUUID(), user_id: user.id, owner_id: user.id, created_at: now };
  if (isSupabaseConfigured && supabase) {
    const insertable = registeredPetInsert(pet);
    const { data, error } = await supabase.from("pets").insert(insertable).select().single();
    if (error) throw error;
    if (input.telefono || input.rasgo_privado) {
      const { error: privateError } = await supabase.from("pet_private_details").upsert({
        pet_id: data.id,
        owner_id: user.id,
        telefono: input.telefono ?? null,
        rasgo_privado: input.rasgo_privado ?? null,
        updated_at: new Date().toISOString(),
      });
      if (privateError) throw privateError;
    }
    return normalizeRegisteredPet(data as RegisteredPetRow);
  }
  writeLocal(REGISTERED_PETS_KEY, [pet, ...readLocal<RegisteredPet[]>(REGISTERED_PETS_KEY, [])]);
  return pet;
}

export async function updateRegisteredPet(id: string, input: Partial<RegisteredPet>) {
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const user = await getCurrentUser();
    if (user) await ensureProfile(user);
    const { error } = await supabase.from("pets").update(registeredPetPatch(input)).eq("id", id).or(`user_id.eq.${user?.id},owner_id.eq.${user?.id}`);
    if (error) throw error;
    if ((input.telefono !== undefined || input.rasgo_privado !== undefined) && user) {
      const { error: privateError } = await supabase.from("pet_private_details").upsert({
        pet_id: id,
        owner_id: user.id,
        telefono: input.telefono ?? null,
        rasgo_privado: input.rasgo_privado ?? null,
        updated_at: new Date().toISOString(),
      });
      if (privateError) throw privateError;
    }
  }
  writeLocal(REGISTERED_PETS_KEY, readLocal<RegisteredPet[]>(REGISTERED_PETS_KEY, []).map((pet) => pet.id === id ? { ...pet, ...input } : pet));
}

export async function deleteRegisteredPet(id: string) {
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const user = await getCurrentUser();
    const { error } = await supabase.from("pets").delete().eq("id", id).or(`user_id.eq.${user?.id},owner_id.eq.${user?.id}`);
    if (error) throw error;
  }
  writeLocal(REGISTERED_PETS_KEY, readLocal<RegisteredPet[]>(REGISTERED_PETS_KEY, []).filter((pet) => pet.id !== id));
}

export async function listReports(includeReunidos = false) {
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from("lost_reports")
      .select("*, pet:pets(*), private_contact:report_private_contacts(contact_whatsapp, contact_phone)")
      .order("created_at", { ascending: false });
    if (!includeReunidos) query = query.eq("status", "active");
    const { data, error } = await query;
    if (!error && data?.length) return (data as unknown as LostReportRow[]).map(lostReportToReport);
  }
  const local = readLocal<Report[]>(REPORTS_KEY, []);
  if (local.length) return includeReunidos ? local : local.filter((report) => report.estado === "activo");
  return demoPets.filter((pet) => includeReunidos || pet.estado !== "reunido").map(legacyPetToReport);
}

export async function listMyReports() {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && supabase && user) {
    const { data, error } = await supabase
      .from("lost_reports")
      .select("*, pet:pets(*), private_contact:report_private_contacts(contact_whatsapp, contact_phone)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) return (data as unknown as LostReportRow[]).map(lostReportToReport);
  }
  return readLocal<Report[]>(REPORTS_KEY, []).filter((report) => report.user_id === user?.id);
}

export async function getReport(id: string) {
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { data, error } = await supabase
      .from("lost_reports")
      .select("*, pet:pets(*), private_contact:report_private_contacts(contact_whatsapp, contact_phone)")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) return lostReportToReport(data as unknown as LostReportRow);
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
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    await supabase.from("lost_reports").update({ views_count: next, updated_at: new Date().toISOString() }).eq("id", id);
  }
  writeLocal(REPORTS_KEY, readLocal<Report[]>(REPORTS_KEY, []).map((item) => item.id === id ? { ...item, views_count: next } : item));
}

export async function createReport(input: Omit<Report, "id" | "user_id" | "created_at" | "updated_at" | "fecha_reporte">) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión.");
  await ensureProfileRow(user);
  const now = new Date().toISOString();
  const report: Report = { ...input, id: crypto.randomUUID(), user_id: user.id, created_at: now, updated_at: now, fecha_reporte: now, reporter_name: input.reporter_is_anonymous ? "Usuario anónimo" : authDisplayName(user), reporter_is_anonymous: Boolean(input.reporter_is_anonymous) };
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("lost_reports")
      .insert(reportToLostInsert(report, user.id))
      .select("*")
      .single();
    if (error) throw error;
    const row = data as LostReportRow;
    const saved: Report = {
      ...report,
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      fecha_reporte: row.lost_at ?? row.created_at,
      views_count: row.views_count,
      reunited_at: row.reunited_at,
      pet: input.pet ?? null,
    };
    if (input.whatsapp) {
      const { error: contactError } = await supabase.from("report_private_contacts").upsert({
        report_id: saved.id,
        owner_id: user.id,
        contact_whatsapp: input.whatsapp,
      });
      if (contactError) console.error("Error al guardar contacto privado del reporte", contactError);
    }
    return saved;
  }
  writeLocal(REPORTS_KEY, [report, ...readLocal<Report[]>(REPORTS_KEY, [])]);
  return report;
}

export async function updateReport(id: string, input: Partial<Report>) {
  const user = await getCurrentUser();
  const patch = { ...input, updated_at: new Date().toISOString() };
  if (input.estado === "reunido" && !input.reunited_at) patch.reunited_at = new Date().toISOString();
  if (input.estado === "activo") patch.reunited_at = null;
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase.from("lost_reports").update(reportToLostPatch(input)).eq("id", id).eq("owner_id", user?.id);
    if (error) throw error;
    if (input.whatsapp !== undefined && user) {
      const { error: contactError } = await supabase.from("report_private_contacts").upsert({
        report_id: id,
        owner_id: user.id,
        contact_whatsapp: input.whatsapp,
      });
      if (contactError) throw contactError;
    }
  }
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
    nombre: report.pet?.nombre ?? "Mascota perdida",
    tipo: report.pet?.especie ?? report.pet?.tipo ?? "Mascota",
    raza: report.pet?.raza ?? "",
    descripcion: report.descripcion,
    estado: report.estado === "reunido" ? "reunido" : "perdido" as PetStatus,
    distrito: report.distrito,
    direccion: report.distrito,
    latitud: report.latitude ?? -12.105,
    longitud: report.longitude ?? -77.03,
    whatsapp: report.whatsapp ?? "",
    foto_principal: report.pet?.foto_principal ?? report.pet?.foto_url ?? report.foto_url,
    fotos: report.pet?.fotos ?? [report.pet?.foto_principal ?? report.pet?.foto_url ?? report.foto_url].filter(Boolean),
    alias: report.pet?.alias ? report.pet.alias.split(",").map((item) => item.trim()).filter(Boolean) : [],
    caracteristicas: report.pet?.caracteristicas ?? [],
    caracteristicas_personalizadas: report.pet?.caracteristicas_personalizadas ?? "",
    edad: report.pet?.edad ?? null,
    salud: report.pet?.salud ?? null,
    esterilizado: report.pet?.esterilizado ?? null,
    observaciones: report.descripcion,
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

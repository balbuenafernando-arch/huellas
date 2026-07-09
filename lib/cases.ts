"use client";

import type { Pet, Sighting } from "@/lib/demo-data";
import { getPet, getPets, getSightings, markPetStatus } from "@/lib/pet-store";
import {
  getCurrentUser,
  getReport,
  listMyReports,
  listReports,
  reportToLegacyPet,
  type RegisteredPet,
  type Report,
  updateReport,
} from "@/lib/sprint14-store";

export type CaseStatus = "activo" | "en_busqueda" | "bajo_seguimiento" | "encontrado" | "reunido" | "archivado";

export type CaseUpdateKind =
  | "caso_creado"
  | "avistamiento_recibido"
  | "coincidencia_sugerida"
  | "comentario"
  | "cambio_estado"
  | "mascota_reunida";

export type CaseTimelineItem = {
  id: string;
  date: string;
  label: string;
  kind: CaseUpdateKind;
};

export type CaseMatch = {
  caseId: string;
  petId: string | null;
  pet: Pet;
  score: number;
  percentage: number;
  level: "alta" | "media" | "baja";
  distance: number | null;
  reasons: string[];
};

export type CaseRecord = {
  id: string;
  ownerId: string | null;
  petId: string | null;
  pet: Pet;
  registeredPet?: RegisteredPet | null;
  report?: Report | null;
  status: CaseStatus;
  district: string;
  description: string;
  photos: string[];
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  reunitedAt: string | null;
  sightings: Sighting[];
  timeline: CaseTimelineItem[];
};

function normalizeCaseStatus(report?: Report | null, pet?: Pet): CaseStatus {
  if (report?.estado === "reunido" || pet?.estado === "reunido") return "reunido";
  if (pet?.estado === "encontrado") return "encontrado";
  return "activo";
}

function uniquePhotos(pet: Pet, report?: Report | null) {
  return Array.from(new Set([pet.foto_principal, ...(pet.fotos ?? []), report?.foto_url].filter(Boolean) as string[])).slice(0, 5);
}

export function buildCaseTimeline(caseRecord: Pick<CaseRecord, "id" | "pet" | "createdAt" | "reunitedAt" | "sightings">): CaseTimelineItem[] {
  const items: CaseTimelineItem[] = [
    {
      id: `${caseRecord.id}-created`,
      date: caseRecord.createdAt,
      label: "Caso creado",
      kind: "caso_creado",
    },
    ...caseRecord.sightings.map((sighting) => ({
      id: sighting.id,
      date: sighting.visto_en ?? sighting.creado_en,
      label: (sighting.estado_avistamiento ?? sighting.estado) === "confirmado" ? "Avistamiento confirmado" : "Avistamiento recibido",
      kind: "avistamiento_recibido" as CaseUpdateKind,
    })),
  ];

  if (caseRecord.reunitedAt) {
    items.push({
      id: `${caseRecord.id}-reunited`,
      date: caseRecord.reunitedAt,
      label: `${caseRecord.pet.nombre} volvió a casa`,
      kind: "mascota_reunida",
    });
  }

  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function reportToCase(report: Report): Promise<CaseRecord> {
  const pet = reportToLegacyPet(report);
  const sightings = await getSightings(report.id, report.pet_id);
  const base: Omit<CaseRecord, "timeline"> = {
    id: report.id,
    ownerId: report.user_id,
    petId: report.pet_id,
    pet,
    registeredPet: report.pet,
    report,
    status: normalizeCaseStatus(report, pet),
    district: report.distrito,
    description: report.descripcion,
    photos: uniquePhotos(pet, report),
    latitude: report.latitude,
    longitude: report.longitude,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
    reunitedAt: report.reunited_at ?? pet.cerrado_en ?? null,
    sightings,
  };
  return { ...base, timeline: buildCaseTimeline(base) };
}

export async function petToCase(pet: Pet): Promise<CaseRecord> {
  const sightings = await getSightings(pet.id);
  const base: Omit<CaseRecord, "timeline"> = {
    id: pet.id,
    ownerId: pet.owner_token ?? null,
    petId: pet.id,
    pet,
    registeredPet: null,
    report: null,
    status: normalizeCaseStatus(null, pet),
    district: pet.distrito,
    description: pet.descripcion,
    photos: uniquePhotos(pet),
    latitude: pet.latitud,
    longitude: pet.longitud,
    createdAt: pet.creado_en,
    updatedAt: pet.creado_en,
    reunitedAt: pet.cerrado_en ?? null,
    sightings,
  };
  return { ...base, timeline: buildCaseTimeline(base) };
}

export async function listCases(includeClosed = false): Promise<CaseRecord[]> {
  const [reports, legacyPets] = await Promise.all([listReports(true), getPets()]);
  const reportCases = await Promise.all(reports.map(reportToCase));
  const reportIds = new Set(reportCases.flatMap((caseRecord) => [caseRecord.id, caseRecord.petId].filter(Boolean) as string[]));
  const legacyCases = await Promise.all(legacyPets.filter((pet) => !reportIds.has(pet.id)).map(petToCase));
  return [...reportCases, ...legacyCases]
    .filter((caseRecord) => includeClosed || caseRecord.status !== "reunido")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function listMyCases(): Promise<CaseRecord[]> {
  const reports = await listMyReports();
  return Promise.all(reports.map(reportToCase));
}

export async function getCase(id: string): Promise<CaseRecord | undefined> {
  const report = await getReport(id);
  if (report) return reportToCase(report);
  const pet = await getPet(id);
  return pet ? petToCase(pet) : undefined;
}

export async function isOwnedCase(caseRecord: CaseRecord) {
  const user = await getCurrentUser();
  return Boolean(user && caseRecord.ownerId === user.id);
}

export async function updateCaseStatus(caseRecord: CaseRecord, status: CaseStatus) {
  if (caseRecord.report) {
    await updateReport(caseRecord.report.id, { estado: status === "reunido" ? "reunido" : "activo" });
    return;
  }
  await markPetStatus(caseRecord.pet.id, status === "reunido" ? "reunido" : "perdido");
}

"use client";

import { listCases, type CaseMatch, type CaseRecord } from "@/lib/cases";
import { distanceKm } from "@/lib/utils";

export type MatchCriteria = {
  especie?: string;
  raza?: string;
  color?: string;
  tamano?: string;
  sexo?: string;
  distrito?: string;
  rasgos?: string[];
  keywords?: string[];
  fecha?: string;
  latitude?: number | null;
  longitude?: number | null;
};

function normalizeValue(value?: string | null) {
  return value?.toLowerCase().trim() ?? "";
}

function includesText(text: string, value?: string) {
  const normalized = normalizeValue(value);
  return Boolean(normalized && text.includes(normalized));
}

function classifyMatch(percentage: number): CaseMatch["level"] {
  if (percentage >= 72) return "alta";
  if (percentage >= 45) return "media";
  return "baja";
}

function addReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) reasons.push(reason);
}

export function scoreCaseMatch(caseRecord: CaseRecord, criteria: MatchCriteria): CaseMatch {
  const pet = caseRecord.pet;
  const text = [
    pet.tipo,
    pet.raza,
    pet.descripcion,
    pet.caracteristicas_personalizadas,
    pet.caracteristicas?.join(" "),
    pet.condiciones_especiales?.join(" "),
    criteria.keywords?.join(" "),
  ].filter(Boolean).join(" ").toLowerCase();
  let score = 0;
  const maxScore = 18;
  const reasons: string[] = [];

  if (includesText(text, criteria.especie)) {
    score += 3;
    addReason(reasons, "Misma especie");
  }
  if (includesText(text, criteria.raza)) {
    score += 2;
    addReason(reasons, "Raza similar");
  }
  if (includesText(text, criteria.color)) {
    score += 2;
    addReason(reasons, "Mismo color");
  }
  if (includesText(text, criteria.tamano)) {
    score += 1;
    addReason(reasons, "Mismo tamano");
  }
  if (criteria.sexo && includesText(text, criteria.sexo)) {
    score += 1;
    addReason(reasons, "Mismo sexo");
  }
  if (criteria.distrito && caseRecord.district === criteria.distrito) {
    score += 3;
    addReason(reasons, "Mismo distrito");
  }
  for (const trait of criteria.rasgos ?? []) {
    if (includesText(text, trait)) {
      score += 1;
      addReason(reasons, `${trait} reportado`);
    }
  }
  if (criteria.fecha) {
    const days = Math.abs(new Date(caseRecord.createdAt).getTime() - new Date(criteria.fecha).getTime()) / 86_400_000;
    if (days <= 3) {
      score += 2;
      addReason(reasons, "Muy reciente");
    } else if (days <= 14) {
      score += 1;
      addReason(reasons, "Fecha reciente");
    }
  }

  const distance = distanceKm(criteria.latitude, criteria.longitude, caseRecord.latitude, caseRecord.longitude);
  if (distance !== null && distance <= 1) {
    score += 4;
    addReason(reasons, "A menos de 1 km");
  } else if (distance !== null && distance <= 5) {
    score += 3;
    addReason(reasons, "Muy cerca");
  } else if (distance !== null && distance <= 12) {
    score += 1;
    addReason(reasons, "Zona cercana");
  }

  const percentage = Math.min(100, Math.round((score / maxScore) * 100));
  return { caseId: caseRecord.id, petId: caseRecord.petId, pet, score, percentage, level: classifyMatch(percentage), distance, reasons };
}

export async function findLostPetMatches(criteria: MatchCriteria) {
  const cases = await listCases(false);
  return cases
    .filter((caseRecord) => caseRecord.pet.estado === "perdido" && caseRecord.status !== "reunido" && caseRecord.status !== "archivado")
    .map((caseRecord) => scoreCaseMatch(caseRecord, criteria))
    .filter((item) => item.percentage >= 25)
    .sort((a, b) => b.percentage - a.percentage || (a.distance ?? 999) - (b.distance ?? 999))
    .slice(0, 5);
}

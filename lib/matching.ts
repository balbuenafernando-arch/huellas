"use client";

import { listCases, type CaseMatch, type CaseRecord } from "@/lib/cases";
import { distanceKm } from "@/lib/utils";

export type MatchCriteria = {
  especie?: string;
  raza?: string;
  color?: string;
  tamano?: string;
  distrito?: string;
  rasgos?: string[];
  keywords?: string[];
  fecha?: string;
  latitude?: number | null;
  longitude?: number | null;
};

function includesText(text: string, value?: string) {
  return Boolean(value && text.includes(value.toLowerCase().trim()));
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
  const reasons: string[] = [];

  if (includesText(text, criteria.especie)) {
    score += 3;
    reasons.push("Misma especie");
  }
  if (includesText(text, criteria.raza)) {
    score += 2;
    reasons.push("Raza similar");
  }
  if (includesText(text, criteria.color)) {
    score += 2;
    reasons.push("Mismo color");
  }
  if (includesText(text, criteria.tamano)) {
    score += 1;
    reasons.push("Mismo tamaño");
  }
  if (criteria.distrito && caseRecord.district === criteria.distrito) {
    score += 3;
    reasons.push("Mismo distrito");
  }
  for (const trait of criteria.rasgos ?? []) {
    if (includesText(text, trait)) {
      score += 1;
      reasons.push(`${trait} reportado`);
    }
  }
  if (criteria.fecha) {
    const days = Math.abs(new Date(caseRecord.createdAt).getTime() - new Date(criteria.fecha).getTime()) / 86_400_000;
    if (days <= 14) {
      score += 1;
      reasons.push("Fecha reciente");
    }
  }

  const distance = distanceKm(criteria.latitude, criteria.longitude, caseRecord.latitude, caseRecord.longitude);
  if (distance !== null && distance <= 5) {
    score += 3;
    reasons.push("Muy cerca");
  } else if (distance !== null && distance <= 12) {
    score += 1;
    reasons.push("Zona cercana");
  }

  return { caseId: caseRecord.id, petId: caseRecord.petId, pet, score, distance, reasons };
}

export async function findLostPetMatches(criteria: MatchCriteria) {
  const cases = await listCases(false);
  return cases
    .filter((caseRecord) => caseRecord.pet.estado === "perdido" && caseRecord.status !== "reunido" && caseRecord.status !== "archivado")
    .map((caseRecord) => scoreCaseMatch(caseRecord, criteria))
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score || (a.distance ?? 999) - (b.distance ?? 999))
    .slice(0, 5);
}

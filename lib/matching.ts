"use client";

import type { Pet } from "@/lib/demo-data";
import { getPets } from "@/lib/pet-store";
import { listReports, reportToLegacyPet } from "@/lib/sprint14-store";
import { distanceKm } from "@/lib/utils";

export type MatchCriteria = {
  especie?: string;
  raza?: string;
  color?: string;
  tamano?: string;
  distrito?: string;
  rasgos?: string[];
  latitude?: number | null;
  longitude?: number | null;
};

export async function findLostPetMatches(criteria: MatchCriteria) {
  const [reports, pets] = await Promise.all([listReports(true), getPets()]);
  const allPets = [...reports.map(reportToLegacyPet), ...pets].filter((pet, index, items) => items.findIndex((item) => item.id === pet.id) === index);
  return allPets
    .filter((pet) => pet.estado === "perdido")
    .map((pet) => {
      const text = `${pet.tipo} ${pet.raza} ${pet.descripcion} ${pet.caracteristicas_personalizadas ?? ""}`.toLowerCase();
      let score = 0;
      const reasons: string[] = [];
      if (criteria.especie && text.includes(criteria.especie.toLowerCase())) { score += 3; reasons.push("Misma especie"); }
      if (criteria.raza && text.includes(criteria.raza.toLowerCase())) { score += 2; reasons.push("Raza similar"); }
      if (criteria.color && text.includes(criteria.color.toLowerCase())) { score += 2; reasons.push("Mismo color"); }
      if (criteria.tamano && text.includes(criteria.tamano.toLowerCase())) { score += 1; reasons.push("Mismo tamaño"); }
      if (criteria.distrito && pet.distrito === criteria.distrito) { score += 3; reasons.push("Mismo distrito"); }
      for (const rasgo of criteria.rasgos ?? []) {
        if (rasgo && text.includes(rasgo.toLowerCase())) { score += 1; reasons.push(`${rasgo} reportado`); }
      }
      const distance = distanceKm(criteria.latitude, criteria.longitude, pet.latitud, pet.longitud);
      if (distance !== null && distance <= 5) { score += 3; reasons.push("Muy cerca"); }
      else if (distance !== null && distance <= 12) { score += 1; reasons.push("Zona cercana"); }
      return { pet, score, distance, reasons };
    })
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score || (a.distance ?? 999) - (b.distance ?? 999))
    .slice(0, 5);
}

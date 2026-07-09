"use client";

import type { Pet, Sighting } from "@/lib/demo-data";
import type { CaseRecord } from "@/lib/cases";
import { distanceKm } from "@/lib/utils";

export type SearchPoint = {
  id: string;
  latitude: number;
  longitude: number;
  date: string;
  label: string;
};

export type MovementEstimate = {
  points: SearchPoint[];
  direction: string | null;
  probableZone: {
    latitude: number;
    longitude: number;
    radiusKm: number;
    label: string;
  } | null;
};

export type SmartHomeSection = {
  activeNearUser: CaseRecord[];
  recentSightings: Sighting[];
  urgentCases: CaseRecord[];
  followedCases: CaseRecord[];
  collaborationCases: CaseRecord[];
};

export type PetCluster = {
  id: string;
  latitude: number;
  longitude: number;
  pets: Pet[];
};

function toPoint(sighting: Sighting): SearchPoint | null {
  if (sighting.latitud == null || sighting.longitud == null) return null;
  return {
    id: sighting.id,
    latitude: sighting.latitud,
    longitude: sighting.longitud,
    date: sighting.visto_en ?? sighting.creado_en,
    label: sighting.ubicacion ?? sighting.distrito ?? "Avistamiento",
  };
}

export function estimateCaseMovement(caseRecord: CaseRecord): MovementEstimate {
  const basePoint: SearchPoint | null = caseRecord.latitude != null && caseRecord.longitude != null ? {
    id: `${caseRecord.id}-origin`,
    latitude: caseRecord.latitude,
    longitude: caseRecord.longitude,
    date: caseRecord.createdAt,
    label: "Última ubicación conocida",
  } : null;
  const sightingPoints = caseRecord.sightings
    .map(toPoint)
    .filter((point): point is SearchPoint => Boolean(point))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const points = [basePoint, ...sightingPoints].filter((point): point is SearchPoint => Boolean(point));

  if (points.length === 0) return { points, direction: null, probableZone: null };

  const latest = points[points.length - 1];
  const recent = points.slice(-3);
  const center = recent.reduce((acc, point) => ({
    latitude: acc.latitude + point.latitude / recent.length,
    longitude: acc.longitude + point.longitude / recent.length,
  }), { latitude: 0, longitude: 0 });
  const maxDistance = Math.max(
    0.5,
    ...recent.map((point) => distanceKm(center.latitude, center.longitude, point.latitude, point.longitude) ?? 0),
  );

  return {
    points,
    direction: null,
    probableZone: {
      ...center,
      radiusKm: Math.min(5, Math.max(0.5, maxDistance + 0.5)),
      label: `Zona probable alrededor de ${latest.label}`,
    },
  };
}

export function buildSmartHomeSections(cases: CaseRecord[], sightings: Sighting[], myCases: CaseRecord[], userCoords: { latitude: number | null; longitude: number | null }): SmartHomeSection {
  const activeCases = cases.filter((caseRecord) => caseRecord.status !== "reunido" && caseRecord.status !== "archivado" && caseRecord.pet.estado === "perdido");
  const sortedByDistance = activeCases.slice().sort((a, b) => {
    const da = distanceKm(userCoords.latitude, userCoords.longitude, a.latitude, a.longitude) ?? Number.MAX_SAFE_INTEGER;
    const db = distanceKm(userCoords.latitude, userCoords.longitude, b.latitude, b.longitude) ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const urgentCases = activeCases.filter((caseRecord) => caseRecord.pet.condiciones_especiales?.length).slice(0, 4);
  const followedCases = myCases.filter((caseRecord) => caseRecord.status !== "reunido" && caseRecord.status !== "archivado").slice(0, 3);

  return {
    activeNearUser: sortedByDistance,
    recentSightings: sightings.slice().sort((a, b) => new Date(b.visto_en ?? b.creado_en).getTime() - new Date(a.visto_en ?? a.creado_en).getTime()).slice(0, 4),
    urgentCases,
    followedCases,
    collaborationCases: sortedByDistance.slice(0, 4),
  };
}

export function clusterPets(pets: Pet[], thresholdKm = 0.8): PetCluster[] {
  const clusters: PetCluster[] = [];
  for (const pet of pets) {
    const existing = clusters.find((cluster) => (distanceKm(cluster.latitude, cluster.longitude, pet.latitud, pet.longitud) ?? Infinity) <= thresholdKm);
    if (existing) {
      existing.pets.push(pet);
      existing.latitude = existing.pets.reduce((sum, item) => sum + item.latitud, 0) / existing.pets.length;
      existing.longitude = existing.pets.reduce((sum, item) => sum + item.longitud, 0) / existing.pets.length;
    } else {
      clusters.push({ id: pet.id, latitude: pet.latitud, longitude: pet.longitud, pets: [pet] });
    }
  }
  return clusters;
}

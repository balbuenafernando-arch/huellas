"use client";

import dynamic from "next/dynamic";
import type { Pet, Sighting } from "@/lib/demo-data";

const LeafletPetMap = dynamic(() => import("@/components/leaflet-pet-map"), { ssr: false, loading: () => <div className="grid min-h-[inherit] place-items-center bg-[#C8EEE0] text-sm text-[#0F6E56]">Cargando mapa...</div> });

export function PetMap({ pets, selectedId, sightings = [] }: { pets: Pet[]; selectedId?: string; sightings?: Sighting[] }) {
  return <LeafletPetMap pets={pets} selectedId={selectedId} sightings={sightings} />;
}

"use client";

import dynamic from "next/dynamic";
import type { Pet } from "@/lib/demo-data";

const LeafletPetMap = dynamic(() => import("@/components/leaflet-pet-map"), { ssr: false, loading: () => <div className="grid min-h-[inherit] place-items-center bg-[#C8EEE0] text-sm text-[#0F6E56]">Cargando mapa...</div> });

export function PetMap({ pets, selectedId }: { pets: Pet[]; selectedId?: string }) {
  return <LeafletPetMap pets={pets} selectedId={selectedId} />;
}

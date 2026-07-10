"use client";

import dynamic from "next/dynamic";
import type { PickedLocation } from "@/components/leaflet-location-picker";

const LeafletLocationPicker = dynamic(() => import("@/components/leaflet-location-picker"), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[inherit] place-items-center bg-[#F8F7F4] text-sm text-[#6B6860]">Cargando mapa...</div>,
});

export function LocationPicker(props: { value: PickedLocation; onChange: (value: PickedLocation) => void }) {
  return <LeafletLocationPicker {...props} />;
}

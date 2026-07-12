"use client";

import dynamic from "next/dynamic";
import type { CaseRecord } from "@/lib/cases";

const LeafletSearchMap = dynamic(() => import("@/components/leaflet-search-map"), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[inherit] place-items-center bg-[#F8F7F4] text-sm text-[#6B6860]">Cargando mapa...</div>,
});

export type SearchMapProps = {
  cases: CaseRecord[];
  selectedId?: string | null;
  userCoords: { latitude: number | null; longitude: number | null };
  referenceCoords: { latitude: number | null; longitude: number | null };
  recenterSignal: number;
  onSelect: (caseId: string) => void;
};

export function SearchMap(props: SearchMapProps) {
  return <LeafletSearchMap {...props} />;
}

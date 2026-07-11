"use client";

import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { CaseRecord } from "@/lib/cases";
import { publicCaseCode, searchState } from "@/lib/case-display";
import { distanceKm, formatDistance } from "@/lib/utils";

type Props = {
  cases: CaseRecord[];
  selectedId?: string | null;
  userCoords: { latitude: number | null; longitude: number | null };
  referenceCoords: { latitude: number | null; longitude: number | null };
  recenterSignal: number;
  currentUserId?: string | null;
  onSelect: (caseId: string) => void;
};

function caseIcon(caseRecord: CaseRecord, selected: boolean, mine: boolean) {
  const state = searchState(caseRecord);
  const color = mine ? "#1D9E75" : state.label === "Resguardado" ? "#378ADD" : state.label === "La vieron hace poco" ? "#B7791F" : "#D85A30";
  const size = selected ? 42 : 34;
  const letter = caseRecord.pet.tipo.toLowerCase().includes("gato") ? "G" : "P";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 8px 18px rgba(0,0,0,.24);display:grid;place-items:center;color:white;font-size:14px;font-weight:800">${letter}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const userIcon = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:999px;background:#1D9E75;border:4px solid white;box-shadow:0 0 0 4px rgba(29,158,117,.22),0 8px 18px rgba(0,0,0,.2)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitMap({ cases, referenceCoords }: Pick<Props, "cases" | "referenceCoords">) {
  const map = useMap();

  useEffect(() => {
    const points: L.LatLngTuple[] = cases
      .filter((caseRecord) => caseRecord.latitude != null && caseRecord.longitude != null)
      .map((caseRecord) => [caseRecord.latitude as number, caseRecord.longitude as number]);
    if (referenceCoords.latitude != null && referenceCoords.longitude != null) points.push([referenceCoords.latitude, referenceCoords.longitude]);
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [42, 42], maxZoom: 14 });
    if (points.length === 1) map.setView(points[0], 13);
  }, [cases, map, referenceCoords.latitude, referenceCoords.longitude]);

  return null;
}

function RecenterUser({ userCoords, recenterSignal }: Pick<Props, "userCoords" | "recenterSignal">) {
  const map = useMap();

  useEffect(() => {
    if (!recenterSignal || userCoords.latitude == null || userCoords.longitude == null) return;
    map.setView([userCoords.latitude, userCoords.longitude], 14, { animate: true });
  }, [map, recenterSignal, userCoords.latitude, userCoords.longitude]);

  return null;
}

export default function LeafletSearchMap({ cases, selectedId, userCoords, referenceCoords, recenterSignal, currentUserId, onSelect }: Props) {
  const mappedCases = useMemo(() => cases.filter((caseRecord) => caseRecord.latitude != null && caseRecord.longitude != null), [cases]);
  const selected = mappedCases.find((caseRecord) => caseRecord.id === selectedId);
  const center: [number, number] = selected
    ? [selected.latitude as number, selected.longitude as number]
    : referenceCoords.latitude != null && referenceCoords.longitude != null
      ? [referenceCoords.latitude, referenceCoords.longitude]
      : [-12.105, -77.03];

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="min-h-[inherit]">
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitMap cases={mappedCases} referenceCoords={referenceCoords} />
      <RecenterUser userCoords={userCoords} recenterSignal={recenterSignal} />
      {userCoords.latitude != null && userCoords.longitude != null && <Marker position={[userCoords.latitude, userCoords.longitude]} icon={userIcon} />}
      {mappedCases.map((caseRecord) => {
        const distanceLabel = formatDistance(distanceKm(referenceCoords.latitude, referenceCoords.longitude, caseRecord.latitude, caseRecord.longitude));
        const mine = Boolean(currentUserId && caseRecord.ownerId === currentUserId);
        return (
          <Marker
            key={caseRecord.id}
            position={[caseRecord.latitude as number, caseRecord.longitude as number]}
            icon={caseIcon(caseRecord, caseRecord.id === selectedId, mine)}
            eventHandlers={{ click: () => onSelect(caseRecord.id) }}
          >
            <Popup>
              <div className="w-52 space-y-2">
                <img src={caseRecord.pet.foto_principal} alt={caseRecord.pet.nombre} className="h-24 w-full rounded-lg bg-[#F8F7F4] object-contain" loading="lazy" />
                <div>
                  <strong className="block">{caseRecord.pet.nombre}</strong>
                  <p className="text-xs text-[#6B6860]">{distanceLabel ?? `${caseRecord.district} · zona aproximada`}</p>
                  <p className="text-xs font-semibold text-[#6B4A10]">{mine ? "Mi búsqueda" : "Caso de la comunidad"}</p>
                  <p className="text-xs font-semibold text-[#1D9E75]">Caso {publicCaseCode(caseRecord.id)}</p>
                </div>
                <Link href={`/pet/${caseRecord.id}`} className="block rounded-lg bg-[#1D9E75] px-3 py-2 text-center text-sm font-semibold text-white">Ver búsqueda</Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

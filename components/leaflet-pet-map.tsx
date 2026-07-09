"use client";

import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Pet } from "@/lib/demo-data";
import { clusterPets } from "@/lib/search-intelligence";

const colors = { perdido: "#D85A30", encontrado: "#1D9E75", reunido: "#7A7871" } as const;

function iconFor(pet: Pet, count = 1) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${count > 1 ? 38 : 30}px;height:${count > 1 ? 38 : 30}px;border-radius:999px;background:${colors[pet.estado]};border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.25);display:grid;place-items:center;color:white;font-size:${count > 1 ? 14 : 15}px;font-weight:700">${count > 1 ? count : pet.tipo.toLowerCase().includes("gato") ? "G" : "P"}</div>`,
    iconSize: count > 1 ? [38, 38] : [30, 30],
    iconAnchor: count > 1 ? [19, 19] : [15, 15],
  });
}

function FitBounds({ pets }: { pets: Pet[] }) {
  const map = useMap();

  useEffect(() => {
    if (!pets.length) return;
    const bounds = L.latLngBounds(pets.map((pet): L.LatLngTuple => [pet.latitud, pet.longitud]));
    map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13 });
  }, [map, pets]);

  return null;
}

export default function LeafletPetMap({ pets, selectedId }: { pets: Pet[]; selectedId?: string }) {
  const selected = pets.find((pet) => pet.id === selectedId);
  const center: [number, number] = selected ? [selected.latitud, selected.longitud] : [-12.105, -77.03];
  const clusters = selected ? [{ id: selected.id, latitude: selected.latitud, longitude: selected.longitud, pets: [selected] }] : clusterPets(pets);
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="min-h-[inherit]">
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {!selected && <FitBounds pets={pets} />}
      {clusters.map((cluster) => (
        <Marker key={cluster.id} position={[cluster.latitude, cluster.longitude]} icon={iconFor(cluster.pets[0], cluster.pets.length)}>
          <Popup>
            <div className="w-48 space-y-2">
              {cluster.pets.slice(0, 4).map((pet) => (
                <div key={pet.id} className="border-b border-black/10 pb-2 last:border-0 last:pb-0">
                  <img src={pet.foto_principal} alt={pet.nombre} className="mb-2 h-20 w-full rounded-lg object-cover" loading="lazy" />
                  <strong>{pet.nombre}</strong>
                  <p className="text-xs text-[#6B6860]">{pet.raza} · {pet.distrito}</p>
                  <Link href={`/pet/${pet.id}`} className="mt-1 block text-sm font-semibold text-[#1D9E75]">Abrir centro de búsqueda</Link>
                </div>
              ))}
              {cluster.pets.length > 4 && <p className="text-xs font-semibold text-[#6B6860]">+{cluster.pets.length - 4} casos cercanos</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

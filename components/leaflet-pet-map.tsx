"use client";

import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Pet } from "@/lib/demo-data";

const colors = { perdido: "#D85A30", encontrado: "#1D9E75", reunido: "#7A7871" } as const;

function iconFor(pet: Pet) {
  return L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:999px;background:${colors[pet.estado]};border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.25);display:grid;place-items:center;color:white;font-size:15px">${pet.tipo.toLowerCase().includes("gato") ? "🐈" : "🐕"}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
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
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="min-h-[inherit]">
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {!selected && <FitBounds pets={pets} />}
      {pets.map((pet) => (
        <Marker key={pet.id} position={[pet.latitud, pet.longitud]} icon={iconFor(pet)}>
          <Popup>
            <div className="w-44">
              <img src={pet.foto_principal} alt={pet.nombre} className="mb-2 h-20 w-full rounded-lg object-cover" />
              <strong>{pet.nombre}</strong>
              <p className="text-xs text-[#6B6860]">{pet.raza} · {pet.distrito}</p>
              <Link href={`/pet/${pet.id}`} className="mt-2 block text-sm font-semibold text-[#1D9E75]">Ver detalle</Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

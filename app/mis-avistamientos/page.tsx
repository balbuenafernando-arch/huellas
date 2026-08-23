"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/feedback";
import { getSightings, isOwnedSighting } from "@/lib/pet-store";
import type { Sighting } from "@/lib/demo-data";
import { listCases } from "@/lib/cases";
import { formatDateTime } from "@/lib/utils";

export default function MySightingsPage() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [caseNames, setCaseNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([getSightings(), listCases(true)]).then(([items, cases]) => { setSightings(items.filter(isOwnedSighting)); setCaseNames(Object.fromEntries(cases.flatMap((item) => [[item.id, item.pet.nombre], ...(item.petId ? [[item.petId, item.pet.nombre]] : [])]))); }).finally(() => setLoading(false)); }, []);
  if (loading) return <PageSkeleton />;
  return <main className="container py-6"><div className="mb-5"><h1 className="font-serif text-4xl">Mis avistamientos</h1><p className="mt-2 text-[#6B6860]">Mascotas vistas que reportaste y el estado de cada seguimiento.</p></div><section className="space-y-3">{sightings.length ? sightings.map((sighting) => { const linkedName = caseNames[sighting.report_id ?? ""] ?? caseNames[sighting.pet_id ?? ""]; const title = linkedName || [sighting.especie, sighting.tamano, sighting.color].filter(Boolean).join(" ") || "Mascota vista"; const linked = Boolean(linkedName || sighting.report_id); const status = sighting.estado_avistamiento ?? sighting.estado ?? "pendiente"; return <article key={sighting.id} className="form-card"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{title}</h2><span className={`status-pill ${linked ? "status-encontrado" : "status-perdido"}`}>{linked ? "Coincidencia encontrada" : "Sin coincidencia asociada"}</span></div><p className="mt-2 text-sm"><strong>Estado:</strong> {status}</p><p className="text-sm text-[#7A7871]"><strong>Ubicación:</strong> {sighting.distrito ?? sighting.ubicacion ?? "No indicada"}</p><p className="text-sm text-[#7A7871]"><strong>Fecha:</strong> {formatDateTime(sighting.visto_en ?? sighting.creado_en)}</p><Button className="mt-3" size="sm" asChild><Link href={`/avistamiento/${sighting.id}`}>Ver detalle del reporte</Link></Button></article>; }) : <div className="form-card empty-state text-sm"><span className="text-4xl" aria-hidden="true">👀</span><strong>Aún no compartiste avistamientos.</strong><span>Si ves una mascota que podría estar perdida, tu información puede ayudar.</span><Button asChild><Link href="/reportar-avistamiento">Reportar una mascota vista</Link></Button></div>}</section></main>;
}

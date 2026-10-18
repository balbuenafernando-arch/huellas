"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { distanceKm, formatDateTime, formatDistance } from "@/lib/utils";
import { listSightingReviews, saveSightingDecision, type ReviewDecision, type SightingReview } from "@/lib/sighting-reviews";
import { friendlyError } from "@/lib/form-validation";

type Props = { reportId: string; petName: string; species: string; latitude: number | null; longitude: number | null };
type View = "por_revisar" | "podria_ser" | "descartado";

export function SightingReviewSection({ reportId, petName, species, latitude, longitude }: Props) {
  const [items, setItems] = useState<SightingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("por_revisar");
  const [maxKm, setMaxKm] = useState("");
  const [days, setDays] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    listSightingReviews(reportId, species).then((result) => {
      if (active) { setItems(result); setError(""); }
    }).catch((caught) => {
      if (active) setError(friendlyError(caught, "No pudimos cargar los avistamientos para revisar."));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reportId, species]);

  const counts = useMemo(() => ({
    por_revisar: items.filter((item) => !item.decision).length,
    podria_ser: items.filter((item) => item.decision === "podria_ser").length,
    descartado: items.filter((item) => item.decision === "descartado").length,
  }), [items]);

  const shown = useMemo(() => items.filter(({ sighting, decision }) => {
    if ((decision ?? "por_revisar") !== view) return false;
    const km = distanceKm(latitude, longitude, sighting.latitud, sighting.longitud);
    if (maxKm && (km === null || km > Number(maxKm))) return false;
    if (days && Date.now() - new Date(sighting.visto_en ?? sighting.creado_en).getTime() > Number(days) * 86400000) return false;
    if (size && sighting.tamano?.toLocaleLowerCase("es-PE") !== size) return false;
    if (color && !sighting.color?.toLocaleLowerCase("es-PE").includes(color.toLocaleLowerCase("es-PE"))) return false;
    return true;
  }).sort((a, b) => new Date(b.sighting.visto_en ?? b.sighting.creado_en).getTime() - new Date(a.sighting.visto_en ?? a.sighting.creado_en).getTime()), [items, view, latitude, longitude, maxKm, days, size, color]);

  async function decide(sightingId: string, decision: ReviewDecision | null) {
    setBusyId(sightingId);
    try {
      await saveSightingDecision(reportId, sightingId, decision);
      setItems((current) => current.map((item) => item.sighting.id === sightingId ? { ...item, decision } : item));
      setExpandedId(null);
      setError("");
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo guardar tu decisión."));
    } finally {
      setBusyId(null);
    }
  }

  return <section id="avistamientos-para-revisar" className="form-card min-w-0 scroll-mt-24 space-y-4">
    <div>
      <h2 className="font-serif text-2xl">Avistamientos para revisar</h2>
      <p className="mt-1 font-semibold text-[#085041]">{loading ? "Cargando…" : `${counts.por_revisar} pendiente${counts.por_revisar === 1 ? "" : "s"}`}</p>
      <p className="mt-2 text-sm text-[#6B6860]">Revisa reportes de la comunidad de la misma especie que podrían ayudarte a encontrar a {petName}. Tú decides.</p>
    </div>
    <Button type="button" variant="outline" aria-expanded={open} aria-controls="lista-avistamientos-revision" onClick={() => setOpen((value) => !value)}>{open ? "Ocultar avistamientos" : "Revisar avistamientos"}</Button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {open && <div id="lista-avistamientos-revision" className="min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2" aria-label="Estado de revisión">
        {(["por_revisar", "podria_ser", "descartado"] as const).map((option) => <Button key={option} type="button" size="sm" variant={view === option ? "default" : "outline"} onClick={() => setView(option)}>{option === "por_revisar" ? "Por revisar" : option === "podria_ser" ? "Podría ser" : "Descartados"} ({counts[option]})</Button>)}
      </div>
      <details className="rounded-xl border border-black/10 p-3">
        <summary className="cursor-pointer font-semibold">Filtros opcionales{[maxKm, days, size, color].filter(Boolean).length ? ` (${[maxKm, days, size, color].filter(Boolean).length})` : ""}</summary>
        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="text-sm">Distancia máxima<select className="input mt-1 w-full" value={maxKm} onChange={(event) => setMaxKm(event.target.value)}><option value="">Cualquier distancia</option><option value="5">5 km</option><option value="20">20 km</option><option value="50">50 km</option></select></label>
          <label className="text-sm">Fecha<select className="input mt-1 w-full" value={days} onChange={(event) => setDays(event.target.value)}><option value="">Cualquier fecha</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option></select></label>
          <label className="text-sm">Tamaño<select className="input mt-1 w-full" value={size} onChange={(event) => setSize(event.target.value)}><option value="">Cualquier tamaño</option>{["Pequeño", "Mediano", "Grande"].map((item) => <option key={item} value={item.toLocaleLowerCase("es-PE")}>{item}</option>)}</select></label>
          <label className="text-sm">Color<input className="input mt-1 w-full" value={color} onChange={(event) => setColor(event.target.value)} placeholder="Cualquier color" /></label>
        </div>
        <Button className="mt-3" size="sm" variant="outline" type="button" onClick={() => { setMaxKm(""); setDays(""); setSize(""); setColor(""); }}>Restablecer filtros</Button>
      </details>
      {!loading && shown.length === 0 && <p className="rounded-xl bg-[#F8F7F4] p-4 text-sm">{items.length === 0 ? "Todavía no hay avistamientos de esta especie para revisar. Tu búsqueda sigue publicada." : "No hay avistamientos en esta vista con los filtros elegidos."}</p>}
      {shown.map(({ sighting, decision }) => {
        const image = sighting.fotos?.[0] ?? sighting.foto;
        const distance = distanceKm(latitude, longitude, sighting.latitud, sighting.longitud);
        return <article key={sighting.id} className="min-w-0 overflow-hidden rounded-2xl border border-black/10">
          {image && <img src={image} alt="Mascota observada" className="h-52 w-full bg-[#F8F7F4] object-contain" />}
          <div className="min-w-0 space-y-2 p-4">
            <p className="font-semibold">{sighting.ubicacion || sighting.distrito || "Zona no indicada"}</p>
            <p className="text-sm text-[#6B6860]">{formatDateTime(sighting.visto_en ?? sighting.creado_en)}{distance !== null ? ` · ${formatDistance(distance)}` : ""}</p>
            <p className="text-sm text-[#6B6860]">{[sighting.tamano, sighting.color].filter(Boolean).join(" · ") || "Sin tamaño ni color indicados"}</p>
            <Button type="button" size="sm" variant="outline" aria-expanded={expandedId === sighting.id} onClick={() => setExpandedId((id) => id === sighting.id ? null : sighting.id)}>Ver avistamiento</Button>
            {expandedId === sighting.id && <div className="space-y-3 border-t border-black/10 pt-3">
              <p className="whitespace-pre-wrap text-sm">{sighting.comentario || "No se añadió una descripción."}</p>
              <p className="text-sm text-[#6B6860]">Reportado por {sighting.reporter_name || "Usuario HUELLA"}.</p>
              <Link href={`/avistamiento/${sighting.id}?caseId=${reportId}`} className="inline-block text-sm font-semibold text-[#085041] underline">Ver detalle completo</Link>
              <p className="font-semibold">¿Podría ser {petName}?</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busyId === sighting.id} onClick={() => decide(sighting.id, "podria_ser")}>Podría ser</Button>
                <Button type="button" size="sm" variant="outline" className="max-w-full whitespace-normal break-words text-center" disabled={busyId === sighting.id} onClick={() => decide(sighting.id, "descartado")}>No es {petName}</Button>
                {decision && <Button type="button" size="sm" variant="outline" disabled={busyId === sighting.id} onClick={() => decide(sighting.id, null)}>Volver a por revisar</Button>}
              </div>
              {decision === "podria_ser" && <p className="text-sm text-[#6B6860]">El caso sigue abierto. El contacto requiere la autorización habitual. <Link href="#solicitudes-contacto" className="font-semibold underline">Ver solicitudes de contacto</Link></p>}
            </div>}
          </div>
        </article>;
      })}
    </div>}
  </section>;
}

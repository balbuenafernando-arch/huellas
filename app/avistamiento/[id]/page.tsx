"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContentReportButton } from "@/components/content-report-button";
import { FriendlyError, DetailSkeleton } from "@/components/feedback";
import type { Sighting } from "@/lib/demo-data";
import { getSighting, getPet, updateSightingReview, isOwnedPet } from "@/lib/pet-store";
import { getCurrentUser, getReport, type Report, updateReport } from "@/lib/sprint14-store";
import { formatDate, formatDateTime } from "@/lib/utils";
import { friendlyError } from "@/lib/form-validation";

const reviewStates: Array<{ value: NonNullable<Sighting["estado_revision"]>; label: string }> = [
  { value: "por_revisar", label: "Por revisar" },
  { value: "posible_coincidencia", label: "Posible coincidencia" },
  { value: "no_era", label: "Descartar avistamiento" },
  { value: "alerta_falsa", label: "Alerta falsa" },
  { value: "informacion_enganosa", label: "Información engañosa" },
  { value: "encontrada", label: "Ayudó a encontrarla" },
];

const situationLabels: Record<string, string> = {
  solo_la_vi: "Solo la vi",
  sigue_en_la_zona: "Sigue en la zona",
  la_tengo_conmigo: "La tengo conmigo",
  veterinaria: "Está en veterinaria",
  refugio: "Está en refugio",
};

export default function SightingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [sighting, setSighting] = useState<Sighting>();
  const [report, setReport] = useState<Report | undefined>();
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const found = await getSighting(params.id);
      setSighting(found);
      if (!found) return;

      const [legacyPet, foundReport, user] = await Promise.all([found.pet_id ? getPet(found.pet_id) : Promise.resolve(undefined), getReport(found.report_id ?? found.pet_id ?? ""), getCurrentUser()]);
      setReport(foundReport);
      setOwned(Boolean(foundReport && user && foundReport.user_id === user.id) || isOwnedPet(legacyPet));
      setError("");
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos cargar el avistamiento. Inténtalo otra vez."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params.id]);

  async function changeReview(value: NonNullable<Sighting["estado_revision"]>) {
    if (!sighting || saving) return;
    setSaving(true);
    setError("");
    try {
      if (sighting.pet_id) await updateSightingReview(sighting.id, sighting.pet_id, value);
      if (value === "encontrada" && report) await updateReport(report.id, { estado: "reunido" });
      await load();
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos actualizar el estado. Inténtalo otra vez."));
    } finally {
      setSaving(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}/avistamiento/${params.id}`;
    if (navigator.share) await navigator.share({ title: "Avistamiento en HUELLA", url });
    else {
      await navigator.clipboard.writeText(url);
      alert("Enlace copiado.");
    }
  }

  if (loading) return <DetailSkeleton />;
  if (!sighting) return <main className="container py-10"><FriendlyError message={error || "Avistamiento no encontrado."} onRetry={load} /></main>;

  const date = sighting.visto_en ?? sighting.creado_en;

  return (
    <main className="container py-6">
      <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))} className="mb-3 text-sm font-semibold text-[#6B6860]">Volver</button>
      {error && <div className="mb-4"><FriendlyError message={error} onRetry={load} /></div>}
      <section className="form-card mx-auto max-w-2xl space-y-4">
        {sighting.foto && <img src={sighting.foto} alt="Foto del avistamiento" className="max-h-[420px] w-full rounded-xl bg-[#F8F7F4] object-contain" />}
        <div>
          <h1 className="font-serif text-4xl">Avistamiento</h1>
          <p className="mt-2 text-sm text-[#6B6860]">Reportado por un miembro de la comunidad</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#F8F7F4] p-3"><h2 className="font-bold">Fecha</h2><p className="mt-1 text-[#6B6860]">{formatDate(date)}</p></div>
          <div className="rounded-xl bg-[#F8F7F4] p-3"><h2 className="font-bold">Hora</h2><p className="mt-1 text-[#6B6860]">{new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</p></div>
          <div className="rounded-xl bg-[#F8F7F4] p-3"><h2 className="font-bold">Ubicación</h2><p className="mt-1 text-[#6B6860]">{sighting.ubicacion}</p></div>
        </div>
        <div><h2 className="font-bold">Descripción</h2><p className="mt-1 leading-7">{sighting.comentario}</p></div>
        <div><h2 className="font-bold">Situación observada</h2><p className="mt-1 text-[#6B6860]">{situationLabels[String(sighting.situacion ?? "")] ?? "Solo la vi"}</p></div>
        {(sighting.especie || sighting.color || sighting.tamano || sighting.distrito) && <div><h2 className="font-bold">Datos observados</h2><p className="mt-1 text-[#6B6860]">{[sighting.especie, sighting.tamano, sighting.color, sighting.distrito].filter(Boolean).join(" · ")}</p></div>}
        <div><h2 className="font-bold">Placa o medalla</h2><p className="mt-1 text-[#6B6860]">{sighting.llevaba_placa === "si" ? `Sí${sighting.nombre_observado ? ` · ${sighting.nombre_observado}` : ""}` : sighting.llevaba_placa === "no" ? "No" : "No pude verificar"}</p></div>
        <div className="grid gap-2 min-[390px]:flex"><Button onClick={share}>Compartir avistamiento</Button>{(sighting.report_id || sighting.pet_id) && <Button variant="outline" asChild><Link href={`/pet/${sighting.report_id ?? sighting.pet_id}`}>Ver centro de búsqueda</Link></Button>}</div>
        <ContentReportButton targetType="sighting" targetId={sighting.id} />
        {owned && <div className="border-t border-black/10 pt-4"><h2 className="mb-2 font-bold">Estado de revisión</h2><div className="grid gap-2">{reviewStates.map((state) => <Button key={state.value} disabled={saving} variant={sighting.estado_revision === state.value ? "default" : "outline"} onClick={() => changeReview(state.value)}>{state.label}</Button>)}</div></div>}
        <p className="sr-only">{formatDateTime(date)}</p>
      </section>
    </main>
  );
}

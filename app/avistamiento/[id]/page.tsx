"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContentReportButton } from "@/components/content-report-button";
import { FriendlyError, DetailSkeleton } from "@/components/feedback";
import type { Sighting } from "@/lib/demo-data";
import { getSighting } from "@/lib/pet-store";
import { formatDate, formatDateTime } from "@/lib/utils";
import { friendlyError } from "@/lib/form-validation";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const found = await getSighting(params.id);
      setSighting(found);
      if (!found) return;

      setError("");
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo cargar el avistamiento. Inténtalo otra vez."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params.id]);

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
        {(sighting.fotos?.length ? sighting.fotos : [sighting.foto].filter((url): url is string => Boolean(url))).length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(sighting.fotos?.length ? sighting.fotos : [sighting.foto].filter((url): url is string => Boolean(url))).slice(0, 3).map((url) => <img key={url} src={url} alt="Foto del avistamiento" className="h-52 w-full rounded-xl bg-[#F8F7F4] object-contain" />)}</div>}
        <div>
          <h1 className="font-serif text-4xl">Avistamiento</h1>
          <p className="mt-2 text-sm text-[#6B6860]">{`Reportado por ${sighting.reporter_is_anonymous ? "Usuario anónimo" : sighting.reporter_name || "Usuario HUELLA"}`}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#F8F7F4] p-3"><h2 className="font-bold">Fecha</h2><p className="mt-1 text-[#6B6860]">{formatDate(date)}</p></div>
          <div className="rounded-xl bg-[#F8F7F4] p-3"><h2 className="font-bold">Hora</h2><p className="mt-1 text-[#6B6860]">{new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</p></div>
          <div className="rounded-xl bg-[#F8F7F4] p-3"><h2 className="font-bold">Ubicación</h2><p className="mt-1 text-[#6B6860]">{sighting.ubicacion}</p></div>
        </div>
        <div><h2 className="font-bold">Descripción del avistamiento</h2><p className="mt-1 leading-7">{sighting.comentario}</p></div>
        <div><h2 className="font-bold">Situación observada</h2><p className="mt-1 text-[#6B6860]">{situationLabels[String(sighting.situacion ?? "")] ?? "Solo la vi"}</p></div>
        {(sighting.especie || sighting.color || sighting.tamano || sighting.distrito) && <div><h2 className="font-bold">Datos observados</h2><p className="mt-1 text-[#6B6860]">{[sighting.especie, sighting.tamano, sighting.color, sighting.distrito].filter(Boolean).join(" · ")}</p></div>}
        <div><h2 className="font-bold">Placa o medalla</h2><p className="mt-1 text-[#6B6860]">{sighting.llevaba_placa === "si" ? `Sí${sighting.nombre_observado ? ` · ${sighting.nombre_observado}` : ""}` : sighting.llevaba_placa === "no" ? "No" : "No pude verificar"}</p></div>
        <div className="grid gap-2 min-[390px]:flex"><Button onClick={share}>Vi esa mascota</Button>{(sighting.report_id || sighting.pet_id) && <Button variant="outline" asChild><Link href={`/pet/${sighting.report_id ?? sighting.pet_id}`}>Ver centro de búsqueda</Link></Button>}</div>
        <ContentReportButton targetType="sighting" targetId={sighting.id} />
        <p className="sr-only">{formatDateTime(date)}</p>
      </section>
    </main>
  );
}

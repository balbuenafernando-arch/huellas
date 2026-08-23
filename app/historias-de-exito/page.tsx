"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listReports, type Report } from "@/lib/sprint14-store";
import { listReunionStories, type ReunionStory } from "@/lib/reunion-stories";
import { formatDate } from "@/lib/utils";
import { PageSkeleton } from "@/components/feedback";

function daysBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return "Tiempo no registrado";
  const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
  return days === 1 ? "1 día" : `${days} días`;
}

async function shareStory(name: string, id: string) {
  const url = `${window.location.origin}/pet/${id}`;
  const text = `${name} volvió a casa gracias a la comunidad HUELLA.`;
  if (navigator.share) await navigator.share({ title: "Reencuentro en HUELLA", text, url });
  else {
    await navigator.clipboard.writeText(`${text} ${url}`);
    alert("Enlace de la historia copiado.");
  }
}

export default function SuccessStoriesPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stories, setStories] = useState<Record<string, ReunionStory>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listReunionStories(), listReports(true)]).then(([storyItems, reportItems]) => {
      setStories(storyItems);
      setReports(reportItems.filter((report) => report.estado === "reunido"));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <main className="container py-6">
      <div className="mb-5">
        <h1 className="font-serif text-4xl">Reencuentros</h1>
        <p className="mt-2 text-[#6B6860]">Historias que recuerdan que cada avistamiento puede cambiar el final.</p>
      </div>
      {reports.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reports.map((report) => {
          const story = stories[report.id] ?? (report.pet_id ? stories[report.pet_id] : undefined);
          return (
            <article key={report.id} className="pet-card block">
              {story?.photoUrl ? <img src={story.photoUrl} alt={`Reencuentro de ${report.pet?.nombre ?? "la mascota"}`} className="pet-photo" loading="lazy" /> : report.foto_url ? <img src={report.foto_url} alt={report.pet?.nombre ?? "Mascota reunida"} className="pet-photo" loading="lazy" /> : <div className="grid h-48 place-items-center bg-[#E1F5EE] text-sm font-semibold text-[#085041]">Sin fotografía</div>}
              <div className="space-y-2 p-4">
                <div className="flex items-center gap-3">{story?.photoUrl && report.foto_url && <img src={report.foto_url} alt={report.pet?.nombre ?? "Mascota reunida"} className="h-14 w-14 rounded-full bg-[#F8F7F4] object-cover" />}<h2 className="font-bold">{report.pet?.nombre ?? "Mascota reunida"}</h2></div>
                <p className="text-sm text-[#7A7871]">{report.distrito}</p>
                <p className="text-sm font-semibold text-[#1D9E75]">Volvió en {story?.searchDurationDays ? `${story.searchDurationDays} días` : daysBetween(report.created_at, report.reunited_at)}</p>
                <p className="text-xs text-[#7A7871]">{report.reunited_at ? formatDate(report.reunited_at) : "Fecha de reencuentro no registrada"}</p>
                <p className="line-clamp-3 text-sm text-[#4D4A43]">{story?.story || "La familia cerró el caso y confirmó el reencuentro."}</p>
                <p className="rounded-xl bg-[#E1F5EE] p-3 text-sm font-semibold text-[#085041]">Gracias a la comunidad de HUELLA esta mascota volvió con su familia.</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => shareStory(report.pet?.nombre ?? "Mascota reunida", report.id)}>Compartir</Button>
                {report.pet_id && <Link href={`/mascota/${report.pet_id}/historial`} className="block text-center text-xs font-semibold text-[#6B6860] underline underline-offset-4">Ver historial completo del caso</Link>}
              </div>
            </article>
          );
        })}
      </div> : <div className="form-card empty-state text-sm"><span className="text-4xl" aria-hidden="true">💚</span><strong>Aún no hay reencuentros publicados.</strong><span>Las historias aparecerán aquí cuando una familia cierre una búsqueda.</span><Button asChild><Link href="/buscar-cerca">Ayudar en una búsqueda</Link></Button></div>}
    </main>
  );
}

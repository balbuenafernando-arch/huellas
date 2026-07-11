"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecondaryHeader } from "@/components/secondary-header";
import { demoPets } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listReports, type Report } from "@/lib/sprint14-store";
import { listReunionStories, type ReunionStory } from "@/lib/reunion-stories";
import { formatDate } from "@/lib/utils";

function daysBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return "Tiempo no registrado";
  const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
  return days === 1 ? "1 día" : `${days} días`;
}

async function shareStory(name: string, id: string) {
  const url = `${window.location.origin}/pet/${id}`;
  const text = `${name} volvió a casa gracias a la comunidad HUELLA.`;
  if (navigator.share) await navigator.share({ title: "Reencuentro en HUELLA", text, url });
  else await navigator.clipboard.writeText(`${text} ${url}`);
}

export default function SuccessStoriesPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stories, setStories] = useState<Record<string, ReunionStory>>({});

  useEffect(() => {
    listReunionStories().then(setStories);
    listReports(true).then((items) => setReports(items.filter((report) => report.estado === "reunido")));
  }, []);

  return (
    <main className="container py-6">
      <SecondaryHeader title="Reencuentros" description="Historias que celebran que una mascota volvió a casa. Cada cierre muestra la fecha, el tiempo perdido y las personas que ayudaron." />
      {!isSupabaseConfigured && <div className="mb-4 rounded-xl bg-[#FAEEDA] p-3 text-sm font-semibold text-[#6B4A10]">Datos demo temporales hasta conectar casos reales de producción.</div>}
      {reports.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reports.map((report) => {
          const story = stories[report.id] ?? (report.pet_id ? stories[report.pet_id] : undefined);
          const photo = story?.photoUrl ?? report.foto_url;
          const helpers = 1;
          return (
            <article key={report.id} className="pet-card block border-[#9FE1CB]">
              {photo ? <img src={photo} alt={report.pet?.nombre ?? "Mascota reunida"} className="pet-photo" loading="lazy" /> : <div className="grid h-48 place-items-center bg-[#E1F5EE] text-sm font-semibold text-[#085041]">Sin fotografía</div>}
              <div className="space-y-2 p-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E1F5EE] px-2 py-1 text-xs font-bold text-[#085041]"><Heart size={13} />Mascota reunida</span>
                <h2 className="font-bold">{report.pet?.nombre ?? "Mascota reunida"}</h2>
                <p className="text-sm text-[#7A7871]">{report.distrito}</p>
                <p className="text-sm font-semibold text-[#1D9E75]">Volvió en {story?.searchDurationDays ? `${story.searchDurationDays} días` : daysBetween(report.created_at, report.reunited_at)}</p>
                <p className="text-xs text-[#7A7871]">{report.reunited_at ? formatDate(report.reunited_at) : "Fecha de reencuentro no registrada"}</p>
                <p className="line-clamp-3 text-sm text-[#4D4A43]">{story?.story || "La familia cerró el caso y confirmó el reencuentro."}</p>
                <p className="flex items-center gap-1 text-xs font-semibold text-[#6B6860]"><Users size={14} />{helpers} persona{helpers === 1 ? "" : "s"} ayudando</p>
                <Button size="sm" className="w-full" asChild><Link href={`/pet/${report.id}`}>Ver historia</Link></Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => shareStory(report.pet?.nombre ?? "Mascota reunida", report.id)}>Compartir</Button>
              </div>
            </article>
          );
        })}
      </div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {demoPets.filter((pet) => pet.estado === "reunido").slice(0, 4).map((pet) => (
          <article key={pet.id} className="pet-card block border-[#9FE1CB]">
            <img src={pet.foto_principal} alt={pet.nombre} className="pet-photo" loading="lazy" />
            <div className="space-y-2 p-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E1F5EE] px-2 py-1 text-xs font-bold text-[#085041]"><Heart size={13} />Mascota reunida</span>
              <h2 className="font-bold">{pet.nombre}</h2>
              <p className="text-sm text-[#7A7871]">{pet.distrito}</p>
              <p className="text-sm font-semibold text-[#1D9E75]">Volvió en {daysBetween(pet.fecha_reporte, pet.cerrado_en ?? pet.creado_en)}</p>
              <p className="text-xs text-[#7A7871]">{formatDate(pet.cerrado_en ?? pet.creado_en)}</p>
              <p className="line-clamp-3 text-sm text-[#4D4A43]">La familia cerró el caso y confirmó el reencuentro.</p>
              <p className="flex items-center gap-1 text-xs font-semibold text-[#6B6860]"><Users size={14} />Comunidad HUELLA</p>
              <Button size="sm" className="w-full" asChild><Link href={`/pet/${pet.id}`}>Ver historia</Link></Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => shareStory(pet.nombre, pet.id)}>Compartir</Button>
            </div>
          </article>
        ))}
      </div>}
    </main>
  );
}

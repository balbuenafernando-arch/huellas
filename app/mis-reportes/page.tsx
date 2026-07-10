"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosterButton, ShareButton } from "@/components/report-actions";
import { getSightings, isOwnedSighting } from "@/lib/pet-store";
import type { Sighting } from "@/lib/demo-data";
import { listCases } from "@/lib/cases";
import { publicCaseCode } from "@/lib/case-display";
import { listMyReports, reportToLegacyPet, type Report, updateReport } from "@/lib/sprint14-store";
import { formatDateTime } from "@/lib/utils";

function ReportRow({ report, sightingCount, onChanged }: { report: Report; sightingCount: number; onChanged: () => void }) {
  const pet = reportToLegacyPet(report);

  return (
    <article className="form-card">
      <div className="flex flex-col gap-4 min-[390px]:flex-row">
        <img src={report.foto_url} alt={report.pet?.nombre ?? "Mascota perdida"} className="h-40 w-full rounded-xl bg-[#F8F7F4] object-cover min-[390px]:h-24 min-[390px]:w-24" loading="lazy" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{report.pet?.nombre ?? "Mascota perdida"}</h3>
            <span className={`status-pill ${report.estado === "reunido" ? "status-reunido" : "status-perdido"}`}>{report.estado === "reunido" ? "Reunido" : "Búsqueda activa"}</span>
          </div>
          <p className="text-xs font-semibold text-[#1D9E75]">Caso {publicCaseCode(report.id)}</p>
          <p className="text-sm text-[#7A7871]">{report.distrito}</p>
          <div className={`mt-3 rounded-xl p-3 text-sm font-semibold ${sightingCount > 0 ? "bg-[#E1F5EE] text-[#085041]" : "bg-[#F8F7F4] text-[#6B6860]"}`}>{sightingCount > 0 ? `${sightingCount} avistamiento${sightingCount === 1 ? "" : "s"} para revisar` : "HUELLA sigue comparando zona y rasgos."}</div>
          <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2">
            <ShareButton pet={pet} label={report.estado === "reunido" ? "Compartir historia" : "Compartir búsqueda"} />
            {report.estado !== "reunido" && <PosterButton pet={pet} />}
          </div>
          <div className="mt-3 grid gap-2 min-[390px]:flex min-[390px]:flex-wrap">
            <Button size="sm" asChild><Link href={`/pet/${report.id}`}>Ver centro de búsqueda</Link></Button>
            <Button size="sm" variant="outline" asChild><Link href={`/pet/${report.id}/editar`}>Editar</Link></Button>
            {report.estado === "activo" ? <Button size="sm" asChild><Link href={`/pet/${report.id}`}><Heart size={16} />Cerrar búsqueda</Link></Button> : <Button size="sm" onClick={() => updateReport(report.id, { estado: "activo" }).then(onChanged)}><RotateCcw size={16} />Reabrir búsqueda</Button>}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MisReportesPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [caseSightingCounts, setCaseSightingCounts] = useState<Record<string, number>>({});
  const [caseNames, setCaseNames] = useState<Record<string, string>>({});

  async function load() {
    const [myReports, allSightings, cases] = await Promise.all([listMyReports(), getSightings(), listCases(true)]);
    setReports(myReports);
    setSightings(allSightings.filter(isOwnedSighting));
    setCaseSightingCounts(Object.fromEntries(myReports.map((report) => [
      report.id,
      allSightings.filter((sighting) => sighting.report_id === report.id || sighting.pet_id === report.pet_id).length,
    ])));
    setCaseNames(Object.fromEntries(cases.flatMap((caseRecord) => [
      [caseRecord.id, caseRecord.pet.nombre],
      ...(caseRecord.petId ? [[caseRecord.petId, caseRecord.pet.nombre]] : []),
    ])));
  }

  useEffect(() => { load(); }, []);
  const lost = reports.filter((report) => report.tipo_reporte === "perdido");

  function sightingTitle(sighting: Sighting) {
    const linkedName = caseNames[sighting.report_id ?? ""] ?? caseNames[sighting.pet_id ?? ""];
    if (linkedName) return linkedName;
    const observed = [sighting.especie, sighting.tamano, sighting.color].filter(Boolean).join(" ");
    if (observed) return observed;
    return sighting.comentario?.trim().slice(0, 42) || "Avistamiento";
  }

  return (
    <main className="container py-6">
      <div className="mb-5"><h1 className="font-serif text-4xl">Mis búsquedas</h1><p className="mt-2 text-[#6B6860]">Aquí ves qué necesita atención y qué avistamientos llegaron.</p></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Mis búsquedas activas</h2>
          {lost.length === 0 && <div className="form-card empty-state text-sm"><strong>Aún no tienes búsquedas activas.</strong><span>Si necesitas ayuda, empieza desde “Perdí mi mascota”.</span></div>}
          {lost.map((report) => <ReportRow key={report.id} report={report} sightingCount={caseSightingCounts[report.id] ?? 0} onChanged={load} />)}
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Mis avistamientos</h2>
          {sightings.length === 0 && <div className="form-card empty-state text-sm"><strong>Aún no compartiste avistamientos.</strong><span>Si ves una mascota que podría estar perdida, tu información puede ayudar.</span></div>}
          {sightings.map((sighting) => <Link key={sighting.id} href={`/avistamiento/${sighting.id}`} className="form-card block hover:bg-[#F8F7F4]"><h3 className="font-bold">{sightingTitle(sighting)}</h3><p className="mt-1 text-sm text-[#7A7871]">{sighting.distrito ?? sighting.ubicacion}</p><p className="mt-1 text-sm">{formatDateTime(sighting.visto_en ?? sighting.creado_en)}</p></Link>)}
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSightings, isOwnedSighting } from "@/lib/pet-store";
import type { Sighting } from "@/lib/demo-data";
import { listCases } from "@/lib/cases";
import { listMyReports, type Report, updateReport } from "@/lib/sprint14-store";
import { formatDateTime } from "@/lib/utils";

function ReportRow({ report, onChanged }: { report: Report; onChanged: () => void }) {
  async function share() {
    const url = `${window.location.origin}/pet/${report.id}`;
    if (navigator.share) await navigator.share({ title: "Caso Huella", url });
    else {
      await navigator.clipboard.writeText(url);
      alert("Enlace copiado.");
    }
  }

  return (
    <article className="form-card">
      <div className="flex flex-col gap-4 min-[390px]:flex-row">
        <img src={report.foto_url} alt={report.pet?.nombre ?? "Mascota perdida"} className="h-40 w-full rounded-xl bg-[#F8F7F4] object-cover min-[390px]:h-24 min-[390px]:w-24" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{report.pet?.nombre ?? "Mascota perdida"}</h3><span className={`status-pill ${report.estado === "reunido" ? "status-reunido" : "status-perdido"}`}>{report.estado === "reunido" ? "Reunido" : "Perdido"}</span></div>
          <p className="text-sm text-[#7A7871]">{report.distrito}</p>
          <div className="mt-3 grid gap-2 min-[390px]:flex min-[390px]:flex-wrap">
            <Button size="sm" asChild><Link href={`/pet/${report.id}`}>Ver caso</Link></Button>
            <Button size="sm" variant="outline" asChild><Link href={`/pet/${report.id}/editar`}>Editar</Link></Button>
            {report.estado === "activo" ? <Button size="sm" onClick={() => updateReport(report.id, { estado: "reunido" }).then(onChanged)}><CheckCircle size={16} />Marcar como reunida</Button> : <Button size="sm" onClick={() => updateReport(report.id, { estado: "activo" }).then(onChanged)}><RotateCcw size={16} />Reabrir busqueda</Button>}
            <Button size="sm" variant="outline" onClick={share}><Share2 size={16} />Compartir</Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MisReportesPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [caseNames, setCaseNames] = useState<Record<string, string>>({});

  async function load() {
    const [myReports, allSightings, cases] = await Promise.all([listMyReports(), getSightings(), listCases(true)]);
    setReports(myReports);
    setSightings(allSightings.filter(isOwnedSighting));
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
      <div className="mb-5"><h1 className="font-serif text-4xl">Mis casos</h1><p className="mt-2 text-[#6B6860]">Seguimiento de tus mascotas perdidas y avistamientos enviados.</p></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3"><h2 className="text-xl font-bold">Mis mascotas perdidas</h2>{lost.length === 0 && <div className="form-card text-sm text-[#6B6860]">Aun no tienes casos de mascotas perdidas. Si necesitas ayuda, puedes crear uno desde "Perdi mi mascota".</div>}{lost.map((report) => <ReportRow key={report.id} report={report} onChanged={load} />)}</section>
        <section className="space-y-3"><h2 className="text-xl font-bold">Mis avistamientos</h2>{sightings.length === 0 && <div className="form-card text-sm text-[#6B6860]">Cuando reportes una mascota vista, aparecera aqui para que puedas seguir su avance.</div>}{sightings.map((sighting) => <Link key={sighting.id} href={`/avistamiento/${sighting.id}`} className="form-card block hover:bg-[#F8F7F4]"><h3 className="font-bold">{sightingTitle(sighting)}</h3><p className="mt-1 text-sm text-[#7A7871]">{sighting.distrito ?? sighting.ubicacion}</p><p className="mt-1 text-sm">{formatDateTime(sighting.visto_en ?? sighting.creado_en)}</p></Link>)}</section>
      </div>
    </main>
  );
}

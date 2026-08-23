"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosterButton, ShareButton } from "@/components/report-actions";
import { getSightings } from "@/lib/pet-store";
import { publicCaseCode } from "@/lib/case-display";
import { deleteReport, listMyReports, reportToLegacyPet, type Report, updateReport } from "@/lib/sprint14-store";
import { PageSkeleton } from "@/components/feedback";

function SearchCard({ report, sightingCount, onChanged, onDelete }: { report: Report; sightingCount: number; onChanged: () => void; onDelete: () => void }) {
  const pet = reportToLegacyPet(report);
  return <article className="form-card"><div className="flex flex-col gap-4 min-[390px]:flex-row"><img src={report.foto_url} alt={report.pet?.nombre ?? "Mascota perdida"} className="h-40 w-full rounded-xl bg-[#F8F7F4] object-contain min-[390px]:h-24 min-[390px]:w-24" loading="lazy" /><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{report.pet?.nombre ?? "Mascota perdida"}</h2><span className={`status-pill ${report.estado === "reunido" ? "status-reunido" : "status-perdido"}`}>{report.estado === "reunido" ? "Reunido" : "Búsqueda activa"}</span></div><p className="text-xs font-semibold text-[#1D9E75]">Caso {publicCaseCode(report.id)}</p><p className="text-sm text-[#7A7871]">{report.distrito}</p><div className={`mt-3 rounded-xl p-3 text-sm font-semibold ${sightingCount ? "bg-[#E1F5EE] text-[#085041]" : "bg-[#F8F7F4] text-[#6B6860]"}`}>{sightingCount ? `${sightingCount} avistamiento${sightingCount === 1 ? "" : "s"} recibido${sightingCount === 1 ? "" : "s"}` : "Sin avistamientos recibidos todavía."}</div><div className="mt-3 grid gap-2 min-[390px]:grid-cols-2"><ShareButton pet={pet} label={report.estado === "reunido" ? "Compartir historia" : "Compartir búsqueda"} />{report.estado !== "reunido" && <PosterButton pet={pet} />}</div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" asChild><Link href={`/pet/${report.id}`}>Ver centro de búsqueda</Link></Button><Button size="sm" variant="outline" asChild><Link href={`/pet/${report.id}/editar`}>Editar</Link></Button>{report.estado === "activo" ? <Button size="sm" asChild><Link href={`/pet/${report.id}?cerrar=1`}><Heart size={16} />Cerrar búsqueda</Link></Button> : <Button size="sm" onClick={() => { if (confirm("¿Quieres reabrir esta búsqueda?")) void updateReport(report.id, { estado: "activo" }).then(onChanged); }}><RotateCcw size={16} />Reabrir búsqueda</Button>}<Button size="sm" variant="outline" onClick={onDelete}><Trash2 size={16} />Eliminar caso</Button></div></div></div></article>;
}

export default function MySearchesPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  async function load() { const [items, sightings] = await Promise.all([listMyReports(), getSightings()]); const searches = items.filter((item) => item.tipo_reporte === "perdido"); setReports(searches); setCounts(Object.fromEntries(searches.map((report) => [report.id, sightings.filter((item) => item.report_id === report.id || item.pet_id === report.pet_id).length]))); setLoading(false); }
  async function remove(report: Report) { if (!confirm(`¿Eliminar definitivamente el caso de ${report.pet?.nombre ?? "esta mascota"}?`)) return; await deleteReport(report.id); await load(); }
  useEffect(() => { void load(); }, []);
  if (loading) return <PageSkeleton />;
  return <main className="container py-6"><div className="mb-5"><h1 className="font-serif text-4xl">Mis búsquedas</h1><p className="mt-2 text-[#6B6860]">Búsquedas propias, estado y avistamientos recibidos.</p></div><section className="space-y-3">{reports.length ? reports.map((report) => <SearchCard key={report.id} report={report} sightingCount={counts[report.id] ?? 0} onChanged={load} onDelete={() => void remove(report)} />) : <div className="form-card empty-state text-sm"><span className="text-4xl" aria-hidden="true">🔎</span><strong>Aún no tienes búsquedas.</strong><span>Inicia una búsqueda desde la ficha de una mascota registrada.</span><Button asChild><Link href="/mis-mascotas">Ir a Mis Mascotas</Link></Button></div>}</section></main>;
}

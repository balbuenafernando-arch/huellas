"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listReports, type Report } from "@/lib/sprint14-store";
import { formatDate } from "@/lib/utils";

export default function SuccessStoriesPage() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => { listReports(true).then((items) => setReports(items.filter((report) => report.estado === "reunido"))); }, []);

  return (
    <main className="container py-6">
      <div className="mb-5"><h1 className="font-serif text-4xl">Historias de éxito</h1><p className="mt-2 text-[#6B6860]">Mascotas reunidas con sus familias.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reports.map((report) => <Link key={report.id} href={`/pet/${report.id}`} className="pet-card block">
          <img src={report.foto_url} alt={report.pet?.nombre ?? "Mascota reunida"} className="pet-photo" />
          <div className="space-y-2 p-4"><h2 className="font-bold">{report.pet?.nombre ?? "Mascota reunida"}</h2><p className="text-sm text-[#7A7871]">{report.distrito}</p><p className="text-sm font-semibold text-[#1D9E75]">{report.reunited_at ? formatDate(report.reunited_at) : "Reunida"}</p></div>
        </Link>)}
      </div>
    </main>
  );
}

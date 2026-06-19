"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getPetReportHistory, type ReportHistoryItem } from "@/lib/sprint14-store";
import { formatDate } from "@/lib/utils";

export default function PetHistoryPage() {
  const params = useParams<{ id: string }>();
  const [items, setItems] = useState<ReportHistoryItem[]>([]);

  useEffect(() => { getPetReportHistory(params.id).then(setItems); }, [params.id]);

  return (
    <main className="container py-6">
      <section className="form-card mx-auto max-w-2xl">
        <h1 className="font-serif text-4xl">Historial</h1>
        <p className="mt-2 text-sm text-[#6B6860]">Reportes anteriores de esta mascota.</p>
        <div className="mt-5 space-y-3">
          {items.length === 0 && <p className="text-sm text-[#6B6860]">No hay historial todavía.</p>}
          {items.map((item) => <Link key={item.id} href={`/pet/${item.id}`} className="block rounded-xl border border-black/10 p-4 hover:bg-[#F8F7F4]">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong className="capitalize">{item.tipo_reporte}</strong><span className={`status-pill ${item.estado === "reunido" ? "status-reunido" : "status-perdido"}`}>{item.estado}</span></div>
            <p className="mt-2 text-sm text-[#7A7871]">{formatDate(item.fecha_reporte)} · {item.distrito}</p>
            {item.reunited_at && <p className="mt-1 text-sm text-[#1D9E75]">Reunido: {formatDate(item.reunited_at)}</p>}
          </Link>)}
        </div>
      </section>
    </main>
  );
}

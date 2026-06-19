import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { Pet } from "@/lib/demo-data";
import { formatDate } from "@/lib/utils";

export function StatusPill({ estado }: { estado: Pet["estado"] }) {
  const label = estado === "perdido" ? "Perdido" : estado === "encontrado" ? "Bajo cuidado temporal" : "Reunido";
  return <span className={`status-pill status-${estado}`}>{label}</span>;
}

export function PetCard({ pet, distance, updatedAgo }: { pet: Pet; distance?: string | null; updatedAgo?: string }) {
  return (
    <Link href={`/pet/${pet.id}`} className="pet-card block">
      <div className="relative">
        <img className="pet-photo" src={pet.foto_principal} alt={`${pet.nombre}, ${pet.raza}`} />
        <div className="absolute left-2 top-2 max-w-[calc(100%-1rem)]"><StatusPill estado={pet.estado} /></div>
      </div>
      <div className="space-y-2 p-4">
        <div>
          <h3 className="text-base font-bold">{pet.nombre}</h3>
          <p className="text-sm text-[#7A7871]">{pet.tipo} · {pet.raza}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#7A7871]"><MapPin size={13} className="shrink-0" />{pet.distrito}</div>
        <div className="flex items-center gap-1 text-xs text-[#7A7871]"><CalendarDays size={13} className="shrink-0" />{formatDate(pet.fecha_reporte)}</div>
        {(distance || updatedAgo) && <div className="text-xs font-medium text-[#1D9E75]">{[distance, updatedAgo ? `Actualizado ${updatedAgo.toLowerCase()}` : null].filter(Boolean).join(" · ")}</div>}
        {pet.condiciones_especiales?.length ? <div className="flex flex-wrap gap-1 pt-1">{pet.condiciones_especiales.slice(0, 2).map((condition) => <span key={condition} className="rounded-full bg-[#E1F5EE] px-2 py-1 text-[11px] font-medium text-[#085041]">{condition}</span>)}</div> : null}
      </div>
    </Link>
  );
}

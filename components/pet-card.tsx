import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { Pet } from "@/lib/demo-data";
import { formatDate } from "@/lib/utils";
import { petSearchState, publicCaseCode } from "@/lib/case-display";

export function StatusPill({ estado }: { estado: Pet["estado"] }) {
  const label = estado === "perdido" ? "Búsqueda activa" : estado === "encontrado" ? "Resguardado" : "Reunido";
  return <span className={`status-pill status-${estado}`}>{label}</span>;
}

export function PetCard({ pet, distance, updatedAgo, lastSightingAgo, activity }: { pet: Pet; distance?: string | null; updatedAgo?: string; lastSightingAgo?: string | null; activity?: string | null }) {
  const state = petSearchState(pet, lastSightingAgo ? 1 : 0);
  return (
    <Link href={`/pet/${pet.id}`} className="pet-card block">
      <div className="relative">
        <img className="pet-photo" src={pet.foto_principal} alt={`${pet.nombre}, ${pet.raza}`} loading="lazy" />
        <div className="absolute left-2 top-2 max-w-[calc(100%-1rem)]"><span className={`status-pill ${state.tone}`}>{state.icon} {state.label}</span></div>
      </div>
      <div className="space-y-2 p-4">
        <div>
          <h3 className="text-base font-bold">{pet.nombre}</h3>
          <p className="text-sm text-[#7A7871]">{pet.tipo} · {pet.raza}</p>
          <p className="text-xs font-semibold text-[#1D9E75]">Caso {publicCaseCode(pet.id)}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#7A7871]"><MapPin size={13} className="shrink-0" />{pet.distrito}</div>
        <div className="flex items-center gap-1 text-xs text-[#7A7871]"><CalendarDays size={13} className="shrink-0" />{formatDate(pet.fecha_reporte)}</div>
        {(distance || updatedAgo) && <div className="text-xs font-medium text-[#1D9E75]">{[distance, updatedAgo ? `Actualizado ${updatedAgo.toLowerCase()}` : null].filter(Boolean).join(" · ")}</div>}
        {lastSightingAgo && <div className="text-xs font-semibold text-[#6B4A10]">Último avistamiento {lastSightingAgo.toLowerCase()}</div>}
        {activity && <div className="rounded-lg bg-[#F8F7F4] px-2 py-1 text-xs text-[#6B6860]">{activity}</div>}
        {pet.condiciones_especiales?.length ? <div className="flex flex-wrap gap-1 pt-1">{pet.condiciones_especiales.slice(0, 2).map((condition) => <span key={condition} className="rounded-full bg-[#E1F5EE] px-2 py-1 text-[11px] font-medium text-[#085041]">{condition}</span>)}</div> : null}
      </div>
    </Link>
  );
}

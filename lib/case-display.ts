import type { Pet } from "@/lib/demo-data";
import type { CaseRecord } from "@/lib/cases";

export function publicCaseCode(id: string) {
  const seed = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `H-${String(seed % 9000 + 1000)}`;
}

export function searchState(caseRecord: Pick<CaseRecord, "status" | "createdAt" | "sightings" | "pet">) {
  if (caseRecord.status === "reunido" || caseRecord.pet.estado === "reunido") return { label: "Reunido", icon: "❤️", tone: "status-reunido" };
  if (caseRecord.pet.estado === "encontrado") return { label: "Resguardado", icon: "🔵", tone: "status-encontrado" };
  const latest = caseRecord.sightings.slice().sort((a, b) => new Date(b.visto_en ?? b.creado_en).getTime() - new Date(a.visto_en ?? a.creado_en).getTime())[0];
  if (latest && Date.now() - new Date(latest.visto_en ?? latest.creado_en).getTime() < 86_400_000) return { label: "Avistamiento reciente", icon: "🟡", tone: "status-encontrado" };
  if (Date.now() - new Date(caseRecord.createdAt).getTime() < 86_400_000) return { label: "Recién reportado", icon: "🟢", tone: "status-perdido" };
  return { label: "Búsqueda activa", icon: "🟢", tone: "status-perdido" };
}

export function petSearchState(pet: Pet, sightingsCount = 0) {
  if (pet.estado === "reunido") return { label: "Reunido", icon: "❤️", tone: "status-reunido" };
  if (pet.estado === "encontrado") return { label: "Resguardado", icon: "🔵", tone: "status-encontrado" };
  if (sightingsCount > 0) return { label: "Avistamiento reciente", icon: "🟡", tone: "status-encontrado" };
  if (Date.now() - new Date(pet.fecha_reporte).getTime() < 86_400_000) return { label: "Recién reportado", icon: "🟢", tone: "status-perdido" };
  return { label: "Búsqueda activa", icon: "🟢", tone: "status-perdido" };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, List, LocateFixed, Map, MapPin, Search } from "lucide-react";
import { SecondaryHeader } from "@/components/secondary-header";
import { SearchMap } from "@/components/search-map";
import { Button } from "@/components/ui/button";
import { AuthorBadge } from "@/components/author-badge";
import { listCases, type CaseRecord } from "@/lib/cases";
import { publicCaseCode, searchState } from "@/lib/case-display";
import { defaultPeruCoords, getCurrentLocationDetails } from "@/lib/location";
import { getCurrentUser } from "@/lib/sprint14-store";
import { distanceKm, formatDistance, timeAgo } from "@/lib/utils";

type RadiusFilter = "0.5" | "1" | "2" | "5" | "20";
type SpeciesFilter = "todos" | "perro" | "gato";
type StateFilter = "todos" | "recien" | "visto" | "resguardado";
type SortFilter = "cerca" | "recientes";
type ViewMode = "mapa" | "lista";
type ScopeFilter = "comunidad" | "todos" | "mios";

type CaseWithDistance = {
  caseRecord: CaseRecord;
  distance: number | null;
};

const radiusOptions: Array<{ value: RadiusFilter; label: string }> = [
  { value: "0.5", label: "500 m" },
  { value: "1", label: "1 km" },
  { value: "2", label: "2 km" },
  { value: "5", label: "5 km" },
  { value: "20", label: "20 km" },
];

const stateOptions: Array<{ value: StateFilter; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "recien", label: "Recién reportado" },
  { value: "visto", label: "La vieron hace poco" },
  { value: "resguardado", label: "Resguardado" },
];

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isActiveCase(caseRecord: CaseRecord) {
  return caseRecord.status !== "reunido" && caseRecord.status !== "archivado" && caseRecord.pet.estado !== "reunido";
}

function stateMatches(caseRecord: CaseRecord, filter: StateFilter) {
  if (filter === "todos") return true;
  const state = searchState(caseRecord).label;
  if (filter === "recien") return state === "Recién reportado" || state === "Recien reportado";
  if (filter === "visto") return state === "La vieron hace poco";
  return state === "Resguardado";
}

function CaseSearchCard({ item, selected, currentUserId, onSelect }: { item: CaseWithDistance; selected?: boolean; currentUserId?: string | null; onSelect: () => void }) {
  const { caseRecord, distance } = item;
  const state = searchState(caseRecord);
  const mine = Boolean(currentUserId && caseRecord.ownerId === currentUserId);

  return (
    <Link
      href={`/pet/${caseRecord.id}`}
      onMouseEnter={onSelect}
      onFocus={onSelect}
      className={`block rounded-2xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selected ? "border-[#1D9E75] ring-2 ring-[#E1F5EE]" : "border-black/10"}`}
    >
      <div className="grid grid-cols-[92px_1fr] gap-3">
        <img src={caseRecord.pet.foto_principal} alt={caseRecord.pet.nombre} className="h-24 w-full rounded-xl bg-[#F8F7F4] object-contain" loading="lazy" />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`status-pill ${state.tone}`}>{state.icon} {state.label}</span>
            <span className="text-xs font-bold text-[#1D9E75]">Caso {publicCaseCode(caseRecord.id)}</span>
          </div>
          <h3 className="truncate text-lg font-bold">{caseRecord.pet.nombre}</h3>
          <p className="truncate text-sm text-[#6B6860]">{caseRecord.pet.tipo} - {caseRecord.district}</p>
          <AuthorBadge compact author={{ name: caseRecord.report?.reporter_name, isAnonymous: caseRecord.report?.reporter_is_anonymous, isCurrentUser: mine, publishedAt: caseRecord.createdAt }} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-[#7A7871]">
            <span>{formatDistance(distance) ?? "Ubicación aproximada"}</span>
            <span>{timeAgo(caseRecord.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function FilterPanel({
  species,
  setSpecies,
  stateFilter,
  setStateFilter,
  scope,
  setScope,
  sort,
  setSort,
}: {
  species: SpeciesFilter;
  setSpecies: (value: SpeciesFilter) => void;
  stateFilter: StateFilter;
  setStateFilter: (value: StateFilter) => void;
  scope: ScopeFilter;
  setScope: (value: ScopeFilter) => void;
  sort: SortFilter;
  setSort: (value: SortFilter) => void;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3 shadow-soft">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="label">Casos</span>
          <div className="flex flex-wrap gap-2">
            {[
              ["comunidad", "Comunidad"],
              ["todos", "Todos"],
              ["mios", "Solo mis casos"],
            ].map(([value, label]) => <button key={value} type="button" className={`filter-tab ${scope === value ? "active" : ""}`} onClick={() => setScope(value as ScopeFilter)}>{label}</button>)}
          </div>
        </div>
        <div>
          <span className="label">Especie</span>
          <div className="flex flex-wrap gap-2">
            {(["todos", "perro", "gato"] as SpeciesFilter[]).map((value) => (
              <button key={value} type="button" className={`filter-tab ${species === value ? "active" : ""}`} onClick={() => setSpecies(value)}>{value === "todos" ? "Todos" : value === "perro" ? "Perros" : "Gatos"}</button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Estado</span>
          <div className="flex flex-wrap gap-2">
            {stateOptions.map((option) => <button key={option.value} type="button" className={`filter-tab ${stateFilter === option.value ? "active" : ""}`} onClick={() => setStateFilter(option.value)}>{option.label}</button>)}
          </div>
        </div>
        <div>
          <span className="label">Orden</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`filter-tab ${sort === "cerca" ? "active" : ""}`} onClick={() => setSort("cerca")}>Más cerca</button>
            <button type="button" className={`filter-tab ${sort === "recientes" ? "active" : ""}`} onClick={() => setSort("recientes")}>Más recientes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NearbySearchPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>(defaultPeruCoords());
  const [geoDenied, setGeoDenied] = useState(false);
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState<RadiusFilter>("2");
  const [species, setSpecies] = useState<SpeciesFilter>("todos");
  const [stateFilter, setStateFilter] = useState<StateFilter>("todos");
  const [scope, setScope] = useState<ScopeFilter>("comunidad");
  const [sort, setSort] = useState<SortFilter>("cerca");
  const [view, setView] = useState<ViewMode>("mapa");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [recenterSignal, setRecenterSignal] = useState(0);

  useEffect(() => {
    listCases(false).then((items) => setCases(items.filter(isActiveCase)));
    getCurrentUser().then((user) => setCurrentUserId(user?.id ?? null));
    getCurrentLocationDetails()
      .then((details) => {
        setCoords({ latitude: details.latitude, longitude: details.longitude });
        setGeoDenied(false);
      })
      .catch(() => setGeoDenied(true));
  }, []);

  useEffect(() => {
    function closeFloatingPanels() {
      setView("lista");
      setShowFilters(false);
    }
    window.addEventListener("huella:mobile-menu-open", closeFloatingPanels);
    return () => window.removeEventListener("huella:mobile-menu-open", closeFloatingPanels);
  }, []);

  useEffect(() => {
    setVisibleCount(20);
  }, [query, radius, species, stateFilter, scope, sort]);

  async function useGps() {
    try {
      const details = await getCurrentLocationDetails();
      setCoords({ latitude: details.latitude, longitude: details.longitude });
      setGeoDenied(false);
      setRecenterSignal((value) => value + 1);
    } catch {
      setGeoDenied(true);
    }
  }

  function recenter() {
    if (coords.latitude == null || coords.longitude == null) {
      void useGps();
      return;
    }
    setRecenterSignal((value) => value + 1);
  }

  const filteredCases = useMemo<CaseWithDistance[]>(() => {
    const normalizedQuery = normalize(query.trim());
    const radiusKm = Number(radius);

    return cases
      .map((caseRecord) => ({
        caseRecord,
        distance: distanceKm(coords.latitude, coords.longitude, caseRecord.latitude, caseRecord.longitude),
      }))
      .filter(({ caseRecord, distance }) => {
        const mine = Boolean(currentUserId && caseRecord.ownerId === currentUserId);
        if (scope === "comunidad" && mine) return false;
        if (scope === "mios" && !mine) return false;
        if (species !== "todos" && !normalize(caseRecord.pet.tipo).includes(species)) return false;
        if (!stateMatches(caseRecord, stateFilter)) return false;
        if (distance == null || distance > radiusKm) return false;
        if (!normalizedQuery) return true;
        const haystack = normalize(`${caseRecord.pet.nombre} ${caseRecord.pet.tipo} ${caseRecord.pet.raza} ${caseRecord.district} ${publicCaseCode(caseRecord.id)}`);
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sort === "recientes") return new Date(b.caseRecord.createdAt).getTime() - new Date(a.caseRecord.createdAt).getTime();
        const da = a.distance ?? Number.MAX_SAFE_INTEGER;
        const db = b.distance ?? Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        return new Date(b.caseRecord.createdAt).getTime() - new Date(a.caseRecord.createdAt).getTime();
      });
  }, [cases, coords.latitude, coords.longitude, currentUserId, query, radius, scope, sort, species, stateFilter]);

  const visibleItems = filteredCases.slice(0, visibleCount);
  const mappedCases = visibleItems.map((item) => item.caseRecord);

  const filterPanel = <FilterPanel species={species} setSpecies={setSpecies} stateFilter={stateFilter} setStateFilter={setStateFilter} scope={scope} setScope={setScope} sort={sort} setSort={setSort} />;

  const listContent = (
    <div className="space-y-3">
      {visibleItems.length > 0 ? visibleItems.map((item) => (
        <CaseSearchCard key={item.caseRecord.id} item={item} currentUserId={currentUserId} selected={item.caseRecord.id === selectedId} onSelect={() => setSelectedId(item.caseRecord.id)} />
      )) : (
        <div className="form-card empty-state text-sm">
          <strong>Aún no hay resultados para mostrar.</strong>
          <span>Prueba ampliar el radio, cambiar el filtro de comunidad o buscar por nombre.</span>
        </div>
      )}
      {visibleItems.length < filteredCases.length && (
        <Button type="button" variant="outline" className="w-full" onClick={() => setVisibleCount((value) => value + 20)}>Cargar más casos</Button>
      )}
    </div>
  );

  return (
    <main className="min-h-[calc(100dvh-64px)] pb-[calc(78px+env(safe-area-inset-bottom))] md:pb-0">
      <section className="container py-3 md:hidden">
        <SecondaryHeader title="Buscar cerca de mí" description="Usa GPS, radio, especie y estado. Por defecto verás casos de la comunidad, no tus propias búsquedas." />
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex rounded-xl border border-black/10 bg-white p-1">
            <button type="button" className={`grid min-h-11 min-w-11 place-items-center rounded-lg ${view === "mapa" ? "bg-[#E1F5EE] text-[#085041]" : "text-[#6B6860]"}`} onClick={() => setView("mapa")} aria-label="Ver mapa"><Map size={20} /></button>
            <button type="button" className={`grid min-h-11 min-w-11 place-items-center rounded-lg ${view === "lista" ? "bg-[#E1F5EE] text-[#085041]" : "text-[#6B6860]"}`} onClick={() => setView("lista")} aria-label="Ver lista"><List size={20} /></button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="search-box flex-1"><Search size={18} className="text-[#A8A49C]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o caso" /></div>
          <Button type="button" variant="outline" className="min-w-12 px-3" onClick={() => setShowFilters((value) => !value)} aria-label="Filtros"><Filter size={20} /></Button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {radiusOptions.map((option) => <button key={option.value} type="button" className={`filter-tab shrink-0 ${radius === option.value ? "active" : ""}`} onClick={() => setRadius(option.value)}>{option.label}</button>)}
        </div>
        {geoDenied && <p className="mt-2 text-xs text-[#6B6860]">No pudimos usar tu ubicación. Activa el GPS para ordenar los casos por cercanía real.</p>}
        {showFilters && <div className="mt-3">{filterPanel}</div>}
      </section>

      <section className="container hidden h-[calc(100dvh-64px)] grid-cols-[420px_1fr] gap-4 py-4 md:grid">
        <aside className="flex min-h-0 flex-col gap-3">
          <SecondaryHeader title="Buscar cerca de mí" description="HUELLA usa tu GPS, el radio elegido, la especie y el estado. El código público reconoce un caso sin exponer datos privados." />
          <div className="flex gap-2">
            <div className="search-box flex-1"><Search size={18} className="text-[#A8A49C]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o caso" /></div>
            <Button type="button" variant="outline" onClick={() => setShowFilters((value) => !value)}><Filter size={18} />Filtros</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {radiusOptions.map((option) => <button key={option.value} type="button" className={`filter-tab ${radius === option.value ? "active" : ""}`} onClick={() => setRadius(option.value)}>{option.label}</button>)}
          </div>
          {showFilters && filterPanel}
          <div className="flex items-center justify-between gap-3 text-sm text-[#6B6860]">
            <span>{filteredCases.length} casos activos</span>
            <Button type="button" variant="outline" size="sm" onClick={recenter}><LocateFixed size={16} />Usar mi GPS</Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">{listContent}</div>
        </aside>
        <section className="relative min-h-0">
          <div className="map-panel h-full min-h-[560px]">
            <SearchMap cases={mappedCases} selectedId={selectedId} userCoords={coords} referenceCoords={coords} recenterSignal={recenterSignal} currentUserId={currentUserId} onSelect={setSelectedId} />
          </div>
        </section>
      </section>

      <section className="container md:hidden">
        {view === "lista" ? (
          <div className="pb-4">{listContent}</div>
        ) : (
          <div className="relative h-[calc(100dvh-220px)] min-h-[520px] overflow-hidden rounded-2xl">
            <div className="map-panel h-full min-h-full rounded-2xl">
              <SearchMap cases={mappedCases} selectedId={selectedId} userCoords={coords} referenceCoords={coords} recenterSignal={recenterSignal} currentUserId={currentUserId} onSelect={setSelectedId} />
            </div>
            <Button type="button" variant="outline" className="absolute right-3 top-3 z-[410] bg-white" onClick={recenter}>
              <LocateFixed size={18} />
              <span className="sr-only">Ir a la ubicación</span>
            </Button>
            <div className="absolute inset-x-0 bottom-0 z-[400] max-h-[46%] overflow-y-auto rounded-t-3xl border border-black/10 bg-white/95 p-3 shadow-[0_-12px_28px_rgba(0,0,0,.12)] backdrop-blur">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/20" />
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold">Casos cercanos</h2>
                  <p className="text-xs text-[#6B6860]">{filteredCases.length} búsquedas activas</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setView("lista")}>Ver lista</Button>
              </div>
              {listContent}
            </div>
          </div>
        )}
      </section>

      <div className="container pb-5 pt-3 text-xs text-[#6B6860] md:hidden">
        <p><MapPin size={14} className="inline" /> La ubicación se muestra de forma aproximada para proteger la privacidad.</p>
      </div>
    </main>
  );
}

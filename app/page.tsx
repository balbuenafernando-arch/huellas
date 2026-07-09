"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Heart, Map, Search, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PetCard } from "@/components/pet-card";
import { PetMap } from "@/components/pet-map";
import type { Sighting } from "@/lib/demo-data";
import { getSightings } from "@/lib/pet-store";
import { listCases, listMyCases, type CaseRecord } from "@/lib/cases";
import { buildSmartHomeSections } from "@/lib/search-intelligence";
import { distanceKm, formatDistance, timeAgo } from "@/lib/utils";

export default function HomePage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [radiusKm, setRadiusKm] = useState(10);
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [recentSightings, setRecentSightings] = useState<Sighting[]>([]);
  const [caseNames, setCaseNames] = useState<Record<string, string>>({});
  const [myActiveCases, setMyActiveCases] = useState<CaseRecord[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const onboardingDone = window.sessionStorage.getItem("huella:onboarding-complete");
    if (!onboardingDone) setShowOnboarding(true);
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }));
    Promise.all([getSightings(), listCases(true)]).then(([items, loadedCases]) => {
      const names = Object.fromEntries(loadedCases.flatMap((caseRecord) => [
        [caseRecord.id, caseRecord.pet.nombre],
        ...(caseRecord.petId ? [[caseRecord.petId, caseRecord.pet.nombre]] : []),
      ]));
      setCaseNames(names);
      setRecentSightings(items.slice(0, 4));
    });
    listMyCases().then((cases) => setMyActiveCases(cases.filter((caseRecord) => caseRecord.status !== "reunido" && caseRecord.status !== "archivado")));
  }, []);

  useEffect(() => {
    listCases(false).then((loadedCases) => {
      setCases(loadedCases);
    });
  }, []);

  const smartSections = useMemo(() => buildSmartHomeSections(cases, recentSightings, myActiveCases, coords), [cases, recentSightings, myActiveCases, coords]);
  const visibleCaseRecords = useMemo(() => cases.filter((caseRecord) => {
    if (caseRecord.pet.estado !== "perdido") return false;
    const distance = distanceKm(coords.latitude, coords.longitude, caseRecord.latitude, caseRecord.longitude);
    if (distance !== null && distance > radiusKm) return false;
    const needle = `${caseRecord.pet.nombre} ${caseRecord.pet.raza} ${caseRecord.district} ${caseRecord.pet.tipo}`.toLowerCase();
    return needle.includes(query.toLowerCase());
  }).sort((a, b) => {
    const da = distanceKm(coords.latitude, coords.longitude, a.latitude, a.longitude) ?? Number.MAX_SAFE_INTEGER;
    const db = distanceKm(coords.latitude, coords.longitude, b.latitude, b.longitude) ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }), [cases, coords.latitude, coords.longitude, query, radiusKm]);

  const lostPets = visibleCaseRecords.map((caseRecord) => caseRecord.pet);
  const firstActiveCase = myActiveCases[0];
  function sightingTitle(sighting: Sighting) {
    const linkedName = caseNames[sighting.report_id ?? ""] ?? caseNames[sighting.pet_id ?? ""];
    if (linkedName) return linkedName;
    const shortComment = sighting.comentario?.trim().slice(0, 42);
    if (shortComment) return shortComment;
    const observed = [sighting.especie, sighting.color].filter(Boolean).join(" ");
    return observed || "Mascota";
  }
  function finishOnboarding() {
    window.sessionStorage.setItem("huella:onboarding-complete", "1");
    setShowOnboarding(false);
  }

  return (
    <main>
      {showOnboarding && <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-black/35 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] min-[430px]:place-items-center">
        <section className="max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-soft">
          <h1 className="font-serif text-4xl">Bienvenido a HUELLA</h1>
          <p className="mt-2 text-[#6B6860]">¿Qué deseas hacer?</p>
          <div className="mt-5 grid gap-2">
            <Button asChild onClick={finishOnboarding}><Link href="/mis-mascotas">Registrar mis mascotas</Link></Button>
            <Button asChild variant="outline" onClick={finishOnboarding}><Link href="/reportar-avistamiento">Vi una mascota en la calle</Link></Button>
            <Button asChild variant="outline" onClick={finishOnboarding}><Link href="/">Ver mascotas desaparecidas cerca de mí</Link></Button>
            <Button type="button" variant="outline" onClick={finishOnboarding}>Omitir por ahora</Button>
          </div>
        </section>
      </div>}
      <section className="hero-band py-6 md:py-10">
        <div className="container grid gap-6 md:grid-cols-[1.1fr_.9fr] md:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-[#0F6E56] shadow-sm"><Heart size={15} fill="currentColor" /> Cada pista queda conectada a una búsqueda.</div>
            <div>
              <h1 className="hero-title text-4xl leading-tight md:text-6xl">Huella</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#6B6860] md:text-lg">Centralizamos cada busqueda en un caso vivo para conectar mascotas perdidas con avistamientos cercanos y ayudar a reunirlas mas rapido.</p>
            </div>
            <div className="grid gap-3 max-w-xl min-[390px]:grid-cols-2">
              <Button size="lg" className="min-h-14 w-full text-base" asChild><Link href="/perdi-mi-mascota">🔴 Perdí mi mascota</Link></Button>
              <Button size="lg" className="min-h-14 w-full text-base" variant="outline" asChild><Link href="/reportar-avistamiento">🟡 Vi una mascota</Link></Button>
            </div>
            <div className="grid max-w-xl grid-cols-3 gap-2 text-center text-xs font-semibold text-[#6B6860]">
              <span>Perdí mascota</span><span>Otra persona la ve</span><span>Huellas conecta</span>
            </div>
            <div className="search-box max-w-xl"><Search size={18} className="text-[#A8A49C]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por zona, nombre, raza..." /></div>
            <div className="flex max-w-xl flex-wrap gap-2">
              {[1, 3, 5, 10, 20].map((radius) => <button key={radius} type="button" onClick={() => setRadiusKm(radius)} className={`min-h-11 rounded-full border px-3 text-sm font-semibold ${radiusKm === radius ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]" : "border-black/10 bg-white text-[#6B6860]"}`}>{radius} km</button>)}
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-soft">
            {firstActiveCase ? <>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#712B13]"><Bell size={17} /> Hay novedades sobre {firstActiveCase.pet.nombre ?? "tu mascota"}</div>
              <ul className="space-y-2 text-sm leading-6 text-[#6B6860]">
                <li>Nuevo avistamiento recibido</li>
                <li>Posible coincidencia cerca de {firstActiveCase.district}</li>
                <li>Mascota rescatada similar en revisión</li>
              </ul>
              <div className="mt-4 grid gap-2"><Button className="w-full" asChild><Link href={`/pet/${firstActiveCase.id}`}>Ver caso activo</Link></Button><Button className="w-full" variant="outline" asChild><Link href="/mis-reportes">Mis casos</Link></Button></div>
            </> : <>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#712B13]"><Bell size={17} /> Búsquedas cerca de ti</div>
              <div className="space-y-2 text-sm leading-6 text-[#6B6860]"><p>Vemos casos cercanos y avistamientos recientes para conectarlos automáticamente.</p><p>Si necesitas ayuda, empieza con uno de los dos botones principales.</p></div>
            </>}
          </div>
        </div>
      </section>

      <section className="container py-7">
        <div className="mb-7"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Avistamientos recientes</h2><Link href="/reportar-avistamiento" className="text-sm font-semibold text-[#1D9E75]">avisar</Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{recentSightings.map((sighting) => <Link key={sighting.id} href={`/avistamiento/${sighting.id}`} className="pet-card block p-4"><div className="text-sm font-bold">{sightingTitle(sighting)}</div><p className="mt-2 text-sm text-[#7A7871]">{sighting.distrito ?? sighting.ubicacion}</p><p className="mt-2 line-clamp-3 text-sm">{sighting.comentario}</p></Link>)}</div>{recentSightings.length === 0 && <div className="form-card text-sm text-[#6B6860]">Aun no hay avistamientos recientes. El primero puede ayudar a abrir una pista importante.</div>}</div>
        {smartSections.urgentCases.length > 0 && <div className="mb-7"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Casos urgentes</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{smartSections.urgentCases.map((caseRecord) => <PetCard key={caseRecord.id} pet={caseRecord.pet} distance={formatDistance(distanceKm(coords.latitude, coords.longitude, caseRecord.latitude, caseRecord.longitude))} updatedAgo={timeAgo(caseRecord.updatedAt)} activity="Requiere atención rápida" />)}</div></div>}
        <div id="mascotas-buscadas" className="mb-4 flex scroll-mt-24 flex-col gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
          <h2 className="text-xl font-bold">Mascotas desaparecidas cerca de ti</h2>
          <div className="grid grid-cols-2 gap-2 min-[430px]:w-auto">
            <Button type="button" size="sm" variant={view === "lista" ? "default" : "outline"} onClick={() => setView("lista")}><List size={16} />Lista</Button>
            <Button type="button" size="sm" variant={view === "mapa" ? "default" : "outline"} onClick={() => setView("mapa")}><Map size={16} />Mapa</Button>
          </div>
        </div>
        {view === "lista" ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{visibleCaseRecords.map((caseRecord) => {
          const latest = caseRecord.sightings.slice().sort((a, b) => new Date(b.visto_en ?? b.creado_en).getTime() - new Date(a.visto_en ?? a.creado_en).getTime())[0];
          return <PetCard key={caseRecord.id} pet={caseRecord.pet} distance={formatDistance(distanceKm(coords.latitude, coords.longitude, caseRecord.latitude, caseRecord.longitude))} updatedAgo={timeAgo(caseRecord.updatedAt)} lastSightingAgo={latest ? timeAgo(latest.visto_en ?? latest.creado_en) : null} activity={caseRecord.sightings.length ? `${caseRecord.sightings.length} avistamientos conectados` : "Sin avistamientos todavía"} />;
        })}</div> : <div className="map-panel min-h-[420px]"><PetMap pets={lostPets} /></div>}
        {lostPets.length === 0 && <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_.9fr]">
          <div className="form-card text-sm text-[#6B6860]"><strong className="block text-base text-[#2D2A24]">No hay mascotas reportadas cerca de ti.</strong><p className="mt-2">Eso es una buena noticia. Registra tu mascota para estar preparado si algún día la necesitas.</p><Button className="mt-4" asChild><Link href="/mis-mascotas">Registrar mascota</Link></Button></div>
          <div className="map-panel min-h-[260px]"><PetMap pets={[]} /></div>
        </div>}
      </section>

      <section className="container pb-8">
        <div className="form-card"><h2 className="mb-3 font-bold">Cómo funciona Huella</h2><div className="grid gap-3 text-sm text-[#6B6860] md:grid-cols-3"><p>1. Alguien inicia una búsqueda o comparte un avistamiento.</p><p>2. Huella compara zona, rasgos y momento.</p><p>3. Las pistas llegan al caso correcto sin exponer datos sensibles.</p></div></div>
      </section>
    </main>
  );
}

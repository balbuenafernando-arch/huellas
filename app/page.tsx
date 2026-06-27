"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PetCard } from "@/components/pet-card";
import type { Pet, Sighting } from "@/lib/demo-data";
import { getSightings } from "@/lib/pet-store";
import { listCases, listMyCases, type CaseRecord } from "@/lib/cases";
import { distanceKm, formatDistance, timeAgo } from "@/lib/utils";

export default function HomePage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [sightingCount, setSightingCount] = useState(0);
  const [recentSightings, setRecentSightings] = useState<Sighting[]>([]);
  const [caseNames, setCaseNames] = useState<Record<string, string>>({});
  const [myActiveCases, setMyActiveCases] = useState<CaseRecord[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const onboardingDone = window.localStorage.getItem("huella:onboarding-complete");
    if (!onboardingDone) setShowOnboarding(true);
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }));
    Promise.all([getSightings(), listCases(true)]).then(([items, cases]) => {
      const names = Object.fromEntries(cases.flatMap((caseRecord) => [
        [caseRecord.id, caseRecord.pet.nombre],
        ...(caseRecord.petId ? [[caseRecord.petId, caseRecord.pet.nombre]] : []),
      ]));
      setCaseNames(names);
      setSightingCount(items.length);
      setRecentSightings(items.slice(0, 4));
    });
    listMyCases().then((cases) => setMyActiveCases(cases.filter((caseRecord) => caseRecord.status !== "reunido" && caseRecord.status !== "archivado")));
  }, []);

  useEffect(() => {
    listCases(false).then((cases) => {
      const visibleCases = cases.filter((caseRecord) => caseRecord.pet.estado === "perdido");
      setPets(visibleCases.sort((a, b) => {
        const da = distanceKm(coords.latitude, coords.longitude, a.latitude, a.longitude) ?? Number.MAX_SAFE_INTEGER;
        const db = distanceKm(coords.latitude, coords.longitude, b.latitude, b.longitude) ?? Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }).map((caseRecord) => caseRecord.pet));
    });
  }, [coords.latitude, coords.longitude]);

  const filtered = useMemo(() => pets.filter((pet) => {
    const needle = `${pet.nombre} ${pet.raza} ${pet.distrito} ${pet.tipo}`.toLowerCase();
    return needle.includes(query.toLowerCase());
  }), [pets, query]);

  const lostPets = filtered.filter((pet) => pet.estado === "perdido");
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
    window.localStorage.setItem("huella:onboarding-complete", "1");
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
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-[#0F6E56] shadow-sm"><Heart size={15} fill="currentColor" /> Ayudamos a que la alegría vuelva a casa.</div>
            <div>
              <h1 className="hero-title text-4xl leading-tight md:text-6xl">Huella</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#6B6860] md:text-lg">Centralizamos cada busqueda en un caso vivo para conectar mascotas perdidas con avistamientos cercanos y ayudar a reunirlas mas rapido.</p>
            </div>
            <div className="search-box max-w-xl"><Search size={18} className="text-[#A8A49C]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por zona, nombre, raza..." /></div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-soft">
            <div className="grid gap-2">
              <Button className="w-full" asChild><Link href="/perdi-mi-mascota">🔴 Perdí mi mascota</Link></Button>
              <Button className="w-full" variant="outline" asChild><Link href="/reportar-avistamiento">🟡 Vi una mascota</Link></Button>
            </div>
            {firstActiveCase ? <>
              <div className="mb-3 mt-4 flex items-center gap-2 text-sm font-bold text-[#712B13]"><Bell size={17} /> Hay novedades sobre {firstActiveCase.pet.nombre ?? "tu mascota"}</div>
              <ul className="space-y-2 text-sm leading-6 text-[#6B6860]">
                <li>Nuevo avistamiento recibido</li>
                <li>Posible coincidencia cerca de {firstActiveCase.district}</li>
                <li>Mascota rescatada similar en revisión</li>
              </ul>
              <div className="mt-4 grid gap-2"><Button className="w-full" asChild><Link href={`/pet/${firstActiveCase.id}`}>Ver caso activo</Link></Button><Button className="w-full" variant="outline" asChild><Link href="/mis-reportes">Mis Reportes</Link></Button></div>
            </> : <>
              <div className="mb-3 mt-4 flex items-center gap-2 text-sm font-bold text-[#712B13]"><Bell size={17} /> Búsquedas cerca de ti</div>
              <div className="space-y-2 text-sm leading-6 text-[#6B6860]"><p>Mascotas desaparecidas cerca de ti</p><p>Últimos avistamientos</p><p>Cómo funciona Huella</p></div>
            </>}
          </div>
        </div>
      </section>

      <section className="container py-7">
        <div className="mb-7"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Avistamientos recientes</h2><Link href="/reportar-avistamiento" className="text-sm font-semibold text-[#1D9E75]">avisar</Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{recentSightings.map((sighting) => <Link key={sighting.id} href={`/avistamiento/${sighting.id}`} className="pet-card block p-4"><div className="text-sm font-bold">{sightingTitle(sighting)}</div><p className="mt-2 text-sm text-[#7A7871]">{sighting.distrito ?? sighting.ubicacion}</p><p className="mt-2 line-clamp-3 text-sm">{sighting.comentario}</p></Link>)}</div>{recentSightings.length === 0 && <div className="form-card text-sm text-[#6B6860]">Aun no hay avistamientos recientes. El primero puede ayudar a abrir una pista importante.</div>}</div>
        <div id="mascotas-buscadas" className="mb-4 flex scroll-mt-24 items-center justify-between"><h2 className="text-xl font-bold">Mascotas desaparecidas cerca de ti</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{lostPets.map((pet) => <PetCard key={pet.id} pet={pet} distance={formatDistance(distanceKm(coords.latitude, coords.longitude, pet.latitud, pet.longitud))} updatedAgo={timeAgo(pet.creado_en)} />)}</div>
        {lostPets.length === 0 && <div className="form-card mt-3 text-sm text-[#6B6860]">No hay mascotas desaparecidas cerca por ahora. Si viste una mascota, tu avistamiento puede ayudar a que alguien la encuentre.</div>}
      </section>

      <section className="container pb-8">
        <div className="form-card"><h2 className="mb-3 font-bold">Cómo funciona Huella</h2><div className="grid gap-3 text-sm text-[#6B6860] md:grid-cols-3"><p>1. Creas un caso o reportas un avistamiento.</p><p>2. Huella busca posibles coincidencias por atributos y zona.</p><p>3. El dueño revisa pistas y puede contactar sin exponer datos públicamente.</p></div></div>
      </section>
    </main>
  );
}

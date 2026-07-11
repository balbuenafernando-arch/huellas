"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Heart, PawPrint, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PetCard } from "@/components/pet-card";
import { AuthorBadge } from "@/components/author-badge";
import { listCases, listMyCases, type CaseRecord } from "@/lib/cases";
import { listContactRequests } from "@/lib/contact-requests";
import { getCurrentUser } from "@/lib/sprint14-store";
import { distanceKm, formatDistance, timeAgo } from "@/lib/utils";

function daysBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return "Tiempo no registrado";
  const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
  return days === 1 ? "1 día" : `${days} días`;
}

export default function HomePage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [myActiveCases, setMyActiveCases] = useState<CaseRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingContacts, setPendingContacts] = useState(0);
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }));
    }
    getCurrentUser().then((user) => setCurrentUserId(user?.id ?? null));
    listCases(true).then(setCases);
    listMyCases().then((items) => setMyActiveCases(items.filter((item) => item.status !== "reunido" && item.status !== "archivado")));
  }, []);

  const activeCase = myActiveCases[0];
  const nearbyCases = useMemo(() => cases
    .filter((caseRecord) => caseRecord.pet.estado === "perdido" && caseRecord.status !== "reunido" && caseRecord.status !== "archivado")
    .filter((caseRecord) => !currentUserId || caseRecord.ownerId !== currentUserId)
    .filter((caseRecord) => {
      const needle = `${caseRecord.pet.nombre} ${caseRecord.pet.tipo} ${caseRecord.pet.raza} ${caseRecord.district}`.toLowerCase();
      return needle.includes(query.toLowerCase());
    })
    .sort((a, b) => {
      const da = distanceKm(coords.latitude, coords.longitude, a.latitude, a.longitude) ?? Number.MAX_SAFE_INTEGER;
      const db = distanceKm(coords.latitude, coords.longitude, b.latitude, b.longitude) ?? Number.MAX_SAFE_INTEGER;
      if (da !== db) return da - db;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }), [cases, coords.latitude, coords.longitude, currentUserId, query]);
  const reunitedCases = useMemo(() => cases
    .filter((caseRecord) => caseRecord.status === "reunido" || caseRecord.pet.estado === "reunido")
    .sort((a, b) => new Date(b.reunitedAt ?? b.updatedAt).getTime() - new Date(a.reunitedAt ?? a.updatedAt).getTime())
    .slice(0, 4), [cases]);
  const visibleNearby = nearbyCases.slice(0, 8);
  const activeLastSighting = activeCase?.sightings.slice().sort((a, b) => new Date(b.visto_en ?? b.creado_en).getTime() - new Date(a.visto_en ?? a.creado_en).getTime())[0];
  const activeLastUpdate = activeCase?.timeline.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  useEffect(() => {
    if (!activeCase) {
      setPendingContacts(0);
      return;
    }
    listContactRequests(activeCase.id).then((items) => setPendingContacts(items.filter((item) => item.status === "pendiente").length));
  }, [activeCase]);

  return (
    <main className="container py-5 md:py-8">
      <section className="action-grid">
        <Link href="/perdi-mi-mascota" className="action-card action-card-primary">
          <span className="action-icon"><PawPrint size={24} /></span>
          <span className="action-copy">
            <strong>Perdí mi mascota</strong>
            <small>Completas datos, HUELLA busca coincidencias y publicas solo cuando confirmas.</small>
          </span>
          <ArrowRight size={20} className="action-arrow" />
        </Link>
        <Link href="/reportar-avistamiento" className="action-card action-card-warm">
          <span className="action-icon"><Eye size={24} /></span>
          <span className="action-copy">
            <strong>Vi una mascota perdida</strong>
            <small>Primero revisamos si ya existe una búsqueda activa para asociar tu reporte.</small>
          </span>
          <ArrowRight size={20} className="action-arrow" />
        </Link>
      </section>

      {activeCase && <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Heart size={19} fill="currentColor" className="text-[#D85A30]" />Estado de tu búsqueda</h2>
        <article className="form-card grid gap-4 min-[520px]:grid-cols-[150px_1fr]">
          <img src={activeCase.pet.foto_principal} alt={activeCase.pet.nombre} className="h-44 w-full rounded-xl bg-[#F8F7F4] object-contain min-[520px]:h-full" loading="lazy" />
          <div className="space-y-3">
            <div>
              <h3 className="font-serif text-3xl">{activeCase.pet.nombre}</h3>
              <p className="text-sm font-semibold text-[#1D9E75]">{activeCase.status === "reunido" ? "Mascota reunida" : "Búsqueda activa"}</p>
            </div>
            <AuthorBadge author={{ isCurrentUser: true, publishedAt: activeCase.createdAt }} />
            <p className="text-sm text-[#6B6860]">Último reporte de alguien que la vio: {activeLastSighting ? timeAgo(activeLastSighting.visto_en ?? activeLastSighting.creado_en) : "sin reportes todavía"}</p>
            <p className="text-sm text-[#6B6860]">Última actualización: {activeLastUpdate ? timeAgo(activeLastUpdate.date) : "sin novedades todavía"}</p>
            <p className="text-sm text-[#6B6860]">Tiempo desde publicación: {timeAgo(activeCase.createdAt)}</p>
            {pendingContacts > 0 && <div className="rounded-xl bg-[#FAEEDA] p-3 text-sm font-semibold text-[#6B4A10]">Tienes personas intentando ayudarte. {pendingContacts} solicitud{pendingContacts === 1 ? "" : "es"} pendiente{pendingContacts === 1 ? "" : "s"}.</div>}
            <Button asChild><Link href={`/pet/${activeCase.id}`}>Ver búsqueda</Link></Button>
          </div>
        </article>
      </section>}

      <section id="mascotas-buscadas" className="mt-7">
        <div className="mb-3 flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">Casos cerca de ti</h2>
            <p className="mt-1 text-sm text-[#6B6860]">Mostramos casos de la comunidad. Tus búsquedas aparecen arriba para no mezclarlas.</p>
          </div>
          <div className="flex gap-2">
            <div className="search-box min-[520px]:w-64"><Search size={18} className="text-[#A8A49C]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por zona..." /></div>
            <Button type="button" variant="outline" asChild><Link href="/buscar-cerca">Ver todos</Link></Button>
          </div>
        </div>
        {visibleNearby.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleNearby.map((caseRecord) => <PetCard key={caseRecord.id} pet={caseRecord.pet} distance={formatDistance(distanceKm(coords.latitude, coords.longitude, caseRecord.latitude, caseRecord.longitude))} updatedAgo={timeAgo(caseRecord.createdAt)} lastSightingAgo={caseRecord.sightings[0] ? timeAgo(caseRecord.sightings[0].visto_en ?? caseRecord.sightings[0].creado_en) : null} author={{ name: caseRecord.report?.reporter_name, isAnonymous: caseRecord.report?.reporter_is_anonymous, publishedAt: caseRecord.createdAt }} />)}
        </div> : <div className="form-card empty-state text-sm"><strong>Por ahora no hay casos de la comunidad cerca de ti.</strong><span>Si ves una mascota que podría estar perdida, cuéntanos dónde la viste para ayudar a reunirla con su familia.</span><Button className="mt-2" asChild><Link href="/reportar-avistamiento">Reportar que la vi</Link></Button></div>}
      </section>

      {reunitedCases.length > 0 && <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold"><Heart size={19} fill="currentColor" className="text-[#1D9E75]" />Hoy volvieron a casa</h2>
          <Button variant="outline" asChild><Link href="/historias-de-exito">Ver historias</Link></Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reunitedCases.map((caseRecord) => <Link key={caseRecord.id} href={`/pet/${caseRecord.id}`} className="pet-card block border-[#BFE8DA]">
            <img src={caseRecord.pet.foto_principal} alt={caseRecord.pet.nombre} className="pet-photo" loading="lazy" />
            <div className="space-y-2 p-4">
              <span className="status-pill status-reunido">♥ Mascota reunida</span>
              <h3 className="font-bold">{caseRecord.pet.nombre}</h3>
              <p className="text-sm text-[#7A7871]">{caseRecord.district}</p>
              <p className="text-sm font-semibold text-[#1D9E75]">Volvió en {daysBetween(caseRecord.createdAt, caseRecord.reunitedAt)}</p>
            </div>
          </Link>)}
        </div>
      </section>}
    </main>
  );
}

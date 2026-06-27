"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Edit, MapPin, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PetMap } from "@/components/pet-map";
import { PosterButton, ShareButton } from "@/components/report-actions";
import { SightingForm } from "@/components/sighting-form";
import { ContentReportButton } from "@/components/content-report-button";
import { StatusPill } from "@/components/pet-card";
import type { Pet, Sighting } from "@/lib/demo-data";
import { deletePet, deleteSighting, getPet, getPets, getSightings, isOwnedPet, isOwnedSighting, markPetStatus, updateSighting, updateSightingStatus } from "@/lib/pet-store";
import { getCurrentUser, getReport, incrementReportView, listReports, reportToLegacyPet, type Report, updateReport } from "@/lib/sprint14-store";
import { getCase, type CaseRecord } from "@/lib/cases";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { compressImage, fileToDataUrl } from "@/lib/image-utils";
import { formatDate, normalizeWhatsapp, timeAgo } from "@/lib/utils";

const districtNeighbors: Record<string, string[]> = {
  Miraflores: ["San Isidro", "Surquillo", "Barranco"],
  "San Isidro": ["Miraflores", "Lince", "Jesús María"],
  Surco: ["San Borja", "Chorrillos", "Surquillo"],
  Barranco: ["Miraflores", "Chorrillos", "Surco"],
  "San Borja": ["Surco", "Surquillo", "La Molina"],
  Magdalena: ["Pueblo Libre", "San Isidro", "Jesús María"],
  "Pueblo Libre": ["Magdalena", "Jesús María", "Lince"],
  "La Molina": ["San Borja", "Surco"],
  Lince: ["San Isidro", "Jesús María", "Pueblo Libre"],
  "Jesús María": ["Lince", "Pueblo Libre", "Magdalena"],
  Chorrillos: ["Barranco", "Surco"],
  Surquillo: ["Miraflores", "San Borja", "Surco"],
};

async function uploadOrEncodePhoto(file: File) {
  const compressed = await compressImage(file);
  if (isSupabaseConfigured && supabase) {
    const path = `${crypto.randomUUID()}-${compressed.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
    const { error } = await supabase.storage.from("pets").upload(path, compressed);
    if (!error) return supabase.storage.from("pets").getPublicUrl(path).data.publicUrl;
  }
  return fileToDataUrl(compressed);
}

function SightingEditor({ sighting, onDone }: { sighting: Sighting; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("foto") as File | null;
    let foto = sighting.foto;
    setSaving(true);
    if (file?.size) foto = await uploadOrEncodePhoto(file);
    await updateSighting(sighting.id, {
      comentario: String(form.get("comentario")),
      ubicacion: String(form.get("ubicacion")),
      visto_en: String(form.get("visto_en")) || sighting.visto_en,
      foto,
    });
    setSaving(false);
    setEditing(false);
    onDone();
  }

  async function remove() {
    if (!confirm("¿Estás seguro?\n\nEsta acción no se puede deshacer.")) return;
    await deleteSighting(sighting.id);
    onDone();
  }

  if (!editing) {
    return <div className="mt-3 grid gap-2 min-[390px]:flex"><Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button><Button size="sm" variant="outline" onClick={remove}>Eliminar</Button></div>;
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl bg-[#F8F7F4] p-3">
      <textarea className="textarea min-h-20" name="comentario" defaultValue={sighting.comentario} />
      <input className="field" name="ubicacion" defaultValue={sighting.ubicacion ?? ""} placeholder="Ubicación" />
      <input className="field" name="visto_en" type="datetime-local" defaultValue={sighting.visto_en?.slice(0, 16)} />
      <input className="field" name="foto" type="file" accept="image/*" />
      <div className="grid gap-2 min-[390px]:flex"><Button size="sm" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button><Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button></div>
    </form>
  );
}

export default function PetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [pet, setPet] = useState<Pet>();
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [owned, setOwned] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [report, setReport] = useState<Report | undefined>();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | undefined>();
  const [signedIn, setSignedIn] = useState(false);

  async function load() {
    const foundReport = await getReport(params.id);
    const [legacyPet, reports, legacyPets, items, user, foundCase] = await Promise.all([getPet(params.id), listReports(true), getPets(), getSightings(params.id, foundReport?.pet_id), getCurrentUser(), getCase(params.id)]);
    const found = foundReport ? reportToLegacyPet(foundReport) : legacyPet;
    setReport(foundReport);
    setCaseRecord(foundCase);
    setPet(found);
    setAllPets(reports.length ? reports.map(reportToLegacyPet) : legacyPets);
    setSightings(items);
    setSignedIn(Boolean(user));
    setOwned((foundReport && user ? foundReport.user_id === user.id : false) || isOwnedPet(found));
  }

  useEffect(() => { load(); }, [params.id]);
  useEffect(() => { incrementReportView(params.id); }, [params.id]);

  const photos = useMemo(() => pet ? Array.from(new Set([pet.foto_principal, ...(pet.fotos ?? [])])).slice(0, 5) : [], [pet]);
  const confirmedLast = useMemo(() => sightings.find((item) => (item.estado_avistamiento ?? item.estado) === "confirmado"), [sightings]);
  const latestSighting = useMemo(() => sightings.slice().sort((a, b) => new Date(b.visto_en ?? b.creado_en).getTime() - new Date(a.visto_en ?? a.creado_en).getTime())[0], [sightings]);
  const collaboratorStats = useMemo(() => {
    const sent = sightings.length;
    const confirmed = sightings.filter((item) => (item.estado_avistamiento ?? item.estado) === "confirmado").length;
    return { sent, confirmed, rate: sent ? Math.round((confirmed / sent) * 100) : 0 };
  }, [sightings]);
  const matches = useMemo(() => {
    if (!pet || pet.estado !== "perdido") return [];
    const districts = new Set([pet.distrito, ...(districtNeighbors[pet.distrito] ?? [])]);
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 21;
    return allPets.filter((item) => item.id !== pet.id && item.estado === "encontrado" && districts.has(item.distrito) && new Date(item.fecha_reporte).getTime() >= cutoff).slice(0, 5);
  }, [allPets, pet]);
  const timeline = useMemo(() => {
    if (caseRecord) return caseRecord.timeline;
    if (!pet) return [];
    return [
      { date: pet.creado_en, label: "Caso creado" },
      ...sightings.map((item) => ({ date: item.visto_en ?? item.creado_en, label: (item.estado_avistamiento ?? item.estado) === "confirmado" ? "Avistamiento confirmado" : "Avistamiento recibido" })),
      ...(pet.cerrado_en ? [{ date: pet.cerrado_en, label: "Mascota reunida" }] : []),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [caseRecord, pet, sightings]);

  async function closeReport() {
    if (!pet) return;
    if (report) await updateReport(report.id, { estado: "reunido" });
    else await markPetStatus(pet.id, "reunido");
    await load();
  }

  async function reopenReport() {
    if (!report) return;
    await updateReport(report.id, { estado: "activo" });
    await load();
  }

  async function removeReport() {
    if (!pet) return;
    if (!confirm("¿Estás seguro?\n\nEsta acción no se puede deshacer.")) return;
    await deletePet(pet.id);
    router.push("/");
  }

  if (!pet) return <main className="container py-10"><Link href="/" className="text-[#1D9E75]">Volver</Link><p className="mt-4">Caso no encontrado.</p></main>;

  return (
    <main className="container py-5">
      <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Volver</button>
      <div className="grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
        <section className="space-y-3">
          <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-[#F8F7F4] shadow-soft">
            <img src={photos[selectedPhoto] ?? pet.foto_principal} alt={pet.nombre} className="h-full w-full object-contain" />
          </div>
          <div className="grid grid-cols-3 gap-2 min-[390px]:grid-cols-5">
            {photos.map((foto, index) => <button key={foto} type="button" onClick={() => setSelectedPhoto(index)} className={`h-20 rounded-xl border ${index === selectedPhoto ? "border-[#1D9E75]" : "border-black/10"} bg-[#F8F7F4] p-1`}><img src={foto} alt="Miniatura" className="h-full w-full object-contain" /></button>)}
          </div>
        </section>

        <section className="space-y-4">
          <div className="form-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h1 className="font-serif text-4xl">{pet.nombre}</h1><p className="mt-1 flex items-center gap-2 text-[#7A7871]"><MapPin size={16} />{pet.distrito} · zona aproximada</p></div>
              <StatusPill estado={pet.estado} />
            </div>
            {pet.alias?.length ? <p className="mt-2 text-sm text-[#6B6860]">También responde a: {pet.alias.join(", ")}</p> : null}
            {latestSighting && <p className="mt-2 text-sm font-semibold text-[#1D9E75]">Último avistamiento: {timeAgo(latestSighting.visto_en ?? latestSighting.creado_en)}</p>}
            {owned && report && <p className="mt-2 text-sm font-semibold text-[#6B6860]">{report.views_count ?? 0} visualizaciones</p>}
            {pet.estado === "reunido" && <div className="mt-3 rounded-xl bg-[#E1F5EE] p-3 font-semibold text-[#085041]">🐾 {pet.nombre} volvió a casa {pet.cerrado_en ? `· ${formatDate(pet.cerrado_en)}` : ""}</div>}
            <p className="mt-4 leading-7 text-[#4D4A43]">{pet.descripcion}</p>
            <div className="mt-4 grid gap-2 min-[390px]:flex min-[390px]:flex-wrap">
              {signedIn && normalizeWhatsapp(pet.whatsapp) ? <Button asChild><a href={`https://wa.me/${normalizeWhatsapp(pet.whatsapp)}?text=${encodeURIComponent("Hola. Creo haber visto una mascota que coincide con tu aviso.")}`} target="_blank" rel="noreferrer"><MessageCircle size={18} />Contactar</a></Button> : <Button asChild variant="outline"><Link href="/auth"><MessageCircle size={18} />Inicia sesión para contactar</Link></Button>}
              <ShareButton pet={pet} />
              <PosterButton pet={pet} />
            </div>
            <div className="mt-3"><ContentReportButton targetType="pet" targetId={pet.id} /></div>
            {owned && <div className="mt-3 grid gap-2 border-t border-black/10 pt-3 min-[390px]:flex min-[390px]:flex-wrap">
              <Button variant="outline" asChild><Link href={`/pet/${pet.id}/editar`}><Edit size={17} />Editar caso</Link></Button>
              {report?.pet_id && <Button variant="outline" asChild><Link href={`/mascota/${report.pet_id}/historial`}>Historial</Link></Button>}
              {pet.estado !== "reunido" && <Button variant="outline" onClick={closeReport}><CheckCircle size={17} />Mascota encontrada</Button>}
              {report?.estado === "reunido" && <Button variant="outline" onClick={reopenReport}>Reabrir búsqueda</Button>}
              <Button variant="outline" onClick={removeReport}><Trash2 size={17} />Eliminar caso</Button>
            </div>}
          </div>

          {(pet.caracteristicas?.length || pet.condiciones_especiales?.length || pet.caracteristicas_personalizadas || pet.recompensa_ofrecida) && <div className="form-card space-y-3">
            {pet.recompensa_ofrecida && <div className="rounded-xl bg-[#FAEEDA] p-3 font-semibold text-[#6B4A10]">Recompensa ofrecida {pet.recompensa_monto ? `S/ ${pet.recompensa_monto}` : ""}</div>}
            <h2 className="font-bold">Características distintivas</h2>
            <div className="flex flex-wrap gap-2">{pet.caracteristicas?.map((feature) => <span key={feature} className="rounded-full bg-[#F1EFE8] px-3 py-1 text-sm">{feature}</span>)}</div>
            {pet.condiciones_especiales?.length ? <><h3 className="text-sm font-bold">Condiciones especiales</h3><div className="flex flex-wrap gap-2">{pet.condiciones_especiales.map((condition) => <span key={condition} className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm text-[#085041]">{condition}</span>)}</div></> : null}
            {pet.caracteristicas_personalizadas && <p className="text-sm text-[#6B6860]">{pet.caracteristicas_personalizadas}</p>}
          </div>}
        </section>
      </div>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <div className="space-y-4">
          {confirmedLast && <article className="form-card border-[#9FE1CB] bg-[#FAFDFB]">
            <h2 className="mb-2 font-bold text-[#085041]">Último avistamiento confirmado</h2>
            {confirmedLast.foto && <img src={confirmedLast.foto} alt="Avistamiento confirmado" className="mb-3 max-h-72 w-full rounded-xl object-contain bg-white" />}
            <p>{confirmedLast.comentario}</p>
            <p className="mt-2 text-sm font-semibold text-[#085041]">{formatDate(confirmedLast.visto_en ?? confirmedLast.creado_en)} · {new Date(confirmedLast.visto_en ?? confirmedLast.creado_en).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</p>
            <p className="text-sm text-[#7A7871]">{confirmedLast.ubicacion ?? "Ubicación no indicada"}</p>
          </article>}

          {matches.length > 0 && <div className="form-card"><h2 className="mb-3 font-bold">Posibles coincidencias cercanas</h2><div className="space-y-3">{matches.map((match) => <Link key={match.id} href={`/pet/${match.id}`} className="flex gap-3 rounded-xl border border-black/10 p-2 hover:bg-[#F8F7F4]"><img src={match.foto_principal} alt={match.nombre} className="h-16 w-16 rounded-lg object-contain bg-[#F8F7F4]" /><div><div className="font-semibold">{match.nombre}</div><div className="text-sm text-[#7A7871]">{match.raza} · {match.distrito}</div></div></Link>)}</div></div>}

          <div className="form-card"><h2 className="mb-3 font-bold">Timeline del caso</h2><div className="space-y-3">{timeline.map((item) => <div key={`${item.date}-${item.label}`} className="flex gap-3"><div className="w-16 text-sm font-semibold text-[#1D9E75]">{formatDate(item.date).slice(0, 6)}</div><div className="border-l border-black/10 pl-3 text-sm">{item.label}</div></div>)}</div></div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold">Avistamientos ({sightings.length})</h2>
            {sightings.map((s) => {
              const estado = s.estado_avistamiento ?? s.estado ?? "pendiente";
              return <article key={s.id} className="form-card">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">{owned && <span className={`status-pill ${estado === "confirmado" ? "status-encontrado" : estado === "descartado" ? "status-reunido" : "status-perdido"}`}>{estado}</span>}<span className="text-sm text-[#7A7871]">{formatDate(s.visto_en ?? s.creado_en)}</span></div>
                <Link href={`/avistamiento/${s.id}`} className="block rounded-xl hover:bg-[#F8F7F4]">
                  {s.foto && <img src={s.foto} alt="Foto de avistamiento" className="mb-3 max-h-64 w-full rounded-xl object-contain bg-[#F8F7F4]" />}
                  <p className="leading-6">{s.comentario}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-[#7A7871]"><MapPin size={15} />{s.ubicacion}</p>
                </Link>
                {s.feedback_reportero && isOwnedSighting(s) && <div className="mt-3 rounded-xl bg-[#E1F5EE] p-3 text-sm font-semibold text-[#085041]">{s.feedback_reportero}</div>}
                {owned && <div className="mt-3 rounded-xl bg-[#F8F7F4] p-3 text-sm"><strong>Revisión:</strong> {(s.estado_revision ?? "por_revisar").replaceAll("_", " ")}</div>}
                {owned && estado === "pendiente" && <div className="mt-3 grid gap-2 min-[390px]:flex"><Button size="sm" onClick={() => updateSightingStatus(s.id, pet.id, "confirmado").then(load)}>✓ Sí era mi mascota</Button><Button size="sm" variant="outline" onClick={() => updateSightingStatus(s.id, pet.id, "descartado").then(load)}>✗ No era mi mascota</Button></div>}
                {isOwnedSighting(s) && <SightingEditor sighting={s} onDone={load} />}
              </article>;
            })}
          </div>
        </div>

        <aside className="space-y-5">
          <SightingForm petId={report?.pet_id ?? pet.id} reportId={report?.id ?? null} onCreated={load} />
          <div className="form-card"><h2 className="mb-2 font-bold">Perfil de colaborador</h2><div className="grid grid-cols-1 gap-2 text-center text-sm min-[390px]:grid-cols-3"><div><strong className="block text-xl">{collaboratorStats.sent}</strong>enviados</div><div><strong className="block text-xl">{collaboratorStats.confirmed}</strong>confirmados</div><div><strong className="block text-xl">{collaboratorStats.rate}%</strong>confirmación</div></div></div>
          <div className="map-panel"><PetMap pets={allPets.length ? allPets : [pet]} selectedId={pet.id} /></div>
        </aside>
      </section>
    </main>
  );
}


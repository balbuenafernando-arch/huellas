"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Download, Edit, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PetMap } from "@/components/pet-map";
import { PosterButton, ShareButton } from "@/components/report-actions";
import { SightingForm } from "@/components/sighting-form";
import { ContentReportButton } from "@/components/content-report-button";
import { SafeContact } from "@/components/safe-contact";
import { StatusPill } from "@/components/pet-card";
import type { Pet, Sighting } from "@/lib/demo-data";
import { deletePet, deleteSighting, getPet, getPets, getSightings, isOwnedPet, isOwnedSighting, markPetStatus, updateSighting, updateSightingStatus } from "@/lib/pet-store";
import { getCurrentUser, getReport, incrementReportView, listReports, reportToLegacyPet, type Report, updateReport } from "@/lib/sprint14-store";
import { getCase, type CaseRecord } from "@/lib/cases";
import { uploadImage } from "@/services/image-service";
import { formatDate, timeAgo } from "@/lib/utils";
import { publicCaseCode, searchState } from "@/lib/case-display";
import { saveReunionStory } from "@/lib/reunion-stories";
import { listContactRequests, type ContactRequest } from "@/lib/contact-requests";
import { FriendlyError, DetailSkeleton } from "@/components/feedback";
import { friendlyError, validateImageFile } from "@/lib/form-validation";

const reviewLabels: Record<string, string> = {
  por_revisar: "Por revisar",
  posible_coincidencia: "Posible coincidencia",
  no_era: "Descartado",
  alerta_falsa: "Alerta falsa",
  informacion_enganosa: "Información engañosa",
  encontrada: "Ayudó a encontrarla",
};

type TimelineItem = {
  id: string;
  date: string;
  label: string;
  type: string;
  icon: string;
  location?: string | null;
  sightingId?: string;
  source?: string;
};

function SightingEditor({ sighting, onDone }: { sighting: Sighting; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("foto") as File | null;
    let foto = sighting.foto;
    if (saving) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (file?.size) foto = await uploadImage(file);
      await updateSighting(sighting.id, {
        comentario: String(form.get("comentario")).slice(0, 1000),
        ubicacion: String(form.get("ubicacion")).slice(0, 240),
        visto_en: String(form.get("visto_en")) || sighting.visto_en,
        foto,
      });
      setEditing(false);
      onDone();
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos guardar el avistamiento. Inténtalo otra vez."));
    } finally {
      setSaving(false);
    }
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
      {error && <FriendlyError message={error} />}
      <textarea className="textarea min-h-20" name="comentario" maxLength={1000} defaultValue={sighting.comentario} />
      <input className="field" name="ubicacion" maxLength={240} defaultValue={sighting.ubicacion ?? ""} placeholder="Ubicación" />
      <input className="field" name="visto_en" type="datetime-local" defaultValue={sighting.visto_en?.slice(0, 16)} />
      <input className="field" name="foto" type="file" accept="image/*" />
      <div className="grid gap-2 min-[390px]:flex"><Button size="sm" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button><Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button></div>
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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [report, setReport] = useState<Report | undefined>();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | undefined>();
  const [signedIn, setSignedIn] = useState(false);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [reunionPhoto, setReunionPhoto] = useState<File | null>(null);
  const [reunionPreview, setReunionPreview] = useState<string | null>(null);

  async function load() {
    try {
      const foundReport = await getReport(params.id);
      const [legacyPet, reports, legacyPets, items, user, foundCase, requests] = await Promise.all([getPet(params.id), listReports(true), getPets(), getSightings(params.id, foundReport?.pet_id), getCurrentUser(), getCase(params.id), listContactRequests(params.id)]);
      const found = foundReport ? reportToLegacyPet(foundReport) : legacyPet;
      setReport(foundReport);
      setCaseRecord(foundCase);
      setPet(found);
      setAllPets(reports.length ? reports.map(reportToLegacyPet) : legacyPets);
      setSightings(items);
      setSignedIn(Boolean(user));
      setContactRequests(requests);
      setOwned((foundReport && user ? foundReport.user_id === user.id : false) || isOwnedPet(found));
      setPageError("");
    } catch (caught) {
      setPageError(friendlyError(caught, "No pudimos cargar el caso. Revisa tu conexión e inténtalo otra vez."));
    }
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
    const caseZone = pet.distrito.trim().toLowerCase();
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 21;
    return allPets.filter((item) => item.id !== pet.id && item.estado === "encontrado" && item.distrito.trim().toLowerCase() === caseZone && new Date(item.fecha_reporte).getTime() >= cutoff).slice(0, 5);
  }, [allPets, pet]);
  const timeline = useMemo<TimelineItem[]>(() => {
    const base = caseRecord?.timeline?.map((item, index) => ({
      id: `case-${caseRecord.id}-${index}-${item.date}`,
      date: item.date,
      label: item.label,
      type: "Caso",
      icon: "●",
      location: caseRecord.district,
      source: caseRecord.report?.reporter_name ? `Abierto por ${caseRecord.report.reporter_name}` : undefined,
    })) ?? (pet ? [{
      id: `pet-${pet.id}-created`,
      date: pet.creado_en,
      label: "Caso creado",
      type: "Caso",
      icon: "●",
      location: pet.distrito,
      source: pet.owner_token ? undefined : "Abierto por usuario registrado",
    }] : []);
    const sightingEvents = sightings.map((item) => ({
      id: `sighting-${item.id}`,
      date: item.visto_en ?? item.creado_en,
      label: (item.estado_avistamiento ?? item.estado) === "confirmado" ? "Avistamiento confirmado" : "Avistamiento recibido",
      type: "Avistamiento",
      icon: "●",
      location: item.ubicacion ?? item.distrito,
      sightingId: item.id,
      source: item.reporter_name ? `${item.reporter_name}` : "Usuario anónimo",
    }));
    const contactEvents = contactRequests.map((item) => ({
      id: `contact-${item.id}-${item.status}`,
      date: item.updated_at ?? item.created_at,
      label: item.status === "autorizada" ? "Contacto autorizado" : item.status === "rechazada" ? "Solicitud de contacto rechazada" : "Solicitud de contacto recibida",
      type: "Contacto seguro",
      icon: "●",
      location: null,
    }));
    const closedAt = report?.reunited_at ?? pet?.cerrado_en ?? caseRecord?.reunitedAt;
    const reunionEvents = closedAt ? [{
      id: `reunion-${report?.id ?? pet?.id ?? caseRecord?.id}`,
      date: closedAt,
      label: "Mascota reunida",
      type: "Reencuentro",
      icon: "●",
      location: pet?.distrito ?? report?.distrito ?? caseRecord?.district,
    }] : [];
    const regularEvents = [...base, ...sightingEvents, ...contactEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return [...regularEvents, ...reunionEvents];
  }, [caseRecord, contactRequests, pet, report, sightings]);
  const currentState = caseRecord ? searchState(caseRecord) : null;
  const isClosed = pet?.estado === "reunido" || report?.estado === "reunido" || caseRecord?.status === "reunido";
  const closedDate = report?.reunited_at ?? pet?.cerrado_en ?? null;
  const helperCount = Math.max(1, new Set(sightings.map((item) => item.owner_token ?? item.id)).size + (owned ? 1 : 0));
  const pendingContactRequests = contactRequests.filter((request) => request.status === "pendiente").length;

  async function closeReport(story?: string) {
    if (!pet) return;
    if (closing) return;
    setClosing(true);
    setPageError("");
    let photoUrl: string | null = null;
    try {
      const validationError = validateImageFile(reunionPhoto);
      if (validationError) {
        setPageError(validationError);
        return;
      }
      if (reunionPhoto) photoUrl = await uploadImage(reunionPhoto);
      const reunitedAt = new Date().toISOString();
      const durationDays = Math.max(1, Math.round((new Date(reunitedAt).getTime() - new Date(report?.created_at ?? pet.creado_en).getTime()) / 86_400_000));
      await saveReunionStory(report?.id ?? pet.id, {
        reportId: report?.id ?? pet.id,
        petId: report?.pet_id ?? pet.id,
        ownerId: report?.user_id ?? pet.owner_token ?? null,
        photoUrl,
        story: story?.trim().slice(0, 200) || null,
        reunitedAt,
        searchDurationDays: durationDays,
      });
      if (report) await updateReport(report.id, { estado: "reunido" });
      else await markPetStatus(pet.id, "reunido");
      setShowCloseConfirm(false);
      await load();
    } catch (caught) {
      setPageError(friendlyError(caught, "No pudimos cerrar la búsqueda. Inténtalo otra vez."));
    } finally {
      setClosing(false);
    }
  }

  async function handleReunionPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setReunionPhoto(file);
    setReunionPreview(file ? URL.createObjectURL(file) : null);
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

  if (!pet && !pageError) return <DetailSkeleton />;
  if (!pet) return <main className="container py-10"><Link href="/" className="text-[#1D9E75]">Volver</Link><div className="mt-4"><FriendlyError message={pageError || "Caso no encontrado."} onRetry={load} /></div></main>;

  return (
    <main className="container py-5">
      <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Volver</button>
      {pageError && <div className="mb-4"><FriendlyError message={pageError} onRetry={load} /></div>}
      {viewerOpen && <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/75 p-3" onClick={() => setViewerOpen(false)}>
        <section className="w-full max-w-4xl rounded-2xl bg-white p-3" onClick={(event) => event.stopPropagation()}>
          <img src={photos[selectedPhoto] ?? pet.foto_principal} alt={pet.nombre} className="max-h-[78vh] w-full rounded-xl object-contain" />
          <div className="mt-3 grid gap-2 min-[390px]:flex min-[390px]:justify-end">
            {owned && <Button type="button" variant="outline" asChild><a href={photos[selectedPhoto] ?? pet.foto_principal} download={`${pet.nombre}-huella.jpg`} target="_blank" rel="noreferrer"><Download size={18} />Descargar foto</a></Button>}
            <Button type="button" onClick={() => setViewerOpen(false)}>Cerrar preview</Button>
          </div>
        </section>
      </div>}
      <div className="grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
        <section className="space-y-3">
          <button type="button" onClick={() => setViewerOpen(true)} className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl bg-[#F8F7F4] shadow-soft">
            <img src={photos[selectedPhoto] ?? pet.foto_principal} alt={pet.nombre} className="h-full w-full object-contain" />
          </button>
          <div className="grid grid-cols-3 gap-2 min-[390px]:grid-cols-5">
            {photos.map((foto, index) => <button key={foto} type="button" onClick={() => setSelectedPhoto(index)} className={`h-20 rounded-xl border ${index === selectedPhoto ? "border-[#1D9E75]" : "border-black/10"} bg-[#F8F7F4] p-1`}><img src={foto} alt="Miniatura" className="h-full w-full object-contain" /></button>)}
          </div>
        </section>

        <section className="space-y-4">
          <div className="form-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h1 className="font-serif text-4xl">{pet.nombre}</h1><p className="mt-1 flex items-center gap-2 text-[#7A7871]"><MapPin size={16} />{pet.distrito} · zona aproximada</p></div>
              {currentState ? <span className={`status-pill ${currentState.tone}`}>{currentState.icon} {currentState.label}</span> : <StatusPill estado={pet.estado} />}
            </div>
            <div className="mt-3 grid gap-2 text-sm min-[430px]:grid-cols-3">
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-[#1D9E75]">Caso {publicCaseCode(report?.id ?? pet.id)}</strong>Identificador público</div>
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-[#1D9E75]">❤️ {helperCount}</strong>personas ayudando</div>
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-[#1D9E75]">{sightings.length}</strong>avistamientos registrados</div>
            </div>
            {pet.alias?.length ? <p className="mt-2 text-sm text-[#6B6860]">También responde a: {pet.alias.join(", ")}</p> : null}
            {report?.reporter_name && <p className="mt-2 text-sm font-semibold text-[#6B6860]">Caso abierto por {report.reporter_name}</p>}
            {latestSighting && <p className="mt-2 text-sm font-semibold text-[#1D9E75]">Último avistamiento: {timeAgo(latestSighting.visto_en ?? latestSighting.creado_en)}</p>}
            <p className="mt-2 text-sm text-[#6B6860]">Última actualización: {timeAgo(report?.updated_at ?? caseRecord?.updatedAt ?? pet.creado_en)}</p>
            {owned && pendingContactRequests > 0 && <div className="mt-3 rounded-2xl bg-[#FAEEDA] p-4 text-sm text-[#6B4A10]"><strong className="block">❤️ Tienes personas intentando ayudarte.</strong><p>{pendingContactRequests} solicitud{pendingContactRequests === 1 ? "" : "es"} pendiente{pendingContactRequests === 1 ? "" : "s"}.</p><a href="#solicitudes-contacto" className="mt-2 inline-block font-bold text-[#6B4A10]">Revisar solicitudes</a></div>}
            {owned && report && <p className="mt-2 text-sm font-semibold text-[#6B6860]">{report.views_count ?? 0} visualizaciones</p>}
            {isClosed && <div className="mt-3 rounded-2xl bg-[#E1F5EE] p-5 text-[#085041]"><div className="text-3xl">❤</div><h2 className="mt-2 text-xl font-bold">{pet.nombre} volvió a casa</h2><p className="mt-1 font-semibold">Nos alegra saber que esta búsqueda terminó en reencuentro.</p><p className="mt-1 text-sm">Gracias por confiar en HUELLA{closedDate ? ` · ${formatDate(closedDate)}` : ""}.</p></div>}
            <p className="mt-4 leading-7 text-[#4D4A43]">{pet.descripcion}</p>
            <div className="mt-4 grid gap-2 min-[390px]:flex min-[390px]:flex-wrap">
              <ShareButton pet={pet} label={isClosed ? "Compartir historia" : "Compartir búsqueda"} />
              {!isClosed && <PosterButton pet={pet} />}
            </div>
            {!isClosed && <div id="solicitudes-contacto" className="mt-4 scroll-mt-24">
              <SafeContact
                reportId={report?.id ?? pet.id}
                petId={report?.pet_id ?? pet.id}
                ownerId={report?.user_id ?? pet.owner_token ?? null}
                petName={pet.nombre}
                whatsapp={pet.whatsapp}
                owned={owned}
                signedIn={signedIn}
              />
            </div>}
            <div className="mt-3"><ContentReportButton targetType="pet" targetId={pet.id} /></div>
            {owned && <div className="mt-3 grid gap-2 border-t border-black/10 pt-3 min-[390px]:flex min-[390px]:flex-wrap">
              <Button variant="outline" asChild><Link href={`/pet/${pet.id}/editar`}><Edit size={17} />Editar caso</Link></Button>
              {report?.pet_id && <Button variant="outline" asChild><Link href={`/mascota/${report.pet_id}/historial`}>Historial</Link></Button>}
              {!isClosed && <Button variant="outline" onClick={() => setShowCloseConfirm(true)}><CheckCircle size={17} />❤️ Mi mascota volvió a casa</Button>}
              {report?.estado === "reunido" && <Button variant="outline" onClick={reopenReport}>Reabrir búsqueda</Button>}
              <Button variant="outline" onClick={removeReport}><Trash2 size={17} />Eliminar caso</Button>
            </div>}
          </div>

          {showCloseConfirm && <form className="form-card space-y-4" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            closeReport(String(form.get("historia") || ""));
          }}>
            <h2 className="font-bold">Confirmar reencuentro</h2>
            <p className="text-sm leading-6 text-[#6B6860]">La foto y la historia podrán aparecer en la sección Reencuentros para dar esperanza a otras familias.</p>
            <div><label className="label">Fotografía del reencuentro opcional</label><input className="field" type="file" accept="image/*" onChange={handleReunionPhoto} /></div>
            {reunionPreview && <img src={reunionPreview} alt="Reencuentro" className="max-h-64 w-full rounded-xl bg-[#F8F7F4] object-contain" />}
            <div><label className="label">Breve historia opcional</label><textarea className="textarea min-h-20" name="historia" maxLength={200} placeholder="Máximo 200 caracteres" /></div>
            <div className="grid gap-2 min-[390px]:flex">
              <Button type="submit" disabled={closing}>{closing ? "Cerrando búsqueda..." : "Cerrar búsqueda"}</Button>
              <Button type="button" variant="outline" disabled={closing} onClick={() => setShowCloseConfirm(false)}>Ahora no</Button>
            </div>
          </form>}

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

          {!isClosed && matches.length > 0 && <div className="form-card"><h2 className="mb-3 font-bold">Posibles coincidencias cercanas</h2><div className="space-y-3">{matches.map((match) => <Link key={match.id} href={`/pet/${match.id}`} className="flex gap-3 rounded-xl border border-black/10 p-2 hover:bg-[#F8F7F4]"><img src={match.foto_principal} alt={match.nombre} className="h-16 w-16 rounded-lg object-contain bg-[#F8F7F4]" /><div><div className="font-semibold">{match.nombre}</div><div className="text-sm text-[#7A7871]">{match.raza} · {match.distrito}</div></div></Link>)}</div></div>}

          <div className="form-card"><h2 className="mb-3 font-bold">Timeline del caso</h2><div className="space-y-3">{timeline.map((item) => {
            const content = <><div className="w-20 text-sm font-semibold text-[#1D9E75]">{new Date(item.date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</div><div className="border-l border-black/10 pl-3 text-sm"><span className="mr-2 text-[#1D9E75]" aria-hidden="true">{item.icon}</span><strong>{item.type}</strong><div>{item.label}</div><div className="text-xs text-[#7A7871]">{formatDate(item.date)}{item.location ? ` · ${item.location}` : ""}</div>{item.source && <div className="text-xs font-semibold text-[#6B6860]">{item.source}</div>}</div></>;
            return item.sightingId ? <Link key={item.id} href={`/avistamiento/${item.sightingId}`} className="flex gap-3 rounded-xl p-1 hover:bg-[#F8F7F4]">{content}</Link> : <div key={item.id} className="flex gap-3">{content}</div>;
          })}</div></div>

          {sightings.length > 0 && <div className="form-card space-y-3">
            <h2 className="font-bold">Actividad reciente</h2>
            <div className="grid gap-2 text-sm min-[430px]:grid-cols-2">
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-[#085041]">Último avistamiento</strong>{(latestSighting?.ubicacion ?? latestSighting?.distrito) || "Ubicación aproximada"}</div>
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-[#085041]">Cantidad de avistamientos</strong>{sightings.length}</div>
              {latestSighting && <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-[#085041]">Fecha</strong>{formatDate(latestSighting.visto_en ?? latestSighting.creado_en)}</div>}
              {latestSighting && <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-[#085041]">Hora</strong>{new Date(latestSighting.visto_en ?? latestSighting.creado_en).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</div>}
            </div>
            <p className="text-sm font-semibold text-[#085041]">Última actualización: {timeAgo(report?.updated_at ?? caseRecord?.updatedAt ?? latestSighting?.creado_en ?? pet.creado_en)}</p>
            <Button size="sm" variant="outline" asChild><a href="#mapa-del-caso">Ver historial en el mapa</a></Button>
          </div>}

          <div className="space-y-3">
            <h2 className="text-xl font-bold">Avistamientos ({sightings.length})</h2>
            {sightings.map((s) => {
              const estado = s.estado_avistamiento ?? s.estado ?? "pendiente";
              return <article key={s.id} className="form-card">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">{owned && <span className={`status-pill ${estado === "confirmado" ? "status-encontrado" : estado === "descartado" ? "status-reunido" : "status-perdido"}`}>{estado}</span>}<span className="text-sm text-[#7A7871]">{formatDate(s.visto_en ?? s.creado_en)}</span></div>
                <Link href={`/avistamiento/${s.id}`} className="block rounded-xl hover:bg-[#F8F7F4]">
                  {s.foto && <img src={s.foto} alt="Foto de avistamiento" className="mb-3 max-h-64 w-full rounded-xl object-contain bg-[#F8F7F4]" />}
                  <p className="text-sm font-bold text-[#085041]">{s.reporter_name ?? "Usuario anónimo"} · {new Date(s.visto_en ?? s.creado_en).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="leading-6">{s.comentario}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-[#7A7871]"><MapPin size={15} />{s.ubicacion}</p>
                </Link>
                {s.feedback_reportero && isOwnedSighting(s) && <div className="mt-3 rounded-xl bg-[#E1F5EE] p-3 text-sm font-semibold text-[#085041]">{s.feedback_reportero}</div>}
                {owned && <div className="mt-3 rounded-xl bg-[#F8F7F4] p-3 text-sm"><strong>Revisión:</strong> {reviewLabels[s.estado_revision ?? "por_revisar"] ?? "Por revisar"}</div>}
                {owned && estado === "pendiente" && <div className="mt-3 grid gap-2 min-[390px]:flex"><Button size="sm" onClick={() => updateSightingStatus(s.id, pet.id, "confirmado").then(load)}>Confirmar avistamiento</Button><Button size="sm" variant="outline" onClick={() => updateSightingStatus(s.id, pet.id, "descartado").then(load)}>Descartar avistamiento</Button></div>}
                {isOwnedSighting(s) && <SightingEditor sighting={s} onDone={load} />}
              </article>;
            })}
          </div>
        </div>

        <aside className="space-y-5">
          {!isClosed && <SightingForm petId={report?.pet_id ?? pet.id} reportId={report?.id ?? null} onCreated={load} />}
          {collaboratorStats.sent > 0 && <div className="form-card"><h2 className="mb-2 font-bold">Perfil de colaborador</h2><div className="grid grid-cols-1 gap-2 text-center text-sm min-[390px]:grid-cols-3"><div><strong className="block text-xl">{collaboratorStats.sent}</strong>enviados</div><div><strong className="block text-xl">{collaboratorStats.confirmed}</strong>confirmados</div><div><strong className="block text-xl">{collaboratorStats.rate}%</strong>confirmación</div></div></div>}
          <div id="mapa-del-caso" className="map-panel scroll-mt-24"><PetMap pets={allPets.length ? allPets : [pet]} selectedId={pet.id} sightings={sightings} /></div>
        </aside>
      </section>
    </main>
  );
}


"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Download, Edit, MapPin, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PetMap } from "@/components/pet-map";
import { PosterButton, ShareButton } from "@/components/report-actions";
import { PhotoUploader } from "@/components/photo-uploader";
import { ContentReportButton } from "@/components/content-report-button";
import { SafeContact } from "@/components/safe-contact";
import { StatusPill } from "@/components/pet-card";
import type { Pet, Sighting } from "@/lib/demo-data";
import { deletePet, deleteSighting, getPet, getPets, getSightingPrivatePhone, getSightings, isOwnedPet, isOwnedSighting, markPetStatus, updateSighting, updateSightingPrivatePhone, updateSightingStatus } from "@/lib/pet-store";
import { deleteReport, getCurrentUser, getReport, incrementReportView, listReports, reportToLegacyPet, type Report, updateReport } from "@/lib/sprint14-store";
import { buildCaseTimeline, getCase, type CaseRecord } from "@/lib/cases";
import { uploadImage } from "@/services/image-service";
import { distanceKm, formatDate, timeAgo } from "@/lib/utils";
import { publicCaseCode, searchState } from "@/lib/case-display";
import { saveReunionStory } from "@/lib/reunion-stories";
import { listContactRequests, type ContactRequest } from "@/lib/contact-requests";
import { FriendlyError, DetailSkeleton } from "@/components/feedback";
import { friendlyError, validateImageFiles } from "@/lib/form-validation";

function touchDistance(touches: { [index: number]: { clientX: number; clientY: number } }) {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function SightingEditor({ sighting, onDone }: { sighting: Sighting; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [retainedPhotoUrls, setRetainedPhotoUrls] = useState<string[]>([]);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!editing) return;
    getSightingPrivatePhone(sighting.id).then((value) => setPhone(value ?? "")).catch(() => setPhone(""));
  }, [editing, sighting.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (saving) return;
    const validationError = validateImageFiles(photoFiles);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const uploaded = await Promise.all(photoFiles.slice(0, 3).map((file) => uploadImage(file)));
      const fotos = [...retainedPhotoUrls, ...uploaded].slice(0, 3);
      await updateSighting(sighting.id, {
        reporter_name: String(form.get("nombre_reportante") || "").trim() || "Usuario HUELLA",
        especie: String(form.get("especie") || ""),
        tamano: String(form.get("tamano") || ""),
        color: String(form.get("color") || ""),
        comentario: String(form.get("comentario")).slice(0, 1000),
        ubicacion: String(form.get("ubicacion")).slice(0, 240),
        visto_en: String(form.get("visto_en")) || sighting.visto_en,
        situacion: String(form.get("situacion") || "solo_la_vi") as Sighting["situacion"],
        foto: fotos[0] ?? null,
        fotos,
      });
      await updateSightingPrivatePhone(sighting.id, phone);
      setEditing(false);
      onDone();
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo guardar el avistamiento. Inténtalo otra vez."));
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
      <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Tu nombre (opcional)</label><input className="field" name="nombre_reportante" maxLength={120} defaultValue={sighting.reporter_name ?? ""} /></div><div><label className="label">Tu teléfono (opcional)</label><input className="field" type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} /></div></div>
      <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Especie *</label><select className="select" name="especie" defaultValue={sighting.especie ?? "Perro"}><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div><div><label className="label">Tamaño *</label><select className="select" name="tamano" defaultValue={sighting.tamano ?? "Mediano"}><option value="Pequeno">Pequeño</option><option>Mediano</option><option>Grande</option></select></div></div>
      <div><label className="label">Color *</label><input required className="field" name="color" maxLength={120} defaultValue={sighting.color ?? ""} /></div>
      <div><label className="label">Ubicación *</label><input required className="field" name="ubicacion" maxLength={240} defaultValue={sighting.ubicacion ?? ""} /></div>
      <div><label className="label">Fecha y hora *</label><input required className="field" name="visto_en" type="datetime-local" defaultValue={sighting.visto_en?.slice(0, 16)} /></div>
      <div><label className="label">Situación observada</label><select className="select" name="situacion" defaultValue={sighting.situacion ?? "solo_la_vi"}><option value="solo_la_vi">La vi</option><option value="la_tengo_conmigo">La tengo resguardada</option><option value="herida">Está herida</option><option value="siguiendo">La estoy siguiendo</option></select></div>
      <div><label className="label">Descripción del avistamiento *</label><textarea required className="textarea min-h-20" name="comentario" maxLength={1000} defaultValue={sighting.comentario} /></div>
      <div><label className="label">Fotografías (máximo 3)</label>
      <PhotoUploader initialUrls={(sighting.fotos?.length ? sighting.fotos : [sighting.foto].filter((url): url is string => Boolean(url))).slice(0, 3)} disabled={saving} onChange={(files, urls) => { setPhotoFiles(files); setRetainedPhotoUrls(urls); }} onError={setError} />
      </div>
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
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerOffset, setViewerOffset] = useState({ x: 0, y: 0 });
  const [report, setReport] = useState<Report | undefined>();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | undefined>();
  const [signedIn, setSignedIn] = useState(false);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [privatePhones, setPrivatePhones] = useState<Record<string, string>>({});
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [reunionPhotos, setReunionPhotos] = useState<File[]>([]);
  const viewerTouchRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number; time: number; distance?: number; zoom?: number } | null>(null);

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
      const ownsCase = (foundReport && user ? foundReport.user_id === user.id : false) || isOwnedPet(found);
      setOwned(ownsCase);
      if (ownsCase) {
        const phoneEntries = await Promise.all(items.map(async (item) => [item.id, await getSightingPrivatePhone(item.id)] as const));
        setPrivatePhones(Object.fromEntries(phoneEntries.filter((entry): entry is readonly [string, string] => Boolean(entry[1]))));
      } else {
        setPrivatePhones({});
      }
      setPageError("");
    } catch (caught) {
      setPageError(friendlyError(caught, "No se pudo cargar el caso. Revisa tu conexión e inténtalo otra vez."));
    }
  }

  useEffect(() => { load(); }, [params.id]);
  useEffect(() => { incrementReportView(params.id); }, [params.id]);
  useEffect(() => {
    if (!photoViewerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPhotoViewerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [photoViewerOpen]);

  const photos = useMemo(() => pet ? Array.from(new Set([pet.foto_principal, ...(pet.fotos ?? [])])).slice(0, 3) : [], [pet]);
  const matches = useMemo(() => {
    if (!pet || pet.estado !== "perdido") return [];
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 21;
    return allPets
      .map((item) => ({ item, distance: distanceKm(pet.latitud, pet.longitud, item.latitud, item.longitud) }))
      .filter(({ item, distance }) => item.id !== pet.id && item.estado === "encontrado" && distance !== null && distance <= 12 && new Date(item.fecha_reporte).getTime() >= cutoff)
      .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
      .map(({ item }) => item)
      .slice(0, 5);
  }, [allPets, pet]);
  const currentState = caseRecord ? searchState(caseRecord) : null;
  const isClosed = pet?.estado === "reunido" || report?.estado === "reunido" || caseRecord?.status === "reunido";
  useEffect(() => {
    if (!owned || isClosed || new URLSearchParams(window.location.search).get("cerrar") !== "1") return;
    setShowCloseConfirm(true);
    window.history.replaceState(null, "", window.location.pathname);
  }, [isClosed, owned]);
  const closedDate = report?.reunited_at ?? pet?.cerrado_en ?? null;
  const helperCount = Math.max(1, new Set(sightings.map((item) => item.owner_token ?? item.id)).size + (owned ? 1 : 0));
  const pendingContactRequests = contactRequests.filter((request) => request.status === "pendiente").length;
  const urgentSighting = useMemo(() => sightings
    .filter((item) => item.situacion === "la_tengo_conmigo" || item.situacion === "herida")
    .sort((a, b) => new Date(b.visto_en ?? b.creado_en).getTime() - new Date(a.visto_en ?? a.creado_en).getTime())[0], [sightings]);
  const activityEvents = useMemo(() => {
    if (!pet) return [];
    const caseEvents = buildCaseTimeline({
      id: report?.id ?? pet.id,
      pet,
      createdAt: report?.created_at ?? pet.creado_en,
      reunitedAt: closedDate,
      sightings,
    }).map((event) => ({ id: event.id, date: event.date, label: event.label, description: event.description, person: event.person }));
    const events = [
      ...caseEvents,
      ...contactRequests.flatMap((request) => [
        { id: `${request.id}-requested`, date: request.created_at, label: "Contacto solicitado", description: request.message || "Se solicitó contactar al propietario.", person: request.requester_name },
        ...(request.status !== "pendiente" ? [{ id: `${request.id}-${request.status}`, date: request.updated_at, label: request.status === "autorizada" ? "Contacto autorizado" : "Contacto rechazado", description: request.status === "autorizada" ? "El propietario autorizó compartir su contacto." : "El propietario rechazó la solicitud de contacto.", person: "Propietario" }] : []),
      ]),
    ];
    return Array.from(new Map(events.filter((event) => event.date).map((event) => [event.id, event])).values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [closedDate, contactRequests, pet, report?.created_at, report?.id, sightings]);
  const recognitionDetails = pet?.caracteristicas_personalizadas?.trim() || pet?.caracteristicas?.filter(Boolean).join(". ") || "";
  const rawCareNotes = report?.descripcion?.trim() || pet?.observaciones?.trim() || "";
  const careNotes = rawCareNotes.includes("Cuidados a tener en cuenta:") ? rawCareNotes.split("Cuidados a tener en cuenta:").pop()?.trim() || "" : rawCareNotes === recognitionDetails ? "" : rawCareNotes;
  const caseDescription = report?.pet
    ? [report.pet.especie, report.pet.raza, report.pet.color].filter(Boolean).join(" · ")
    : pet?.descripcion?.trim() && pet.descripcion.trim() !== careNotes && pet.descripcion.trim() !== recognitionDetails
      ? pet.descripcion.trim()
      : "";
  const petDetails = [
    pet?.edad ? ["Edad", pet.edad] : null,
    pet?.esterilizado !== null && pet?.esterilizado !== undefined ? ["Esterilizado", pet.esterilizado ? "Si" : "No"] : null,
    pet?.salud ? ["Condicion medica", pet.salud] : null,
    careNotes ? ["A tener en cuenta sobre la mascota", careNotes] : null,
  ].filter(Boolean) as Array<[string, string]>;

  async function closeReport(story?: string) {
    if (!pet) return;
    if (closing) return;
    setClosing(true);
    setPageError("");
    let photoUrls: string[] = [];
    try {
      const validationError = validateImageFiles(reunionPhotos);
      if (validationError) {
        setPageError(validationError);
        return;
      }
      if (reunionPhotos.length) photoUrls = await Promise.all(reunionPhotos.slice(0, 3).map((file) => uploadImage(file)));
      const reunitedAt = new Date().toISOString();
      const durationDays = Math.max(1, Math.round((new Date(reunitedAt).getTime() - new Date(report?.created_at ?? pet.creado_en).getTime()) / 86_400_000));
      await saveReunionStory(report?.id ?? pet.id, {
        reportId: report?.id ?? pet.id,
        petId: report?.pet_id ?? pet.id,
        ownerId: report?.user_id ?? pet.owner_token ?? null,
        photoUrl: photoUrls[0] ?? null,
        photoUrls,
        story: story?.trim().slice(0, 200) || null,
        reunitedAt,
        searchDurationDays: durationDays,
      });
      if (report) await updateReport(report.id, { estado: "reunido" });
      else await markPetStatus(pet.id, "reunido");
      setShowCloseConfirm(false);
      await load();
    } catch (caught) {
      setPageError(friendlyError(caught, "No se pudo cerrar la búsqueda. Inténtalo otra vez."));
    } finally {
      setClosing(false);
    }
  }

  async function reopenReport() {
    if (!report) return;
    if (!confirm("¿Quieres reabrir esta búsqueda? Volverá a aceptar avistamientos de la comunidad.")) return;
    await updateReport(report.id, { estado: "activo" });
    await load();
  }

  function openViewer(index = selectedPhoto) {
    setSelectedPhoto(index);
    setViewerZoom(1);
    setViewerOffset({ x: 0, y: 0 });
    setPhotoViewerOpen(true);
  }

  function moveViewer(delta: number) {
    setSelectedPhoto((index) => (photos.length ? (index + delta + photos.length) % photos.length : index));
    setViewerZoom(1);
    setViewerOffset({ x: 0, y: 0 });
  }

  async function removeReport() {
    if (!pet) return;
    if (!confirm("¿Estás seguro?\n\nEsta acción no se puede deshacer.")) return;
    try {
      if (report) await deleteReport(report.id);
      else await deletePet(pet.id);
      router.push("/mis-busquedas");
      router.refresh();
    } catch (caught) {
      setPageError(friendlyError(caught, "No se pudo eliminar el caso. Inténtalo otra vez."));
    }
  }

  if (!pet && !pageError) return <DetailSkeleton />;
  if (!pet) return <main className="container py-10"><Link href="/" className="text-[#1D9E75]">Volver</Link><div className="mt-4"><FriendlyError message={pageError || "Caso no encontrado."} onRetry={load} /></div></main>;

  return (
    <main className="container py-5">
      <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Volver</button>
      {pageError && <div className="mb-4"><FriendlyError message={pageError} onRetry={load} /></div>}
      <div className="grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
        <section className="space-y-3">
          <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-[#F8F7F4] shadow-soft">
            <button type="button" className="h-full w-full" onClick={() => openViewer()}>
              <img src={photos[selectedPhoto] ?? pet.foto_principal} alt={pet.nombre} className="h-full w-full object-contain" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 min-[390px]:grid-cols-5">
            {photos.map((foto, index) => <button key={foto} type="button" onClick={() => setSelectedPhoto(index)} onDoubleClick={() => openViewer(index)} className={`h-20 rounded-xl border ${index === selectedPhoto ? "border-[#1D9E75]" : "border-black/10"} bg-[#F8F7F4] p-1`}><img src={foto} alt="Miniatura" className="h-full w-full object-contain" /></button>)}
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
            {report && <p className="mt-2 text-sm text-[#6B6860]">Caso creado por: <strong>{report.reporter_is_anonymous ? "Usuario anónimo" : report.reporter_name || "Usuario HUELLA"}</strong></p>}
            <p className="mt-2 text-sm text-[#6B6860]">Última actualización: {timeAgo(report?.updated_at ?? caseRecord?.updatedAt ?? pet.creado_en)}</p>
            {owned && urgentSighting && <div className="mt-3 rounded-2xl border border-[#D85A30]/20 bg-[#FFF7F3] p-4 text-[#712B13]"><strong className="block text-lg">⚠️ Avistamiento prioritario</strong><p className="mt-1 font-bold">{urgentSighting.situacion === "la_tengo_conmigo" ? "La tiene consigo" : "La vio herida"}</p><p className="mt-1 text-sm">Reportado {timeAgo(urgentSighting.visto_en ?? urgentSighting.creado_en)} por {urgentSighting.reporter_name || "Usuario HUELLA"}.</p>{privatePhones[urgentSighting.id] ? <Button className="mt-3" asChild><a href={`tel:${privatePhones[urgentSighting.id]}`}>Contactar ahora</a></Button> : <Button className="mt-3" asChild><a href={`#avistamiento-${urgentSighting.id}`}>Revisar datos de contacto</a></Button>}</div>}
            {owned && pendingContactRequests > 0 && <div className="mt-3 rounded-2xl bg-[#FAEEDA] p-4 text-sm text-[#6B4A10]"><strong className="block">❤️ Tienes personas intentando ayudarte.</strong><p>{pendingContactRequests} solicitud{pendingContactRequests === 1 ? "" : "es"} pendiente{pendingContactRequests === 1 ? "" : "s"}.</p><a href="#solicitudes-contacto" className="mt-2 inline-block font-bold text-[#6B4A10]">Revisar solicitudes</a></div>}
            {owned && report && <p className="mt-2 text-sm font-semibold text-[#6B6860]">{report.views_count ?? 0} visualizaciones</p>}
            {isClosed && <div className="mt-3 rounded-2xl bg-[#E1F5EE] p-5 text-[#085041]"><div className="text-3xl">❤</div><h2 className="mt-2 text-xl font-bold">Mascota reunida</h2><p className="mt-1 font-semibold">Caso cerrado. {pet.nombre} volvió a casa.</p><p className="mt-1 text-sm">Gracias por confiar en HUELLA{closedDate ? ` · ${formatDate(closedDate)}` : ""}.</p></div>}
            <div className="mt-4 grid gap-2 min-[390px]:flex min-[390px]:flex-wrap">
              {!isClosed && !owned && <Button asChild><Link href={`/reportar-avistamiento?caseId=${report?.id ?? pet.id}`}>Reportar avistamiento</Link></Button>}
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
              <Button variant="outline" asChild><Link href={isClosed ? `/historias-de-exito/${report?.id ?? pet.id}/editar` : `/pet/${pet.id}/editar`}><Edit size={17} />{isClosed ? "Editar historia" : "Editar caso"}</Link></Button>
              {report?.pet_id && <Button variant="outline" asChild><Link href={`/mascota/${report.pet_id}/historial`}>Ver historial completo del caso</Link></Button>}
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
            <div className="text-4xl" aria-hidden="true">🎉</div>
            <h2 className="font-serif text-2xl">¡Nos alegra saber que tu mascota volvió contigo!</h2>
            <p className="text-sm leading-6 text-[#6B6860]">Comparte este momento para dar esperanza a otras familias.</p>
            <div><span className="mb-1 block text-xs font-bold text-[#1D9E75]">PASO 2</span><label className="label">Fotografías del reencuentro (opcional, máximo 3)</label><PhotoUploader disabled={closing} onChange={(files) => setReunionPhotos(files)} onError={setPageError} /></div>
            <div><span className="mb-1 block text-xs font-bold text-[#1D9E75]">PASO 3</span><label className="label">Cuéntanos brevemente cómo ocurrió el reencuentro (opcional)</label><textarea className="textarea min-h-20" name="historia" maxLength={200} placeholder="Ejemplo: Un vecino reconoció el afiche y nos llamó." /></div>
            <div className="grid gap-2 min-[390px]:flex">
              <Button type="submit" disabled={closing}>{closing ? "Guardando reencuentro..." : "Guardar y cerrar búsqueda"}</Button>
              <Button type="button" variant="outline" disabled={closing} onClick={() => setShowCloseConfirm(false)}>Ahora no</Button>
            </div>
          </form>}

          <div className="form-card space-y-3">
            <h2 className="font-serif text-2xl">Información del caso</h2>
            {caseDescription && <div><h3 className="font-bold">Descripción</h3><p className="mt-1 text-sm leading-6 text-[#6B6860]">{caseDescription}</p></div>}
            <div className="grid gap-2 text-sm min-[430px]:grid-cols-2">
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-[#085041]">Última ubicación</strong>{pet.direccion || pet.distrito}</div>
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-[#085041]">Fecha</strong>{formatDate(pet.fecha_reporte)}</div>
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-[#085041]">Hora</strong>{new Date(pet.fecha_reporte).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</div>
              {pet.recompensa_ofrecida && <div className="rounded-xl bg-[#FAEEDA] p-3 text-[#6B4A10]"><strong className="block">Recompensa</strong>{pet.recompensa_texto || (pet.recompensa_monto ? `S/ ${pet.recompensa_monto}` : "Ofrecida")}</div>}
            </div>
            {petDetails.length > 0 && <div className="grid gap-2 text-sm min-[430px]:grid-cols-2">{petDetails.map(([label, value]) => <div key={label} className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-[#085041]">{label}</strong>{value}</div>)}</div>}
            {recognitionDetails && <><h2 className="font-bold">¿Qué hace fácil reconocer a esta mascota?</h2><p className="text-sm text-[#6B6860]">{recognitionDetails}</p></>}
            {pet.condiciones_especiales?.length ? <><h3 className="text-sm font-bold">Condiciones especiales</h3><div className="flex flex-wrap gap-2">{pet.condiciones_especiales.map((condition) => <span key={condition} className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm text-[#085041]">{condition}</span>)}</div></> : null}
          </div>
        </section>
      </div>

      {photoViewerOpen && <div
        className="fixed inset-0 z-[1300] grid place-items-center overflow-hidden bg-black/85 p-3"
        onClick={(event) => {
          if (event.target === event.currentTarget) setPhotoViewerOpen(false);
        }}
        onWheel={(event) => setViewerZoom((value) => Math.min(4, Math.max(1, value + (event.deltaY < 0 ? 0.16 : -0.16))))}
        onDoubleClick={() => setViewerZoom((value) => value > 1 ? 1 : 2)}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          viewerTouchRef.current = { x: touch.clientX, y: touch.clientY, offsetX: viewerOffset.x, offsetY: viewerOffset.y, time: Date.now(), distance: event.touches.length === 2 ? touchDistance(event.touches) : undefined, zoom: viewerZoom };
        }}
        onTouchMove={(event) => {
          const start = viewerTouchRef.current;
          const touch = event.touches[0];
          if (!start || !touch) return;
          if (event.touches.length === 2 && start.distance && start.zoom) {
            setViewerZoom(Math.min(4, Math.max(1, start.zoom * (touchDistance(event.touches) / start.distance))));
            return;
          }
          if (viewerZoom > 1) setViewerOffset({ x: start.offsetX + touch.clientX - start.x, y: start.offsetY + touch.clientY - start.y });
        }}
        onTouchEnd={(event) => {
          const start = viewerTouchRef.current;
          if (!start) return;
          const changed = event.changedTouches[0];
          const dx = changed.clientX - start.x;
          const dy = changed.clientY - start.y;
          if (viewerZoom === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) moveViewer(dx < 0 ? 1 : -1);
          if (Date.now() - start.time < 240 && Math.abs(dx) < 8 && Math.abs(dy) < 8) setViewerZoom((value) => value > 1 ? 1 : 2);
          viewerTouchRef.current = null;
        }}
      >
        <div className="absolute right-3 top-3 z-[2] flex gap-2">
          {owned && <Button type="button" variant="outline" asChild><a href={photos[selectedPhoto] ?? pet.foto_principal} download><Download size={18} />Descargar fotografía</a></Button>}
          <Button type="button" variant="outline" onClick={() => setPhotoViewerOpen(false)}><X size={18} />Cerrar</Button>
        </div>
        {photos.length > 1 && <div className="absolute inset-x-3 bottom-4 z-[1] flex justify-between gap-3"><Button type="button" variant="outline" onClick={() => moveViewer(-1)}>Anterior</Button><Button type="button" variant="outline" onClick={() => moveViewer(1)}>Siguiente</Button></div>}
        <img src={photos[selectedPhoto] ?? pet.foto_principal} alt={pet.nombre} className="max-h-[88dvh] max-w-[96vw] touch-none select-none object-contain" draggable={false} onClick={(event) => event.stopPropagation()} style={{ transform: `translate(${viewerOffset.x}px, ${viewerOffset.y}px) scale(${viewerZoom})` }} />
      </div>}

      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <div className="space-y-4">
          {!isClosed && matches.length > 0 && <div className="form-card"><h2 className="mb-3 font-bold">Posibles coincidencias cercanas</h2><div className="space-y-3">{matches.map((match) => <Link key={match.id} href={`/pet/${match.id}`} className="flex gap-3 rounded-xl border border-black/10 p-2 hover:bg-[#F8F7F4]"><img src={match.foto_principal} alt={match.nombre} className="h-16 w-16 rounded-lg object-contain bg-[#F8F7F4]" /><div><div className="font-semibold">{match.nombre}</div><div className="text-sm text-[#7A7871]">{match.raza} · {match.distrito}</div></div></Link>)}</div></div>}

          {!isClosed && <div className="space-y-3">
            <h2 className="text-xl font-bold">Avistamientos ({sightings.length})</h2>
            {sightings.map((s) => {
              const estado = s.estado_avistamiento ?? s.estado ?? "pendiente";
              return <article id={`avistamiento-${s.id}`} key={s.id} className="form-card scroll-mt-24">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">{owned && <span className={`status-pill ${estado === "confirmado" ? "status-encontrado" : estado === "descartado" ? "status-reunido" : "status-perdido"}`}>{estado}</span>}<span className="text-sm text-[#7A7871]">{formatDate(s.visto_en ?? s.creado_en)}</span></div>
                <Link href={`/avistamiento/${s.id}`} className="block rounded-xl hover:bg-[#F8F7F4]">
                  {(s.fotos?.length ? s.fotos : [s.foto].filter((url): url is string => Boolean(url))).length > 0 && <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{(s.fotos?.length ? s.fotos : [s.foto].filter((url): url is string => Boolean(url))).slice(0, 3).map((url) => <img key={url} src={url} alt="Foto de avistamiento" className="h-44 w-full rounded-xl bg-[#F8F7F4] object-contain" />)}</div>}
                  <p className="leading-6">{s.comentario}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-[#7A7871]"><MapPin size={15} />{s.ubicacion}</p>
                </Link>
                {s.feedback_reportero && isOwnedSighting(s) && <div className="mt-3 rounded-xl bg-[#E1F5EE] p-3 text-sm font-semibold text-[#085041]">{s.feedback_reportero}</div>}
                {owned && estado === "pendiente" && <div className="mt-3 grid gap-2 min-[390px]:flex"><Button size="sm" onClick={() => updateSightingStatus(s.id, pet.id, "confirmado").then(load)}>Confirmar avistamiento</Button><Button size="sm" variant="outline" onClick={() => updateSightingStatus(s.id, pet.id, "descartado").then(load)}>Descartar avistamiento</Button></div>}
                {isOwnedSighting(s) && <SightingEditor sighting={s} onDone={load} />}
              </article>;
            })}
          </div>}
        </div>

        <aside className="space-y-5">
          <p className="text-sm font-semibold text-[#6B6860]">Recorrido registrado según los avistamientos reportados</p>
          <div id="mapa-del-caso" className="map-panel scroll-mt-24"><PetMap pets={allPets.length ? allPets : [pet]} selectedId={pet.id} sightings={sightings} /></div>
          <details className="form-card"><summary className="cursor-pointer font-bold">Ver historial de actividad</summary><ol className="mt-4 space-y-4 border-l-2 border-[#9FE1CB] pl-4">{activityEvents.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-[#1D9E75]" /><p className="font-semibold">{event.label}</p><p className="mt-1 text-sm text-[#4D4A43]">{event.description}</p><p className="mt-1 text-sm text-[#6B6860]">{formatDate(event.date)} · {new Date(event.date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</p><p className="text-sm text-[#7A7871]">Persona: {event.person}</p></li>)}</ol></details>
        </aside>
      </section>
    </main>
  );
}

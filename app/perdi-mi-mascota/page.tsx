"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoUploader } from "@/components/photo-uploader";
import { LocationPicker } from "@/components/location-picker";
import { createRegisteredPet, createReport, listMyRegisteredPets, reportToLegacyPet, type RegisteredPet, uploadMascotaImage } from "@/lib/sprint14-store";
import { PosterButton, ShareButton } from "@/components/report-actions";
import type { Pet } from "@/lib/demo-data";
import { findLostPetMatches } from "@/lib/matching";
import type { CaseMatch } from "@/lib/cases";
import { formatDistance } from "@/lib/utils";
import { defaultPeruCoords, getCurrentLocationDetails, locationDetailsFromCoords, searchPeruLocation, type LocationDetails } from "@/lib/location";
import { FriendlyError } from "@/components/feedback";
import { friendlyError, operationError, requiredText, validateImageFiles, validateNotFuture } from "@/lib/form-validation";
import { isValidPeruWhatsapp, normalizePeruWhatsapp } from "@/lib/whatsapp";

const fallbackPhoto = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80";
type FieldErrors = Record<string, string>;

function locationLabel(details: LocationDetails | null, address: string) {
  return details?.district || details?.province || details?.department || address || "Punto marcado en el mapa";
}

function petOptionLabel(pet: RegisteredPet) {
  return [pet.nombre, [pet.especie, pet.sexo].filter(Boolean).join(" · ")].filter(Boolean).join(" - ");
}

export default function EmergencyReportPage() {
  const [coords, setCoords] = useState(defaultPeruCoords());
  const [address, setAddress] = useState("");
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);
  const [registeredPets, setRegisteredPets] = useState<RegisteredPet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [usingGps, setUsingGps] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [publishedPet, setPublishedPet] = useState<Pet | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [retainedPhotoUrls, setRetainedPhotoUrls] = useState<string[]>([]);
  const [matches, setMatches] = useState<CaseMatch[]>([]);
  const [matchCriteria, setMatchCriteria] = useState<Parameters<typeof findLostPetMatches>[0] | null>(null);
  const [searchingPublishedMatches, setSearchingPublishedMatches] = useState(false);
  const [reviewedMatches, setReviewedMatches] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    listMyRegisteredPets().then((items) => {
      setRegisteredPets(items);
      const requestedPetId = new URLSearchParams(window.location.search).get("petId");
      setSelectedPetId(items.some((item) => item.id === requestedPetId) ? requestedPetId! : items[0]?.id ?? "");
    });
  }, []);

  function resetMatchReview() {
    setReviewedMatches(false);
    setMatches([]);
  }

  async function useLocation() {
    if (usingGps) return;
    setUsingGps(true);
    setError("");
    try {
      const details = await getCurrentLocationDetails();
      setCoords({ latitude: details.latitude, longitude: details.longitude });
      setLocationDetails(details);
      setAddress(details.address);
      resetMatchReview();
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo obtener tu ubicación. Escribe una referencia cercana."));
    } finally {
      setUsingGps(false);
    }
  }

  async function searchAddress() {
    if (!address.trim() || searchingAddress) return;
    setSearchingAddress(true);
    setError("");
    try {
      const details = await searchPeruLocation(address);
      if (!details) {
        setError("No se encontró esa dirección. Prueba con una referencia más específica.");
        return;
      }
      setCoords({ latitude: details.latitude, longitude: details.longitude });
      setLocationDetails(details);
      setAddress(details.address);
      resetMatchReview();
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo buscar esa dirección. Prueba con otra referencia."));
    } finally {
      setSearchingAddress(false);
    }
  }

  async function movePin(latitude: number, longitude: number) {
    setCoords({ latitude, longitude });
    resetMatchReview();
    try {
      const details = await locationDetailsFromCoords(latitude, longitude);
      setLocationDetails(details);
      setAddress(details.address);
    } catch {
      setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    }
  }

  function showFieldErrors(errors: FieldErrors) {
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (!first) return false;
    requestAnimationFrame(() => {
      const field = formRef.current?.querySelector<HTMLElement>(`[name="${first}"],[data-field="${first}"]`);
      field?.focus();
      field?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const files = photoFiles;
    const fecha = String(form.get("fecha") || new Date().toISOString().slice(0, 10));
    const hora = String(form.get("hora") || "");
    const errors: FieldErrors = {};
    if (!selectedPetId) {
      const nombreError = requiredText(form.get("nombre"), "El nombre", 120);
      if (nombreError) errors.nombre = nombreError;
      const colorError = requiredText(form.get("color"), "El color", 120);
      if (colorError) errors.color = colorError;
      const descriptionError = requiredText(form.get("descripcion_mascota"), "La descripción de la mascota", 1000);
      if (descriptionError) errors.descripcion_mascota = descriptionError;
    }
    const addressError = requiredText(address, "La ubicación", 240);
    if (addressError) errors.ubicacion = addressError;
    const whatsapp = String(form.get("whatsapp") || "");
    const whatsappError = whatsapp && !isValidPeruWhatsapp(whatsapp) ? "Ingresa un WhatsApp peruano valido." : null;
    if (whatsappError) errors.whatsapp = whatsappError;
    const notesError = requiredText(form.get("observaciones"), "Los datos de manejo", 1000);
    if (notesError) errors.observaciones = notesError;
    const dateError = validateNotFuture(`${fecha}T${hora || "00:00"}`, "La fecha de perdida");
    if (dateError) errors.fecha = dateError;
    const imageError = validateImageFiles(files);
    if (imageError) errors.foto = imageError;
    if (showFieldErrors(errors)) {
      setError("");
      return;
    }

    setSaving(true);
    setError("");
    try {
      let uploadedPhotoUrls: string[] = [];
      const selectedPet = registeredPets.find((item) => item.id === selectedPetId);
      let pet = selectedPet;
      if (files.length) {
        try {
          uploadedPhotoUrls = await Promise.all(files.slice(0, 3).map((file) => uploadMascotaImage(file, "mascotas")));
        } catch (caught) {
          throw new Error(operationError(caught, "subir fotografía de búsqueda", "Error al subir la fotografía"));
        }
      }
      const photoUrls = [...retainedPhotoUrls, ...uploadedPhotoUrls].slice(0, 3);
      const fotoUrl = photoUrls[0] ?? selectedPet?.foto_principal ?? selectedPet?.foto_url ?? fallbackPhoto;
      if (!pet) {
        const petDescription = String(form.get("descripcion_mascota") || "").trim();
        try {
          pet = await createRegisteredPet({
          nombre: String(form.get("nombre")),
          alias: "",
          especie: String(form.get("especie")),
          raza: String(form.get("raza") || form.get("tamano") || "No indicada"),
          tamano: String(form.get("tamano")),
          color: String(form.get("color")),
          sexo: "",
          edad: String(form.get("edad") || ""),
          salud: "",
          esterilizado: false,
          placa_medalla: "",
          caracteristicas: [petDescription, ...form.getAll("caracteristicas").map(String)].filter(Boolean),
          caracteristicas_personalizadas: petDescription,
          telefono: whatsapp ? normalizePeruWhatsapp(whatsapp) : "",
          contacto_preferido: "whatsapp",
          fotos: photoUrls.length ? photoUrls : [fotoUrl],
          foto_principal: fotoUrl,
          foto_url: fotoUrl,
          });
        } catch (caught) {
          throw new Error(operationError(caught, "crear mascota en Supabase", "Error al crear la mascota en Supabase"));
        }
      }
      let report;
      try {
        const petDescription = String(form.get("descripcion_mascota") || "").trim();
        const careNotes = String(form.get("observaciones") || "").trim();
        report = await createReport({
        pet_id: pet.id,
        tipo_reporte: "perdido",
        estado: "activo",
        distrito: locationLabel(locationDetails, address),
        descripcion: careNotes,
        fecha_reporte: `${fecha}T${hora || "00:00"}`,
        reward_text: String(form.get("recompensa") || "").trim() || null,
        foto_url: fotoUrl,
        photos: photoUrls.length ? photoUrls : (pet.fotos ?? [fotoUrl]).slice(0, 3),
        whatsapp: whatsapp ? normalizePeruWhatsapp(whatsapp) : "",
        latitude: coords.latitude,
        longitude: coords.longitude,
        pet,
        });
      } catch (caught) {
        throw new Error(operationError(caught, "crear reporte en Supabase", "Error de base de datos al crear el reporte"));
      }
      setMatchCriteria({
        especie: pet.especie,
        raza: pet.raza,
        color: pet.color,
        tamano: pet.tamano ?? undefined,
        distrito: locationLabel(locationDetails, address),
        fecha: `${fecha}T${hora || "00:00"}`,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setPublishedPet(reportToLegacyPet(report));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : operationError(caught, "crear reporte"));
    } finally {
      setSaving(false);
    }
  }

  async function searchPublishedMatches() {
    if (!matchCriteria || searchingPublishedMatches) return;
    setSearchingPublishedMatches(true);
    setError("");
    try {
      setMatches(await findLostPetMatches(matchCriteria));
      setReviewedMatches(true);
    } catch (caught) {
      setError(friendlyError(caught, "La búsqueda ya está publicada, pero no pudimos revisar coincidencias ahora."));
    } finally {
      setSearchingPublishedMatches(false);
    }
  }

  if (publishedPet) return (
    <main className="container py-6">
      <section className="form-card mx-auto max-w-xl space-y-4">
        <div><h1 className="font-serif text-4xl">Tu búsqueda ya está publicada.</h1><p className="mt-2 text-[#6B6860]">Ya puedes compartirla, editarla y recibir avistamientos de la comunidad.</p></div>
        <img src={publishedPet.foto_principal} alt={publishedPet.nombre} className="max-h-80 w-full rounded-xl bg-[#F8F7F4] object-contain" />
        <div className="grid gap-2 min-[390px]:flex min-[390px]:flex-wrap">
          <ShareButton pet={publishedPet} label="Compartir búsqueda" />
          <PosterButton pet={publishedPet} />
          <Button variant="outline" asChild><Link href={`/pet/${publishedPet.id}`}>Ver centro de búsqueda</Link></Button>
        </div>
        <div className="border-t border-black/10 pt-4"><Button type="button" className="w-full" onClick={searchPublishedMatches} disabled={searchingPublishedMatches}>{searchingPublishedMatches ? "Buscando coincidencias..." : "Buscar coincidencias"}</Button></div>
        {error && <FriendlyError message={error} />}
        {reviewedMatches && matches.length === 0 && <p className="rounded-xl bg-[#F8F7F4] p-3 text-sm font-semibold text-[#6B6860]">No encontramos búsquedas activas compatibles.</p>}
        {matches.length > 0 && <div className="space-y-3"><h2 className="font-bold">Posibles coincidencias</h2>{matches.map((match) => <article key={match.caseId} className="rounded-xl border border-black/10 p-3"><div className="flex gap-3"><img src={match.pet.foto_principal} alt={match.pet.nombre} className="h-16 w-16 rounded-lg bg-[#F8F7F4] object-contain" /><div><strong>{match.pet.nombre}</strong><p className="text-sm text-[#6B6860]">Coincidencia {match.level} · {match.percentage}%</p>{match.distance !== null && <p className="text-sm font-semibold text-[#1D9E75]">{formatDistance(match.distance)}</p>}</div></div><Button type="button" size="sm" variant="outline" className="mt-3" asChild><Link href={`/pet/${match.caseId}`}>Ver caso</Link></Button></article>)}</div>}
      </section>
    </main>
  );

  const selectedRegisteredPet = registeredPets.find((pet) => pet.id === selectedPetId);
  const registeredPhotoUrls = selectedRegisteredPet ? Array.from(new Set([selectedRegisteredPet.foto_principal, selectedRegisteredPet.foto_url, ...(selectedRegisteredPet.fotos ?? [])].filter((url): url is string => Boolean(url)))).slice(0, 3) : [];

  return (
    <main className="container py-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Inicio</Link>
      <form ref={formRef} onSubmit={submit} className="mx-auto grid max-w-3xl gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="form-card space-y-4">
          <div className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm font-bold text-[#085041]">Paso 1 - Foto y nombre</div>
          <div><h1 className="font-serif text-4xl">Perdí mi mascota</h1><p className="mt-2 text-sm text-[#6B6860]">Completa los datos para publicar la búsqueda. Después podrás revisar coincidencias.</p></div>
          {error && <FriendlyError message={error} />}
          {registeredPets.length > 0 && <div><label className="label">Mascota registrada</label><select className="select" value={selectedPetId} onChange={(event) => setSelectedPetId(event.target.value)}>{registeredPets.map((pet) => <option key={pet.id} value={pet.id}>{petOptionLabel(pet)}</option>)}<option value="">No esta registrada</option></select></div>}
          {selectedRegisteredPet && <div className="rounded-xl bg-[#E1F5EE] p-3 text-sm text-[#085041]"><strong>Usaremos las fotografías registradas de {selectedRegisteredPet.nombre}.</strong><span className="mt-1 block">Puedes agregar una fotografía reciente de forma opcional si aún no alcanzaste el máximo de 3.</span></div>}
          <div data-field="foto"><label className="label">Fotografías (máximo 3)</label><PhotoUploader key={selectedPetId || "unregistered"} initialUrls={registeredPhotoUrls} disabled={saving} onChange={(files, urls) => { setPhotoFiles(files); setRetainedPhotoUrls(urls); }} onError={setError} /></div>
          {fieldErrors.foto && <p className="text-sm font-semibold text-[#B42318]">{fieldErrors.foto}</p>}
          {!selectedPetId && <>
            <div><label className="label">Nombre *</label><input required maxLength={120} className="field" name="nombre" placeholder="Luna" aria-invalid={Boolean(fieldErrors.nombre)} />{fieldErrors.nombre && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.nombre}</p>}</div>
            <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Especie *</label><select className="select" name="especie"><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div><div><label className="label">Tamaño *</label><select className="select" name="tamano"><option value="Pequeno">Pequeño</option><option>Mediano</option><option>Grande</option></select></div></div>
            <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Color *</label><input required maxLength={120} className="field" name="color" placeholder="Marrón, blanco..." aria-invalid={Boolean(fieldErrors.color)} />{fieldErrors.color && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.color}</p>}</div><div><label className="label">Raza aproximada</label><input maxLength={120} className="field" name="raza" placeholder="Mestizo, labrador..." /></div></div>
            <div><label className="label">Describe a tu mascota *</label><textarea required maxLength={1000} className="textarea min-h-24" name="descripcion_mascota" placeholder="Ej. Mestizo de pelaje marrón claro, pecho blanco, cola larga y muy juguetón." aria-invalid={Boolean(fieldErrors.descripcion_mascota)} />{fieldErrors.descripcion_mascota && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.descripcion_mascota}</p>}</div>
          </>}
        </section>
        <section className="form-card space-y-4">
          <div className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm font-bold text-[#085041]">Paso 2 - ¿Dónde se perdió tu mascota?</div>
          <div>
            <label className="label">Dirección o referencia *</label>
            <div className="grid gap-2 min-[390px]:grid-cols-[1fr_auto]">
              <input ref={addressInputRef} required maxLength={240} className="field" name="ubicacion" value={address} onChange={(event) => { setAddress(event.target.value); resetMatchReview(); }} placeholder="Av La Paz, Jiron Castilla, parque..." aria-invalid={Boolean(fieldErrors.ubicacion)} />
              <Button type="button" variant="outline" onClick={searchAddress} disabled={searchingAddress || saving}><Search size={18} />{searchingAddress ? "Buscando..." : "Buscar"}</Button>
            </div>
            {fieldErrors.ubicacion && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.ubicacion}</p>}
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={useLocation} disabled={usingGps || saving}><MapPin size={18} />{usingGps ? "Obteniendo ubicación..." : "Usar mi ubicación actual"}</Button>
          <div className="map-panel min-h-[320px] overflow-hidden rounded-2xl">
            <LocationPicker value={coords} onChange={(value) => { void movePin(value.latitude, value.longitude); }} />
          </div>
          <p className="text-xs text-[#6B6860]">Arrastra el pin al punto exacto. Las coordenadas del pin son la fuente principal.</p>
          <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Fecha *</label><input required className="field" name="fecha" type="date" aria-invalid={Boolean(fieldErrors.fecha)} />{fieldErrors.fecha && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.fecha}</p>}</div><div><label className="label">Hora *</label><input required className="field" name="hora" type="time" /></div></div>
          <div className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm font-bold text-[#085041]">Paso 3 - Contacto</div>
          <div><label className="label">WhatsApp (opcional)</label><input maxLength={40} className="field" name="whatsapp" placeholder="+51 987 654 321" aria-invalid={Boolean(fieldErrors.whatsapp)} />{fieldErrors.whatsapp && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.whatsapp}</p>}</div>
          <div><label className="label">Recompensa opcional</label><input maxLength={160} className="field" name="recompensa" placeholder="Monto o descripción" /></div>
          <div><label className="label">Datos de manejo *</label><textarea required maxLength={1000} className="textarea min-h-24" name="observaciones" placeholder="Ejemplo: Es nervioso, no perseguir, responde a su nombre y necesita medicación." aria-invalid={Boolean(fieldErrors.observaciones)} />{fieldErrors.observaciones && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.observaciones}</p>}</div>
          <Button disabled={saving} className="w-full">{saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Send size={18} />}{saving ? "Publicando búsqueda..." : "Publicar búsqueda"}</Button>
        </section>
      </form>
    </main>
  );
}

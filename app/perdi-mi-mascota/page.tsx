"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Image as ImageIcon, MapPin, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/location-picker";
import { ImageCropper } from "@/components/image-cropper";
import { createRegisteredPet, createReport, listMyRegisteredPets, reportToLegacyPet, type RegisteredPet, uploadMascotaImage } from "@/lib/sprint14-store";
import { PosterButton, ShareButton } from "@/components/report-actions";
import { ProgressiveSigninCard } from "@/components/progressive-signin-card";
import type { Pet } from "@/lib/demo-data";
import { findLostPetMatches } from "@/lib/matching";
import type { CaseMatch } from "@/lib/cases";
import { formatDistance } from "@/lib/utils";
import { defaultPeruCoords, getCurrentLocationDetails, locationDetailsFromCoords, searchPeruLocation, type LocationDetails } from "@/lib/location";
import { FriendlyError } from "@/components/feedback";
import { friendlyError, operationError, requiredText, validateImageFile, validateNotFuture } from "@/lib/form-validation";
import { isValidPeruWhatsapp, normalizePeruWhatsapp } from "@/lib/whatsapp";

const fallbackPhoto = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80";
type FieldErrors = Record<string, string>;

function locationLabel(details: LocationDetails | null, address: string) {
  return details?.district || details?.province || details?.department || address || "Ubicacion exacta";
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [matches, setMatches] = useState<CaseMatch[]>([]);
  const [reviewedMatches, setReviewedMatches] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    listMyRegisteredPets().then((items) => {
      setRegisteredPets(items);
      setSelectedPetId(items[0]?.id ?? "");
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
      setError(friendlyError(caught, "No se pudo obtener tu ubicacion. Escribe una referencia cercana."));
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
        setError("No se encontro esa direccion. Prueba con una referencia mas especifica.");
        return;
      }
      setCoords({ latitude: details.latitude, longitude: details.longitude });
      setLocationDetails(details);
      setAddress(details.address);
      resetMatchReview();
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo buscar esa direccion. Prueba con otra referencia."));
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

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (file) {
      setCropFile(file);
      setError("");
    }
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
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
    const file = photoFile;
    const fecha = String(form.get("fecha") || new Date().toISOString().slice(0, 10));
    const hora = String(form.get("hora") || "");
    const errors: FieldErrors = {};
    if (!selectedPetId) {
      const nombreError = requiredText(form.get("nombre"), "El nombre", 120);
      if (nombreError) errors.nombre = nombreError;
      const colorError = requiredText(form.get("color"), "El color", 120);
      if (colorError) errors.color = colorError;
    }
    const addressError = requiredText(address, "La ubicacion", 240);
    if (addressError) errors.ubicacion = addressError;
    const whatsapp = String(form.get("whatsapp") || "");
    const whatsappError = requiredText(whatsapp, "El WhatsApp de contacto", 40) || (!isValidPeruWhatsapp(whatsapp) ? "Ingresa un WhatsApp peruano valido." : null);
    if (whatsappError) errors.whatsapp = whatsappError;
    const notesError = requiredText(form.get("observaciones"), "A tener en cuenta sobre la mascota", 1000);
    if (notesError) errors.observaciones = notesError;
    const dateError = validateNotFuture(`${fecha}T${hora || "00:00"}`, "La fecha de perdida");
    if (dateError) errors.fecha = dateError;
    const imageError = validateImageFile(file);
    if (imageError) errors.foto = imageError;
    if (showFieldErrors(errors)) {
      setError("");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (!reviewedMatches) {
        const found = await findLostPetMatches({
          especie: String(form.get("especie") || ""),
          raza: String(form.get("raza") || ""),
          color: String(form.get("color") || ""),
          tamano: String(form.get("tamano") || ""),
          distrito: locationLabel(locationDetails, address),
          fecha: `${fecha}T${hora || "00:00"}`,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setMatches(found);
        setReviewedMatches(true);
        setSaving(false);
        if (found.length) return;
      }

      let fotoUrl = fallbackPhoto;
      const selectedPet = registeredPets.find((item) => item.id === selectedPetId);
      let pet = selectedPet;
      if (file?.size) {
        try {
          fotoUrl = await uploadMascotaImage(file, "mascotas");
        } catch (caught) {
          throw new Error(operationError(caught, "subir fotografia de busqueda", "Error al subir la fotografia"));
        }
      }
      if (!pet) {
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
          caracteristicas: form.getAll("caracteristicas").map(String),
          telefono: normalizePeruWhatsapp(whatsapp),
          contacto_preferido: "whatsapp",
          fotos: [fotoUrl],
          foto_principal: fotoUrl,
          foto_url: fotoUrl,
          });
        } catch (caught) {
          throw new Error(operationError(caught, "crear mascota en Supabase", "Error al crear la mascota en Supabase"));
        }
      }
      const recompensa = String(form.get("recompensa") || "");
      let report;
      try {
        report = await createReport({
        pet_id: pet.id,
        tipo_reporte: "perdido",
        estado: "activo",
        distrito: locationLabel(locationDetails, address),
        descripcion: `${String(form.get("observaciones"))} Ultima ubicacion: ${address}. Fecha: ${fecha}. Hora: ${hora}. Recompensa: ${recompensa || "no indicada"}.`,
        foto_url: file?.size ? fotoUrl : pet.foto_principal ?? pet.foto_url,
        whatsapp: normalizePeruWhatsapp(whatsapp),
        latitude: coords.latitude,
        longitude: coords.longitude,
        pet,
        });
      } catch (caught) {
        throw new Error(operationError(caught, "crear reporte en Supabase", "Error de base de datos al crear el reporte"));
      }
      setPublishedPet(reportToLegacyPet(report));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : operationError(caught, "crear reporte"));
    } finally {
      setSaving(false);
    }
  }

  if (publishedPet) return (
    <main className="container py-6">
      <section className="form-card mx-auto max-w-xl space-y-4">
        <ProgressiveSigninCard continueHref={`/pet/${publishedPet.id}`} />
        <h1 className="font-serif text-4xl">{publishedPet.nombre}</h1>
        <img src={publishedPet.foto_principal} alt={publishedPet.nombre} className="max-h-80 w-full rounded-xl bg-[#F8F7F4] object-contain" />
        <div className="rounded-xl bg-[#E1F5EE] p-4 font-semibold text-[#085041]"><strong className="block text-lg">Busqueda creada correctamente.</strong>El caso ya esta activo. Ahora otras personas pueden reportar avistamientos y revisar coincidencias desde el centro de busqueda.</div>
        <div className="grid gap-2 min-[390px]:flex min-[390px]:flex-wrap">
          <ShareButton pet={publishedPet} label="Compartir busqueda" />
          <PosterButton pet={publishedPet} />
          <Button variant="outline" asChild><Link href={`/pet/${publishedPet.id}`}>Ver centro de busqueda</Link></Button>
        </div>
      </section>
    </main>
  );

  return (
    <main className="container py-6">
      {cropFile && <ImageCropper file={cropFile} onCancel={() => setCropFile(null)} onApply={(file, previewUrl) => {
        setPhotoFile(file);
        setPhotoPreview(previewUrl);
        setCropFile(null);
      }} />}
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Inicio</Link>
      <form ref={formRef} onSubmit={submit} className="mx-auto grid max-w-3xl gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="form-card space-y-4">
          <div className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm font-bold text-[#085041]">Paso 1 - Foto y nombre</div>
          <div><h1 className="font-serif text-4xl">Perdi mi mascota</h1><p className="mt-2 text-sm text-[#6B6860]">Primero revisamos coincidencias cercanas. La busqueda se guarda recien cuando confirmas.</p></div>
          {error && <FriendlyError message={error} />}
          {registeredPets.length > 0 && <div><label className="label">Mascota registrada</label><select className="select" value={selectedPetId} onChange={(event) => setSelectedPetId(event.target.value)}>{registeredPets.map((pet) => <option key={pet.id} value={pet.id}>{pet.nombre} - {pet.especie}</option>)}<option value="">No esta registrada</option></select></div>}
          <input ref={cameraInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onClick={(event) => { event.currentTarget.value = ""; }} onChange={handlePhoto} />
          <input ref={galleryInputRef} className="sr-only" type="file" accept="image/*" onClick={(event) => { event.currentTarget.value = ""; }} onChange={handlePhoto} />
          <div className="grid gap-2 min-[390px]:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={saving}><Camera size={18} />Tomar foto</Button>
            <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()} disabled={saving}><ImageIcon size={18} />Elegir desde galeria</Button>
          </div>
          {fieldErrors.foto && <p className="text-sm font-semibold text-[#B42318]">{fieldErrors.foto}</p>}
          {photoPreview ? <div className="rounded-2xl border border-black/10 bg-[#F8F7F4] p-3">
            <img src={photoPreview} alt="Foto recortada" className="max-h-64 w-full rounded-xl bg-white object-contain" />
            <Button type="button" variant="outline" className="mt-3 w-full" onClick={removePhoto}>Eliminar foto</Button>
          </div> : <p className="rounded-xl bg-[#F8F7F4] p-3 text-sm text-[#6B6860]">La foto se podra recortar antes de guardar.</p>}
          {!selectedPetId && <>
            <div><label className="label">Nombre *</label><input required maxLength={120} className="field" name="nombre" placeholder="Luna" aria-invalid={Boolean(fieldErrors.nombre)} />{fieldErrors.nombre && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.nombre}</p>}</div>
            <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Especie *</label><select className="select" name="especie"><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div><div><label className="label">Tamano *</label><select className="select" name="tamano"><option>Pequeno</option><option>Mediano</option><option>Grande</option></select></div></div>
            <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Color *</label><input required maxLength={120} className="field" name="color" placeholder="Marron, blanco..." aria-invalid={Boolean(fieldErrors.color)} />{fieldErrors.color && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.color}</p>}</div><div><label className="label">Raza aproximada</label><input maxLength={120} className="field" name="raza" placeholder="Mestizo, labrador..." /></div></div>
          </>}
        </section>
        <section className="form-card space-y-4">
          <div className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm font-bold text-[#085041]">Paso 2 - Ubicacion exacta</div>
          <div>
            <label className="label">Direccion o referencia *</label>
            <div className="grid gap-2 min-[390px]:grid-cols-[1fr_auto]">
              <input ref={addressInputRef} required maxLength={240} className="field" name="ubicacion" value={address} onChange={(event) => { setAddress(event.target.value); resetMatchReview(); }} placeholder="Av La Paz, Jiron Castilla, parque..." aria-invalid={Boolean(fieldErrors.ubicacion)} />
              <Button type="button" variant="outline" onClick={searchAddress} disabled={searchingAddress || saving}><Search size={18} />{searchingAddress ? "Buscando..." : "Buscar"}</Button>
            </div>
            {fieldErrors.ubicacion && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.ubicacion}</p>}
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={useLocation} disabled={usingGps || saving}><MapPin size={18} />{usingGps ? "Obteniendo ubicacion..." : "Usar mi ubicacion actual"}</Button>
          <div className="map-panel min-h-[320px] overflow-hidden rounded-2xl">
            <LocationPicker value={coords} onChange={(value) => { void movePin(value.latitude, value.longitude); }} />
          </div>
          <div className="grid gap-2 min-[390px]:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => addressInputRef.current?.focus()} disabled={saving}>Cambiar ubicacion</Button>
          </div>
          <p className="text-xs text-[#6B6860]">Arrastra el pin al punto exacto. Las coordenadas del pin son la fuente principal.</p>
          <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Fecha *</label><input required className="field" name="fecha" type="date" aria-invalid={Boolean(fieldErrors.fecha)} />{fieldErrors.fecha && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.fecha}</p>}</div><div><label className="label">Hora *</label><input required className="field" name="hora" type="time" /></div></div>
          <div className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm font-bold text-[#085041]">Paso 3 - Contacto</div>
          <div><label className="label">WhatsApp de contacto *</label><input required maxLength={40} className="field" name="whatsapp" placeholder="+51 987 654 321" aria-invalid={Boolean(fieldErrors.whatsapp)} />{fieldErrors.whatsapp && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.whatsapp}</p>}</div>
          <div><label className="label">Recompensa opcional</label><input maxLength={160} className="field" name="recompensa" placeholder="Monto o descripcion" /></div>
          <div><label className="label">A tener en cuenta sobre la mascota *</label><textarea required maxLength={1000} className="textarea min-h-24" name="observaciones" placeholder="Comportamiento, ultimo momento visto, cuidados importantes" aria-invalid={Boolean(fieldErrors.observaciones)} />{fieldErrors.observaciones && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.observaciones}</p>}</div>
          {reviewedMatches && matches.length > 0 && <div className="rounded-xl bg-[#FAEEDA] p-3 text-sm text-[#6B4A10]"><strong>Coincidencias encontradas.</strong><span className="block">Revisa los casos antes de crear la busqueda. Si ninguna corresponde, puedes continuar.</span></div>}
          <Button disabled={saving} className="w-full">{saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Send size={18} />}{saving ? reviewedMatches ? "Creando reporte..." : "Buscando coincidencias..." : reviewedMatches ? "Crear busqueda" : "Buscar coincidencias"}</Button>
        </section>
        {matches.length > 0 && <aside className="space-y-3 lg:col-span-2">
          <h2 className="font-bold">Posibles coincidencias</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {matches.map((match) => <article key={match.caseId} className="form-card">
              <div className="flex gap-3">
                <img src={match.pet.foto_principal} alt={match.pet.nombre} className="h-16 w-16 rounded-lg bg-[#F8F7F4] object-contain" />
                <div><strong>{match.pet.nombre}</strong><p className="text-sm text-[#6B6860]">Coincidencia {match.level} - {match.percentage}%</p>{match.distance !== null && <p className="text-sm font-semibold text-[#1D9E75]">{formatDistance(match.distance)}</p>}</div>
              </div>
              <Button type="button" size="sm" variant="outline" className="mt-3" asChild><Link href={`/pet/${match.caseId}`}>Ver caso</Link></Button>
            </article>)}
          </div>
        </aside>}
      </form>
    </main>
  );
}

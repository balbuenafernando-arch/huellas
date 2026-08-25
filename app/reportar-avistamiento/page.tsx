"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoUploader } from "@/components/photo-uploader";
import { LocationPicker } from "@/components/location-picker";
import { createSighting } from "@/lib/pet-store";
import type { Sighting } from "@/lib/demo-data";
import { findLostPetMatches } from "@/lib/matching";
import { createRegisteredPet, createReport, getCurrentUser } from "@/lib/sprint14-store";
import { formatDistance } from "@/lib/utils";
import type { CaseMatch } from "@/lib/cases";
import { uploadImage } from "@/services/image-service";
import { defaultPeruCoords, getCurrentLocationDetails, locationDetailsFromCoords, searchPeruLocation, type LocationDetails } from "@/lib/location";
import { FriendlyError } from "@/components/feedback";
import { friendlyError, operationError, requiredText, validateImageFiles, validateNotFuture } from "@/lib/form-validation";

const fallbackPhoto = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80";
type FieldErrors = Record<string, string>;

type SightingDraft = {
  nombre: string;
  telefono: string;
  especie: string;
  tamano: string;
  color: string;
  ubicacion: string;
  vistoEn: string;
  comentario: string;
  situacion: string;
};

const defaultDraft: SightingDraft = {
  nombre: "",
  telefono: "",
  especie: "Perro",
  tamano: "Mediano",
  color: "",
  ubicacion: "",
  vistoEn: "",
  comentario: "",
  situacion: "solo_la_vi",
};

const quickSituations = [
  ["solo_la_vi", "La vi"],
  ["la_tengo_conmigo", "La tengo resguardada"],
  ["herida", "Está herida"],
  ["siguiendo", "La estoy siguiendo"],
];

function locationLabel(details: LocationDetails | null, address: string) {
  return details?.district || details?.province || details?.department || address || "Punto marcado en el mapa";
}

export default function ReportSightingPage() {
  const requestedCaseId = useSearchParams().get("caseId") ?? "";
  const [draft, setDraft] = useState<SightingDraft>(defaultDraft);
  const [coords, setCoords] = useState(defaultPeruCoords());
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);
  const [matches, setMatches] = useState<CaseMatch[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [reviewedMatches, setReviewedMatches] = useState(false);
  const [noMatches, setNoMatches] = useState(false);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usingGps, setUsingGps] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const addressInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setDraft(defaultDraft);
    setMatches([]);
    setSelectedCaseId("");
    setPhotoFiles([]);
    setReviewedMatches(false);
    setNoMatches(false);
    setSent(false);
    setError("");
    setFieldErrors({});
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }));
  }, []);

  function resetMatches() {
    setReviewedMatches(false);
    setSelectedCaseId("");
    setMatches([]);
    setNoMatches(false);
  }

  async function useLocation() {
    if (usingGps) return;
    setUsingGps(true);
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener la ubicación.");
      setUsingGps(false);
      return;
    }
    setError("");
    try {
      const details = await getCurrentLocationDetails();
      setCoords({ latitude: details.latitude, longitude: details.longitude });
      setLocationDetails(details);
      updateDraft("ubicacion", details.address);
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo obtener tu ubicación. Puedes seguir con una referencia cercana."));
    } finally {
      setUsingGps(false);
    }
  }

  async function searchAddress() {
    if (!draft.ubicacion.trim() || searchingAddress) return;
    setSearchingAddress(true);
    setError("");
    try {
      const details = await searchPeruLocation(draft.ubicacion);
      if (!details) {
        setError("No se encontró esa dirección. Prueba con una referencia más específica.");
        return;
      }
      setCoords({ latitude: details.latitude, longitude: details.longitude });
      setLocationDetails(details);
      updateDraft("ubicacion", details.address);
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo buscar esa dirección. Prueba con otra referencia."));
    } finally {
      setSearchingAddress(false);
    }
  }

  async function movePin(latitude: number, longitude: number) {
    setCoords({ latitude, longitude });
    resetMatches();
    try {
      const details = await locationDetailsFromCoords(latitude, longitude);
      setLocationDetails(details);
      setDraft((current) => ({ ...current, ubicacion: details.address }));
    } catch {
      setDraft((current) => ({ ...current, ubicacion: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
    }
  }

  function updateDraft<K extends keyof SightingDraft>(key: K, value: SightingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    resetMatches();
  }

  function selectCase(match: CaseMatch) {
    setSelectedCaseId(match.caseId);
    requestAnimationFrame(() => document.getElementById(`coincidencia-${match.caseId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  function continueWithoutMatch() {
    setSelectedCaseId("");
    setMatches([]);
    setReviewedMatches(true);
    setNoMatches(true);
    formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
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
    const formElement: HTMLFormElement = event.currentTarget;
    const form = new FormData(formElement);
    const intent = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value ?? "search";

    const especie = String(form.get("especie") || draft.especie);
    const tamano = String(form.get("tamano") || draft.tamano);
    const color = String(form.get("color") || draft.color);
    const descripcionObservada = String(form.get("comentario") || draft.comentario).trim();
    const rasgos = descripcionObservada ? [descripcionObservada] : [];
    const seenAt = String(form.get("visto_en") || draft.vistoEn);
    const files = photoFiles;
    const errors: FieldErrors = {};
    const ubicacionError = requiredText(form.get("ubicacion") || draft.ubicacion, "La ubicación", 240);
    if (ubicacionError) errors.ubicacion = ubicacionError;
    const comentarioError = requiredText(form.get("comentario") || draft.comentario, "La descripción", 1000);
    if (comentarioError) errors.comentario = comentarioError;
    const dateError = validateNotFuture(seenAt, "La fecha del avistamiento");
    if (dateError) errors.visto_en = dateError;
    const imageError = validateImageFiles(files);
    if (imageError) errors.foto = imageError;
    if (showFieldErrors(errors)) {
      setError("");
      return;
    }

    setSaving(true);
    setError("");
    let user;
    try {
      user = await getCurrentUser();
      if (intent === "search") {
        const foundMatches = await findLostPetMatches({ especie, tamano, color, distrito: locationLabel(locationDetails, draft.ubicacion), rasgos, fecha: seenAt, latitude: coords.latitude, longitude: coords.longitude });
        setMatches(foundMatches);
        setReviewedMatches(true);
        setNoMatches(foundMatches.length === 0);
        setSelectedCaseId("");
        setSaving(false);
        return;
      }
    } catch (caught) {
      setError(operationError(caught, "revisar coincidencias"));
      setSaving(false);
      return;
    }

    try {
      let fotos: string[] = [];
      if (files.length) {
        try {
          fotos = await Promise.all(files.slice(0, 3).map((file) => uploadImage(file)));
        } catch (caught) {
          throw new Error(operationError(caught, "subir fotografía de avistamiento", "Error al subir la fotografía"));
        }
      }

      const selectedMatch = matches.find((match) => match.caseId === selectedCaseId);
      let reportId: string | null = selectedMatch?.caseId ?? (requestedCaseId || null);
      let petId: string | null = selectedMatch?.petId ?? null;

      if (!selectedMatch && !requestedCaseId && user) {
        const photoUrl = fotos[0] ?? fallbackPhoto;
        let pet;
        try {
          pet = await createRegisteredPet({
          nombre: "Mascota vista",
          alias: "",
          especie,
          raza: "No indicada",
          tamano,
          color,
          sexo: "",
          edad: "",
          salud: "",
          esterilizado: false,
          placa_medalla: "",
          caracteristicas: rasgos,
          caracteristicas_personalizadas: descripcionObservada,
          telefono: "",
          contacto_preferido: "whatsapp",
          fotos: fotos.length ? fotos : [photoUrl],
          foto_principal: photoUrl,
          foto_url: photoUrl,
          photos: fotos.length ? fotos : [photoUrl],
          rasgo_privado: "",
          });
        } catch (caught) {
          throw new Error(operationError(caught, "crear mascota vista en Supabase", "Error al crear la mascota vista en Supabase"));
        }
        let report;
        try {
          report = await createReport({
          pet_id: pet.id,
          tipo_reporte: "encontrado",
          estado: "activo",
          distrito: locationLabel(locationDetails, draft.ubicacion),
          descripcion: String(form.get("comentario")),
          foto_url: photoUrl,
          whatsapp: "",
          latitude: coords.latitude,
          longitude: coords.longitude,
          pet,
          });
        } catch (caught) {
          throw new Error(operationError(caught, "crear caso asociado en Supabase", "Error al crear el caso asociado en Supabase"));
        }
        reportId = report.id;
        petId = pet.id;
      }

      const situacionTexto = quickSituations.find(([value]) => value === draft.situacion)?.[1] ?? "La vi";
      const comentario = `${String(form.get("comentario"))}\nSituación observada: ${situacionTexto}`;

      try {
        await createSighting({
        pet_id: petId,
        report_id: reportId,
        especie,
        tamano,
        color,
        distrito: locationLabel(locationDetails, draft.ubicacion),
        comentario,
        foto: fotos[0] ?? null,
        fotos,
        ubicacion: String(form.get("ubicacion") || draft.ubicacion),
        visto_en: seenAt,
        situacion: draft.situacion as Sighting["situacion"],
        reporter_name: draft.nombre.trim() || null,
        reporter_phone: draft.telefono.trim() || null,
        latitud: coords.latitude,
        longitud: coords.longitude,
        });
      } catch (caught) {
        throw new Error(operationError(caught, "registrar avistamiento en Supabase", "Error de base de datos al registrar el avistamiento"));
      }

      setSent(true);
      setDraft(defaultDraft);
      setPhotoFiles([]);
      formElement.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : operationError(caught, "registrar avistamiento"));
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <main className="container py-6">
        <section className="form-card mx-auto max-w-xl space-y-4">
          <div className="rounded-xl bg-[#E1F5EE] p-4 text-[#085041]"><h1 className="font-serif text-3xl">¡Gracias por ayudar!</h1><p className="mt-2">Registramos tu avistamiento correctamente. Si corresponde a una búsqueda activa, sus responsables serán notificados para revisarlo.</p></div>
          <Button className="w-full" asChild><Link href="/">Volver al inicio</Link></Button>
        </section>
      </main>
    );
  }

  return (
    <main className="container py-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Inicio</Link>
      <div className="mb-5"><h1 className="font-serif text-4xl">Vi una mascota</h1><p className="mt-2 text-[#6B6860]">{requestedCaseId ? "Este avistamiento se registrará directamente en el caso que estabas consultando." : "Primero buscamos si corresponde a un caso activo. Solo se guarda después de revisar coincidencias."}</p></div>
      <form ref={formRef} onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="form-card space-y-4">
          {error && <FriendlyError message={error} />}
          <div data-field="foto"><label className="label">Fotografías (máximo 3)</label><PhotoUploader disabled={saving} onChange={(files) => setPhotoFiles(files)} onError={setError} /></div>
          {fieldErrors.foto && <p className="text-sm font-semibold text-[#B42318]">{fieldErrors.foto}</p>}
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label">Tu nombre (opcional)</label><input maxLength={120} className="field" name="nombre_reportante" value={draft.nombre} onChange={(event) => updateDraft("nombre", event.target.value)} autoComplete="name" /></div>
            <div><label className="label">Tu teléfono (opcional)</label><input maxLength={40} className="field" type="tel" name="telefono_reportante" value={draft.telefono} onChange={(event) => updateDraft("telefono", event.target.value)} autoComplete="tel" placeholder="Solo lo verá el propietario" /></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label">Especie *</label><select className="select" name="especie" value={draft.especie} onChange={(event) => updateDraft("especie", event.target.value)}><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div>
            <div><label className="label">Tamaño *</label><select className="select" name="tamano" value={draft.tamano} onChange={(event) => updateDraft("tamano", event.target.value)}><option value="Pequeno">Pequeño</option><option>Mediano</option><option>Grande</option></select></div>
          </div>
          <div><label className="label">Color *</label><input required maxLength={120} className="field" name="color" value={draft.color} onChange={(event) => updateDraft("color", event.target.value)} placeholder="Marrón, blanco, negro..." /></div>
          <div>
            <label className="label">Ubicación *</label>
            <div className="grid gap-2 min-[390px]:grid-cols-[1fr_auto]">
              <input ref={addressInputRef} required maxLength={240} className="field" name="ubicacion" value={draft.ubicacion} onChange={(event) => updateDraft("ubicacion", event.target.value)} placeholder="Calle, parque o referencia" aria-invalid={Boolean(fieldErrors.ubicacion)} />
              <Button type="button" variant="outline" onClick={searchAddress} disabled={searchingAddress || saving}><Search size={18} />{searchingAddress ? "Buscando..." : "Buscar"}</Button>
            </div>
            {fieldErrors.ubicacion && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.ubicacion}</p>}
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={useLocation} disabled={usingGps || saving}><MapPin size={18} />{usingGps ? "Obteniendo ubicación..." : "Usar mi ubicación actual"}</Button>
          <div className="map-panel min-h-[300px] overflow-hidden rounded-2xl">
            <LocationPicker value={coords} onChange={(value) => { void movePin(value.latitude, value.longitude); }} />
          </div>
          <p className="text-xs text-[#6B6860]">Arrastra el pin al punto exacto. El pin manda sobre la dirección.</p>
          <div><label className="label">Fecha y hora *</label><input required className="field" type="datetime-local" name="visto_en" value={draft.vistoEn} onChange={(event) => updateDraft("vistoEn", event.target.value)} aria-invalid={Boolean(fieldErrors.visto_en)} />{fieldErrors.visto_en && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.visto_en}</p>}</div>
          <div><label className="label">Situación observada</label><div className="grid gap-2 min-[390px]:grid-cols-2">{quickSituations.map(([value, label]) => <button key={value} type="button" onClick={() => updateDraft("situacion", value)} className={`min-h-11 rounded-xl border px-3 text-left text-sm font-semibold ${draft.situacion === value ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]" : "border-black/10 bg-white text-[#4D4A43]"}`}>{label}</button>)}</div></div>
          <div><label className="label">Descripción del avistamiento *</label><textarea required maxLength={1000} className="textarea min-h-24" name="comentario" value={draft.comentario} onChange={(event) => updateDraft("comentario", event.target.value)} placeholder="Describe brevemente dónde viste la mascota, cómo se comportaba o cualquier detalle que pueda ayudar al propietario." aria-invalid={Boolean(fieldErrors.comentario)} />{fieldErrors.comentario && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.comentario}</p>}</div>
          {!reviewedMatches && <Button name="intent" value={requestedCaseId ? "associate" : "search"} disabled={saving}>{saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Search size={18} />}{saving ? requestedCaseId ? "Registrando avistamiento..." : "Buscando coincidencias..." : requestedCaseId ? "Registrar avistamiento en este caso" : "Buscar coincidencias"}</Button>}
        </section>
        {reviewedMatches && <aside className="space-y-3">
          <div className="form-card"><h2 className="font-bold">Coincidencias</h2><p className="mt-2 text-sm text-[#6B6860]">Se comparan especie, color, tamaño, fecha, detalles visibles y distancia geográfica.</p></div>
          {matches.map((match) => (
            <article id={`coincidencia-${match.caseId}`} key={match.caseId} className={`form-card ${selectedCaseId === match.caseId ? "border-[#1D9E75] bg-[#FAFDFB] ring-2 ring-[#E1F5EE]" : ""}`}>
              <div className="flex gap-3">
                <img src={match.pet.foto_principal} alt={match.pet.nombre} className="h-16 w-16 rounded-lg object-contain bg-[#F8F7F4]" loading="lazy" />
                <div>
                  <strong>Coincidencia {match.level}</strong>
                  <p className="text-sm text-[#7A7871]">{match.pet.nombre} - {match.pet.tipo}</p>
                  <p className="text-xs text-[#1D9E75]">{match.percentage}% - {match.reasons.slice(0, 3).join(" - ")}</p>
                  {match.distance !== null && <p className="text-sm font-semibold text-[#1D9E75]">{formatDistance(match.distance)}</p>}
                </div>
              </div>
              <div className="mt-3 grid gap-2 min-[390px]:flex"><Button type="button" size="sm" onClick={() => selectCase(match)}>Sí corresponde</Button><Button type="button" size="sm" variant="outline" asChild><Link href={`/pet/${match.caseId}`}>Ver centro de búsqueda</Link></Button></div>
              {selectedCaseId === match.caseId && <div className="mt-4 border-t border-[#9FE1CB] pt-4"><p className="mb-3 text-sm font-semibold text-[#085041]">Esta coincidencia fue seleccionada. Guarda el avistamiento para notificar a la familia.</p><Button type="submit" name="intent" value="associate" className="w-full" disabled={saving}>{saving ? "Registrando avistamiento..." : "Unir este avistamiento al caso"}</Button></div>}
            </article>
          ))}
          {matches.length > 0 && <Button type="button" variant="outline" className="w-full" onClick={continueWithoutMatch}>Ninguna coincide</Button>}
          {noMatches && <div className="form-card space-y-3"><p className="font-semibold text-[#6B4A10]">No encontramos ninguna búsqueda activa compatible.</p><Button type="submit" name="intent" value="new" className="w-full" disabled={saving}>{saving ? "Registrando..." : "Registrar como nueva mascota vista"}</Button></div>}
        </aside>}
      </form>
    </main>
  );
}

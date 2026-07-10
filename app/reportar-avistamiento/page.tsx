"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Image as ImageIcon, MapPin, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressiveSigninCard } from "@/components/progressive-signin-card";
import { LocationPicker } from "@/components/location-picker";
import { ImageCropper } from "@/components/image-cropper";
import { createNotification, createSighting } from "@/lib/pet-store";
import type { Sighting } from "@/lib/demo-data";
import { findLostPetMatches } from "@/lib/matching";
import { createRegisteredPet, createReport, getCurrentUser } from "@/lib/sprint14-store";
import { formatDistance } from "@/lib/utils";
import type { CaseMatch } from "@/lib/cases";
import { uploadImage } from "@/services/image-service";
import { defaultPeruCoords, getCurrentLocationDetails, locationDetailsFromCoords, searchPeruLocation, type LocationDetails } from "@/lib/location";
import { FriendlyError } from "@/components/feedback";
import { friendlyError, requiredText, validateImageFile, validateNotFuture } from "@/lib/form-validation";

const traits = ["Collar", "Placa", "Panuelo", "Mancha blanca", "Oreja doblada", "Cola corta", "Cojera", "Herida visible", "Ojo de color distinto", "Otro"];
const fallbackPhoto = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80";
const DRAFT_KEY = "huella:sighting-draft";
type FieldErrors = Record<string, string>;

type SightingDraft = {
  especie: string;
  tamano: string;
  color: string;
  ubicacion: string;
  vistoEn: string;
  comentario: string;
  rasgos: string[];
  rasgoOtro: string;
  situacion: string;
  photoDataUrl: string | null;
};

const defaultDraft: SightingDraft = {
  especie: "Perro",
  tamano: "Mediano",
  color: "",
  ubicacion: "",
  vistoEn: "",
  comentario: "",
  rasgos: [],
  rasgoOtro: "",
  situacion: "solo_la_vi",
  photoDataUrl: null,
};

const quickSituations = [
  ["solo_la_vi", "La vi"],
  ["la_tengo_conmigo", "La tengo resguardada"],
  ["herida", "Esta herida"],
  ["siguiendo", "La estoy siguiendo"],
];

function loadDraft() {
  if (typeof window === "undefined") return defaultDraft;
  const raw = window.sessionStorage.getItem(DRAFT_KEY);
  return raw ? { ...defaultDraft, ...JSON.parse(raw) as Partial<SightingDraft> } : defaultDraft;
}

function locationLabel(details: LocationDetails | null, address: string) {
  return details?.district || details?.province || details?.department || address || "Ubicacion exacta";
}

export default function ReportSightingPage() {
  const [draft, setDraft] = useState<SightingDraft>(defaultDraft);
  const [coords, setCoords] = useState(defaultPeruCoords());
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);
  const [matches, setMatches] = useState<CaseMatch[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [associationMessage, setAssociationMessage] = useState("");
  const [reviewedMatches, setReviewedMatches] = useState(false);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usingGps, setUsingGps] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const saved = loadDraft();
    setDraft(saved);
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }));
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  function resetMatches() {
    setReviewedMatches(false);
    setSelectedCaseId("");
    setAssociationMessage("");
    setMatches([]);
  }

  async function useLocation() {
    if (usingGps) return;
    setUsingGps(true);
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener la ubicacion.");
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
      setError(friendlyError(caught, "No pudimos tomar tu ubicacion. Puedes seguir con una referencia cercana."));
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
        setError("No encontramos esa direccion. Prueba con una referencia mas especifica.");
        return;
      }
      setCoords({ latitude: details.latitude, longitude: details.longitude });
      setLocationDetails(details);
      updateDraft("ubicacion", details.address);
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos buscar esa direccion. Prueba con otra referencia."));
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

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
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

  function toggleTrait(trait: string, checked: boolean) {
    const next = checked ? [...draft.rasgos, trait] : draft.rasgos.filter((item) => item !== trait);
    updateDraft("rasgos", Array.from(new Set(next)));
  }

  function selectCase(match: CaseMatch) {
    setSelectedCaseId(match.caseId);
    setAssociationMessage(`Avistamiento asociado a ${match.pet.nombre}. Presiona "Unir a este caso" para finalizar.`);
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

    const especie = String(form.get("especie") || draft.especie);
    const tamano = String(form.get("tamano") || draft.tamano);
    const color = String(form.get("color") || draft.color);
    const rawRasgos = form.getAll("rasgos").map(String);
    const rasgos = rawRasgos.includes("Otro") ? [...rawRasgos.filter((trait) => trait !== "Otro"), draft.rasgoOtro.trim()].filter(Boolean) : rawRasgos;
    const seenAt = String(form.get("visto_en") || draft.vistoEn);
    const file = photoFile;
    const errors: FieldErrors = {};
    const ubicacionError = requiredText(form.get("ubicacion") || draft.ubicacion, "La ubicacion", 240);
    if (ubicacionError) errors.ubicacion = ubicacionError;
    const comentarioError = requiredText(form.get("comentario") || draft.comentario, "La descripcion", 1000);
    if (comentarioError) errors.comentario = comentarioError;
    const dateError = validateNotFuture(seenAt, "La fecha del avistamiento");
    if (dateError) errors.visto_en = dateError;
    const imageError = validateImageFile(file);
    if (imageError) errors.foto = imageError;
    if (showFieldErrors(errors)) {
      setError("");
      return;
    }

    setSaving(true);
    setError("");
    let user;
    let foundMatches: CaseMatch[] = [];
    try {
      user = await getCurrentUser();
      foundMatches = await findLostPetMatches({ especie, tamano, color, distrito: locationLabel(locationDetails, draft.ubicacion), rasgos, fecha: seenAt, latitude: coords.latitude, longitude: coords.longitude });
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos revisar coincidencias. Intenta nuevamente."));
      setSaving(false);
      return;
    }

    if (foundMatches.length && !reviewedMatches) {
      setMatches(foundMatches);
      setReviewedMatches(true);
      setSaving(false);
      return;
    }

    try {
      let foto: string | null = draft.photoDataUrl;
      if (file?.size) foto = await uploadImage(file);

      const selectedMatch = matches.find((match) => match.caseId === selectedCaseId);
      let reportId: string | null = selectedMatch?.caseId ?? null;
      let petId: string | null = selectedMatch?.petId ?? null;

      if (!selectedMatch && user) {
        const photoUrl = foto ?? fallbackPhoto;
        const pet = await createRegisteredPet({
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
          telefono: "",
          contacto_preferido: "whatsapp",
          fotos: [photoUrl],
          foto_principal: photoUrl,
          foto_url: photoUrl,
          rasgo_privado: "",
        });
        const report = await createReport({
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
        reportId = report.id;
        petId = pet.id;
      }

      const situacionTexto = quickSituations.find(([value]) => value === draft.situacion)?.[1] ?? "La vi";
      const comentario = `${String(form.get("comentario"))}\nSituacion observada: ${situacionTexto}`;

      await createSighting({
        pet_id: petId,
        report_id: reportId,
        especie,
        tamano,
        color,
        distrito: locationLabel(locationDetails, draft.ubicacion),
        comentario,
        foto,
        ubicacion: String(form.get("ubicacion") || draft.ubicacion),
        visto_en: seenAt,
        situacion: draft.situacion as Sighting["situacion"],
        latitud: coords.latitude,
        longitud: coords.longitude,
      });

      if (selectedMatch) {
        await createNotification({
          pet_id: selectedMatch.pet.id,
          tipo: selectedMatch.level === "alta" ? "coincidencia_alta" : "nuevo_avistamiento",
          mensaje: `Se encontro una coincidencia ${selectedMatch.level} para ${selectedMatch.pet.nombre}.`,
        });
      }

      setSent(true);
      window.sessionStorage.removeItem(DRAFT_KEY);
      setDraft(defaultDraft);
      setPhotoFile(null);
      formElement.reset();
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos enviar el avistamiento. Revisa tu conexion e intentalo otra vez."));
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <main className="container py-6">
        <section className="form-card mx-auto max-w-xl space-y-4">
          <ProgressiveSigninCard context="sighting" />
          <div className="rounded-xl bg-[#E1F5EE] p-4 font-semibold text-[#085041]"><strong className="block text-lg">Avistamiento registrado correctamente.</strong>Quedo asociado al caso correspondiente o guardado como nuevo seguimiento para que el equipo y la familia puedan revisarlo.</div>
          <Button asChild><Link href="/">Volver al inicio</Link></Button>
        </section>
      </main>
    );
  }

  return (
    <main className="container py-6">
      {cropFile && <ImageCropper file={cropFile} onCancel={() => setCropFile(null)} onApply={(file, previewUrl) => {
        setPhotoFile(file);
        updateDraft("photoDataUrl", previewUrl);
        setCropFile(null);
      }} />}
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Inicio</Link>
      <div className="mb-5"><h1 className="font-serif text-4xl">Vi una mascota</h1><p className="mt-2 text-[#6B6860]">Primero buscamos si corresponde a un caso activo. Solo se guarda despues de revisar coincidencias.</p></div>
      <form ref={formRef} onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="form-card space-y-4">
          {error && <FriendlyError message={error} />}
          <input ref={cameraInputRef} className="sr-only" name="foto_camara" type="file" accept="image/*" capture="environment" onClick={(event) => { event.currentTarget.value = ""; }} onChange={handlePhoto} />
          <input ref={galleryInputRef} className="sr-only" name="foto_galeria" type="file" accept="image/*" onClick={(event) => { event.currentTarget.value = ""; }} onChange={handlePhoto} />
          <div className="grid gap-2 min-[390px]:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={saving}><Camera size={18} />Tomar foto</Button>
            <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()} disabled={saving}><ImageIcon size={18} />Elegir desde galeria</Button>
          </div>
          {draft.photoDataUrl && <img src={draft.photoDataUrl} alt="Foto recortada" className="max-h-56 w-full rounded-xl bg-[#F8F7F4] object-contain" />}
          {fieldErrors.foto && <p className="text-sm font-semibold text-[#B42318]">{fieldErrors.foto}</p>}
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label">Especie *</label><select className="select" name="especie" value={draft.especie} onChange={(event) => updateDraft("especie", event.target.value)}><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div>
            <div><label className="label">Tamano *</label><select className="select" name="tamano" value={draft.tamano} onChange={(event) => updateDraft("tamano", event.target.value)}><option>Pequeno</option><option>Mediano</option><option>Grande</option></select></div>
          </div>
          <div><label className="label">Color *</label><input required maxLength={120} className="field" name="color" value={draft.color} onChange={(event) => updateDraft("color", event.target.value)} placeholder="Marron, blanco, negro..." /></div>
          <div>
            <label className="label">Ubicacion *</label>
            <div className="grid gap-2 min-[390px]:grid-cols-[1fr_auto]">
              <input ref={addressInputRef} required maxLength={240} className="field" name="ubicacion" value={draft.ubicacion} onChange={(event) => updateDraft("ubicacion", event.target.value)} placeholder="Calle, parque o referencia" aria-invalid={Boolean(fieldErrors.ubicacion)} />
              <Button type="button" variant="outline" onClick={searchAddress} disabled={searchingAddress || saving}><Search size={18} />{searchingAddress ? "Buscando..." : "Buscar"}</Button>
            </div>
            {fieldErrors.ubicacion && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.ubicacion}</p>}
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={useLocation} disabled={usingGps || saving}><MapPin size={18} />{usingGps ? "Obteniendo ubicacion..." : "Usar mi ubicacion actual"}</Button>
          <div className="map-panel min-h-[300px] overflow-hidden rounded-2xl">
            <LocationPicker value={coords} onChange={(value) => { void movePin(value.latitude, value.longitude); }} />
          </div>
          <div className="grid gap-2 min-[390px]:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => setError("")} disabled={saving}>Usar esta zona</Button>
            <Button type="button" variant="outline" onClick={() => addressInputRef.current?.focus()} disabled={saving}>Cambiar ubicacion</Button>
          </div>
          <p className="text-xs text-[#6B6860]">Arrastra el pin al punto exacto. El pin manda sobre la direccion.</p>
          <div><label className="label">Fecha y hora *</label><input required className="field" type="datetime-local" name="visto_en" value={draft.vistoEn} onChange={(event) => updateDraft("vistoEn", event.target.value)} aria-invalid={Boolean(fieldErrors.visto_en)} />{fieldErrors.visto_en && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.visto_en}</p>}</div>
          <div><label className="label">Situacion observada</label><div className="grid gap-2 min-[390px]:grid-cols-2">{quickSituations.map(([value, label]) => <button key={value} type="button" onClick={() => updateDraft("situacion", value)} className={`min-h-11 rounded-xl border px-3 text-left text-sm font-semibold ${draft.situacion === value ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]" : "border-black/10 bg-white text-[#4D4A43]"}`}>{label}</button>)}</div></div>
          <div><label className="label">Comentario *</label><textarea required maxLength={1000} className="textarea min-h-24" name="comentario" value={draft.comentario} onChange={(event) => updateDraft("comentario", event.target.value)} placeholder="Que hacia, como se veia, si parecia asustada..." aria-invalid={Boolean(fieldErrors.comentario)} />{fieldErrors.comentario && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.comentario}</p>}</div>
          <div><label className="label">Rasgos distintivos</label><div className="grid gap-2 md:grid-cols-2">{traits.map((trait) => <label key={trait} className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="rasgos" value={trait} checked={draft.rasgos.includes(trait)} onChange={(event) => toggleTrait(trait, event.target.checked)} />{trait}</label>)}</div>{draft.rasgos.includes("Otro") && <div className="mt-3"><label className="label">Describe el rasgo</label><input className="field" value={draft.rasgoOtro} onChange={(event) => updateDraft("rasgoOtro", event.target.value)} maxLength={240} placeholder="Ej. cicatriz, collar especial, comportamiento" /></div>}</div>
          {associationMessage && <div className="rounded-xl bg-[#E1F5EE] p-3 text-sm font-semibold text-[#085041]">{associationMessage}</div>}
          <Button disabled={saving}>{saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Send size={18} />}{saving ? "Registrando avistamiento..." : matches.length && reviewedMatches ? selectedCaseId ? "Unir a este caso" : "Enviar avistamiento" : "Buscar coincidencias"}</Button>
        </section>
        <aside className="space-y-3">
          <div className="form-card"><h2 className="font-bold">Coincidencias</h2><p className="mt-2 text-sm text-[#6B6860]">Se comparan especie, color, tamano, fecha, rasgos y distancia geografica.</p>{reviewedMatches && !selectedCaseId && <p className="mt-2 text-sm font-semibold text-[#6B4A10]">Si ninguna coincide, se creara un caso de seguimiento para centralizar futuros avistamientos.</p>}</div>
          {matches.map((match) => (
            <article key={match.caseId} className={`form-card ${selectedCaseId === match.caseId ? "border-[#1D9E75] bg-[#FAFDFB]" : ""}`}>
              <div className="flex gap-3">
                <img src={match.pet.foto_principal} alt={match.pet.nombre} className="h-16 w-16 rounded-lg object-contain bg-[#F8F7F4]" loading="lazy" />
                <div>
                  <strong>Coincidencia {match.level}</strong>
                  <p className="text-sm text-[#7A7871]">{match.pet.nombre} - {match.pet.tipo}</p>
                  <p className="text-xs text-[#1D9E75]">{match.percentage}% - {match.reasons.slice(0, 3).join(" - ")}</p>
                  {match.distance !== null && <p className="text-sm font-semibold text-[#1D9E75]">{formatDistance(match.distance)}</p>}
                </div>
              </div>
              <div className="mt-3 grid gap-2 min-[390px]:flex"><Button type="button" size="sm" onClick={() => selectCase(match)}>Corresponde</Button><Button type="button" size="sm" variant="outline" asChild><Link href={`/pet/${match.caseId}`}>Ver centro de busqueda</Link></Button></div>
            </article>
          ))}
          {matches.length > 0 && <Button type="button" variant="outline" className="w-full" onClick={() => setSelectedCaseId("")}>Ninguna coincide</Button>}
        </aside>
      </form>
    </main>
  );
}

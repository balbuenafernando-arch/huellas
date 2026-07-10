"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressiveSigninCard } from "@/components/progressive-signin-card";
import { createNotification, createSighting } from "@/lib/pet-store";
import type { Sighting } from "@/lib/demo-data";
import { fileToDataUrl } from "@/lib/image-utils";
import { findLostPetMatches } from "@/lib/matching";
import { createRegisteredPet, createReport, getCurrentUser } from "@/lib/sprint14-store";
import { formatDistance } from "@/lib/utils";
import type { CaseMatch } from "@/lib/cases";
import { uploadImage } from "@/services/image-service";
import { FriendlyError } from "@/components/feedback";
import { friendlyError, requiredText, validateImageFile, validateNotFuture } from "@/lib/form-validation";
import { defaultPeruCoords, getCurrentLocationDetails, searchPeruLocation } from "@/lib/location";

const traits = ["Collar", "Placa", "Pañuelo", "Mancha blanca", "Oreja doblada", "Cola corta", "Cojera", "Herida visible", "Ojo de color distinto", "Otro"];
const fallbackPhoto = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80";
const DRAFT_KEY = "huella:sighting-draft";

type SightingDraft = {
  especie: string;
  tamano: string;
  color: string;
  ubicacion: string;
  distrito: string;
  vistoEn: string;
  comentario: string;
  rasgos: string[];
  situacion: string;
  photoDataUrl: string | null;
};

const defaultDraft: SightingDraft = {
  especie: "Perro",
  tamano: "Mediano",
  color: "",
  ubicacion: "",
  distrito: "",
  vistoEn: "",
  comentario: "",
  rasgos: [],
  situacion: "solo_la_vi",
  photoDataUrl: null,
};

const quickSituations = [
  ["solo_la_vi", "La vi"],
  ["la_tengo_conmigo", "La tengo resguardada"],
  ["herida", "Está herida"],
  ["siguiendo", "La estoy siguiendo"],
  ["otra_mascota", "No era la mascota buscada"],
];

function loadDraft() {
  if (typeof window === "undefined") return defaultDraft;
  const raw = window.sessionStorage.getItem(DRAFT_KEY);
  return raw ? { ...defaultDraft, ...JSON.parse(raw) as Partial<SightingDraft> } : defaultDraft;
}

export default function ReportSightingPage() {
  const [draft, setDraft] = useState<SightingDraft>(defaultDraft);
  const [district, setDistrict] = useState(defaultDraft.distrito);
  const [province, setProvince] = useState("");
  const [department, setDepartment] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [otherTrait, setOtherTrait] = useState("");
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [matches, setMatches] = useState<CaseMatch[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [associationMessage, setAssociationMessage] = useState("");
  const [reviewedMatches, setReviewedMatches] = useState(false);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = loadDraft();
    setDraft(saved);
    setDistrict(saved.distrito);
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, distrito: district }));
  }, [draft, district]);

  function applyLocation(details: { latitude: number; longitude: number; address: string; district: string; province: string; department: string }) {
    setCoords({ latitude: details.latitude, longitude: details.longitude });
    setDistrict(details.district);
    setProvince(details.province);
    setDepartment(details.department);
    updateDraft("ubicacion", details.address);
    setReviewedMatches(false);
    setAssociationMessage("");
  }

  async function useLocation() {
    setLocating(true);
    setError("");
    setLocationMessage("");
    try {
      const details = await getCurrentLocationDetails();
      applyLocation(details);
      setLocationMessage("Ubicación actual detectada.");
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos tomar tu ubicación. Puedes seguir con una referencia cercana."));
    } finally {
      setLocating(false);
    }
  }

  async function searchLocation() {
    const query = locationQuery.trim();
    if (!query) return;
    setLocating(true);
    setError("");
    setLocationMessage("");
    try {
      const details = await searchPeruLocation(query);
      if (!details) {
        setLocationMessage("No encontramos esa referencia. Prueba con una avenida, parque o ciudad.");
        return;
      }
      applyLocation(details);
      setLocationMessage("Ubicación encontrada.");
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos buscar esa ubicación. Intenta con otra referencia."));
    } finally {
      setLocating(false);
    }
  }

  function updateDraft<K extends keyof SightingDraft>(key: K, value: SightingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setReviewedMatches(false);
    setSelectedCaseId("");
    setAssociationMessage("");
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPhotoFile(file);
    if (!file) {
      updateDraft("photoDataUrl", null);
      return;
    }
    try {
      updateDraft("photoDataUrl", await fileToDataUrl(file));
      setError("");
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos preparar la foto. Intenta con otra imagen."));
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const formElement: HTMLFormElement = event.currentTarget;
    const form = new FormData(formElement);

    const especie = String(form.get("especie") || draft.especie);
    const tamano = String(form.get("tamano") || draft.tamano);
    const color = String(form.get("color") || draft.color);
    const rasgos = form.getAll("rasgos").map(String);
    const customTrait = otherTrait.trim();
    if (customTrait) rasgos.push(customTrait);
    const seenAt = String(form.get("visto_en") || draft.vistoEn);
    const fallback = defaultPeruCoords();
    const reportDistrict = district || province || department || "Perú";
    const latitude = coords.latitude ?? fallback.latitude;
    const longitude = coords.longitude ?? fallback.longitude;
    const file = photoFile ?? form.get("foto") as File | null;
    const validationMessage =
      requiredText(form.get("ubicacion") || draft.ubicacion, "La ubicación", 240) ||
      requiredText(form.get("comentario") || draft.comentario, "La descripción", 1000) ||
      validateNotFuture(seenAt, "La fecha del avistamiento") ||
      validateImageFile(file);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);
    setError("");
    let user;
    let foundMatches: CaseMatch[] = [];
    try {
      user = await getCurrentUser();
      foundMatches = await findLostPetMatches({ especie, tamano, color, distrito: reportDistrict, rasgos, fecha: seenAt, latitude, longitude });
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
          distrito: reportDistrict,
          descripcion: String(form.get("comentario")),
          foto_url: photoUrl,
          whatsapp: "",
          latitude,
          longitude,
          pet,
        });
        reportId = report.id;
        petId = pet.id;
      }

      const situacionTexto = quickSituations.find(([value]) => value === draft.situacion)?.[1] ?? "La vi";
      const comentario = `${String(form.get("comentario"))}\nSituación observada: ${situacionTexto}`;

      await createSighting({
        pet_id: petId,
        report_id: reportId,
        especie,
        tamano,
        color,
        distrito: reportDistrict,
        comentario,
        foto,
        ubicacion: String(form.get("ubicacion") || draft.ubicacion),
        visto_en: seenAt,
        situacion: draft.situacion as Sighting["situacion"],
        latitud: latitude,
        longitud: longitude,
      });

      if (selectedMatch) {
        await createNotification({
          pet_id: selectedMatch.pet.id,
          tipo: selectedMatch.level === "alta" ? "coincidencia_alta" : "nuevo_avistamiento",
          mensaje: `Se encontró una coincidencia ${selectedMatch.level} para ${selectedMatch.pet.nombre}.`,
        });
      }

      setSent(true);
      window.sessionStorage.removeItem(DRAFT_KEY);
      setDraft(defaultDraft);
      setPhotoFile(null);
      formElement.reset();
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos enviar el avistamiento. Revisa tu conexión e inténtalo otra vez."));
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <main className="container py-6">
        <section className="form-card mx-auto max-w-xl space-y-4">
          <ProgressiveSigninCard context="sighting" />
          <div className="rounded-xl bg-[#E1F5EE] p-3 font-semibold text-[#085041]">Avistamiento recibido. Gracias por detenerte a ayudar.</div>
          <Button asChild><Link href="/">Volver al inicio</Link></Button>
        </section>
      </main>
    );
  }

  return (
    <main className="container py-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Inicio</Link>
      <div className="mb-5"><h1 className="font-serif text-4xl">Vi una mascota</h1><p className="mt-2 text-[#6B6860]">Primero buscamos si corresponde a un caso activo. Solo se crea un caso nuevo si ninguna coincidencia aplica.</p></div>
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="form-card space-y-4">
          {error && <FriendlyError message={error} />}
          <div className="upload-box">
            <Camera className="mx-auto mb-2 text-[#1D9E75]" />
            <p className="font-semibold">Tomar o subir foto</p>
            <p className="text-sm text-[#7A7871]">Una imagen ayuda a reconocer rasgos y unir avistamientos al caso correcto.</p>
            <input className="field mt-3" name="foto" type="file" accept="image/*" capture="environment" onClick={(event) => { event.currentTarget.value = ""; }} onChange={handlePhoto} />
            {draft.photoDataUrl && <p className="mt-2 text-xs font-semibold text-[#1D9E75]">Foto conservada en este formulario.</p>}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label">Especie</label><select className="select" name="especie" value={draft.especie} onChange={(event) => updateDraft("especie", event.target.value)}><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div>
            <div><label className="label">Tamaño</label><select className="select" name="tamano" value={draft.tamano} onChange={(event) => updateDraft("tamano", event.target.value)}><option>Pequeño</option><option>Mediano</option><option>Grande</option></select></div>
          </div>
          <div><label className="label">Color</label><input required maxLength={120} className="field" name="color" value={draft.color} onChange={(event) => updateDraft("color", event.target.value)} placeholder="Marrón, blanco, negro..." /></div>
          <div><label className="label">Ubicación</label><input required maxLength={240} className="field" name="ubicacion" value={draft.ubicacion} onChange={(event) => updateDraft("ubicacion", event.target.value)} placeholder="Calle, parque o referencia" /></div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input className="field" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Buscar dirección, parque o ciudad" />
            <Button type="button" variant="outline" onClick={searchLocation} disabled={locating}>Buscar</Button>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={useLocation} disabled={locating}><MapPin size={18} />{locating ? "Ubicando..." : "Usar mi ubicación actual"}</Button>
          {locationMessage && <p className="text-xs font-semibold text-[#1D9E75]">{locationMessage}</p>}
          <div className="grid gap-3 md:grid-cols-3">
            <div><label className="label">Distrito o zona</label><input maxLength={120} className="field" value={district} onChange={(event) => { setDistrict(event.target.value); setReviewedMatches(false); setAssociationMessage(""); }} placeholder="Ej. Wanchaq" /></div>
            <div><label className="label">Provincia</label><input maxLength={120} className="field" value={province} onChange={(event) => setProvince(event.target.value)} placeholder="Ej. Cusco" /></div>
            <div><label className="label">Departamento</label><input maxLength={120} className="field" value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Ej. Cusco" /></div>
          </div>
          <div><label className="label">Fecha y hora</label><input required className="field" type="datetime-local" name="visto_en" value={draft.vistoEn} onChange={(event) => updateDraft("vistoEn", event.target.value)} /></div>
          <div><label className="label">Situación observada</label><div className="grid gap-2 min-[390px]:grid-cols-2">{quickSituations.map(([value, label]) => <button key={value} type="button" onClick={() => updateDraft("situacion", value)} className={`min-h-11 rounded-xl border px-3 text-left text-sm font-semibold ${draft.situacion === value ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]" : "border-black/10 bg-white text-[#4D4A43]"}`}>{label}</button>)}</div>{draft.situacion === "otra_mascota" && <p className="mt-2 text-xs text-[#6B6860]">Usa esta opción si el avistamiento ayuda a descartar una coincidencia con el caso revisado.</p>}</div>
          <div><label className="label">Comentario</label><textarea required maxLength={1000} className="textarea min-h-24" name="comentario" value={draft.comentario} onChange={(event) => updateDraft("comentario", event.target.value)} placeholder="Qué hacía, cómo se veía, si parecía asustada..." /></div>
          <div><label className="label">Rasgos distintivos</label><div className="grid gap-2 md:grid-cols-2">{traits.map((trait) => <label key={trait} className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="rasgos" value={trait} checked={draft.rasgos.includes(trait)} onChange={(event) => toggleTrait(trait, event.target.checked)} />{trait}</label>)}</div>{draft.rasgos.includes("Otro") && <input className="field mt-2" maxLength={120} value={otherTrait} onChange={(event) => setOtherTrait(event.target.value)} placeholder="Describe el rasgo distintivo" />}</div>
          {associationMessage && <div className="rounded-xl bg-[#E1F5EE] p-3 text-sm font-semibold text-[#085041]">{associationMessage}</div>}
          <Button disabled={saving}><Send size={18} />{saving ? "Enviando avistamiento..." : matches.length && reviewedMatches ? selectedCaseId ? "Unir a este caso" : "Enviar avistamiento" : "Buscar coincidencias"}</Button>
        </section>
        <aside className="space-y-3">
          <div className="form-card"><h2 className="font-bold">Encontramos posibles coincidencias</h2><p className="mt-2 text-sm text-[#6B6860]">Se comparan especie, color, tamaño, distrito, fecha, rasgos y distancia geográfica.</p>{reviewedMatches && !selectedCaseId && <p className="mt-2 text-sm font-semibold text-[#6B4A10]">Si ninguna coincide, se creará un caso de seguimiento para centralizar futuros avistamientos.</p>}</div>
          {matches.map((match) => (
            <article key={match.caseId} className={`form-card ${selectedCaseId === match.caseId ? "border-[#1D9E75] bg-[#FAFDFB]" : ""}`}>
              <div className="flex gap-3">
                <img src={match.pet.foto_principal} alt={match.pet.nombre} className="h-16 w-16 rounded-lg object-cover" loading="lazy" />
                <div>
                  <strong>Coincidencia {match.level}</strong>
                  <p className="text-sm text-[#7A7871]">{match.pet.nombre} - {match.pet.tipo} - {match.pet.distrito}</p>
                  <p className="text-xs text-[#1D9E75]">{match.percentage}% - {match.reasons.slice(0, 3).map((reason) => `✓ ${reason}`).join(" - ")}</p>
                  {match.distance !== null && <p className="text-sm font-semibold text-[#1D9E75]">{formatDistance(match.distance)}</p>}
                </div>
              </div>
              <div className="mt-3 grid gap-2 min-[390px]:flex"><Button type="button" size="sm" onClick={() => selectCase(match)}>Sí corresponde</Button><Button type="button" size="sm" variant="outline" asChild><Link href={`/pet/${match.caseId}`}>Ver centro de búsqueda</Link></Button></div>
            </article>
          ))}
          {matches.length > 0 && <Button type="button" variant="outline" className="w-full" onClick={() => setSelectedCaseId("")}>Ninguna coincide</Button>}
        </aside>
      </form>
    </main>
  );
}

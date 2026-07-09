"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createNotification, createSighting } from "@/lib/pet-store";
import type { Sighting } from "@/lib/demo-data";
import { fileToDataUrl } from "@/lib/image-utils";
import { findLostPetMatches } from "@/lib/matching";
import { createRegisteredPet, createReport, getCurrentUser } from "@/lib/sprint14-store";
import { formatDistance } from "@/lib/utils";
import type { CaseMatch } from "@/lib/cases";
import { uploadImage } from "@/services/image-service";

const districtCoords: Record<string, [number, number]> = {
  Miraflores: [-12.1211, -77.0297],
  "San Isidro": [-12.0975, -77.0366],
  Surco: [-12.1278, -76.9849],
  Barranco: [-12.1499, -77.0215],
  "San Borja": [-12.0969, -76.9996],
  Magdalena: [-12.0916, -77.0679],
  "Pueblo Libre": [-12.0763, -77.0611],
  "La Molina": [-12.0864, -76.9224],
  Lince: [-12.0846, -77.0348],
  "Jesus Maria": [-12.0706, -77.0432],
  Chorrillos: [-12.1823, -77.0301],
  Surquillo: [-12.1121, -77.0116],
};

const traits = ["Collar", "Placa", "Panuelo", "Mancha blanca", "Oreja doblada", "Cola corta", "Cojera", "Herida visible", "Ojo de color distinto", "Otro"];
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
  direccionAnimal: string;
  photoDataUrl: string | null;
};

const defaultDraft: SightingDraft = {
  especie: "Perro",
  tamano: "Mediano",
  color: "",
  ubicacion: "",
  distrito: "Miraflores",
  vistoEn: "",
  comentario: "",
  rasgos: [],
  situacion: "solo_la_vi",
  direccionAnimal: "quieto",
  photoDataUrl: null,
};

const directions = [
  ["norte", "Norte"],
  ["sur", "Sur"],
  ["oeste", "Oeste"],
  ["este", "Este"],
  ["quieto", "Quieto"],
];

const quickSituations = [
  ["solo_la_vi", "La vi"],
  ["la_tengo_conmigo", "La tengo resguardada"],
  ["herida", "Esta herida"],
  ["siguiendo", "La estoy siguiendo"],
  ["otra_mascota", "Era otra mascota"],
];

function loadDraft() {
  if (typeof window === "undefined") return defaultDraft;
  const raw = window.sessionStorage.getItem(DRAFT_KEY);
  return raw ? { ...defaultDraft, ...JSON.parse(raw) as Partial<SightingDraft> } : defaultDraft;
}

export default function ReportSightingPage() {
  const [draft, setDraft] = useState<SightingDraft>(defaultDraft);
  const [district, setDistrict] = useState(defaultDraft.distrito);
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
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }));
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, distrito: district }));
  }, [draft, district]);

  function useLocation() {
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener la ubicacion.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setError("");
      },
      () => setError("No pudimos tomar tu ubicacion. Puedes seguir con una referencia cercana."),
    );
  }

  function updateDraft<K extends keyof SightingDraft>(key: K, value: SightingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setReviewedMatches(false);
    setSelectedCaseId("");
    setAssociationMessage("");
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (!file) {
      updateDraft("photoDataUrl", null);
      return;
    }
    updateDraft("photoDataUrl", await fileToDataUrl(file));
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
    const formElement: HTMLFormElement = event.currentTarget;
    const form = new FormData(formElement);
    const user = await getCurrentUser();

    const especie = String(form.get("especie") || draft.especie);
    const tamano = String(form.get("tamano") || draft.tamano);
    const color = String(form.get("color") || draft.color);
    const rasgos = form.getAll("rasgos").map(String);
    const seenAt = String(form.get("visto_en") || draft.vistoEn);
    const [fallbackLat, fallbackLng] = districtCoords[district] ?? districtCoords.Miraflores;
    const latitude = coords.latitude ?? fallbackLat;
    const longitude = coords.longitude ?? fallbackLng;
    const foundMatches = await findLostPetMatches({ especie, tamano, color, distrito: district, rasgos, fecha: seenAt, latitude, longitude });

    if (foundMatches.length && !reviewedMatches) {
      setMatches(foundMatches);
      setReviewedMatches(true);
      return;
    }

    setSaving(true);
    setError("");
    const file = photoFile ?? form.get("foto") as File | null;
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
        distrito: district,
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

    const direccionTexto = directions.find(([value]) => value === draft.direccionAnimal)?.[1] ?? "Quieto";
    const situacionTexto = quickSituations.find(([value]) => value === draft.situacion)?.[1] ?? "La vi";
    const comentario = `${String(form.get("comentario"))}\nSituacion: ${situacionTexto}\nDireccion del animal: ${direccionTexto}`;

    await createSighting({
      pet_id: petId,
      report_id: reportId,
      especie,
      tamano,
      color,
      distrito: district,
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
        mensaje: `Se encontro una coincidencia ${selectedMatch.level} para ${selectedMatch.pet.nombre}.`,
      });
    }

    setSaving(false);
    setSent(true);
    window.sessionStorage.removeItem(DRAFT_KEY);
    setDraft(defaultDraft);
    setPhotoFile(null);
    formElement.reset();
  }

  if (sent) {
    return (
      <main className="container py-6">
        <section className="form-card mx-auto max-w-xl space-y-4">
          <div className="rounded-xl bg-[#E1F5EE] p-3 font-semibold text-[#085041]">Pista recibida. Gracias por detenerte a ayudar.</div>
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
          {error && <div className="rounded-xl bg-[#FAECE7] p-3 text-sm text-[#712B13]">{error}</div>}
          <div className="upload-box">
            <Camera className="mx-auto mb-2 text-[#1D9E75]" />
            <p className="font-semibold">Tomar o subir foto</p>
            <p className="text-sm text-[#7A7871]">Una imagen ayuda a reconocer rasgos y unir pistas al caso correcto.</p>
            <input className="field mt-3" name="foto" type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
            {draft.photoDataUrl && <p className="mt-2 text-xs font-semibold text-[#1D9E75]">Foto conservada en este formulario.</p>}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label">Especie</label><select className="select" name="especie" value={draft.especie} onChange={(event) => updateDraft("especie", event.target.value)}><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div>
            <div><label className="label">Tamano</label><select className="select" name="tamano" value={draft.tamano} onChange={(event) => updateDraft("tamano", event.target.value)}><option>Pequeno</option><option>Mediano</option><option>Grande</option></select></div>
          </div>
          <div><label className="label">Color</label><input required className="field" name="color" value={draft.color} onChange={(event) => updateDraft("color", event.target.value)} placeholder="Marron, blanco, negro..." /></div>
          <div><label className="label">Ubicacion</label><input required className="field" name="ubicacion" value={draft.ubicacion} onChange={(event) => updateDraft("ubicacion", event.target.value)} placeholder="Calle, parque o referencia" /></div>
          <Button type="button" variant="outline" className="w-full" onClick={useLocation}><MapPin size={18} />Usar mi ubicacion actual</Button>
          <div><label className="label">Distrito</label><select className="select" value={district} onChange={(event) => { setDistrict(event.target.value); setReviewedMatches(false); setAssociationMessage(""); }}>{Object.keys(districtCoords).map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="label">Fecha y hora</label><input required className="field" type="datetime-local" name="visto_en" value={draft.vistoEn} onChange={(event) => updateDraft("vistoEn", event.target.value)} /></div>
          <div><label className="label">Situacion observada</label><div className="grid gap-2 min-[390px]:grid-cols-2">{quickSituations.map(([value, label]) => <button key={value} type="button" onClick={() => updateDraft("situacion", value)} className={`min-h-11 rounded-xl border px-3 text-left text-sm font-semibold ${draft.situacion === value ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]" : "border-black/10 bg-white text-[#4D4A43]"}`}>{label}</button>)}</div></div>
          <div><label className="label">Direccion del animal</label><div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-5">{directions.map(([value, label]) => <button key={value} type="button" onClick={() => updateDraft("direccionAnimal", value)} className={`min-h-11 rounded-xl border px-2 text-sm font-semibold ${draft.direccionAnimal === value ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]" : "border-black/10 bg-white text-[#4D4A43]"}`}>{label}</button>)}</div></div>
          <div><label className="label">Comentario</label><textarea required className="textarea min-h-24" name="comentario" value={draft.comentario} onChange={(event) => updateDraft("comentario", event.target.value)} placeholder="Que hacia, hacia donde iba, si parecia asustada..." /></div>
          <div><label className="label">Rasgos distintivos</label><div className="grid gap-2 md:grid-cols-2">{traits.map((trait) => <label key={trait} className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="rasgos" value={trait} checked={draft.rasgos.includes(trait)} onChange={(event) => toggleTrait(trait, event.target.checked)} />{trait}</label>)}</div></div>
          {associationMessage && <div className="rounded-xl bg-[#E1F5EE] p-3 text-sm font-semibold text-[#085041]">{associationMessage}</div>}
          <Button disabled={saving}><Send size={18} />{saving ? "Enviando pista..." : matches.length && reviewedMatches ? selectedCaseId ? "Unir a este caso" : "Enviar pista" : "Buscar coincidencias"}</Button>
        </section>
        <aside className="space-y-3">
          <div className="form-card"><h2 className="font-bold">Encontramos posibles coincidencias</h2><p className="mt-2 text-sm text-[#6B6860]">Se comparan especie, color, tamano, distrito, fecha, rasgos y distancia geografica.</p>{reviewedMatches && !selectedCaseId && <p className="mt-2 text-sm font-semibold text-[#6B4A10]">Si ninguna coincide, se creara un caso de seguimiento para centralizar futuras pistas.</p>}</div>
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
              <div className="mt-3 grid gap-2 min-[390px]:flex"><Button type="button" size="sm" onClick={() => selectCase(match)}>Este corresponde</Button><Button type="button" size="sm" variant="outline" asChild><Link href={`/pet/${match.caseId}`}>Ver caso</Link></Button></div>
            </article>
          ))}
          {matches.length > 0 && <Button type="button" variant="outline" className="w-full" onClick={() => setSelectedCaseId("")}>Ninguna coincide</Button>}
        </aside>
      </form>
    </main>
  );
}

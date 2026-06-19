"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createNotification, createSighting } from "@/lib/pet-store";
import { compressImage, fileToDataUrl } from "@/lib/image-utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { findLostPetMatches } from "@/lib/matching";
import { getCurrentUser } from "@/lib/sprint14-store";
import { formatDistance } from "@/lib/utils";
import type { Pet } from "@/lib/demo-data";

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
  "Jesús María": [-12.0706, -77.0432],
  Chorrillos: [-12.1823, -77.0301],
  Surquillo: [-12.1121, -77.0116],
};

const traits = ["Collar", "Placa", "Pañuelo", "Mancha blanca", "Oreja doblada", "Cola corta", "Cojera", "Herida visible", "Ojo de color distinto", "Otro"];

async function uploadOrEncodePhoto(file: File) {
  const compressed = await compressImage(file);
  if (isSupabaseConfigured && supabase) {
    const path = `${crypto.randomUUID()}-${compressed.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
    const { error } = await supabase.storage.from("pets").upload(path, compressed);
    if (!error) return supabase.storage.from("pets").getPublicUrl(path).data.publicUrl;
  }
  return fileToDataUrl(compressed);
}

export default function ReportSightingPage() {
  const [district, setDistrict] = useState("Miraflores");
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [matches, setMatches] = useState<Array<{ pet: Pet; distance: number | null; score: number; reasons: string[] }>>([]);
  const [underCare, setUnderCare] = useState("no");
  const [reviewedMatches, setReviewedMatches] = useState(false);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }));
  }, []);

  const useLocation = () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener la ubicación.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setError("");
      },
      () => setError("No pudimos obtener tu ubicación. Puedes completar la zona manualmente."),
    );
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement: HTMLFormElement = event.currentTarget;
    const form = new FormData(formElement);
    const user = await getCurrentUser();
    if (!user) {
      setError("Inicia sesión para crear un avistamiento.");
      return;
    }
    const especie = String(form.get("especie"));
    const tamano = String(form.get("tamano"));
    const color = String(form.get("color"));
    const rasgos = form.getAll("rasgos").map(String);
    const [fallbackLat, fallbackLng] = districtCoords[district] ?? districtCoords.Miraflores;
    const latitude = coords.latitude ?? fallbackLat;
    const longitude = coords.longitude ?? fallbackLng;
    const foundMatches = await findLostPetMatches({ especie, tamano, color, distrito: district, rasgos, latitude, longitude });
    if (foundMatches.length && !reviewedMatches) {
      setMatches(foundMatches.map((item) => ({ pet: item.pet, distance: item.distance, score: item.score, reasons: item.reasons })));
      setReviewedMatches(true);
      return;
    }

    setSaving(true);
    const file = form.get("foto") as File | null;
    let foto: string | null = null;
    if (file?.size) foto = await uploadOrEncodePhoto(file);
    await createSighting({
      pet_id: null,
      report_id: null,
      especie,
      tamano,
      color,
      distrito: district,
      comentario: String(form.get("comentario")),
      foto,
      ubicacion: String(form.get("ubicacion")),
      visto_en: String(form.get("visto_en")),
      situacion: underCare === "si" ? "la_tengo_conmigo" : "solo_la_vi",
      latitud: latitude,
      longitud: longitude,
    });
    await Promise.all(matches.map(({ pet }) => createNotification({ pet_id: pet.id, tipo: "nuevo_avistamiento", mensaje: `Se encontró una posible coincidencia para ${pet.nombre}.` })));
    setSaving(false);
    setSent(true);
    formElement.reset();
  }

  if (sent) return (
    <main className="container py-6">
      <section className="form-card mx-auto max-w-xl space-y-4">
        <div className="rounded-xl bg-[#E1F5EE] p-3 font-semibold text-[#085041]">Avistamiento publicado. Gracias por ayudar.</div>
        <Button asChild><Link href="/">Volver al inicio</Link></Button>
      </section>
    </main>
  );

  return (
    <main className="container py-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Inicio</Link>
      <div className="mb-5"><h1 className="font-serif text-4xl">Vi una mascota</h1><p className="mt-2 text-[#6B6860]">No necesitas saber de quién es. Describe lo que viste y HUELLA buscará posibles coincidencias.</p></div>
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="form-card space-y-4">
          {error && <div className="rounded-xl bg-[#FAECE7] p-3 text-sm text-[#712B13]">{error} <Link href="/auth" className="font-semibold underline">Iniciar sesión</Link></div>}
          <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Especie</label><select className="select" name="especie"><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div><div><label className="label">Tamaño</label><select className="select" name="tamano"><option>Pequeño</option><option>Mediano</option><option>Grande</option></select></div></div>
          <div><label className="label">Color</label><input required className="field" name="color" placeholder="Marrón, blanco, negro..." /></div>
          <div><label className="label">Ubicación</label><input required className="field" name="ubicacion" placeholder="Calle, parque o referencia" /></div>
          <Button type="button" variant="outline" className="w-full" onClick={useLocation}><MapPin size={18} />Usar mi ubicación actual</Button>
          <div><label className="label">Distrito</label><select className="select" value={district} onChange={(event) => setDistrict(event.target.value)}>{Object.keys(districtCoords).map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="label">Fecha y hora</label><input required className="field" type="datetime-local" name="visto_en" /></div>
          <div><label className="label">Comentario</label><textarea required className="textarea min-h-24" name="comentario" placeholder="Qué hacía, hacia dónde iba, si parecía asustada..." /></div>
          <div><label className="label">Rasgos distintivos</label><div className="grid gap-2 md:grid-cols-2">{traits.map((trait) => <label key={trait} className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="rasgos" value={trait} />{trait}</label>)}</div></div>
          <div><label className="label">¿La mascota está bajo tu cuidado temporal?</label><select className="select" value={underCare} onChange={(event) => setUnderCare(event.target.value)}><option value="no">No</option><option value="si">Sí</option></select></div>
          <div><label className="label">Foto opcional</label><input className="field" name="foto" type="file" accept="image/*" /></div>
          <Button disabled={saving}><Send size={18} />{saving ? "Publicando..." : matches.length && reviewedMatches ? "Publicar de todos modos" : "Buscar coincidencias"}</Button>
        </section>
        <aside className="space-y-3">
          <div className="form-card"><h2 className="font-bold">Posibles coincidencias</h2><p className="mt-2 text-sm text-[#6B6860]">Se comparan especie, color, tamaño, distrito y distancia geográfica.</p></div>
          {matches.map(({ pet, distance, score, reasons }) => <Link key={pet.id} href={`/pet/${pet.id}`} className="form-card block hover:bg-[#F8F7F4]"><div className="flex gap-3"><img src={pet.foto_principal} alt={pet.nombre} className="h-16 w-16 rounded-lg object-cover" /><div><strong>Posible coincidencia</strong><p className="text-sm text-[#7A7871]">{pet.nombre} · {pet.tipo} · {pet.distrito}</p><p className="text-xs text-[#1D9E75]">Score {score} · {reasons.slice(0, 3).map((reason) => `✓ ${reason}`).join(" · ")}</p>{distance !== null && <p className="text-sm font-semibold text-[#1D9E75]">{formatDistance(distance)}</p>}</div></div></Link>)}
        </aside>
      </form>
    </main>
  );
}

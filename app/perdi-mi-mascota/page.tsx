"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createRegisteredPet, createReport, listMyRegisteredPets, reportToLegacyPet, type RegisteredPet, uploadMascotaImage } from "@/lib/sprint14-store";
import { PosterButton, ShareButton } from "@/components/report-actions";
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

export default function EmergencyReportPage() {
  const [district, setDistrict] = useState("Miraflores");
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [registeredPets, setRegisteredPets] = useState<RegisteredPet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [publishedPet, setPublishedPet] = useState<Pet | null>(null);

  useEffect(() => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }));
    listMyRegisteredPets().then((items) => {
      setRegisteredPets(items);
      setSelectedPetId(items[0]?.id ?? "");
    });
  }, []);

  function useLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const [fallbackLat, fallbackLng] = districtCoords[district] ?? districtCoords.Miraflores;
    const file = form.get("foto") as File | null;
    let foto_url = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80";
    setSaving(true);
    setError("");
    try {
      const selectedPet = registeredPets.find((item) => item.id === selectedPetId);
      let pet = selectedPet;
      if (!pet) {
        if (file?.size) foto_url = await uploadMascotaImage(file, "mascotas");
        pet = await createRegisteredPet({
        nombre: String(form.get("nombre")),
        alias: String(form.get("alias") || ""),
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
        telefono: String(form.get("whatsapp") || ""),
        contacto_preferido: "whatsapp",
        fotos: [foto_url],
        foto_principal: foto_url,
        foto_url,
        rasgo_privado: String(form.get("rasgo_privado") || ""),
      });
      }
      const fecha = String(form.get("fecha") || new Date().toISOString().slice(0, 10));
      const hora = String(form.get("hora") || "");
      const recompensa = String(form.get("recompensa") || "");
      const report = await createReport({
        pet_id: pet.id,
        tipo_reporte: "perdido",
        estado: "activo",
        distrito: district,
        descripcion: `${String(form.get("observaciones"))} Última ubicación: ${String(form.get("ultima_ubicacion"))}. Fecha: ${fecha}. Hora: ${hora}. Recompensa: ${recompensa || "no indicada"}.`,
        foto_url: pet.foto_principal ?? pet.foto_url,
        whatsapp: String(form.get("whatsapp") || ""),
        latitude: coords.latitude ?? fallbackLat,
        longitude: coords.longitude ?? fallbackLng,
        pet,
      });
      setPublishedPet(reportToLegacyPet(report));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo publicar el reporte.");
      setSaving(false);
    }
  }

  if (publishedPet) return (
    <main className="container py-6">
      <section className="form-card mx-auto max-w-xl space-y-4">
        <div className="rounded-xl bg-[#E1F5EE] p-3 font-semibold text-[#085041]">Aviso publicado</div>
        <h1 className="font-serif text-4xl">{publishedPet.nombre}</h1>
        <img src={publishedPet.foto_principal} alt={publishedPet.nombre} className="max-h-80 w-full rounded-xl bg-[#F8F7F4] object-contain" />
        <div className="grid gap-2 min-[390px]:flex min-[390px]:flex-wrap">
          <ShareButton pet={publishedPet} />
          <PosterButton pet={publishedPet} />
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/pet/${publishedPet.id}`).then(() => alert("Enlace copiado."))}>Copiar enlace</Button>
          <Button variant="outline" asChild><Link href={`/pet/${publishedPet.id}`}>Ver reporte</Link></Button>
        </div>
      </section>
    </main>
  );

  return (
    <main className="container py-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Inicio</Link>
      <form onSubmit={submit} className="mx-auto grid max-w-3xl gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="form-card space-y-4">
          <div><h1 className="font-serif text-4xl">Perdí mi mascota</h1><p className="mt-2 text-sm text-[#6B6860]">Completa un solo formulario. HUELLA crea la mascota, el reporte y publica el aviso.</p></div>
          {error && <div className="rounded-xl bg-[#FAECE7] p-3 text-sm text-[#712B13]">{error} <Link href="/auth" className="font-semibold underline">Iniciar sesión</Link></div>}
          {registeredPets.length > 0 && <div><label className="label">Mascota registrada</label><select className="select" value={selectedPetId} onChange={(event) => setSelectedPetId(event.target.value)}>{registeredPets.map((pet) => <option key={pet.id} value={pet.id}>{pet.nombre} · {pet.especie}</option>)}<option value="">No está registrada</option></select></div>}
          {!selectedPetId && <>
            <div><label className="label">Nombre</label><input required className="field" name="nombre" placeholder="Luna" /></div>
            <div><label className="label">Alias</label><input className="field" name="alias" placeholder="Lunita, Lulu" /></div>
            <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Especie</label><select className="select" name="especie"><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div><div><label className="label">Tamaño</label><select className="select" name="tamano"><option>Pequeño</option><option>Mediano</option><option>Grande</option></select></div></div>
            <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Color</label><input required className="field" name="color" placeholder="Marrón, blanco..." /></div><div><label className="label">Raza aproximada</label><input className="field" name="raza" placeholder="Mestizo, labrador..." /></div></div>
            <div><label className="label">Foto</label><input className="field" type="file" name="foto" accept="image/*" /></div>
            <div><label className="label">Rasgo privado de verificación</label><input className="field" name="rasgo_privado" placeholder="No visible públicamente" /></div>
          </>}
        </section>
        <section className="form-card space-y-4">
          <Camera className="text-[#1D9E75]" />
          <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Fecha</label><input required className="field" name="fecha" type="date" /></div><div><label className="label">Hora</label><input required className="field" name="hora" type="time" /></div></div>
          <div><label className="label">Última ubicación</label><input required className="field" name="ultima_ubicacion" placeholder="Zona aproximada, parque o avenida" /></div>
          <div><label className="label">Distrito</label><select className="select" value={district} onChange={(event) => setDistrict(event.target.value)}>{Object.keys(districtCoords).map((item) => <option key={item}>{item}</option>)}</select></div>
          <Button type="button" variant="outline" className="w-full" onClick={useLocation}><MapPin size={18} />Usar mi ubicación actual</Button>
          <div><label className="label">WhatsApp de contacto</label><input required className="field" name="whatsapp" placeholder="+51 987 654 321" /></div>
          <div><label className="label">Recompensa opcional</label><input className="field" name="recompensa" placeholder="Monto o descripción" /></div>
          <div><label className="label">Observaciones</label><textarea required className="textarea min-h-24" name="observaciones" placeholder="Comportamiento, último momento visto, cuidados importantes" /></div>
          <Button disabled={saving} className="w-full"><Send size={18} />{saving ? "Publicando..." : "Publicar aviso"}</Button>
        </section>
      </form>
    </main>
  );
}

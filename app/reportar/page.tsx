"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { Camera, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPet, distinctiveFeatures, specialConditions } from "@/lib/pet-store";
import { createReport, reportToLegacyPet } from "@/lib/sprint14-store";
import { findPotentialDuplicateReports } from "@/lib/sprint14-store";
import type { Pet, PetStatus } from "@/lib/demo-data";
import { PosterButton, ShareButton } from "@/components/report-actions";
import { ProgressiveSigninCard } from "@/components/progressive-signin-card";
import { uploadImage } from "@/services/image-service";
import { FriendlyError } from "@/components/feedback";
import { friendlyError, requiredText, validateImageFiles } from "@/lib/form-validation";
import { defaultPeruCoords, getCurrentLocationDetails, searchPeruLocation } from "@/lib/location";

export default function ReportarPage() {
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [error, setError] = useState("");
  const [publishedPet, setPublishedPet] = useState<Pet | null>(null);
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [locating, setLocating] = useState(false);

  function applyLocation(details: { latitude: number; longitude: number; address: string; district: string; province: string; department: string }) {
    setCoords({ latitude: details.latitude, longitude: details.longitude });
    setDistrict(details.district || details.province || details.department);
    setAddress(details.address);
  }

  async function useCurrentLocation() {
    setLocating(true);
    setError("");
    try {
      applyLocation(await getCurrentLocationDetails());
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos tomar tu ubicación. Puedes escribir una referencia cercana."));
    } finally {
      setLocating(false);
    }
  }

  async function searchLocation() {
    const query = locationQuery.trim();
    if (!query) return;
    setLocating(true);
    setError("");
    try {
      const details = await searchPeruLocation(query);
      if (!details) {
        setError("No encontramos esa referencia. Prueba con una avenida, parque o ciudad.");
        return;
      }
      applyLocation(details);
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos buscar esa ubicación. Intenta con otra referencia."));
    } finally {
      setLocating(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const distrito = district || String(form.get("distrito")) || "Perú";
    const fallback = defaultPeruCoords();
    const latitud = coords.latitude ?? fallback.latitude;
    const longitud = coords.longitude ?? fallback.longitude;
    const files = form.getAll("fotos").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 5);
    const recompensaMonto = Number(form.get("recompensa_monto") || 0);
    let fotoPrincipal = String(form.get("foto_principal")) || "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80";
    let fotos = [fotoPrincipal];

    const validationMessage =
      requiredText(form.get("nombre"), "El nombre", 120) ||
      requiredText(form.get("descripcion"), "La descripción", 1000) ||
      requiredText(address || form.get("direccion"), "La dirección o referencia", 240) ||
      requiredText(form.get("whatsapp"), "El WhatsApp", 40) ||
      validateImageFiles(files);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const duplicates = await findPotentialDuplicateReports({ distrito, especie: String(form.get("tipo")), fecha: new Date().toISOString(), latitude: latitud, longitude: longitud });
      if (duplicates.length && !duplicateWarning) {
        setDuplicateWarning("Hay casos parecidos cerca. Revisa si ya existe una búsqueda relacionada; si no, continúa.");
        setSaving(false);
        return;
      }
      if (files.length) {
        fotos = await Promise.all(files.map((file) => uploadImage(file)));
        fotoPrincipal = fotos[0];
      }

      const legacyPet = await createPet({
      nombre: String(form.get("nombre")),
      tipo: String(form.get("tipo")),
      raza: String(form.get("raza")),
      descripcion: String(form.get("descripcion")),
      estado: String(form.get("estado")) as PetStatus,
      distrito,
      direccion: address || String(form.get("direccion")),
      latitud,
      longitud,
      whatsapp: String(form.get("whatsapp")),
      foto_principal: fotoPrincipal,
      fotos,
      condiciones_especiales: form.getAll("condiciones_especiales").map(String),
      alias: String(form.get("alias") || "").split(",").map((item) => item.trim()).filter(Boolean),
      caracteristicas: form.getAll("caracteristicas").map(String),
      caracteristicas_personalizadas: String(form.get("caracteristicas_personalizadas") || ""),
      recompensa_ofrecida: recompensaMonto > 0,
      recompensa_monto: recompensaMonto > 0 ? recompensaMonto : null,
    });
      const report = await createReport({
      pet_id: legacyPet.id,
      tipo_reporte: "perdido",
      estado: "activo",
      distrito,
      descripcion: String(form.get("descripcion")),
      foto_url: fotoPrincipal,
      whatsapp: String(form.get("whatsapp")),
      latitude: latitud,
      longitude: longitud,
      pet: {
        id: legacyPet.id,
        user_id: legacyPet.owner_token ?? "",
        nombre: legacyPet.nombre,
        especie: legacyPet.tipo,
        raza: legacyPet.raza,
        color: "",
        sexo: "",
        edad: "",
        foto_url: legacyPet.foto_principal,
        created_at: legacyPet.creado_en,
      },
    });
      setPublishedPet(reportToLegacyPet(report));
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos activar la búsqueda. Revisa tu conexión e inténtalo otra vez."));
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
        <div className="grid gap-2 min-[390px]:flex min-[390px]:flex-wrap">
          <PosterButton pet={publishedPet} />
          <ShareButton pet={publishedPet} />
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/pet/${publishedPet.id}`).then(() => alert("Enlace copiado."))}>Copiar enlace</Button>
          <Button variant="outline" asChild><Link href={`/pet/${publishedPet.id}`}>Ver Centro de Búsqueda</Link></Button>
        </div>
      </section>
    </main>
  );

  return (
    <main className="container py-6">
      <div className="mb-5"><h1 className="font-serif text-4xl">Crear caso de mascota perdida</h1><p className="mt-2 text-[#6B6860]">Activa una búsqueda simple para que HUELLA pueda conectar pistas.</p></div>
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="form-card space-y-4">
          {duplicateWarning && <div className="rounded-xl bg-[#FAEEDA] p-3 text-sm text-[#6B4A10]">{duplicateWarning}</div>}
          {error && <FriendlyError message={error} />}
          <div className="upload-box"><Camera className="mx-auto mb-2 text-[#1D9E75]" /><p className="font-semibold">Foto principal</p><p className="text-sm text-[#7A7871]">Adjunta una imagen o pega una URL</p></div>
          <div><label className="label">Subir fotos (máximo 5)</label><input className="field" name="fotos" type="file" accept="image/*" multiple onClick={(event) => { event.currentTarget.value = ""; }} /></div>
          <div><label className="label">URL de foto opcional</label><input className="field" name="foto_principal" placeholder="https://..." /></div>
          <input type="hidden" name="estado" value="perdido" />
          <div><label className="label">Nombre</label><input required maxLength={120} className="field" name="nombre" placeholder="Luna" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Tipo</label><select className="select" name="tipo"><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div><div><label className="label">Raza</label><input className="field" name="raza" placeholder="Mestizo" /></div></div>
          <div><label className="label">Descripción</label><textarea required maxLength={1000} className="textarea min-h-28" name="descripcion" placeholder="Color, collar, señas particulares, temperamento..." /></div>
          <div><label className="label">Alias o nombres alternativos</label><input maxLength={160} className="field" name="alias" placeholder="Lunita, Lulu" /></div>
          <div><label className="label">Condiciones especiales</label><div className="grid gap-2 md:grid-cols-2">{specialConditions.map((condition) => <label key={condition} className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="condiciones_especiales" value={condition} />{condition}</label>)}</div></div>
          <div><label className="label">Características distintivas</label><div className="grid gap-2 md:grid-cols-2">{distinctiveFeatures.map((feature) => <label key={feature} className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="caracteristicas" value={feature} />{feature}</label>)}</div></div>
          <div><label className="label">Características personalizadas</label><input className="field" name="caracteristicas_personalizadas" placeholder="Ej. cicatriz pequeña, patita blanca" /></div>
        </section>
        <section className="form-card space-y-4">
          <div><label className="label">Distrito o zona</label><input maxLength={120} className="field" name="distrito" value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Distrito, provincia o ciudad" /></div>
          <div><label className="label">Dirección o referencia</label><input required maxLength={240} className="field" name="direccion" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Parque, avenida, último lugar visto" /></div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input className="field" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Buscar dirección, parque o ciudad" />
            <Button type="button" variant="outline" onClick={searchLocation} disabled={locating}>Buscar</Button>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={useCurrentLocation} disabled={locating}><MapPin size={18} />{locating ? "Ubicando..." : "Usar mi ubicación actual"}</Button>
          <div className="rounded-2xl border border-black/10 bg-[#C8EEE0] p-5 text-[#085041]"><MapPin className="mb-2" /><p className="font-semibold">Ubicación aproximada</p><p className="text-sm">La búsqueda usa la referencia escrita o tu ubicación actual.</p></div>
          <div><label className="label">WhatsApp</label><input required maxLength={40} className="field" name="whatsapp" placeholder="+51 987 654 321" /></div>
          <div><label className="label">Recompensa opcional</label><input className="field" name="recompensa_monto" type="number" min="0" placeholder="Monto en soles" /></div>
      <Button type="submit" size="lg" className="w-full" disabled={saving}><Send size={18} />{saving ? "Activando..." : "Activar búsqueda"}</Button>
        </section>
      </form>
    </main>
  );
}






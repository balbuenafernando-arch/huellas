"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createRegisteredPet, createReport, listMyRegisteredPets, reportToLegacyPet, type RegisteredPet, uploadMascotaImage } from "@/lib/sprint14-store";
import { PosterButton, ShareButton } from "@/components/report-actions";
import { ProgressiveSigninCard } from "@/components/progressive-signin-card";
import { ImageCropper } from "@/components/image-cropper";
import type { Pet } from "@/lib/demo-data";
import { FriendlyError } from "@/components/feedback";
import { friendlyError, requiredText, validateImageFile, validateNotFuture } from "@/lib/form-validation";
import { LocationPicker } from "@/components/location-picker";
import { defaultPeruCoords, getCurrentLocationDetails, locationDetailsFromCoords, searchPeruLocation } from "@/lib/location";

export default function EmergencyReportPage() {
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [department, setDepartment] = useState("");
  const [locationText, setLocationText] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [registeredPets, setRegisteredPets] = useState<RegisteredPet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [publishedPet, setPublishedPet] = useState<Pet | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [recentPhoto, setRecentPhoto] = useState<File | null>(null);
  const [recentPhotoPreview, setRecentPhotoPreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listMyRegisteredPets().then((items) => {
      setRegisteredPets(items);
      setSelectedPetId(items[0]?.id ?? "");
    });
  }, []);

  function applyLocation(details: { latitude: number; longitude: number; address: string; district: string; province: string; department: string }) {
    setCoords({ latitude: details.latitude, longitude: details.longitude });
    setLocationText(details.address);
    setDistrict(details.district);
    setProvince(details.province);
    setDepartment(details.department);
    setLocationConfirmed(true);
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

  async function movePin(latitude: number, longitude: number) {
    setCoords({ latitude, longitude });
    try {
      const details = await locationDetailsFromCoords(latitude, longitude);
      setLocationText(details.address);
      setDistrict(details.district);
      setProvince(details.province);
      setDepartment(details.department);
      setLocationConfirmed(true);
    } catch {
      setLocationText(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      setLocationConfirmed(true);
    }
  }

  async function handleRecentPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (file) setCropFile(file);
    else removeRecentPhoto();
    setError("");
  }

  function removeRecentPhoto() {
    setRecentPhoto(null);
    setRecentPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const fallback = defaultPeruCoords();
    const file = recentPhoto;
    const fecha = String(form.get("fecha") || new Date().toISOString().slice(0, 10));
    const hora = String(form.get("hora") || "");
    const validationMessage =
      requiredText(locationText || form.get("ultima_ubicacion"), "La última ubicación", 240) ||
      requiredText(form.get("whatsapp"), "El WhatsApp de contacto", 40) ||
      requiredText(form.get("observaciones"), "Las observaciones", 1000) ||
      validateNotFuture(`${fecha}T${hora || "00:00"}`, "La fecha de pérdida") ||
      validateImageFile(file);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    let foto_url = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80";
    setSaving(true);
    setError("");
    try {
      const selectedPet = registeredPets.find((item) => item.id === selectedPetId);
      let pet = selectedPet;
      if (file?.size) foto_url = await uploadMascotaImage(file, "mascotas");
      if (!pet) {
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
          telefono: String(form.get("whatsapp") || ""),
          contacto_preferido: "whatsapp",
          fotos: [foto_url],
          foto_principal: foto_url,
          foto_url,
        });
      }
      const recompensa = String(form.get("recompensa") || "");
      const report = await createReport({
        pet_id: pet.id,
        tipo_reporte: "perdido",
        estado: "activo",
        distrito: district || province || department || "Perú",
        descripcion: `${String(form.get("observaciones"))} Última ubicación: ${locationText || String(form.get("ultima_ubicacion"))}. Fecha: ${fecha}. Hora: ${hora}. Recompensa: ${recompensa || "no indicada"}.`,
        foto_url: file?.size ? foto_url : pet.foto_principal ?? pet.foto_url,
        whatsapp: String(form.get("whatsapp") || ""),
        latitude: coords.latitude ?? fallback.latitude,
        longitude: coords.longitude ?? fallback.longitude,
        pet,
      });
      setPublishedPet(reportToLegacyPet(report));
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos activar la búsqueda. Revisa los datos e inténtalo otra vez."));
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
          <ShareButton pet={publishedPet} label="Compartir búsqueda" />
          <PosterButton pet={publishedPet} />
          <Button variant="outline" asChild><Link href={`/pet/${publishedPet.id}`}>Ver centro de búsqueda</Link></Button>
        </div>
      </section>
    </main>
  );

  return (
    <main className="container py-6">
      {cropFile && <ImageCropper file={cropFile} onCancel={() => setCropFile(null)} onApply={(file, previewUrl) => {
        setRecentPhoto(file);
        setRecentPhotoPreview(previewUrl);
        setCropFile(null);
      }} />}
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Inicio</Link>
      <form onSubmit={submit} className="mx-auto grid max-w-3xl gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="form-card space-y-4">
          <div className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm font-bold text-[#085041]">Paso 1 · Foto y nombre</div>
          <div><h1 className="font-serif text-4xl">Perdí mi mascota</h1><p className="mt-2 text-sm text-[#6B6860]">Vamos paso a paso. HUELLA abre la búsqueda y conecta posibles avistamientos por ti.</p></div>
          {error && <FriendlyError message={error} />}
          {registeredPets.length > 0 && <div><label className="label">Mascota registrada</label><select className="select" value={selectedPetId} onChange={(event) => setSelectedPetId(event.target.value)}>{registeredPets.map((pet) => <option key={pet.id} value={pet.id}>{pet.nombre} · {pet.especie}</option>)}<option value="">No está registrada</option></select></div>}
          <input ref={photoInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onClick={(event) => { event.currentTarget.value = ""; }} onChange={handleRecentPhoto} />
          <input ref={galleryInputRef} className="sr-only" type="file" accept="image/*" onClick={(event) => { event.currentTarget.value = ""; }} onChange={handleRecentPhoto} />
          <div className="grid gap-2 min-[390px]:grid-cols-2">
            <button type="button" onClick={() => photoInputRef.current?.click()} className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#1D9E75] bg-white p-4 text-center text-[#085041]">
              <Camera size={28} />
              <span className="font-bold">Tomar foto</span>
              <span className="text-sm text-[#6B6860]">Abre la cámara del dispositivo.</span>
            </button>
            <button type="button" onClick={() => galleryInputRef.current?.click()} className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#1D9E75] bg-white p-4 text-center text-[#085041]">
              <Camera size={28} />
              <span className="font-bold">{recentPhotoPreview ? "Cambiar foto" : "Elegir de galería"}</span>
              <span className="text-sm text-[#6B6860]">Selecciona una imagen existente.</span>
            </button>
          </div>
          {!selectedPetId && <>
            <div><label className="label">Nombre</label><input required maxLength={120} className="field" name="nombre" placeholder="Luna" /></div>
            <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Especie</label><select className="select" name="especie"><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div><div><label className="label">Tamaño</label><select className="select" name="tamano"><option>Pequeño</option><option>Mediano</option><option>Grande</option></select></div></div>
            <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Color</label><input required maxLength={120} className="field" name="color" placeholder="Marrón, blanco..." /></div><div><label className="label">Raza aproximada</label><input maxLength={120} className="field" name="raza" placeholder="Mestizo, labrador..." /></div></div>
          </>}
        </section>
        <section className="form-card space-y-4">
          <div className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm font-bold text-[#085041]">Paso 2 · Última ubicación</div>
          <div className="rounded-2xl border border-black/10 bg-[#F8F7F4] p-3">
            {recentPhotoPreview ? <div className="space-y-3">
              <img src={recentPhotoPreview} alt="Foto reciente" className="max-h-64 w-full rounded-xl bg-white object-contain" />
              <div className="grid gap-2 min-[390px]:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()}><Camera size={18} />Reemplazar foto</Button>
                <Button type="button" variant="outline" onClick={removeRecentPhoto}>Eliminar foto</Button>
              </div>
            </div> : <p className="text-sm text-[#6B6860]">Cuando agregues una foto, aquí verás la vista previa antes de publicar.</p>}
          </div>
          <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Fecha</label><input required className="field" name="fecha" type="date" /></div><div><label className="label">Hora</label><input required className="field" name="hora" type="time" /></div></div>
          <div className="map-panel min-h-[320px] overflow-hidden rounded-2xl">
            <LocationPicker
              value={{ latitude: coords.latitude ?? defaultPeruCoords().latitude, longitude: coords.longitude ?? defaultPeruCoords().longitude }}
              onChange={(value) => { void movePin(value.latitude, value.longitude); }}
            />
          </div>
          <p className="text-xs text-[#6B6860]">Arrastra el pin al punto exacto. Las coordenadas del pin son las que se guardan.</p>
          <div><label className="label">Última ubicación</label><input required maxLength={240} className="field" name="ultima_ubicacion" value={locationText} onChange={(event) => setLocationText(event.target.value)} placeholder="Zona aproximada, parque o avenida" /></div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input className="field" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Buscar dirección, parque o ciudad" />
            <Button type="button" variant="outline" onClick={searchLocation} disabled={locating}>Buscar</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div><label className="label">Distrito o zona</label><input maxLength={120} className="field" value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Ej. Wanchaq" /></div>
            <div><label className="label">Provincia</label><input maxLength={120} className="field" value={province} onChange={(event) => setProvince(event.target.value)} placeholder="Ej. Cusco" /></div>
            <div><label className="label">Departamento</label><input maxLength={120} className="field" value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Ej. Cusco" /></div>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={useLocation} disabled={locating}><MapPin size={18} />{locating ? "Ubicando..." : "Usar mi ubicación actual"}</Button>
          {locationMessage && <p className="text-xs font-semibold text-[#1D9E75]">{locationMessage}</p>}
          <div className="grid gap-2 rounded-xl bg-[#F8F7F4] p-3 text-sm">
            <strong>¿Fue aquí?</strong>
            <div className="grid gap-2 min-[390px]:grid-cols-2">
              <Button type="button" variant={locationConfirmed ? "default" : "outline"} onClick={() => setLocationConfirmed(true)}>Sí, usar esta zona</Button>
              <Button type="button" variant="outline" onClick={() => setLocationConfirmed(false)}>Cambiar ubicación</Button>
            </div>
          </div>
          <div className="rounded-full bg-[#E1F5EE] px-3 py-1 text-sm font-bold text-[#085041]">Paso 3 · Contacto</div>
          <div><label className="label">WhatsApp de contacto</label><input required maxLength={40} className="field" name="whatsapp" placeholder="+51 987 654 321" /></div>
          <div><label className="label">Recompensa opcional</label><input maxLength={160} className="field" name="recompensa" placeholder="Monto o descripción" /></div>
          <div><label className="label">Observaciones</label><textarea required maxLength={1000} className="textarea min-h-24" name="observaciones" placeholder="Comportamiento, último momento visto, cuidados importantes" /></div>
          <Button disabled={saving} className="w-full"><Send size={18} />{saving ? "Activando búsqueda..." : "Empezar búsqueda"}</Button>
        </section>
      </form>
    </main>
  );
}

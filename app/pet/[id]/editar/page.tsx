"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoUploader } from "@/components/photo-uploader";
import { LocationPicker } from "@/components/location-picker";
import type { Pet } from "@/lib/demo-data";
import { deletePet, getPet, isOwnedPet, updatePet } from "@/lib/pet-store";
import { deleteReport, getCurrentUser, getReport, reportToLegacyPet, type Report, updateReport } from "@/lib/sprint14-store";
import { locationDetailsFromCoords, searchPeruLocation } from "@/lib/location";
import { uploadImage } from "@/services/image-service";
import { FriendlyError, DetailSkeleton } from "@/components/feedback";
import { friendlyError, requiredText, validateImageFiles } from "@/lib/form-validation";

export default function EditPetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [pet, setPet] = useState<Pet>();
  const [report, setReport] = useState<Report | undefined>();
  const [allowed, setAllowed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("");
  const [areaName, setAreaName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [retainedPhotoUrls, setRetainedPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([getReport(params.id), getPet(params.id), getCurrentUser()])
      .then(([foundReport, foundPet, user]) => {
        const normalized = foundReport ? reportToLegacyPet(foundReport) : foundPet;
        setReport(foundReport);
        setPet(normalized);
        if (normalized) {
          setCoords({ latitude: normalized.latitud, longitude: normalized.longitud });
          setAddress(normalized.direccion);
          setAreaName(normalized.distrito);
        }
        setAllowed((foundReport && user ? foundReport.user_id === user.id : false) || isOwnedPet(normalized));
      })
      .catch((caught) => setError(friendlyError(caught, "No se pudo cargar el caso. Inténtalo otra vez.")))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pet || !allowed || saving) return;
    const form = new FormData(event.currentTarget);
    const latitude = coords?.latitude ?? pet.latitud;
    const longitude = coords?.longitude ?? pet.longitud;
    const place = areaName || address || pet.distrito;
    const recompensaTexto = String(form.get("recompensa") || "").trim();
    const recompensaMonto = Number(recompensaTexto.replace(/[^0-9.,]/g, "").replace(",", "."));
    const files = photoFiles.slice(0, 3);
    let fotoPrincipal = pet.foto_principal;
    let fotos = retainedPhotoUrls.length ? retainedPhotoUrls.slice(0, 3) : (pet.fotos?.length ? pet.fotos.slice(0, 3) : [fotoPrincipal]);

    const validationMessage =
      requiredText(form.get("nombre"), "El nombre", 120) ||
      requiredText(form.get("descripcion"), "La descripción", 1000) ||
      requiredText(address, "La dirección", 240) ||
      requiredText(form.get("whatsapp"), "El WhatsApp", 40) ||
      validateImageFiles(files);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (files.length) {
        const uploaded = await Promise.all(files.map((file) => uploadImage(file)));
        fotos = [...retainedPhotoUrls, ...uploaded].slice(0, 3);
        fotoPrincipal = fotos[0];
      }

      if (report) {
        await updateReport(report.id, {
          tipo_reporte: report.tipo_reporte,
          estado: report.estado,
          distrito: place,
          descripcion: String(form.get("descripcion")),
          reward_text: recompensaTexto || null,
          foto_url: fotoPrincipal,
          photos: fotos,
          latitude,
          longitude,
        });
        router.push(`/pet/${report.id}`);
        return;
      }

      await updatePet(pet.id, {
        nombre: String(form.get("nombre")),
        tipo: String(form.get("tipo")),
        raza: String(form.get("raza")),
        descripcion: String(form.get("descripcion")),
        estado: pet.estado,
        distrito: place,
        direccion: address,
        latitud: latitude,
        longitud: longitude,
        whatsapp: String(form.get("whatsapp")),
        foto_principal: fotoPrincipal,
        fotos: Array.from(new Set([fotoPrincipal, ...fotos])).slice(0, 3),
        condiciones_especiales: pet.condiciones_especiales,
        alias: pet.alias ?? [],
        caracteristicas: [],
        caracteristicas_personalizadas: String(form.get("caracteristicas_personalizadas") || ""),
        recompensa_ofrecida: recompensaMonto > 0,
        recompensa_monto: recompensaMonto > 0 ? recompensaMonto : null,
        cerrado_en: pet.cerrado_en,
      });
      router.push(`/pet/${pet.id}`);
    } catch (caught) {
      setError(friendlyError(caught, "No se pudieron guardar los cambios. Revisa tu conexión e inténtalo otra vez."));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pet || !allowed) return;
    if (!confirm("¿Estás seguro?\n\nEsta acción no se puede deshacer.")) return;
    try {
      if (report) await deleteReport(report.id);
      else await deletePet(pet.id);
      router.push("/mis-busquedas");
      router.refresh();
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo eliminar el caso. Inténtalo otra vez."));
    }
  }

  async function searchAddress() {
    if (!address.trim()) return;
    try {
      const details = await searchPeruLocation(address);
      if (!details) return;
      setCoords({ latitude: details.latitude, longitude: details.longitude });
      setAddress(details.address);
      setAreaName(details.district || details.province || details.department || details.address);
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo buscar esa dirección."));
    }
  }

  async function movePin(latitude: number, longitude: number) {
    setCoords({ latitude, longitude });
    try {
      const details = await locationDetailsFromCoords(latitude, longitude);
      setAddress(details.address);
      setAreaName(details.district || details.province || details.department || details.address);
    } catch {
      setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      setAreaName("Punto marcado en el mapa");
    }
  }

  if (loading) return <DetailSkeleton />;
  if (!pet) return <main className="container py-10"><FriendlyError message={error || "No se encontró este caso."} /></main>;
  if (!allowed) return <main className="container py-10"><Link href={`/pet/${pet.id}`} className="text-[#1D9E75]">Volver</Link><p className="mt-4">Solo el navegador que creó este caso puede editarlo.</p></main>;

  return (
    <main className="container py-6">
      <Link href={`/pet/${pet.id}`} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Volver al caso</Link>
      <h1 className="mb-5 font-serif text-4xl">Editar caso</h1>
      {error && <div className="mb-4"><FriendlyError message={error} /></div>}
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="form-card space-y-4">
          <div><label className="label">Nombre</label><input required maxLength={120} className="field" name="nombre" defaultValue={pet.nombre} /></div>
          <div><label className="label">Tipo</label><select className="select" name="tipo" defaultValue={pet.tipo}><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div>
          <div><label className="label">Raza</label><input className="field" name="raza" defaultValue={pet.raza} /></div>
          <div><label className="label">Descripción</label><textarea required maxLength={1000} className="textarea min-h-28" name="descripcion" defaultValue={pet.descripcion} /></div>
          <div><label className="label">¿Qué hace fácil reconocer a esta mascota?</label><textarea className="textarea min-h-20" name="caracteristicas_personalizadas" maxLength={500} defaultValue={pet.caracteristicas_personalizadas || pet.caracteristicas?.join(". ") || ""} placeholder="Ejemplo: Tiene un collar rojo, una cicatriz en la oreja izquierda y una mancha blanca en el pecho." /></div>
        </section>
        <section className="form-card space-y-4">
          <div><label className="label">Fotografías (máximo 3)</label><PhotoUploader initialUrls={(pet.fotos?.length ? pet.fotos : [pet.foto_principal]).slice(0, 3)} disabled={saving} onChange={(files, urls) => { setPhotoFiles(files); setRetainedPhotoUrls(urls); }} onError={setError} /></div>
          <div>
            <label className="label">Dirección</label>
            <div className="grid gap-2 min-[390px]:grid-cols-[1fr_auto]">
              <input required maxLength={240} className="field" value={address} onChange={(event) => setAddress(event.target.value)} />
              <Button type="button" variant="outline" onClick={searchAddress}>Buscar</Button>
            </div>
          </div>
          {coords && <div className="map-panel min-h-[300px] overflow-hidden rounded-2xl"><LocationPicker value={coords} onChange={(value) => { void movePin(value.latitude, value.longitude); }} /></div>}
          <div><label className="label">WhatsApp</label><input required maxLength={40} className="field" name="whatsapp" defaultValue={pet.whatsapp} /></div>
          <div><label className="label">Recompensa opcional</label><input className="field" name="recompensa" maxLength={160} defaultValue={report?.reward_text ?? pet.recompensa_texto ?? pet.recompensa_monto ?? ""} placeholder="Ej. S/ 500" /></div>
          <div className="flex flex-wrap gap-2"><Button type="submit" disabled={saving}><Save size={18} />{saving ? "Guardando..." : "Guardar cambios"}</Button><Button type="button" variant="outline" onClick={remove}><Trash2 size={18} />Eliminar caso</Button></div>
        </section>
      </form>
    </main>
  );
}

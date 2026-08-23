"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { MapPin, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoUploader } from "@/components/photo-uploader";
import { createSighting, findPotentialDuplicateSightings } from "@/lib/pet-store";
import { uploadImage } from "@/services/image-service";
import type { Sighting } from "@/lib/demo-data";
import { FriendlyError } from "@/components/feedback";
import { friendlyError, operationError, validateImageFiles, validateNotFuture } from "@/lib/form-validation";
import { LocationPicker } from "@/components/location-picker";
import { defaultPeruCoords, getCurrentLocationDetails, locationDetailsFromCoords, searchPeruLocation } from "@/lib/location";

type FieldErrors = Record<string, string>;

export function SightingForm({ petId, reportId, onCreated }: { petId: string; reportId?: string | null; onCreated: () => void }) {
  const [comentario, setComentario] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [vistoEn, setVistoEn] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(defaultPeruCoords());
  const [placa, setPlaca] = useState("no_pude_verificar");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [usingGps, setUsingGps] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  async function useLocation() {
    if (usingGps || saving) return;
    setUsingGps(true);
    setError("");
    try {
      const details = await getCurrentLocationDetails();
      setCoords({ latitude: details.latitude, longitude: details.longitude });
      setUbicacion(details.address);
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo obtener tu ubicación. Escribe una referencia cercana."));
    } finally {
      setUsingGps(false);
    }
  }

  async function movePin(latitude: number, longitude: number) {
    setCoords({ latitude, longitude });
    try {
      const details = await locationDetailsFromCoords(latitude, longitude);
      setUbicacion(details.address);
    } catch {
      setUbicacion(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    }
  }

  async function searchAddress() {
    if (!ubicacion.trim() || searchingAddress) return;
    setSearchingAddress(true);
    setError("");
    try {
      const details = await searchPeruLocation(ubicacion);
      if (!details) {
        setError("No se encontro esa dirección. Prueba con una referencia más específica.");
        return;
      }
      setCoords({ latitude: details.latitude, longitude: details.longitude });
      setUbicacion(details.address);
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo buscar esa dirección. Prueba con otra referencia."));
    } finally {
      setSearchingAddress(false);
    }
  }

  function showFieldErrors(errors: FieldErrors) {
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (!first) return false;
    requestAnimationFrame(() => {
      const field = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
      field?.focus();
      field?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const errors: FieldErrors = {};
    if (!ubicacion.trim()) errors.ubicacion = "Indica la ubicación del avistamiento.";
    if (!vistoEn) errors.visto_en = "Indica fecha y hora del avistamiento.";
    if (!comentario.trim()) errors.comentario = "Describe lo que viste.";
    const validationMessage = validateNotFuture(vistoEn, "La fecha del avistamiento") || validateImageFiles(photoFiles);
    if (validationMessage) {
      if (validationMessage.includes("fecha") || validationMessage.includes("Fecha")) errors.visto_en = validationMessage;
      else errors.foto = validationMessage;
    }
    if (showFieldErrors(errors)) {
      setError("");
      return;
    }
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      const duplicates = await findPotentialDuplicateSightings({ petId: reportId ?? petId, ubicacion, vistoEn });
      if (duplicates.length && !warning) {
      setWarning("Ya hay avistamientos parecidos cerca. Revisa si ayudan; si tu información agrega algo, envíala igual.");
        setSaving(false);
        return;
      }
      let photoUrls: string[] = [];
      try {
        photoUrls = await Promise.all(photoFiles.slice(0, 3).map((photo) => uploadImage(photo)));
      } catch (caught) {
        throw new Error(operationError(caught, "subir fotografia de avistamiento", "Error al subir la fotografia"));
      }
      try {
        await createSighting({
        pet_id: petId,
        report_id: reportId ?? null,
        comentario,
        foto: photoUrls[0] ?? null,
        fotos: photoUrls,
        ubicacion,
        visto_en: vistoEn,
        situacion: String(form.get("situacion") ?? "solo_la_vi") as Sighting["situacion"],
        llevaba_placa: String(form.get("llevaba_placa") ?? "no_pude_verificar") as Sighting["llevaba_placa"],
        nombre_observado: String(form.get("nombre_observado") ?? "").trim() || null,
        latitud: coords.latitude,
        longitud: coords.longitude,
        });
      } catch (caught) {
        throw new Error(operationError(caught, "registrar avistamiento en Supabase", "Error de base de datos al registrar el avistamiento"));
      }
      setComentario("");
      setUbicacion("");
      setVistoEn("");
      setWarning("");
      setPhotoFiles([]);
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : operationError(caught, "registrar avistamiento"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="compartir-avistamiento" ref={formRef} onSubmit={submit} className="form-card scroll-mt-24 space-y-4">
      <h2 className="font-bold">Compartir avistamiento</h2>
      {error && <FriendlyError message={error} />}
      {warning && <div className="rounded-xl bg-[#FAEEDA] p-3 text-sm text-[#6B4A10]">{warning}</div>}
      <div>
        <label className="label">Ubicación *</label>
        <div className="grid gap-2 min-[390px]:grid-cols-[1fr_auto]">
          <input required className="field" name="ubicacion" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Parque, calle o referencia" />
          <Button type="button" variant="outline" onClick={searchAddress} disabled={searchingAddress || saving}><Search size={18} />{searchingAddress ? "Buscando..." : "Buscar"}</Button>
        </div>
        {fieldErrors.ubicacion && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.ubicacion}</p>}
      </div>
      <div className="map-panel min-h-[280px] overflow-hidden rounded-2xl">
        <LocationPicker value={coords} onChange={(value) => { void movePin(value.latitude, value.longitude); }} />
      </div>
      <p className="text-xs text-[#6B6860]">Arrastra el pin al punto exacto. El pin manda sobre la dirección.</p>
      <Button type="button" variant="outline" className="w-full" onClick={useLocation} disabled={usingGps || saving}>{usingGps ? "Obteniendo ubicación..." : "Usar mi ubicación actual"}</Button>
      <div>
        <label className="label">Fecha y hora del avistamiento *</label>
        <input required className="field" name="visto_en" type="datetime-local" value={vistoEn} onChange={(e) => setVistoEn(e.target.value)} />
        {fieldErrors.visto_en && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.visto_en}</p>}
      </div>
      <div>
        <label className="label">Describe lo que observaste *</label>
        <textarea required maxLength={1000} className="textarea min-h-24" name="comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Describe brevemente dónde viste la mascota, cómo se comportaba o cualquier detalle que pueda ayudar al propietario." />
        {fieldErrors.comentario && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.comentario}</p>}
      </div>
      <fieldset>
        <legend className="label">Situación observada</legend>
        <div className="grid gap-2">
          {[
            ["solo_la_vi", "Solo la vi"],
            ["sigue_en_la_zona", "Sigue en la zona"],
            ["la_tengo_conmigo", "La tengo conmigo"],
            ["veterinaria", "Está en veterinaria"],
            ["refugio", "Está en refugio"],
          ].map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="radio" name="situacion" value={value} defaultChecked={value === "solo_la_vi"} />{label}</label>)}
        </div>
      </fieldset>
      <div>
        <label className="label">¿Llevaba placa o medalla?</label>
        <select className="select" name="llevaba_placa" value={placa} onChange={(event) => setPlaca(event.target.value)}>
          <option value="si">Sí</option>
          <option value="no">No</option>
          <option value="no_pude_verificar">No pude verificar</option>
        </select>
      </div>
      {placa === "si" && <div><label className="label">Nombre observado</label><input className="field" name="nombre_observado" placeholder="Nombre en la placa" /></div>}
      <div>
        <label className="label">Fotografías (opcional, máximo 3)</label>
        <PhotoUploader disabled={saving} onChange={(files) => setPhotoFiles(files)} onError={setError} />
        {fieldErrors.foto && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.foto}</p>}
      </div>
      <div className="flex gap-2 rounded-xl bg-[#E1F5EE] p-3 text-sm text-[#085041]"><MapPin size={18} className="shrink-0" />Comparte una referencia clara para orientar la búsqueda.</div>
      <Button type="submit" disabled={saving}><Send size={18} />{saving ? "Registrando avistamiento..." : warning ? "Enviar de todos modos" : "Enviar avistamiento"}</Button>
    </form>
  );
}

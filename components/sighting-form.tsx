"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSighting, findPotentialDuplicateSightings } from "@/lib/pet-store";
import { uploadImage } from "@/services/image-service";
import type { Sighting } from "@/lib/demo-data";
import { FriendlyError } from "@/components/feedback";
import { friendlyError, validateImageFile, validateNotFuture } from "@/lib/form-validation";

export function SightingForm({ petId, reportId, onCreated }: { petId: string; reportId?: string | null; onCreated: () => void }) {
  const [comentario, setComentario] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [vistoEn, setVistoEn] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [placa, setPlaca] = useState("no_pude_verificar");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function useLocation() {
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener ubicación. Puedes escribir una referencia manual.");
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      if (!ubicacion) setUbicacion("Ubicación actual compartida");
      setError("");
    }, () => setError("No pudimos tomar tu ubicación. Escribe una referencia cercana."));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !comentario.trim() || !ubicacion.trim() || !vistoEn) return;
    const validationMessage = validateNotFuture(vistoEn, "La fecha del avistamiento") || validateImageFile(foto);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const duplicates = await findPotentialDuplicateSightings({ petId: reportId ?? petId, ubicacion, vistoEn });
      if (duplicates.length && !warning) {
      setWarning("Ya hay avistamientos parecidos cerca. Revisa si ayudan; si tu información agrega algo, envíala igual.");
        setSaving(false);
        return;
      }
      let fotoUrl: string | null = null;
      if (foto) fotoUrl = await uploadImage(foto);
      await createSighting({
        pet_id: petId,
        report_id: reportId ?? null,
        comentario,
        foto: fotoUrl,
        ubicacion,
        visto_en: vistoEn,
        situacion: String(form.get("situacion") ?? "solo_la_vi") as Sighting["situacion"],
        llevaba_placa: String(form.get("llevaba_placa") ?? "no_pude_verificar") as Sighting["llevaba_placa"],
        nombre_observado: String(form.get("nombre_observado") ?? "").trim() || null,
        latitud: coords.latitude,
        longitud: coords.longitude,
      });
      setComentario("");
      setUbicacion("");
      setVistoEn("");
      setWarning("");
      setFoto(null);
      onCreated();
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos enviar el avistamiento. Revisa tu conexión e inténtalo otra vez."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="form-card space-y-4">
      <h2 className="font-bold">Compartir avistamiento</h2>
      {error && <FriendlyError message={error} />}
      {warning && <div className="rounded-xl bg-[#FAEEDA] p-3 text-sm text-[#6B4A10]">{warning}</div>}
      <div>
        <label className="label">Ubicación</label>
        <input required className="field" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Parque, calle o referencia" />
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={useLocation}>Usar mi ubicación actual</Button>
      <div>
        <label className="label">Fecha y hora del avistamiento</label>
        <input required className="field" type="datetime-local" value={vistoEn} onChange={(e) => setVistoEn(e.target.value)} />
      </div>
      <div>
        <label className="label">Descripción</label>
        <textarea required maxLength={1000} className="textarea min-h-24" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Cuenta dónde, cuándo y cómo viste a esta mascota" />
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
        <label className="label">Foto (opcional pero recomendada)</label>
        <input className="field" type="file" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          const validationMessage = validateImageFile(file);
          if (validationMessage) {
            setError(validationMessage);
            return;
          }
          setFoto(file);
          setError("");
        }} />
      </div>
      <div className="flex gap-2 rounded-xl bg-[#E1F5EE] p-3 text-sm text-[#085041]"><MapPin size={18} className="shrink-0" />Comparte una referencia clara para orientar la búsqueda.</div>
      <Button type="submit" disabled={saving || !comentario.trim() || !ubicacion.trim() || !vistoEn}><Send size={18} />{saving ? "Enviando avistamiento..." : "Enviar avistamiento"}</Button>
    </form>
  );
}



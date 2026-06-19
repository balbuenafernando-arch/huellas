"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSighting, findPotentialDuplicateSightings } from "@/lib/pet-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { compressImage, fileToDataUrl } from "@/lib/image-utils";
import type { Sighting } from "@/lib/demo-data";

export function SightingForm({ petId, reportId, onCreated }: { petId: string; reportId?: string | null; onCreated: () => void }) {
  const [comentario, setComentario] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [vistoEn, setVistoEn] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [placa, setPlaca] = useState("no_pude_verificar");
  const [warning, setWarning] = useState("");
  const [saving, setSaving] = useState(false);

  function useLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      if (!ubicacion) setUbicacion("Ubicación actual compartida");
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comentario.trim() || !ubicacion.trim() || !vistoEn) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const duplicates = await findPotentialDuplicateSightings({ petId: reportId ?? petId, ubicacion, vistoEn });
    if (duplicates.length && !warning) {
      setWarning("Hay avistamientos similares recientes. Revisa si ya fue reportado; puedes publicar de todos modos.");
      setSaving(false);
      return;
    }
    let fotoUrl: string | null = null;
    if (foto) {
      if (isSupabaseConfigured && supabase) {
        const compressed = await compressImage(foto);
        const path = `${crypto.randomUUID()}-${compressed.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
        const { error } = await supabase.storage.from("pets").upload(path, compressed);
        if (!error) fotoUrl = supabase.storage.from("pets").getPublicUrl(path).data.publicUrl;
      } else {
        fotoUrl = await fileToDataUrl(foto);
      }
    }
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
    setSaving(false);
    onCreated();
  }

  return (
    <form onSubmit={submit} className="form-card space-y-4">
      <h2 className="font-bold">🐾 Reportar avistamiento</h2>
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
        <textarea required className="textarea min-h-24" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Cuenta dónde, cuándo y cómo viste a esta mascota" />
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
        <input className="field" type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
      </div>
      <div className="flex gap-2 rounded-xl bg-[#E1F5EE] p-3 text-sm text-[#085041]"><MapPin size={18} className="shrink-0" />Comparte una referencia clara para orientar la búsqueda.</div>
      <Button type="submit" disabled={saving || !comentario.trim() || !ubicacion.trim() || !vistoEn}><Send size={18} />{saving ? "Guardando..." : "Reportar avistamiento"}</Button>
    </form>
  );
}



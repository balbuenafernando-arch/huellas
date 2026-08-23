"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FriendlyError } from "@/components/feedback";
import { PhotoUploader } from "@/components/photo-uploader";
import { submitFeedback, type FeedbackType } from "@/lib/feedback";
import { uploadImage } from "@/services/image-service";
import { friendlyError, validateImageFiles } from "@/lib/form-validation";

const feedbackTypes: FeedbackType[] = ["Sugerencia", "Error", "Algo no se entiende", "Experiencia"];

export default function FeedbackPage() {
  const [tipo, setTipo] = useState<FeedbackType>("Sugerencia");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const comentario = String(form.get("comentario") ?? "").trim();
    const validation = validateImageFiles(photoFiles);
    if (!comentario) {
      setError("Cuéntanos qué pasó o qué podemos mejorar.");
      return;
    }
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const photoUrls = await Promise.all(photoFiles.slice(0, 3).map((photo) => uploadImage(photo)));
      await submitFeedback({ tipo, comentario: comentario.slice(0, 1200), photo_urls: photoUrls });
      setSent(true);
      setPhotoFiles([]);
      event.currentTarget.reset();
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo enviar el feedback. Inténtalo otra vez."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container py-6">
      <section className="form-card mx-auto max-w-xl space-y-4">
        <div>
          <h1 className="font-serif text-4xl">Ayúdanos a mejorar HUELLA</h1>
          <p className="mt-2 text-sm text-[#6B6860]">Tu comentario llega al equipo de beta.</p>
        </div>
        {error && <FriendlyError message={error} />}
        {sent && <div className="rounded-xl bg-[#E1F5EE] p-3 text-sm font-semibold text-[#085041]">Gracias. Recibimos tu comentario.</div>}
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label">Tipo</label>
            <div className="grid gap-2 min-[430px]:grid-cols-2">
              {feedbackTypes.map((item) => (
                <button key={item} type="button" onClick={() => setTipo(item)} className={`min-h-11 rounded-xl border px-3 text-left text-sm font-semibold ${tipo === item ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]" : "border-black/10 bg-white text-[#4D4A43]"}`}>{item}</button>
              ))}
            </div>
          </div>
          <div><label className="label">Comentario</label><textarea className="textarea min-h-32" name="comentario" maxLength={1200} required /></div>
          <div><label className="label">Capturas opcionales (máximo 3)</label><PhotoUploader disabled={saving} onChange={(files) => setPhotoFiles(files)} onError={setError} /></div>
          <Button disabled={saving}><Send size={18} />{saving ? "Enviando..." : "Enviar"}</Button>
        </form>
      </section>
    </main>
  );
}

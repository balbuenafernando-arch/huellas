"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FriendlyError, PageSkeleton } from "@/components/feedback";
import { getCurrentUser, getReport, updateReport, type Report } from "@/lib/sprint14-store";
import { listReunionStories, saveReunionStory, type ReunionStory } from "@/lib/reunion-stories";
import { uploadImage } from "@/services/image-service";
import { friendlyError, validateImageFile } from "@/lib/form-validation";

export default function EditReunionStoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [story, setStory] = useState<ReunionStory | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getReport(params.id), listReunionStories(), getCurrentUser()])
      .then(([found, stories, user]) => {
        setReport(found ?? null);
        setStory(stories[params.id] ?? null);
        setAllowed(Boolean(found && user && found.user_id === user.id && found.estado === "reunido"));
      })
      .catch((caught) => setError(friendlyError(caught, "No se pudo cargar la historia.")))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!report || !allowed || saving) return;
    const form = new FormData(event.currentTarget);
    const photoValue = form.get("foto");
    const photo = photoValue instanceof File && photoValue.size ? photoValue : null;
    const imageError = validateImageFile(photo);
    if (imageError) return setError(imageError);
    setSaving(true);
    setError("");
    try {
      const photoUrl = photo ? await uploadImage(photo) : story?.photoUrl ?? null;
      const reunitedAt = new Date(`${String(form.get("fecha"))}T12:00:00`).toISOString();
      const message = String(form.get("mensaje") || "").trim();
      const history = String(form.get("historia") || "").trim();
      await saveReunionStory(report.id, { ...story, reportId: report.id, petId: report.pet_id, ownerId: report.user_id, photoUrl, story: [history, message].filter(Boolean).join("\n\n"), reunitedAt });
      await updateReport(report.id, { estado: "reunido", reunited_at: reunitedAt });
      router.push("/historias-de-exito");
      router.refresh();
    } catch (caught) {
      setError(friendlyError(caught, "No se pudo guardar la historia."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton />;
  if (!report || !allowed) return <main className="container py-10"><FriendlyError message={error || "Esta historia no está disponible para edición."} /></main>;
  const [currentHistory, currentMessage = ""] = (story?.story ?? "").split("\n\n", 2);

  return <main className="container py-6"><Link href="/historias-de-exito" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Volver a Reencuentros</Link><form onSubmit={submit} className="form-card mx-auto max-w-2xl space-y-4"><div><h1 className="font-serif text-4xl">Editar historia de reencuentro</h1><p className="mt-2 text-sm text-[#6B6860]">Aquí solo se modifica la historia de éxito; la búsqueda permanece cerrada.</p></div>{error && <FriendlyError message={error} />}<div><label className="label">Fotografía del reencuentro (opcional)</label><input className="field" name="foto" type="file" accept="image/*" /></div>{story?.photoUrl && <img src={story.photoUrl} alt="Reencuentro" className="max-h-72 w-full rounded-xl bg-[#F8F7F4] object-contain" />}<div><label className="label">Historia</label><textarea className="textarea min-h-28" name="historia" maxLength={200} defaultValue={currentHistory} /></div><div><label className="label">Mensaje para la comunidad</label><textarea className="textarea min-h-20" name="mensaje" maxLength={200} defaultValue={currentMessage} /></div><div><label className="label">Fecha del reencuentro</label><input required className="field" name="fecha" type="date" defaultValue={(story?.reunitedAt ?? report.reunited_at ?? new Date().toISOString()).slice(0, 10)} /></div><Button disabled={saving}><Save size={18} />{saving ? "Guardando..." : "Guardar historia"}</Button></form></main>;
}

"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FriendlyError, DetailSkeleton } from "@/components/feedback";
import { PhotoUploader } from "@/components/photo-uploader";
import { listMyRegisteredPets, updateRegisteredPet, uploadMascotaImage, type RegisteredPet } from "@/lib/sprint14-store";
import { friendlyError, requiredText, validateImageFiles } from "@/lib/form-validation";

type FieldErrors = Record<string, string>;

export default function EditRegisteredPetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pet, setPet] = useState<RegisteredPet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [retainedUrls, setRetainedUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => { listMyRegisteredPets().then((items) => setPet(items.find((item) => item.id === id) ?? null)).catch((caught) => setError(friendlyError(caught, "No se pudo cargar la mascota."))).finally(() => setLoading(false)); }, [id]);

  function showErrors(errors: FieldErrors) {
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (!first) return false;
    requestAnimationFrame(() => { const target = formRef.current?.querySelector<HTMLElement>(`[name="${first}"],[data-field="${first}"]`); target?.focus(); target?.scrollIntoView({ behavior: "smooth", block: "center" }); });
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pet || saving) return;
    const form = new FormData(event.currentTarget);
    const errors: FieldErrors = {};
    for (const [name, label] of [["nombre", "El nombre"], ["especie", "La especie"], ["raza", "La raza"], ["color", "El color"], ["descripcion", "La descripción"]] as const) { const validation = requiredText(form.get(name), label, name === "descripcion" ? 1000 : 120); if (validation) errors[name] = validation; }
    const imageError = validateImageFiles(files);
    if (imageError) errors.fotos = imageError;
    if (retainedUrls.length + files.length < 1) errors.fotos = "Agrega al menos una fotografía.";
    const age = String(form.get("edad") ?? "");
    if (age && Number(age) < 0) errors.edad = "La edad no puede ser negativa.";
    if (showErrors(errors)) return;
    setSaving(true); setError("");
    try {
      const uploaded = await Promise.all(files.slice(0, 3).map((file) => uploadMascotaImage(file)));
      const fotos = [...retainedUrls, ...uploaded].slice(0, 3);
      await updateRegisteredPet(pet.id, { nombre: String(form.get("nombre")).trim(), especie: String(form.get("especie")), raza: String(form.get("raza")).trim(), sexo: String(form.get("sexo") || ""), edad: age, color: String(form.get("color")).trim(), salud: String(form.get("salud") || "").trim(), esterilizado: form.get("esterilizado") === "on", placa_medalla: String(form.get("placa_medalla") || "").trim(), telefono: String(form.get("telefono") || "").trim(), caracteristicas: [], caracteristicas_personalizadas: String(form.get("descripcion")).trim(), fotos, foto_principal: fotos[0], foto_url: fotos[0] });
      router.push("/mis-mascotas?actualizada=1"); router.refresh();
    } catch (caught) { setError(friendlyError(caught, "No se pudieron guardar los cambios.")); } finally { setSaving(false); }
  }

  if (loading) return <DetailSkeleton />;
  if (!pet) return <main className="container py-10"><FriendlyError message={error || "No se encontró esta mascota."} /></main>;
  const initialUrls = Array.from(new Set([...(pet.fotos ?? []), pet.foto_principal, pet.foto_url].filter((url): url is string => Boolean(url)))).slice(0, 3);
  return <main className="container py-6"><Link href="/mis-mascotas" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Volver a Mis mascotas</Link><form ref={formRef} onSubmit={submit} className="form-card mx-auto max-w-2xl space-y-4"><div><h1 className="font-serif text-4xl">Editar mascota</h1><p className="mt-2 text-sm text-[#6B6860]">Actualiza únicamente su ficha preventiva.</p></div>{error && <FriendlyError message={error} />}<div data-field="fotos"><label className="label">Fotografías * (máximo 3)</label><PhotoUploader initialUrls={initialUrls} disabled={saving} onChange={(nextFiles, urls) => { setFiles(nextFiles); setRetainedUrls(urls); }} onError={setError} />{fieldErrors.fotos && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.fotos}</p>}</div><div><label className="label">Nombre *</label><input className="field" name="nombre" maxLength={120} defaultValue={pet.nombre} />{fieldErrors.nombre && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.nombre}</p>}</div><div className="grid gap-3 md:grid-cols-2"><div><label className="label">Especie *</label><select className="select" name="especie" defaultValue={pet.especie}><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div><div><label className="label">Raza *</label><input className="field" name="raza" maxLength={120} defaultValue={pet.raza} />{fieldErrors.raza && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.raza}</p>}</div></div><div className="grid gap-3 md:grid-cols-2"><div><label className="label">Sexo</label><select className="select" name="sexo" defaultValue={pet.sexo || ""}><option value="">No indicado</option><option>Hembra</option><option>Macho</option></select></div><div><label className="label">Edad</label><input className="field" name="edad" type="number" min="0" defaultValue={pet.edad || ""} />{fieldErrors.edad && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.edad}</p>}</div></div><div><label className="label">Color *</label><input className="field" name="color" maxLength={120} defaultValue={pet.color} />{fieldErrors.color && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.color}</p>}</div><div><label className="label">Descripción *</label><textarea className="textarea min-h-24" name="descripcion" maxLength={1000} defaultValue={pet.caracteristicas_personalizadas || ""} />{fieldErrors.descripcion && <p className="mt-1 text-sm font-semibold text-[#B42318]">{fieldErrors.descripcion}</p>}</div><div><label className="label">Salud</label><input className="field" name="salud" maxLength={240} defaultValue={pet.salud || ""} /></div><label className="flex min-h-11 items-center gap-3 rounded-xl border border-black/10 p-3 text-sm font-semibold"><input type="checkbox" name="esterilizado" defaultChecked={Boolean(pet.esterilizado)} />Esterilizado</label><div><label className="label">Placa o medalla (opcional)</label><input className="field" name="placa_medalla" maxLength={120} defaultValue={pet.placa_medalla || ""} /></div><div><label className="label">Teléfono (opcional)</label><input className="field" name="telefono" type="tel" maxLength={40} defaultValue={pet.telefono || ""} /></div><div className="grid gap-2 min-[390px]:flex"><Button disabled={saving}><Save size={18} />{saving ? "Guardando..." : "Guardar cambios"}</Button><Button type="button" variant="outline" asChild><Link href="/mis-mascotas">Cancelar</Link></Button></div></form></main>;
}

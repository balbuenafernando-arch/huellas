"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Camera, Edit, Eye, Image as ImageIcon, Plus, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageCropper } from "@/components/image-cropper";
import { FriendlyError, PageSkeleton } from "@/components/feedback";
import type { Sighting } from "@/lib/demo-data";
import { getSightings } from "@/lib/pet-store";
import { listMyCases, type CaseRecord } from "@/lib/cases";
import { createRegisteredPet, deleteRegisteredPet, listMyRegisteredPets, type RegisteredPet, updateRegisteredPet, uploadMascotaImage } from "@/lib/sprint14-store";
import { friendlyError, operationError, requiredText, validateImageFiles } from "@/lib/form-validation";

type FieldErrors = Record<string, string>;

type FormPhoto = {
  id: string;
  previewUrl: string;
  file?: File;
  persistedUrl?: string;
};

const fallbackPhoto = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80";

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function petPhotos(pet?: RegisteredPet | null) {
  const photos = [...(pet?.fotos ?? []), pet?.foto_principal, pet?.foto_url].filter((photo): photo is string => Boolean(photo));
  return Array.from(new Set(photos));
}

function photoId() {
  return crypto.randomUUID();
}

function fieldValue(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

export default function MisMascotasPage() {
  const [pets, setPets] = useState<RegisteredPet[]>([]);
  const [editing, setEditing] = useState<RegisteredPet | null>(null);
  const [detailPetId, setDetailPetId] = useState<string | null>(null);
  const [deletePet, setDeletePet] = useState<RegisteredPet | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formPhotos, setFormPhotos] = useState<FormPhoto[]>([]);
  const [principalPhotoId, setPrincipalPhotoId] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [pendingCropFiles, setPendingCropFiles] = useState<File[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const detailPet = useMemo(() => pets.find((pet) => pet.id === detailPetId) ?? null, [detailPetId, pets]);

  async function load() {
    try {
      const [registeredPets, myCases, allSightings] = await Promise.all([listMyRegisteredPets(), listMyCases(), getSightings()]);
      setPets(registeredPets);
      setCases(myCases);
      setSightings(allSightings);
      setError("");
    } catch (caught) {
      setError(friendlyError(caught, "No se pudieron cargar tus mascotas. Revisa tu conexion e intentalo otra vez."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openForm(pet?: RegisteredPet) {
    const existingPhotos = petPhotos(pet);
    const photos = existingPhotos.map((url) => ({ id: photoId(), previewUrl: url, persistedUrl: url }));
    setEditing(pet ?? null);
    setShowForm(true);
    setFormPhotos(photos);
    setPrincipalPhotoId(photos.find((photo) => photo.persistedUrl === (pet?.foto_principal ?? pet?.foto_url))?.id ?? photos[0]?.id ?? "");
    setCropFile(null);
    setError("");
    setSuccessMessage("");
    setFieldErrors({});
  }

  function closeForm() {
    setEditing(null);
    setShowForm(false);
    setFormPhotos([]);
    setPrincipalPhotoId("");
    setCropFile(null);
    setPendingCropFiles([]);
    setFieldErrors({});
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const availableSlots = 3 - formPhotos.length;
    const selectedForCrop = selected.slice(0, Math.max(0, availableSlots));
    const validationMessage = validateImageFiles(selectedForCrop);
    if (selected.length === 0) return;
    if (availableSlots <= 0 || selected.length > availableSlots) {
      setError("Puedes subir hasta un maximo de 3 fotografias por mascota.");
    }
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    if (selectedForCrop.length) {
      setPendingCropFiles(selectedForCrop.slice(1));
      setCropFile(selectedForCrop[0]);
      setError("");
    }
  }

  function addCroppedPhoto(file: File, previewUrl: string) {
    const nextPhoto = { id: photoId(), previewUrl, file };
    setFormPhotos((current) => {
      const next = [...current, nextPhoto].slice(0, 3);
      if (!principalPhotoId) setPrincipalPhotoId(nextPhoto.id);
      return next;
    });
    const [nextFile, ...remaining] = pendingCropFiles;
    setPendingCropFiles(remaining);
    setCropFile(nextFile ?? null);
  }

  function cancelCrop() {
    const [nextFile, ...remaining] = pendingCropFiles;
    setPendingCropFiles(remaining);
    setCropFile(nextFile ?? null);
  }

  function removeFormPhoto(id: string) {
    if (formPhotos.length <= 1) {
      setError("Si solo existe una fotografia, no puedes eliminarla hasta subir otra o eliminar la mascota.");
      return;
    }
    setFormPhotos((current) => {
      const next = current.filter((photo) => photo.id !== id);
      if (principalPhotoId === id) setPrincipalPhotoId(next[0]?.id ?? "");
      return next;
    });
    setError("");
  }

  function showFieldErrors(errors: FieldErrors) {
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (!first) return false;
    requestAnimationFrame(() => {
      const field = formRef.current?.querySelector<HTMLElement>(`[name="${first}"],[data-field="${first}"]`);
      field?.focus();
      field?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const errors: FieldErrors = {};
    const nombreError = requiredText(form.get("nombre"), "El nombre", 120);
    if (nombreError) errors.nombre = nombreError;
    const especieError = requiredText(form.get("especie"), "La especie", 60);
    if (especieError) errors.especie = especieError;
    const ageText = fieldValue(form, "edad");
    if (ageText && Number(ageText) < 0) errors.edad = "La edad debe ser mayor o igual a cero.";
    if (formPhotos.length < 1) errors.fotos = "Debes subir al menos 1 fotografia de la mascota.";
    if (formPhotos.length > 3) errors.fotos = "Puedes subir hasta un maximo de 3 fotografias por mascota.";
    const imageError = validateImageFiles(formPhotos.flatMap((photo) => photo.file ? [photo.file] : []));
    if (imageError) errors.fotos = imageError;
    if (showFieldErrors(errors)) {
      setError("");
      return;
    }
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const uploadResults = await Promise.all(formPhotos.map(async (photo) => {
        if (photo.persistedUrl) return { id: photo.id, url: photo.persistedUrl };
        if (!photo.file) return { id: photo.id, url: photo.previewUrl };
        try {
          return { id: photo.id, url: await uploadMascotaImage(photo.file) };
        } catch (caught) {
          throw new Error(operationError(caught, "subir fotografia de mascota"));
        }
      }));
      const fotos = uploadResults.map((photo) => photo.url).slice(0, 3);
      const principal = uploadResults.find((photo) => photo.id === principalPhotoId)?.url ?? fotos[0] ?? fallbackPhoto;
      const payload = {
        nombre: fieldValue(form, "nombre"),
        alias: editing?.alias ?? "",
        especie: fieldValue(form, "especie"),
        raza: fieldValue(form, "raza") || "No indicada",
        tamano: fieldValue(form, "tamano"),
        color: fieldValue(form, "color"),
        sexo: fieldValue(form, "sexo"),
        edad: ageText,
        salud: fieldValue(form, "descripcion"),
        esterilizado: Boolean(editing?.esterilizado),
        placa_medalla: editing?.placa_medalla ?? "",
        caracteristicas: editing?.caracteristicas ?? [],
        caracteristicas_personalizadas: fieldValue(form, "rasgos_distintivos"),
        condiciones_especiales: editing?.condiciones_especiales ?? [],
        telefono: editing?.telefono ?? "",
        contacto_preferido: editing?.contacto_preferido ?? "whatsapp",
        fotos,
        foto_principal: principal,
        foto_url: principal,
        rasgo_privado: editing?.rasgo_privado ?? "",
      };
      if (editing) await updateRegisteredPet(editing.id, payload);
      else await createRegisteredPet(payload);
      closeForm();
      formElement.reset();
      await load();
      setSuccessMessage(editing ? "Mascota actualizada correctamente." : "Mascota registrada correctamente.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : operationError(caught, editing ? "actualizar mascota" : "guardar mascota"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletePet || deleting) return;
    setDeleting(true);
    setError("");
    setSuccessMessage("");
    try {
      await deleteRegisteredPet(deletePet.id);
      setDeletePet(null);
      if (detailPetId === deletePet.id) setDetailPetId(null);
      await load();
      setSuccessMessage("Mascota eliminada correctamente.");
    } catch (caught) {
      setError(operationError(caught, "eliminar mascota"));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageSkeleton />;

  return (
    <main className="container py-6">
      {cropFile && <ImageCropper file={cropFile} onCancel={cancelCrop} onApply={addCroppedPhoto} />}
      {deletePet && (
        <div className="fixed inset-0 z-[1100] grid place-items-center bg-black/60 p-4">
          <section className="form-card max-w-lg space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">Eliminar mascota</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => setDeletePet(null)} disabled={deleting}><X size={16} />Cerrar</Button>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[#4D4A43]">
              <p className="font-bold">Estas seguro de que deseas eliminar esta mascota?</p>
              <p>Esta accion es permanente y no puede deshacerse.</p>
              <p>Al eliminar esta mascota tambien se eliminaran:</p>
              <ul className="list-disc pl-5">
                <li>la ficha de la mascota;</li>
                <li>todas sus fotografias;</li>
                <li>la busqueda asociada (si existe);</li>
                <li>los avistamientos asociados;</li>
                <li>las notificaciones relacionadas.</li>
              </ul>
              <p>Toda esta informacion se eliminara de forma definitiva y no podra recuperarse.</p>
            </div>
            <div className="grid gap-2 min-[390px]:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => setDeletePet(null)} disabled={deleting}>Cancelar</Button>
              <Button type="button" onClick={confirmDelete} disabled={deleting}><Trash2 size={18} className={deleting ? "animate-spin" : ""} />{deleting ? "Eliminando..." : "Eliminar definitivamente"}</Button>
            </div>
          </section>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 min-[390px]:flex-row min-[390px]:items-end min-[390px]:justify-between">
        <div>
          <h1 className="font-serif text-4xl">Mis mascotas</h1>
          <p className="mt-2 text-[#6B6860]">Gestiona las fichas de tus mascotas y sus fotografias.</p>
        </div>
        <Button type="button" onClick={() => openForm()} disabled={saving || deleting}><Plus size={18} />Registrar mascota</Button>
      </div>

      {successMessage && (
        <div className="fixed right-4 top-4 z-[1300] max-w-sm rounded-xl bg-[#E1F5EE] p-4 text-sm font-semibold text-[#085041] shadow-[0_16px_40px_rgba(0,0,0,.18)]" role="status" aria-live="polite">
          {successMessage}
        </div>
      )}
      {error && <div className="mb-4"><FriendlyError message={error} onRetry={load} /></div>}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Mascotas registradas</h2>
          {pets.length === 0 && (
            <div className="form-card empty-state text-sm">
              <strong>Aun no has registrado ninguna mascota.</strong>
              <Button type="button" onClick={() => openForm()}><Plus size={18} />Registrar mascota</Button>
            </div>
          )}
          {pets.map((pet) => {
            return (
              <article key={pet.id} className="form-card flex flex-col gap-3 min-[520px]:flex-row">
                <img src={pet.foto_principal ?? pet.foto_url} alt={pet.nombre} className="h-36 w-full rounded-xl bg-[#F8F7F4] object-contain min-[520px]:h-32 min-[520px]:w-32" loading="lazy" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">{pet.nombre}</h3>
                  </div>
                  <dl className="mt-2 grid gap-1 text-sm text-[#6B6860] min-[390px]:grid-cols-2">
                    <div><dt className="font-semibold text-[#4D4A43]">Especie</dt><dd>{pet.especie || "No indicada"}</dd></div>
                    <div><dt className="font-semibold text-[#4D4A43]">Sexo</dt><dd>{pet.sexo || "No indicado"}</dd></div>
                    <div><dt className="font-semibold text-[#4D4A43]">Edad</dt><dd>{pet.edad || "No indicada"}</dd></div>
                    <div><dt className="font-semibold text-[#4D4A43]">Registro</dt><dd>{formatDate(pet.created_at)}</dd></div>
                  </dl>
                  <div className="mt-3 grid gap-2 min-[390px]:flex min-[390px]:flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setDetailPetId(pet.id)}><Eye size={16} />Ver detalle</Button>
                    <Button size="sm" variant="outline" onClick={() => openForm(pet)} disabled={saving}><Edit size={16} />Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => setDeletePet(pet)} disabled={deleting}><Trash2 size={16} />Eliminar</Button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {showForm ? (
          <form ref={formRef} onSubmit={submit} className="form-card space-y-4">
            <h2 className="text-xl font-bold">{editing ? "Editar mascota" : "Registrar mascota"}</h2>
            <p className="rounded-xl bg-[#FAEEDA] p-3 text-sm text-[#6B4A10]">Puedes subir hasta un maximo de 3 fotografias por mascota.</p>
            <div className="rounded-xl bg-[#F8F7F4] p-3 text-sm leading-6 text-[#4D4A43]">
              <strong className="block">Normas para las fotografias</strong>
              Las imagenes deben corresponder unicamente a la mascota registrada. No esta permitido subir contenido sexual o con desnudos, violento o extremadamente grafico, ofensivo o discriminatorio, que promueva odio o acoso, que infrinja derechos de autor o privacidad de terceros, o que no este relacionado con la mascota. El contenido que incumpla estas normas podra ser eliminado y la cuenta podra ser suspendida.
            </div>

            <div data-field="fotos">
              <label className="label">Fotografias *</label>
              <input ref={cameraInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onClick={(event) => { event.currentTarget.value = ""; }} onChange={handlePhoto} />
              <input ref={galleryInputRef} className="sr-only" type="file" accept="image/*" multiple onClick={(event) => { event.currentTarget.value = ""; }} onChange={handlePhoto} />
              <div className="grid gap-2 min-[390px]:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={saving || formPhotos.length >= 3}><Camera size={18} />Tomar foto</Button>
                <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()} disabled={saving || formPhotos.length >= 3}><ImageIcon size={18} />Elegir desde galeria</Button>
              </div>
              {formPhotos.length >= 3 && <p className="mt-2 text-sm font-semibold text-[#6B4A10]">Puedes subir hasta un maximo de 3 fotografias por mascota.</p>}
              {fieldErrors.fotos && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.fotos}</p>}
              <div className="mt-3 grid gap-3 min-[520px]:grid-cols-3">
                {formPhotos.map((photo) => (
                  <div key={photo.id} className="rounded-xl border border-black/10 bg-white p-2">
                    <img src={photo.previewUrl} alt="Fotografia de la mascota" className="h-32 w-full rounded-lg bg-[#F8F7F4] object-contain" />
                    <p className="mt-2 text-xs font-semibold text-[#085041]">{photo.persistedUrl ? "Fotografia guardada" : "Lista para guardar"}</p>
                    <div className="mt-2 grid gap-2">
                      <Button type="button" size="sm" variant={principalPhotoId === photo.id ? "default" : "outline"} onClick={() => setPrincipalPhotoId(photo.id)} disabled={saving}><Star size={15} />{principalPhotoId === photo.id ? "Principal" : "Hacer principal"}</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => removeFormPhoto(photo.id)} disabled={saving || formPhotos.length <= 1}><Trash2 size={15} />Eliminar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div><label className="label">Nombre *</label><input className="field" name="nombre" required maxLength={120} defaultValue={editing?.nombre} />{fieldErrors.nombre && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.nombre}</p>}</div>
            <div><label className="label">Especie *</label><select className="select" name="especie" required defaultValue={editing?.especie ?? "Perro"}><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select>{fieldErrors.especie && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.especie}</p>}</div>
            <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Raza</label><input className="field" name="raza" defaultValue={editing?.raza} /></div><div><label className="label">Sexo</label><select className="select" name="sexo" defaultValue={editing?.sexo ?? ""}><option value="">No indicado</option><option>Hembra</option><option>Macho</option></select></div></div>
            <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Tamano</label><select className="select" name="tamano" defaultValue={editing?.tamano ?? "Mediano"}><option>Pequeno</option><option>Mediano</option><option>Grande</option></select></div><div><label className="label">Edad</label><input className="field" name="edad" type="number" min="0" defaultValue={editing?.edad} />{fieldErrors.edad && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.edad}</p>}</div></div>
            <div><label className="label">Color</label><input className="field" name="color" defaultValue={editing?.color} /></div>
            <div><label className="label">Descripcion</label><textarea className="field min-h-28" name="descripcion" maxLength={1000} defaultValue={editing?.salud || ""} /></div>
            <div><label className="label">Otros rasgos distintivos</label><input className="field" name="rasgos_distintivos" maxLength={240} defaultValue={editing?.caracteristicas_personalizadas ?? ""} placeholder="Manchas, cicatrices, collar, placa u otros detalles visibles" /></div>
            <p className="text-xs font-semibold text-[#6B6860]">(*) Campos obligatorios.</p>
            <div className="grid gap-2 min-[390px]:flex">
              <Button disabled={saving}><Plus size={18} className={saving ? "animate-spin" : ""} />{saving ? "Guardando..." : editing ? "Guardar cambios" : "Registrar mascota"}</Button>
              <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Cancelar</Button>
            </div>
          </form>
        ) : detailPet ? (
          <aside className="form-card space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-bold">{detailPet.nombre}</h2><p className="text-sm text-[#6B6860]">Detalle de mascota</p></div>
              <Button type="button" size="sm" variant="outline" onClick={() => setDetailPetId(null)}><X size={16} />Cerrar</Button>
            </div>
            <div className="grid gap-3">
              {petPhotos(detailPet).map((photo, index) => <img key={photo} src={photo} alt={`${detailPet.nombre} fotografia ${index + 1}`} className="max-h-64 w-full rounded-xl bg-[#F8F7F4] object-contain" />)}
            </div>
            <dl className="grid gap-3 text-sm min-[390px]:grid-cols-2">
              <div><dt className="font-bold">Especie</dt><dd>{detailPet.especie || "No indicada"}</dd></div>
              <div><dt className="font-bold">Raza</dt><dd>{detailPet.raza || "No indicada"}</dd></div>
              <div><dt className="font-bold">Sexo</dt><dd>{detailPet.sexo || "No indicado"}</dd></div>
              <div><dt className="font-bold">Edad</dt><dd>{detailPet.edad || "No indicada"}</dd></div>
              <div><dt className="font-bold">Tamano</dt><dd>{detailPet.tamano || "No indicado"}</dd></div>
              <div><dt className="font-bold">Color</dt><dd>{detailPet.color || "No indicado"}</dd></div>
              <div><dt className="font-bold">Fecha de registro</dt><dd className="flex items-center gap-2"><CalendarDays size={15} />{formatDate(detailPet.created_at)}</dd></div>
            </dl>
            <div><h3 className="font-bold">Descripcion</h3><p className="mt-1 text-sm text-[#6B6860]">{detailPet.salud || "Sin descripcion."}</p></div>
            <div><h3 className="font-bold">Otros rasgos distintivos</h3><p className="mt-1 text-sm text-[#6B6860]">{detailPet.caracteristicas_personalizadas || "Sin rasgos adicionales."}</p></div>
            <div className="grid gap-2 min-[390px]:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => openForm(detailPet)}><Edit size={18} />Editar</Button>
              <Button type="button" variant="outline" onClick={() => setDeletePet(detailPet)}><Trash2 size={18} />Eliminar</Button>
            </div>
          </aside>
        ) : (
          <aside className="space-y-4">
            <div className="form-card text-sm text-[#6B6860]">Una ficha clara ahora puede hacer mas rapida una busqueda despues.</div>
            <div className="form-card">
              <h2 className="mb-3 font-bold">Resumen de busqueda</h2>
              <div className="grid grid-cols-2 gap-2 text-center text-sm">
                <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-xl">{cases.filter((item) => item.status !== "reunido").length}</strong>casos activos</div>
                <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-xl">{cases.filter((item) => item.status === "reunido").length}</strong>historial</div>
                <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-xl">{sightings.length}</strong>avistamientos</div>
                <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-xl">{sightings.filter((item) => (item.estado_avistamiento ?? item.estado) === "confirmado").length}</strong>confirmados</div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

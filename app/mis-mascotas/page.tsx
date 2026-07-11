"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Camera, Edit, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageCropper } from "@/components/image-cropper";
import { FriendlyError, PageSkeleton } from "@/components/feedback";
import type { Sighting } from "@/lib/demo-data";
import { getSightings } from "@/lib/pet-store";
import { listMyCases, type CaseRecord } from "@/lib/cases";
import { createRegisteredPet, deleteRegisteredPet, listMyRegisteredPets, type RegisteredPet, updateRegisteredPet, uploadMascotaImage } from "@/lib/sprint14-store";
import { friendlyError, operationError, requiredText, validateImageFiles } from "@/lib/form-validation";

type FieldErrors = Record<string, string>;

const traits = ["Collar", "Placa", "Pañuelo", "Mancha blanca", "Oreja doblada", "Cola corta", "Cojera", "Herida visible", "Ojo de color distinto", "Otro"];

export default function MisMascotasPage() {
  const [pets, setPets] = useState<RegisteredPet[]>([]);
  const [editing, setEditing] = useState<RegisteredPet | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [customTraitVisible, setCustomTraitVisible] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function load() {
    try {
      const [registeredPets, myCases, allSightings] = await Promise.all([listMyRegisteredPets(), listMyCases(), getSightings()]);
      setPets(registeredPets);
      setCases(myCases);
      setSightings(allSightings);
      setError("");
    } catch (caught) {
      setError(friendlyError(caught, "No se pudieron cargar tus mascotas. Revisa tu conexión e inténtalo otra vez."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openForm(pet?: RegisteredPet) {
    setEditing(pet ?? null);
    setShowForm(true);
    setPhotoFile(null);
    setPhotoPreview(pet?.foto_principal ?? pet?.foto_url ?? "");
    setCropFile(null);
    setError("");
    setSuccessMessage("");
    setFieldErrors({});
    setCustomTraitVisible(Boolean(pet?.caracteristicas?.includes("Otro") || pet?.caracteristicas_personalizadas));
  }

  function closeForm() {
    setEditing(null);
    setShowForm(false);
    setPhotoFile(null);
    setPhotoPreview("");
    setCropFile(null);
    setFieldErrors({});
    setCustomTraitVisible(false);
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const validationMessage = validateImageFiles(file ? [file] : []);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    if (file) {
      setCropFile(file);
      setError("");
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const files = photoFile ? [photoFile] : [];
    const errors: FieldErrors = {};
    const nombreError = requiredText(form.get("nombre"), "El nombre", 120);
    if (nombreError) errors.nombre = nombreError;
    const especieError = requiredText(form.get("especie"), "La especie", 60);
    if (especieError) errors.especie = especieError;
    const imageError = validateImageFiles(files);
    if (imageError) errors.fotos = imageError;
    if (showFieldErrors(errors)) {
      setError("");
      return;
    }
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const wasEditing = Boolean(editing);
      let uploaded: string[] = [];
      try {
        uploaded = files.length ? await Promise.all(files.map((file) => uploadMascotaImage(file))) : [];
      } catch (caught) {
        throw new Error(operationError(caught, "subir fotografia de mascota"));
      }
      const existingFotos = editing?.fotos?.length ? editing.fotos : editing?.foto_url ? [editing.foto_url] : [];
      const fotos = uploaded.length ? uploaded : existingFotos;
      const principal = String(fotos[0] || editing?.foto_url || "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80");
      const selectedTraits = form.getAll("caracteristicas").map(String);
      const payload = {
        nombre: String(form.get("nombre")),
        alias: editing?.alias ?? "",
        especie: String(form.get("especie")),
        raza: String(form.get("raza") || "No indicada"),
        tamano: String(form.get("tamano")),
        color: String(form.get("color") || ""),
        sexo: String(form.get("sexo") || ""),
        edad: String(form.get("edad") || ""),
        salud: String(form.get("salud") || ""),
        esterilizado: form.get("esterilizado") === "on",
        placa_medalla: String(form.get("placa_medalla") || ""),
        caracteristicas: selectedTraits,
        caracteristicas_personalizadas: selectedTraits.includes("Otro") ? String(form.get("caracteristicas_personalizadas") || "").trim() : "",
        telefono: String(form.get("telefono") || ""),
        contacto_preferido: String(form.get("contacto_preferido") || "whatsapp"),
        fotos,
        foto_principal: principal,
        foto_url: principal,
        rasgo_privado: editing?.rasgo_privado ?? "",
      };
      try {
        if (editing) await updateRegisteredPet(editing.id, payload);
        else await createRegisteredPet(payload);
      } catch (caught) {
        throw new Error(operationError(caught, editing ? "actualizar mascota" : "guardar mascota"));
      }
      closeForm();
      formElement.reset();
      await load();
      setSuccessMessage(wasEditing ? "Mascota actualizada correctamente. Sus datos ya estan disponibles para futuras busquedas." : "Mascota creada correctamente. Ahora puedes activar una busqueda si algun dia la necesitas.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : operationError(caught, "guardar mascota"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Estás seguro?\n\nEsta acción no se puede deshacer.")) return;
    try {
      await deleteRegisteredPet(id);
      await load();
    } catch (caught) {
      setError(operationError(caught, "eliminar mascota"));
    }
  }

  if (loading) return <PageSkeleton />;

  return (
    <main className="container py-6">
      <div className="mb-5 flex flex-col gap-3 min-[390px]:flex-row min-[390px]:items-end min-[390px]:justify-between">
        <div><h1 className="font-serif text-4xl">Mis mascotas</h1><p className="mt-2 text-[#6B6860]">Registra información útil para activar una búsqueda rápidamente si algún día la necesitas.</p></div>
        <Button type="button" onClick={() => openForm()}><Plus size={18} />Registrar mascota</Button>
      </div>
      {error && <div className="mb-4"><FriendlyError message={error} onRetry={load} /></div>}
      {successMessage && <div className="mb-4 rounded-xl bg-[#E1F5EE] p-4 text-sm font-semibold text-[#085041]"><strong className="block text-base">Operacion exitosa</strong>{successMessage}</div>}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Mascotas registradas</h2>
          {pets.length === 0 && <div className="form-card empty-state text-sm"><strong>Aún no hay mascotas guardadas.</strong><span>Agrega fotos y señas claras para ahorrar minutos importantes si algún día las necesitas.</span></div>}
          {pets.map((pet) => <article key={pet.id} className="form-card flex flex-col gap-3 min-[390px]:flex-row">
            <img src={pet.foto_principal ?? pet.foto_url} alt={pet.nombre} className="h-40 w-full rounded-xl bg-[#F8F7F4] object-contain min-[390px]:h-24 min-[390px]:w-24" loading="lazy" />
            <div className="flex-1">
              <h3 className="font-bold">{pet.nombre}</h3>
              <p className="text-sm text-[#7A7871]">{[pet.especie, pet.tamano, pet.color].filter(Boolean).join(" - ")}</p>
              <p className="text-sm text-[#7A7871]">{pet.alias ? `También responde a ${pet.alias}` : pet.edad}</p>
              <div className="mt-3 grid gap-2 min-[390px]:flex">
                <Button size="sm" variant="outline" onClick={() => openForm(pet)}><Edit size={16} />Editar</Button>
                <Button size="sm" variant="outline" onClick={() => remove(pet.id)}><Trash2 size={16} />Eliminar</Button>
              </div>
            </div>
          </article>)}
        </section>

        {showForm ? <form ref={formRef} onSubmit={submit} className="form-card space-y-4">
          {cropFile && <ImageCropper file={cropFile} onCancel={() => setCropFile(null)} onApply={(file, previewUrl) => {
            setPhotoFile(file);
            setPhotoPreview(previewUrl);
            setCropFile(null);
          }} />}
          <h2 className="font-bold">{editing ? "Editar mascota" : "Registrar mascota"}</h2>
          <p className="rounded-xl bg-[#FAEEDA] p-3 text-sm text-[#6B4A10]">Incluye fotos y rasgos distintivos: manchas, collar, cicatrices o comportamiento. Eso ayuda a encontrar coincidencias.</p>
          <div>
            <label className="label">Foto</label>
            <input ref={cameraInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onClick={(event) => { event.currentTarget.value = ""; }} onChange={handlePhoto} />
            <input ref={galleryInputRef} className="sr-only" type="file" accept="image/*" onClick={(event) => { event.currentTarget.value = ""; }} onChange={handlePhoto} />
            <div className="grid gap-2 min-[390px]:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={saving}><Camera size={18} />Tomar foto</Button>
              <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()} disabled={saving}><ImageIcon size={18} />Elegir desde galeria</Button>
            </div>
            {photoPreview && <img src={photoPreview} alt="Vista previa" className="mt-3 max-h-56 w-full rounded-xl bg-[#F8F7F4] object-contain" />}
            {fieldErrors.fotos && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.fotos}</p>}
          </div>
          <div><label className="label">Nombre *</label><input className="field" name="nombre" required maxLength={120} defaultValue={editing?.nombre} />{fieldErrors.nombre && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.nombre}</p>}</div>
          <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Especie *</label><select className="select" name="especie" defaultValue={editing?.especie ?? "Perro"}><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select>{fieldErrors.especie && <p className="mt-2 text-sm font-semibold text-red-700">{fieldErrors.especie}</p>}</div><div><label className="label">Tamaño</label><select className="select" name="tamano" defaultValue={editing?.tamano ?? "Mediano"}><option>Pequeño</option><option>Mediano</option><option>Grande</option></select></div></div>
          <div><label className="label">Señas particulares</label><div className="grid gap-2 md:grid-cols-2">{traits.map((trait) => <label key={trait} className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="caracteristicas" value={trait} defaultChecked={editing?.caracteristicas?.includes(trait)} onChange={trait === "Otro" ? (event) => setCustomTraitVisible(event.currentTarget.checked) : undefined} />{trait}</label>)}</div>{customTraitVisible && <div className="mt-3"><label className="label">Describe la seña particular</label><input className="field" name="caracteristicas_personalizadas" maxLength={240} defaultValue={editing?.caracteristicas_personalizadas ?? ""} placeholder="Ej. mancha, cicatriz o comportamiento especial" /></div>}</div>
          <details className="rounded-xl border border-black/10 p-3">
            <summary className="cursor-pointer text-sm font-bold text-[#1D9E75]">Agregar más datos</summary>
            <div className="mt-3 space-y-4">
              <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Raza</label><input className="field" name="raza" defaultValue={editing?.raza} /></div><div><label className="label">Color</label><input className="field" name="color" defaultValue={editing?.color} /></div></div>
              <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Sexo</label><select className="select" name="sexo" defaultValue={editing?.sexo ?? ""}><option value="">No indicado</option><option>Hembra</option><option>Macho</option></select></div><div><label className="label">Edad</label><input className="field" name="edad" defaultValue={editing?.edad} /></div></div>
              <div><label className="label">Salud</label><input className="field" name="salud" defaultValue={editing?.salud ?? ""} placeholder="Medicación, condición, alergias" /></div>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="esterilizado" defaultChecked={Boolean(editing?.esterilizado)} />Esterilizado</label>
              <div><label className="label">Placa/medalla</label><input className="field" name="placa_medalla" defaultValue={editing?.placa_medalla ?? ""} placeholder="Color o texto visible" /></div>
              <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Teléfono</label><input className="field" name="telefono" defaultValue={editing?.telefono ?? ""} /></div><div><label className="label">Contacto preferido</label><select className="select" name="contacto_preferido" defaultValue={editing?.contacto_preferido ?? "whatsapp"}><option value="whatsapp">WhatsApp</option><option value="telefono">Teléfono</option><option value="ambos">Ambos</option></select></div></div>
            </div>
          </details>
          <div className="grid gap-2 min-[390px]:flex">
            <Button disabled={saving}><Plus size={18} className={saving ? "animate-spin" : ""} />{saving ? "Guardando mascota..." : "Guardar mascota"}</Button>
            <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
          </div>
        </form> : <aside className="space-y-4">
          <div className="form-card text-sm text-[#6B6860]">Una ficha clara ahora puede hacer más rápida una búsqueda después.</div>
          <div className="form-card">
            <h2 className="mb-3 font-bold">Resumen de búsqueda</h2>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-xl">{cases.filter((item) => item.status !== "reunido").length}</strong>casos activos</div>
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-xl">{cases.filter((item) => item.status === "reunido").length}</strong>historial</div>
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-xl">{sightings.length}</strong>avistamientos</div>
              <div className="rounded-xl bg-[#F8F7F4] p-3"><strong className="block text-xl">{sightings.filter((item) => (item.estado_avistamiento ?? item.estado) === "confirmado").length}</strong>confirmados</div>
            </div>
          </div>
          <div className="form-card">
            <h2 className="mb-3 font-bold">Configuración</h2>
            <p className="text-sm text-[#6B6860]">La privacidad mantiene teléfonos y datos de verificación fuera de la vista pública.</p>
          </div>
        </aside>}
      </div>
    </main>
  );
}

"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FriendlyError, PageSkeleton } from "@/components/feedback";
import type { Sighting } from "@/lib/demo-data";
import { getSightings } from "@/lib/pet-store";
import { listMyCases, type CaseRecord } from "@/lib/cases";
import { createRegisteredPet, deleteRegisteredPet, listMyRegisteredPets, type RegisteredPet, updateRegisteredPet, uploadMascotaImage } from "@/lib/sprint14-store";
import { friendlyError, requiredText, validateImageFiles } from "@/lib/form-validation";

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

  async function load() {
    try {
      const [registeredPets, myCases, allSightings] = await Promise.all([listMyRegisteredPets(), listMyCases(), getSightings()]);
      setPets(registeredPets);
      setCases(myCases);
      setSightings(allSightings);
      setError("");
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos cargar tus mascotas. Revisa tu conexión e inténtalo otra vez."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const files = form.getAll("fotos").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 5);
    const validationMessage =
      requiredText(form.get("nombre"), "El nombre", 120) ||
      requiredText(form.get("especie"), "La especie", 60) ||
      validateImageFiles(files);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const uploaded = files.length ? await Promise.all(files.map((file) => uploadMascotaImage(file))) : [];
      const existingFotos = editing?.fotos?.length ? editing.fotos : editing?.foto_url ? [editing.foto_url] : [];
      const fotos = uploaded.length ? uploaded : existingFotos;
      const principal = String(form.get("foto_principal") || fotos[0] || editing?.foto_url || "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80");
      const payload = {
        nombre: String(form.get("nombre")),
        alias: String(form.get("alias") || ""),
        especie: String(form.get("especie")),
        raza: String(form.get("raza") || "No indicada"),
        tamano: String(form.get("tamano")),
        color: String(form.get("color") || ""),
        sexo: String(form.get("sexo") || ""),
        edad: String(form.get("edad") || ""),
        salud: String(form.get("salud") || ""),
        esterilizado: form.get("esterilizado") === "on",
        placa_medalla: String(form.get("placa_medalla") || ""),
        caracteristicas: form.getAll("caracteristicas").map(String),
        telefono: String(form.get("telefono") || ""),
        contacto_preferido: String(form.get("contacto_preferido") || "whatsapp"),
        fotos,
        foto_principal: principal,
        foto_url: principal,
        rasgo_privado: String(form.get("rasgo_privado") || ""),
      };
      if (editing) await updateRegisteredPet(editing.id, payload);
      else await createRegisteredPet(payload);
      setEditing(null);
      setShowForm(false);
      formElement.reset();
      await load();
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos guardar la mascota. Revisa los datos e inténtalo otra vez."));
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
      setError(friendlyError(caught, "No pudimos eliminar la mascota. Inténtalo otra vez."));
    }
  }

  if (loading) return <PageSkeleton />;

  return (
    <main className="container py-6">
      <div className="mb-5 flex flex-col gap-3 min-[390px]:flex-row min-[390px]:items-end min-[390px]:justify-between">
        <div><h1 className="font-serif text-4xl">Mis mascotas</h1><p className="mt-2 text-[#6B6860]">Registra información útil para activar una búsqueda rápidamente si algún día la necesitas.</p></div>
        <Button type="button" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={18} />Registrar mascota</Button>
      </div>
      {error && <div className="mb-4"><FriendlyError message={error} onRetry={load} /></div>}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Mascotas registradas</h2>
          {pets.length === 0 && <div className="form-card empty-state text-sm"><strong>Aún no hay mascotas guardadas.</strong><span>Agrega fotos y señas claras para ahorrar minutos importantes si algún día las necesitas.</span></div>}
          {pets.map((pet) => <article key={pet.id} className="form-card flex flex-col gap-3 min-[390px]:flex-row">
            <img src={pet.foto_principal ?? pet.foto_url} alt={pet.nombre} className="h-40 w-full rounded-xl bg-[#F8F7F4] object-cover min-[390px]:h-24 min-[390px]:w-24" loading="lazy" />
            <div className="flex-1">
              <h3 className="font-bold">{pet.nombre}</h3>
              <p className="text-sm text-[#7A7871]">{[pet.especie, pet.tamano, pet.color].filter(Boolean).join(" - ")}</p>
              <p className="text-sm text-[#7A7871]">{pet.alias ? `También responde a ${pet.alias}` : pet.edad}</p>
              <div className="mt-3 grid gap-2 min-[390px]:flex">
                <Button size="sm" variant="outline" onClick={() => { setEditing(pet); setShowForm(true); }}><Edit size={16} />Editar</Button>
                <Button size="sm" variant="outline" onClick={() => remove(pet.id)}><Trash2 size={16} />Eliminar</Button>
              </div>
            </div>
          </article>)}
        </section>

        {showForm ? <form onSubmit={submit} className="form-card space-y-4">
          <h2 className="font-bold">{editing ? "Editar mascota" : "Registrar mascota"}</h2>
          <p className="rounded-xl bg-[#FAEEDA] p-3 text-sm text-[#6B4A10]">Incluye fotos y rasgos distintivos: manchas, collar, cicatrices o comportamiento. Eso ayuda a encontrar coincidencias.</p>
          <div><label className="label">Foto</label><input className="field" type="file" name="fotos" accept="image/*" multiple /></div>
          <div><label className="label">Nombre</label><input className="field" name="nombre" required maxLength={120} defaultValue={editing?.nombre} /></div>
          <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Especie</label><select className="select" name="especie" defaultValue={editing?.especie ?? "Perro"}><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div><div><label className="label">Tamaño</label><select className="select" name="tamano" defaultValue={editing?.tamano ?? "Mediano"}><option>Pequeño</option><option>Mediano</option><option>Grande</option></select></div></div>
          <div><label className="label">Señas particulares</label><div className="grid gap-2 md:grid-cols-2">{traits.map((trait) => <label key={trait} className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="caracteristicas" value={trait} defaultChecked={editing?.caracteristicas?.includes(trait)} />{trait}</label>)}</div></div>
          <details className="rounded-xl border border-black/10 p-3">
            <summary className="cursor-pointer text-sm font-bold text-[#1D9E75]">Agregar más datos</summary>
            <div className="mt-3 space-y-4">
              <div><label className="label">Alias</label><input className="field" name="alias" maxLength={160} defaultValue={editing?.alias ?? ""} placeholder="Lunita, Lulú" /></div>
              <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Raza</label><input className="field" name="raza" defaultValue={editing?.raza} /></div><div><label className="label">Color</label><input className="field" name="color" defaultValue={editing?.color} /></div></div>
              <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Sexo</label><select className="select" name="sexo" defaultValue={editing?.sexo ?? ""}><option value="">No indicado</option><option>Hembra</option><option>Macho</option></select></div><div><label className="label">Edad</label><input className="field" name="edad" defaultValue={editing?.edad} /></div></div>
              <div><label className="label">Salud</label><input className="field" name="salud" defaultValue={editing?.salud ?? ""} placeholder="Medicación, condición, alergias" /></div>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="esterilizado" defaultChecked={Boolean(editing?.esterilizado)} />Esterilizado</label>
              <div><label className="label">Placa/medalla</label><input className="field" name="placa_medalla" defaultValue={editing?.placa_medalla ?? ""} placeholder="Color o texto visible" /></div>
              <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Teléfono</label><input className="field" name="telefono" defaultValue={editing?.telefono ?? ""} /></div><div><label className="label">Contacto preferido</label><select className="select" name="contacto_preferido" defaultValue={editing?.contacto_preferido ?? "whatsapp"}><option value="whatsapp">WhatsApp</option><option value="telefono">Teléfono</option><option value="ambos">Ambos</option></select></div></div>
              <div><label className="label">URL de foto principal opcional</label><input className="field" name="foto_principal" defaultValue={editing?.foto_principal ?? editing?.foto_url} /></div>
              <div><label className="label">Dato de verificación</label><input className="field" name="rasgo_privado" defaultValue={editing?.rasgo_privado ?? ""} placeholder="Información no visible públicamente" /></div>
            </div>
          </details>
          <div className="grid gap-2 min-[390px]:flex">
            <Button disabled={saving}><Plus size={18} />{saving ? "Guardando..." : "Guardar mascota"}</Button>
            <Button type="button" variant="outline" onClick={() => { setEditing(null); setShowForm(false); }}>Cancelar</Button>
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

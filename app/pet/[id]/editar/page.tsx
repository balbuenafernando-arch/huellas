"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Pet } from "@/lib/demo-data";
import { deletePet, distinctiveFeatures, getPet, isOwnedPet, specialConditions, updatePet } from "@/lib/pet-store";
import { getCurrentUser, getReport, reportToLegacyPet, type Report, updateReport } from "@/lib/sprint14-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { compressImage, fileToDataUrl } from "@/lib/image-utils";

const districtCoords: Record<string, [number, number]> = {
  Miraflores: [-12.1211, -77.0297], "San Isidro": [-12.0975, -77.0366], Surco: [-12.1278, -76.9849], Barranco: [-12.1499, -77.0215], "San Borja": [-12.0969, -76.9996], Magdalena: [-12.0916, -77.0679], "Pueblo Libre": [-12.0763, -77.0611], "La Molina": [-12.0864, -76.9224], Lince: [-12.0846, -77.0348], "Jesús María": [-12.0706, -77.0432], Chorrillos: [-12.1823, -77.0301], Surquillo: [-12.1121, -77.0116]
};

async function uploadOrEncodePhoto(file: File) {
  const compressed = await compressImage(file);
  if (isSupabaseConfigured && supabase) {
    const path = `${crypto.randomUUID()}-${compressed.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
    const { error } = await supabase.storage.from("pets").upload(path, compressed);
    if (!error) return supabase.storage.from("pets").getPublicUrl(path).data.publicUrl;
  }
  return fileToDataUrl(compressed);
}

export default function EditPetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [pet, setPet] = useState<Pet>();
  const [report, setReport] = useState<Report | undefined>();
  const [allowed, setAllowed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getReport(params.id), getPet(params.id), getCurrentUser()]).then(([foundReport, foundPet, user]) => {
      const normalized = foundReport ? reportToLegacyPet(foundReport) : foundPet;
      setReport(foundReport);
      setPet(normalized);
      setAllowed((foundReport && user ? foundReport.user_id === user.id : false) || isOwnedPet(normalized));
    });
  }, [params.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pet || !allowed) return;
    const form = new FormData(event.currentTarget);
    const distrito = String(form.get("distrito"));
    const [latitud, longitud] = districtCoords[distrito] ?? [pet.latitud, pet.longitud];
    const recompensaMonto = Number(form.get("recompensa_monto") || 0);
    const files = form.getAll("fotos").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 5);
    let fotoPrincipal = String(form.get("foto_principal") || pet.foto_principal);
    let fotos = pet.fotos?.length ? pet.fotos.slice(0, 5) : [fotoPrincipal];

    setSaving(true);
    if (files.length) {
      fotos = await Promise.all(files.map(uploadOrEncodePhoto));
      fotoPrincipal = fotos[0];
    }

    const estado = String(form.get("estado")) as Pet["estado"];
    if (report) {
      await updateReport(report.id, {
        tipo_reporte: estado === "encontrado" ? "encontrado" : report.tipo_reporte,
        estado: estado === "reunido" ? "reunido" : "activo",
        distrito,
        descripcion: String(form.get("descripcion")),
        foto_url: fotoPrincipal,
        latitude: latitud,
        longitude: longitud,
      });
      router.push(`/pet/${report.id}`);
      return;
    }

    await updatePet(pet.id, {
      nombre: String(form.get("nombre")),
      tipo: String(form.get("tipo")),
      raza: String(form.get("raza")),
      descripcion: String(form.get("descripcion")),
      estado,
      distrito,
      direccion: String(form.get("direccion")),
      latitud,
      longitud,
      whatsapp: String(form.get("whatsapp")),
      foto_principal: fotoPrincipal,
      fotos: Array.from(new Set([fotoPrincipal, ...fotos])).slice(0, 5),
      condiciones_especiales: form.getAll("condiciones_especiales").map(String),
      alias: String(form.get("alias") || "").split(",").map((item) => item.trim()).filter(Boolean),
      caracteristicas: form.getAll("caracteristicas").map(String),
      caracteristicas_personalizadas: String(form.get("caracteristicas_personalizadas") || ""),
      recompensa_ofrecida: recompensaMonto > 0,
      recompensa_monto: recompensaMonto > 0 ? recompensaMonto : null,
      cerrado_en: String(form.get("estado")) === "reunido" ? pet.cerrado_en ?? new Date().toISOString() : null,
    });
    router.push(`/pet/${pet.id}`);
  }

  async function remove() {
    if (!pet || !allowed) return;
    if (!confirm("¿Estás seguro?\n\nEsta acción no se puede deshacer.")) return;
    await deletePet(pet.id);
    router.push("/");
  }

  if (!pet) return <main className="container py-10">Cargando...</main>;
  if (!allowed) return <main className="container py-10"><Link href={`/pet/${pet.id}`} className="text-[#1D9E75]">Volver</Link><p className="mt-4">Solo el navegador que creó este reporte puede editarlo.</p></main>;

  return (
    <main className="container py-6">
      <Link href={`/pet/${pet.id}`} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6860]"><ArrowLeft size={17} />Volver al reporte</Link>
      <h1 className="mb-5 font-serif text-4xl">Editar reporte</h1>
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="form-card space-y-4">
          <div><label className="label">Nombre</label><input required className="field" name="nombre" defaultValue={pet.nombre} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Tipo</label><select className="select" name="tipo" defaultValue={pet.tipo}><option>Perro</option><option>Gato</option><option>Ave</option><option>Otro</option></select></div><div><label className="label">Estado</label><select className="select" name="estado" defaultValue={pet.estado}><option value="perdido">Perdido</option><option value="encontrado">Encontrado</option><option value="reunido">Reunido</option></select></div></div>
          <div><label className="label">Raza</label><input className="field" name="raza" defaultValue={pet.raza} /></div>
          <div><label className="label">Descripción</label><textarea required className="textarea min-h-28" name="descripcion" defaultValue={pet.descripcion} /></div>
          <div><label className="label">Alias o nombres alternativos</label><input className="field" name="alias" defaultValue={pet.alias?.join(", ") ?? ""} /></div>
          <div><label className="label">Condiciones especiales</label><div className="grid gap-2 md:grid-cols-2">{specialConditions.map((condition) => <label key={condition} className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="condiciones_especiales" value={condition} defaultChecked={pet.condiciones_especiales?.includes(condition)} />{condition}</label>)}</div></div>
          <div><label className="label">Características distintivas</label><div className="grid gap-2 md:grid-cols-2">{distinctiveFeatures.map((feature) => <label key={feature} className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 p-2 text-sm"><input type="checkbox" name="caracteristicas" value={feature} defaultChecked={pet.caracteristicas?.includes(feature)} />{feature}</label>)}</div></div>
          <div><label className="label">Características personalizadas</label><input className="field" name="caracteristicas_personalizadas" defaultValue={pet.caracteristicas_personalizadas ?? ""} /></div>
        </section>
        <section className="form-card space-y-4">
          <img src={pet.foto_principal} alt={pet.nombre} className="h-52 w-full rounded-xl object-cover" />
          <div className="grid grid-cols-3 gap-2 min-[390px]:grid-cols-5">{(pet.fotos?.length ? pet.fotos : [pet.foto_principal]).slice(0, 5).map((foto) => <img key={foto} src={foto} alt="Foto actual" className="h-16 w-full rounded-lg object-contain bg-[#F8F7F4]" />)}</div>
          <div><label className="label">Reemplazar fotos (máximo 5)</label><input className="field" name="fotos" type="file" accept="image/*" multiple /></div>
          <div><label className="label">URL de foto</label><input className="field" name="foto_principal" defaultValue={pet.foto_principal} /></div>
          <div><label className="label">Distrito</label><select className="select" name="distrito" defaultValue={pet.distrito}>{Object.keys(districtCoords).map((d) => <option key={d}>{d}</option>)}</select></div>
          <div><label className="label">Dirección</label><input required className="field" name="direccion" defaultValue={pet.direccion} /></div>
          <div><label className="label">WhatsApp</label><input required className="field" name="whatsapp" defaultValue={pet.whatsapp} /></div>
          <div><label className="label">Recompensa opcional</label><input className="field" name="recompensa_monto" type="number" min="0" defaultValue={pet.recompensa_monto ?? ""} /></div>
          <div className="flex flex-wrap gap-2"><Button type="submit" disabled={saving}><Save size={18} />{saving ? "Guardando..." : "Guardar cambios"}</Button><Button type="button" variant="outline" onClick={remove}><Trash2 size={18} />Eliminar reporte</Button></div>
        </section>
      </form>
    </main>
  );
}



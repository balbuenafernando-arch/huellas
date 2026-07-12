import Link from "next/link";
import { ArrowDown, Eye, Heart, Link2, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: Siren, title: "Reporta la pérdida", body: "Se abre un caso único con fotos, zona aproximada y datos útiles." },
  { icon: Eye, title: "La comunidad ayuda", body: "Cada avistamiento se conecta al caso correcto cuando hay coincidencias." },
  { icon: Link2, title: "HUELLA conecta la información", body: "El centro de búsqueda organiza mapa, timeline, coincidencias y actividad." },
  { icon: Heart, title: "Tu mascota vuelve a casa", body: "El caso conserva el historial y pasa a reencuentros." },
];

export default function ComoFuncionaPage() {
  return (
    <main className="container py-6">
      <section className="mx-auto max-w-3xl">
        <h1 className="font-serif text-4xl">Cómo funciona HUELLA</h1>
        <p className="mt-3 text-[#6B6860]">HUELLA no funciona como un feed. Cada búsqueda vive en un caso único para reunir pistas y reducir información duplicada.</p>
        <div className="mt-6 grid gap-3">
          {steps.map((step, index) => <div key={step.title}>
            <article className="form-card flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#E1F5EE] text-[#085041]"><step.icon size={24} /></div>
              <div>
                <h2 className="font-bold">{step.title}</h2>
                <p className="mt-1 text-sm leading-6 text-[#6B6860]">{step.body}</p>
              </div>
            </article>
            {index < steps.length - 1 && <div className="grid h-9 place-items-center text-[#1D9E75]"><ArrowDown size={22} /></div>}
          </div>)}
        </div>
        <section className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="form-card"><h2 className="font-bold">Centro de búsqueda</h2><p className="mt-2 text-sm text-[#6B6860]">Reúne mascota, fotos, mapa, avistamientos, timeline y estado del caso.</p></div>
          <div className="form-card"><h2 className="font-bold">Coincidencias</h2><p className="mt-2 text-sm text-[#6B6860]">Compara zona, momento y rasgos para sugerir posibles conexiones sin afirmar identidad.</p></div>
          <div className="form-card"><h2 className="font-bold">Caso único</h2><p className="mt-2 text-sm text-[#6B6860]">Evita publicaciones repetidas del mismo evento y mantiene la búsqueda ordenada.</p></div>
          <div className="form-card"><h2 className="font-bold">Comunidad colaborativa</h2><p className="mt-2 text-sm text-[#6B6860]">Cualquier pista útil puede acercar a una familia al reencuentro.</p></div>
        </section>
        <div className="mt-6 grid gap-3 min-[420px]:grid-cols-2">
          <Button asChild><Link href="/perdi-mi-mascota">Perdí mi mascota</Link></Button>
          <Button variant="outline" asChild><Link href="/reportar-avistamiento">Vi una mascota</Link></Button>
        </div>
      </section>
    </main>
  );
}

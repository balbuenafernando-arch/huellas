import Link from "next/link";
import { ArrowDown, Eye, Heart, Link2, ShieldCheck, Siren, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecondaryHeader } from "@/components/secondary-header";

const steps = [
  { icon: Siren, title: "Abres una búsqueda", body: "Completas datos útiles, agregas fotos y marcas la zona aproximada. Antes de publicar, HUELLA revisa si ya hay casos parecidos." },
  { icon: Eye, title: "Alguien reporta que la vio", body: "La persona indica dónde, cuándo y cómo la vio. Si existe un caso activo parecido, puede asociar su reporte." },
  { icon: Link2, title: "HUELLA ordena las pistas", body: "Cada caso reúne fotos, mapa, reportes, timeline y estado para evitar publicaciones duplicadas." },
  { icon: Heart, title: "La mascota vuelve a casa", body: "Cuando la familia confirma el reencuentro, el caso se cierra y pasa a Reencuentros." },
];

const sections = [
  { title: "Propósito de HUELLA", body: "Ayudar a que una familia no tenga que revisar mensajes sueltos en distintos grupos. La aplicación convierte cada búsqueda en un centro claro de información." },
  { title: "Historia del proyecto", body: "HUELLA nació para ordenar la ayuda vecinal cuando una mascota se pierde: menos ruido, más pistas útiles y más confianza para contactar." },
  { title: "Mensaje del creador", body: "Esta herramienta está pensada para momentos de angustia. Por eso prioriza claridad, respeto por la privacidad y acciones simples." },
  { title: "Cómo se usan los datos", body: "Usamos la información del caso para mostrar reportes cercanos, calcular coincidencias y facilitar el contacto seguro cuando corresponde." },
  { title: "Privacidad", body: "La ubicación se muestra de forma aproximada y los datos de contacto se cuidan. El dueño decide cuándo autorizar una descarga o un contacto directo." },
  { title: "Cómo colaborar", body: "Puedes reportar que viste una mascota, compartir una búsqueda o ayudar a confirmar información sin exponer datos innecesarios." },
];

const faqs = [
  ["¿Por qué HUELLA busca coincidencias antes de publicar?", "Para reducir duplicados y conectar pistas con el caso correcto."],
  ["¿Qué pasa si ninguna coincidencia corresponde?", "Puedes publicar la búsqueda o guardar un reporte independiente."],
  ["¿La dirección exacta se muestra públicamente?", "No. El mapa prioriza coordenadas aproximadas para orientar sin exponer de más."],
];

export default function ComoFuncionaPage() {
  return (
    <main className="container py-6">
      <section className="mx-auto max-w-4xl">
        <SecondaryHeader title="Cómo funciona HUELLA" description="HUELLA conecta búsquedas y reportes de personas que vieron mascotas perdidas. La idea es simple: menos publicaciones repetidas, más información útil en un solo caso." />

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
          {sections.map((section) => <article key={section.title} className="form-card">
            <h2 className="font-bold">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B6860]">{section.body}</p>
          </article>)}
        </section>

        <section className="mt-6 form-card">
          <div className="mb-3 flex items-center gap-2"><ShieldCheck size={20} className="text-[#1D9E75]" /><h2 className="font-bold">Preguntas frecuentes</h2></div>
          <div className="space-y-3">
            {faqs.map(([question, answer]) => <div key={question} className="rounded-xl bg-[#F8F7F4] p-3 text-sm">
              <strong className="block text-[#085041]">{question}</strong>
              <p className="mt-1 text-[#6B6860]">{answer}</p>
            </div>)}
          </div>
        </section>

        <section className="mt-6 form-card bg-[#FAFDFB]">
          <div className="flex items-start gap-3">
            <Users className="mt-1 text-[#1D9E75]" size={22} />
            <div>
              <h2 className="font-bold">Una comunidad cuidadosa ayuda mejor</h2>
              <p className="mt-1 text-sm leading-6 text-[#6B6860]">Cada reporte debe ser honesto, claro y respetuoso. HUELLA no confirma identidades por sí sola: organiza señales para que la familia pueda decidir con más información.</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-3 min-[420px]:grid-cols-2">
          <Button asChild><Link href="/perdi-mi-mascota">Perdí mi mascota</Link></Button>
          <Button variant="outline" asChild><Link href="/reportar-avistamiento">Vi una mascota perdida</Link></Button>
        </div>
      </section>
    </main>
  );
}

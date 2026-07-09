"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/sprint14-store";

export function ProgressiveSigninCard({ continueHref = "/" }: { continueHref?: string }) {
  async function google() {
    await signInWithGoogle();
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-[#F8F7F4] p-4">
      <h2 className="font-bold">Tu reporte fue publicado</h2>
      <p className="mt-2 text-sm leading-6 text-[#6B6860]">Con una cuenta puedes recibir notificaciones, seguir la búsqueda, registrar mascotas y formar parte de la comunidad HUELLA.</p>
      <div className="mt-4 grid gap-2">
        <Button type="button" onClick={google}>Continuar con Google</Button>
        <Button variant="outline" asChild><Link href={continueHref}>Ahora no</Link></Button>
      </div>
    </div>
  );
}

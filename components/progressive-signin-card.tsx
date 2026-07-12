"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ProgressiveSigninCard({ continueHref = "/", context = "search" }: { continueHref?: string; context?: "search" | "sighting" }) {
  const isSighting = context === "sighting";

  return (
    <div className="rounded-2xl border border-black/10 bg-[#F8F7F4] p-4">
      <h2 className="font-bold">{isSighting ? "Gracias por ayudar." : "Tu búsqueda ya está publicada."}</h2>
      <p className="mt-2 text-sm leading-6 text-[#6B6860]">
        {isSighting
          ? "Registramos el avistamiento y quedó asociado a tu sesión."
          : "Ahora puedes dar seguimiento, editar la información y comunicarte con quienes reporten avistamientos."}
      </p>
      <div className="mt-4">
        <Button asChild><Link href={continueHref}>Continuar</Link></Button>
      </div>
    </div>
  );
}

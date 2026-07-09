"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareHuellaButton({ compact = false }: { compact?: boolean }) {
  async function shareHuella() {
    const url = window.location.origin;
    const text = "Estoy usando HUELLA para ayudar a encontrar mascotas perdidas. Únete a la comunidad.";
    if (navigator.share) {
      await navigator.share({ title: "HUELLA", text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    alert("Enlace de HUELLA copiado.");
  }

  return <Button type="button" variant="outline" size={compact ? "sm" : "default"} onClick={shareHuella}><Share2 size={17} />Compartir HUELLA</Button>;
}

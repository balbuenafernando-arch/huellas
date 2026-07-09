"use client";

import { Download, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Pet } from "@/lib/demo-data";
import { formatDate } from "@/lib/utils";
import { publicCaseCode } from "@/lib/case-display";

function caseUrl(pet: Pet) {
  return `${window.location.origin}/pet/${pet.id}`;
}

function shareText(pet: Pet) {
  const code = publicCaseCode(pet.id);
  return `Caso ${code}: ${pet.nombre} en ${pet.distrito}. Ayúdanos compartiendo esta búsqueda en HUELLA.`;
}

function drawPseudoQr(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number) {
  const cells = 29;
  const cell = size / cells;
  ctx.fillStyle = "white";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#111";
  const seed = Array.from(url).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const finder = (row < 7 && col < 7) || (row < 7 && col > 21) || (row > 21 && col < 7);
      const value = finder || ((row * 31 + col * 17 + seed) % 5 === 0);
      if (value) ctx.fillRect(x + col * cell, y + row * cell, cell * .88, cell * .88);
    }
  }
}

export function ShareButton({ pet, label = "Compartir" }: { pet: Pet; label?: string }) {
  async function share() {
    const url = caseUrl(pet);
    if (navigator.share) {
      await navigator.share({ title: `HUELLA: ${pet.nombre}`, text: shareText(pet), url });
      return;
    }
    await navigator.clipboard.writeText(url);
    alert("Enlace copiado al portapapeles.");
  }

  return <Button type="button" variant="outline" onClick={share}><Share2 size={18} />{label}</Button>;
}

export function WhatsAppShareButton({ pet }: { pet: Pet }) {
  function openWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText(pet)} ${caseUrl(pet)}`)}`, "_blank", "noopener,noreferrer");
  }

  return <Button type="button" variant="outline" onClick={openWhatsApp}><MessageCircle size={18} />WhatsApp</Button>;
}

export function PosterButton({ pet }: { pet: Pet }) {
  async function downloadPoster() {
    const url = caseUrl(pet);
    const code = publicCaseCode(pet.id);
    const cacheKey = `huella:poster:${pet.id}:${pet.foto_principal}:${pet.nombre}:${pet.estado}:${pet.descripcion}:${pet.fecha_reporte}`;
    const cached = window.sessionStorage.getItem(cacheKey);

    if (cached) {
      const link = document.createElement("a");
      link.download = `huella-${code}-${pet.nombre.toLowerCase()}-afiche.png`;
      link.href = cached;
      link.click();
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#F8F7F4";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(60, 60, 960, 600);

    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = pet.foto_principal;
      await image.decode();
      const scale = Math.min(960 / image.width, 600 / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(image, 60 + (960 - width) / 2, 60 + (600 - height) / 2, width, height);
    } catch {
      ctx.fillStyle = "#E1F5EE";
      ctx.fillRect(60, 60, 960, 600);
    }

    ctx.fillStyle = pet.estado === "perdido" ? "#D85A30" : "#1D9E75";
    ctx.fillRect(60, 690, 960, 86);
    ctx.fillStyle = "white";
    ctx.font = "700 46px Arial";
    ctx.fillText(pet.estado.toUpperCase(), 90, 747);

    ctx.fillStyle = "#1C1C1A";
    ctx.font = "700 86px Arial";
    ctx.fillText(pet.nombre, 60, 860);
    ctx.font = "500 36px Arial";
    ctx.fillText(`${pet.distrito} · zona aproximada`, 60, 918);
    ctx.font = "28px Arial";
    ctx.fillText(`Caso ${code} · iniciado: ${formatDate(pet.fecha_reporte)}`, 60, 965);
    const details = [...(pet.caracteristicas ?? []), ...(pet.condiciones_especiales ?? [])].slice(0, 4).join(" · ");
    if (details) ctx.fillText(details, 60, 1010, 900);
    ctx.font = "30px Arial";
    ctx.fillText(pet.descripcion.slice(0, 105), 60, 1060, 900);
    ctx.font = "700 42px Arial";
    ctx.fillText("Contacto desde el caso público", 60, 1130);
    ctx.font = "24px Arial";
    ctx.fillText(url, 60, 1180, 640);

    drawPseudoQr(ctx, url, 745, 1010, 285);
    ctx.font = "26px Arial";
    ctx.fillText(`Escanea ${code}`, 760, 1320);

    const dataUrl = canvas.toDataURL("image/png");
    window.sessionStorage.setItem(cacheKey, dataUrl);
    const link = document.createElement("a");
    link.download = `huella-${code}-${pet.nombre.toLowerCase()}-afiche.png`;
    link.href = dataUrl;
    link.click();
  }

  return <Button type="button" variant="outline" onClick={downloadPoster}><Download size={18} />Descargar afiche</Button>;
}

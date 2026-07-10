"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  file: File;
  aspect?: number;
  onCancel: () => void;
  onApply: (file: File, previewUrl: string) => void;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
}

export function ImageCropper({ file, aspect = 4 / 3, onCancel, onApply }: Props) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [applying, setApplying] = useState(false);
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  async function applyCrop() {
    if (applying) return;
    setApplying(true);
    try {
      const image = await loadImage(objectUrl);
      const outputWidth = 1200;
      const outputHeight = Math.round(outputWidth / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No pudimos preparar el editor de imagen.");

      const coverScale = Math.max(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight) * zoom;
      const drawWidth = image.naturalWidth * coverScale;
      const drawHeight = image.naturalHeight * coverScale;
      const maxMoveX = Math.max(0, (drawWidth - outputWidth) / 2);
      const maxMoveY = Math.max(0, (drawHeight - outputHeight) / 2);
      const dx = (outputWidth - drawWidth) / 2 + (offsetX / 100) * maxMoveX;
      const dy = (outputHeight - drawHeight) / 2 + (offsetY / 100) * maxMoveY;

      ctx.fillStyle = "#F8F7F4";
      ctx.fillRect(0, 0, outputWidth, outputHeight);
      ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

      const blob = await canvasToBlob(canvas);
      if (!blob) throw new Error("No pudimos recortar la imagen.");
      const cropped = new File([blob], file.name.replace(/\.[^.]+$/, "-recorte.jpg"), { type: "image/jpeg" });
      onApply(cropped, canvas.toDataURL("image/jpeg", 0.88));
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/55 p-3">
      <section className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,.28)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-bold">Ajustar foto</h2>
          <Button type="button" variant="outline" onClick={onCancel} disabled={applying}>Cancelar</Button>
        </div>
        <div className="mx-auto aspect-[4/3] max-h-[56vh] overflow-hidden rounded-xl bg-[#F8F7F4]">
          <img
            src={objectUrl}
            alt="Vista previa del recorte"
            className="h-full w-full object-cover"
            style={{ transform: `scale(${zoom}) translate(${offsetX / 2}%, ${offsetY / 2}%)`, transformOrigin: "center" }}
          />
        </div>
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-semibold text-[#6B6860]">Zoom
            <input className="w-full accent-[#1D9E75]" type="range" min="1" max="2.4" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          </label>
          <label className="text-sm font-semibold text-[#6B6860]">Mover horizontal
            <input className="w-full accent-[#1D9E75]" type="range" min="-100" max="100" step="1" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} />
          </label>
          <label className="text-sm font-semibold text-[#6B6860]">Mover vertical
            <input className="w-full accent-[#1D9E75]" type="range" min="-100" max="100" step="1" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} />
          </label>
        </div>
        <Button type="button" className="mt-4 w-full" onClick={applyCrop} disabled={applying}>{applying ? "Preparando..." : "Usar recorte"}</Button>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  file: File;
  aspect?: number;
  onCancel: () => void;
  onApply: (file: File, previewUrl: string) => void;
};

type DragState = {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  distance?: number;
  zoom?: number;
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
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(touches: { [index: number]: { clientX: number; clientY: number } }) {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function ImageCropper({ file, aspect = 4 / 3, onCancel, onApply }: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [applying, setApplying] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const dragRef = useRef<DragState | null>(null);
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  function updateOffset(nextX: number, nextY: number) {
    const limit = 24 * zoom;
    setOffset({ x: clamp(nextX, -limit, limit), y: clamp(nextY, -limit, limit) });
  }

  function toggleZoom() {
    setZoom((value) => value > 1.05 ? 1 : 1.8);
  }

  function startDrag(clientX: number, clientY: number, distance?: number) {
    dragRef.current = { x: clientX, y: clientY, offsetX: offset.x, offsetY: offset.y, distance, zoom };
  }

  function moveDrag(clientX: number, clientY: number) {
    const drag = dragRef.current;
    if (!drag) return;
    updateOffset(drag.offsetX + (clientX - drag.x) / 10, drag.offsetY + (clientY - drag.y) / 10);
  }

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
      const dx = (outputWidth - drawWidth) / 2 + (offset.x / 100) * maxMoveX;
      const dy = (outputHeight - drawHeight) / 2 + (offset.y / 100) * maxMoveY;

      ctx.fillStyle = "#F8F7F4";
      ctx.fillRect(0, 0, outputWidth, outputHeight);
      ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

      const blob = await canvasToBlob(canvas);
      if (!blob) throw new Error("No pudimos recortar la imagen.");
      const cropped = new File([blob], file.name.replace(/\.[^.]+$/, "-recorte.jpg"), { type: "image/jpeg" });
      onApply(cropped, canvas.toDataURL("image/jpeg", 0.9));
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/70 p-3">
      <section className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,.28)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-bold">Ajustar foto</h2>
          <Button type="button" variant="outline" onClick={onCancel} disabled={applying}>Cancelar</Button>
        </div>
        <div
          className="relative mx-auto aspect-[4/3] max-h-[62vh] touch-none overflow-hidden rounded-xl bg-[#111]"
          onDoubleClick={toggleZoom}
          onWheel={(event) => {
            event.preventDefault();
            setZoom((value) => clamp(value + (event.deltaY < 0 ? 0.08 : -0.08), 1, 3));
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            startDrag(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => moveDrag(event.clientX, event.clientY)}
          onPointerUp={() => { dragRef.current = null; }}
          onTouchStart={(event) => {
            const now = Date.now();
            if (now - lastTap < 280) toggleZoom();
            setLastTap(now);
            if (event.touches.length === 2) startDrag(event.touches[0].clientX, event.touches[0].clientY, touchDistance(event.touches));
            else startDrag(event.touches[0].clientX, event.touches[0].clientY);
          }}
          onTouchMove={(event) => {
            const drag = dragRef.current;
            if (!drag) return;
            if (event.touches.length === 2 && drag.distance && drag.zoom) {
              const ratio = touchDistance(event.touches) / drag.distance;
              setZoom(clamp(drag.zoom * (1 + (ratio - 1) * 0.55), 1, 3));
              return;
            }
            moveDrag(event.touches[0].clientX, event.touches[0].clientY);
          }}
          onTouchEnd={() => { dragRef.current = null; }}
        >
          <img
            src={objectUrl}
            alt="Vista previa del recorte"
            className="h-full w-full select-none object-cover"
            draggable={false}
            style={{ transform: `translate(${offset.x}%, ${offset.y}%) scale(${zoom})`, transformOrigin: "center" }}
          />
          <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,.25)]" />
        </div>
        <p className="mt-3 text-center text-xs font-semibold text-[#6B6860]">Mueve la imagen, usa dos dedos para acercar y doble toque para ampliar.</p>
        <Button type="button" className="mt-4 w-full" onClick={applyCrop} disabled={applying}>{applying ? "Preparando..." : "Usar recorte"}</Button>
      </section>
    </div>
  );
}

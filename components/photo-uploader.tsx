"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/camera-capture";
import { ImageCropper } from "@/components/image-cropper";
import { validateImageFiles } from "@/lib/form-validation";

type PreparedPhoto = { id: string; file?: File; url: string };

export function PhotoUploader({ initialUrls = [], disabled = false, onChange, onError }: { initialUrls?: string[]; disabled?: boolean; onChange: (files: File[], retainedUrls: string[]) => void; onError?: (message: string) => void }) {
  const [photos, setPhotos] = useState<PreparedPhoto[]>(() => initialUrls.slice(0, 3).map((url) => ({ id: crypto.randomUUID(), url })));
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => { onChangeRef.current(photos.flatMap((item) => item.file ? [item.file] : []), photos.flatMap((item) => item.file ? [] : [item.url])); }, [photos]);

  function add(files: File[]) {
    const available = 3 - photos.length;
    const accepted = files.slice(0, Math.max(0, available));
    const error = validateImageFiles(accepted);
    if (error) return onError?.(error);
    if (!accepted.length) return onError?.("Puedes subir hasta un máximo de 3 fotografías.");
    if (files.length > available) onError?.("Solo se tomarán las fotografías necesarias para completar el máximo de 3.");
    setCropFile(accepted[0]);
    setQueue(accepted.slice(1));
  }

  function advance() { const [next, ...remaining] = queue; setCropFile(next ?? null); setQueue(remaining); }
  function gallery(event: ChangeEvent<HTMLInputElement>) { add(Array.from(event.target.files ?? [])); }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return <div>{cropFile && <ImageCropper file={cropFile} onCancel={advance} onApply={(file, preview) => { setPhotos((current) => [...current, { id: crypto.randomUUID(), file, url: preview }].slice(0, 3)); advance(); }} />}<input ref={inputRef} className="sr-only" type="file" accept="image/*" multiple onChange={gallery} onClick={(event) => { event.currentTarget.value = ""; }} /><div className="grid gap-2 min-[390px]:grid-cols-2"><CameraCapture disabled={disabled || photos.length >= 3} onCapture={(file) => add([file])} /><Button type="button" variant="outline" disabled={disabled || photos.length >= 3} onClick={() => inputRef.current?.click()}><ImageIcon size={18} />Elegir desde galería</Button></div><div className="mt-3 grid grid-cols-2 gap-3 min-[520px]:grid-cols-3">{photos.map((photo, index) => <div key={photo.id} className="rounded-xl border border-black/10 p-2"><div className="relative"><img src={photo.url} alt={`Fotografía ${index + 1} de ${photos.length}${index === 0 ? ", principal" : ""}`} className="h-28 w-full rounded-lg bg-[#F8F7F4] object-contain" />{index === 0 && <span className="absolute left-2 top-2 rounded-full bg-[#085041] px-2 py-1 text-[11px] font-bold text-white">Principal</span>}</div><div className="mt-2 grid grid-cols-2 gap-1" aria-label={`Orden de la fotografía ${index + 1}`}><Button type="button" size="sm" variant="outline" aria-label="Mover fotografía a la izquierda" disabled={disabled || index === 0} onClick={() => movePhoto(index, -1)}><ArrowLeft size={15} /></Button><Button type="button" size="sm" variant="outline" aria-label="Mover fotografía a la derecha" disabled={disabled || index === photos.length - 1} onClick={() => movePhoto(index, 1)}><ArrowRight size={15} /></Button></div><Button type="button" size="sm" variant="outline" className="mt-1 w-full" disabled={disabled} onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}><Trash2 size={15} />Eliminar</Button></div>)}</div><p className="mt-2 text-xs font-semibold text-[#6B6860]">{photos.length}/3 fotografías. La primera será la fotografía principal.</p></div>;
}

"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Trash2 } from "lucide-react";
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

  return <div>{cropFile && <ImageCropper file={cropFile} onCancel={advance} onApply={(file, preview) => { setPhotos((current) => [...current, { id: crypto.randomUUID(), file, url: preview }].slice(0, 3)); advance(); }} />}<input ref={inputRef} className="sr-only" type="file" accept="image/*" multiple onChange={gallery} onClick={(event) => { event.currentTarget.value = ""; }} /><div className="grid gap-2 min-[390px]:grid-cols-2"><CameraCapture disabled={disabled || photos.length >= 3} onCapture={(file) => add([file])} /><Button type="button" variant="outline" disabled={disabled || photos.length >= 3} onClick={() => inputRef.current?.click()}><ImageIcon size={18} />Elegir desde galería</Button></div><div className="mt-3 grid grid-cols-2 gap-3 min-[520px]:grid-cols-3">{photos.map((photo) => <div key={photo.id} className="rounded-xl border border-black/10 p-2"><img src={photo.url} alt="Fotografía preparada" className="h-28 w-full rounded-lg bg-[#F8F7F4] object-contain" /><Button type="button" size="sm" variant="outline" className="mt-2 w-full" disabled={disabled} onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}><Trash2 size={15} />Eliminar</Button></div>)}</div><p className="mt-2 text-xs font-semibold text-[#6B6860]">{photos.length}/3 fotografías</p></div>;
}

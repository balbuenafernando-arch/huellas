"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CameraCapture({ disabled = false, onCapture }: { disabled?: boolean; onCapture: (file: File) => void }) {
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setOpen(false);
    setStarting(false);
  }

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") stopCamera();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function openCamera() {
    if (disabled || starting) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      inputRef.current?.click();
      return;
    }
    setOpen(true);
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setOpen(false);
      inputRef.current?.click();
    } finally {
      setStarting(false);
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `huella-camara-${Date.now()}.jpg`, { type: "image/jpeg" }));
      stopCamera();
    }, "image/jpeg", 0.92);
  }

  return <>
    <input ref={inputRef} className="sr-only" type="file" accept="image/*" capture="environment" onClick={(event) => { event.currentTarget.value = ""; }} onChange={(event) => { const file = event.target.files?.[0]; if (file) onCapture(file); }} />
    <Button type="button" variant="outline" onClick={openCamera} disabled={disabled}><Camera size={18} />Tomar foto</Button>
    {open && <div className="fixed inset-0 z-[1400] grid place-items-center overflow-hidden bg-black/80 p-3" role="dialog" aria-modal="true" aria-labelledby="camera-title">
      <div className="max-h-[calc(100dvh-24px)] w-full max-w-2xl space-y-3 overflow-y-auto overscroll-contain rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between"><strong id="camera-title">Tomar foto</strong><button ref={closeButtonRef} type="button" className="grid h-11 w-11 place-items-center rounded-full" aria-label="Cerrar cámara" onClick={stopCamera}><X size={22} /></button></div>
        <video ref={videoRef} autoPlay playsInline muted className="max-h-[65vh] w-full rounded-xl bg-black object-contain" />
        <Button type="button" className="w-full" onClick={takePhoto} disabled={starting}>{starting ? "Abriendo cámara..." : "Capturar foto"}</Button>
      </div>
    </div>}
  </>;
}

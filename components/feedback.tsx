"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, SearchX, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FriendlyError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-[#D85A30]/10 bg-[#FFF7F3] p-4 text-sm text-[#712B13] shadow-[0_12px_30px_rgba(113,43,19,.06)]" role="alert">
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FAECE7]"><AlertTriangle size={18} /></span>
        <div className="flex-1">
          <p className="font-semibold leading-relaxed">{message}</p>
          {onRetry && <Button type="button" size="sm" variant="outline" className="mt-3 bg-white" onClick={onRetry}>Reintentar</Button>}
        </div>
      </div>
    </div>
  );
}

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;
  return (
    <div className="border-b border-[#D85A30]/15 bg-[#FFF7F3] px-3 py-2 text-center text-sm font-semibold text-[#712B13]">
      <WifiOff size={16} className="mr-2 inline" />Sin conexión. Puedes seguir viendo información ya cargada.
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[24px] bg-gradient-to-r from-white/60 via-white/90 to-white/60 shadow-[0_10px_30px_rgba(28,28,26,.04)] ${className}`} />;
}

export function PageSkeleton() {
  return (
    <main className="container py-6">
      <SkeletonBlock className="mb-5 h-12 max-w-sm" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-64" />)}
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-3xl bg-white/70 p-4 text-sm text-[#7A7871]">
        <SearchX size={18} />
        <span>Cargando casos recientes...</span>
      </div>
    </main>
  );
}

export function DetailSkeleton() {
  return (
    <main className="container py-6">
      <div className="grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
        <SkeletonBlock className="h-80" />
        <div className="space-y-4">
          <SkeletonBlock className="h-52" />
          <SkeletonBlock className="h-40" />
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, HeartHandshake, PawPrint, Radar, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FriendlyError, PageSkeleton } from "@/components/feedback";
import { listNotifications, markAllNotificationsRead, type AppNotification } from "@/lib/notifications";
import { formatDateTime } from "@/lib/utils";
import { friendlyError } from "@/lib/form-validation";

function iconFor(type: string) {
  if (type.includes("contact")) return ShieldCheck;
  if (type.includes("match") || type.includes("coincidencia")) return Radar;
  if (type.includes("reun") || type.includes("cerrado")) return HeartHandshake;
  if (type.includes("avistamiento")) return PawPrint;
  return Bell;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setNotifications(await listNotifications());
      window.dispatchEvent(new Event("huella:notifications-updated"));
      setError("");
    } catch (caught) {
      setError(friendlyError(caught, "No se pudieron cargar tus notificaciones. Inténtalo otra vez."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markAllRead() {
    if (saving) return;
    setSaving(true);
    try {
      await markAllNotificationsRead();
      await load();
    } catch (caught) {
      setError(friendlyError(caught, "No se pudieron marcar las notificaciones como leídas."));
    } finally {
      setSaving(false);
    }
  }

  const unread = notifications.filter((item) => !item.read).length;

  if (loading) return <PageSkeleton />;

  return (
    <main className="container py-6">
      <div className="mb-5 flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
        <div>
          <h1 className="font-serif text-4xl">Notificaciones</h1>
          <p className="mt-2 text-sm text-[#6B6860]">{unread ? `${unread} novedad${unread === 1 ? "" : "es"} sin leer` : "No tienes novedades pendientes."}</p>
        </div>
        <Button type="button" variant="outline" onClick={markAllRead} disabled={!notifications.length || saving}><CheckCheck size={18} />{saving ? "Sincronizando..." : "Marcar todas como leídas"}</Button>
      </div>
      {error && <div className="mb-4"><FriendlyError message={error} onRetry={load} /></div>}
      <section className="space-y-3">
        {notifications.length === 0 && <div className="form-card empty-state text-sm"><span className="text-4xl" aria-hidden="true">🔔</span><strong>Aún no hay notificaciones.</strong><span>Te avisaremos cuando llegue un avistamiento, una coincidencia o una solicitud de contacto.</span><Button asChild><Link href="/buscar-cerca">Explorar búsquedas activas</Link></Button></div>}
        {notifications.map((notification) => {
          const Icon = iconFor(notification.type);
          return (
            <article key={notification.id} className={`form-card ${notification.read ? "opacity-80" : "border-[#9FE1CB] bg-[#FAFDFB]"}`}>
              <div className="flex gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E1F5EE] text-[#085041]"><Icon size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{notification.title}</h2>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${notification.read ? "bg-[#F1EFE8] text-[#6B6860]" : "bg-[#D85A30] text-white"}`}>{notification.read ? "Leída" : "No leída"}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#4D4A43]">{notification.description}</p>
                  <p className="mt-1 text-xs text-[#7A7871]">{formatDateTime(notification.createdAt)}</p>
                  {notification.caseId && <Button size="sm" className="mt-3" asChild><Link href={`/pet/${notification.caseId}`}>Abrir caso</Link></Button>}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

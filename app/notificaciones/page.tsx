"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, HeartHandshake, PawPrint, Radar, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FriendlyError } from "@/components/feedback";
import { listNotifications, markAllNotificationsRead, type AppNotification } from "@/lib/notifications";
import { getNotificationPreferences, saveNotificationPreferences, type NotificationPreferences } from "@/lib/notification-preferences";
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
  const [preferences, setPreferences] = useState<NotificationPreferences>({ notifyByEmail: true, notifyByWhatsapp: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setNotifications(await listNotifications());
      setError("");
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos cargar tus notificaciones. Inténtalo otra vez."));
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { getNotificationPreferences().then(setPreferences).catch(() => undefined); }, []);

  async function markAllRead() {
    if (saving) return;
    setSaving(true);
    try {
      await markAllNotificationsRead();
      await load();
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos marcar las notificaciones como leídas."));
    } finally {
      setSaving(false);
    }
  }

  const unread = notifications.filter((item) => !item.read).length;

  async function updatePreference(next: NotificationPreferences) {
    setPreferences(next);
    try {
      await saveNotificationPreferences(next);
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos guardar tus preferencias."));
    }
  }

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
        {notifications.length === 0 && <div className="form-card empty-state text-sm"><strong>Aún no hay notificaciones.</strong><span>Te avisaremos cuando llegue un avistamiento, una coincidencia o una solicitud de contacto.</span></div>}
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
      <section className="form-card mt-5 space-y-3">
        <h2 className="font-bold">Preferencias</h2>
        <p className="text-sm text-[#6B6860]">Arquitectura preparada para futuras notificaciones push. Por ahora HUELLA registra tus preferencias internas.</p>
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-black/10 p-3 text-sm font-semibold">
          Avisos por email
          <input type="checkbox" checked={preferences.notifyByEmail} onChange={(event) => updatePreference({ ...preferences, notifyByEmail: event.target.checked })} />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-black/10 p-3 text-sm font-semibold">
          Avisos por WhatsApp autorizados
          <input type="checkbox" checked={preferences.notifyByWhatsapp} onChange={(event) => updatePreference({ ...preferences, notifyByWhatsapp: event.target.checked })} />
        </label>
      </section>
    </main>
  );
}

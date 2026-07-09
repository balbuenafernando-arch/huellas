"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { getNotifications, markNotificationsRead } from "@/lib/pet-store";
import type { Notification } from "@/lib/demo-data";

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unread = notifications.filter((item) => !item.leido).length;

  useEffect(() => {
    getNotifications().then(setNotifications);
  }, []);

  async function openNotifications() {
    if (!notifications.length) {
      alert("Aún no hay novedades. Te avisaremos cuando llegue una pista.");
      return;
    }
    alert(notifications.slice(0, 5).map((item) => item.mensaje).join("\n"));
    await markNotificationsRead();
    setNotifications((items) => items.map((item) => ({ ...item, leido: true })));
  }

  return (
    <button onClick={openNotifications} className="relative grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white text-[#6B6860] hover:bg-[#F8F7F4]" aria-label="Notificaciones">
      <Bell size={18} />
      {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#D85A30] px-1 text-[11px] font-bold text-white">{unread}</span>}
    </button>
  );
}


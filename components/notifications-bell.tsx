"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { listNotifications, type AppNotification } from "@/lib/notifications";

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unread = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    listNotifications().then(setNotifications);
  }, []);

  return (
    <Link href="/notificaciones" className="relative grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white text-[#6B6860] hover:bg-[#F8F7F4]" aria-label="Notificaciones">
      <Bell size={18} />
      {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#D85A30] px-1 text-[11px] font-bold text-white">{unread}</span>}
    </Link>
  );
}

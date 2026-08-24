"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, Home, MapPin, PawPrint } from "lucide-react";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/buscar-cerca", label: "Buscar cerca", icon: MapPin },
  { href: "/mis-mascotas", label: "Mis mascotas", icon: PawPrint },
  { href: "/reportar-avistamiento", label: "Vi una mascota", icon: Eye },
];

export function BottomNavigation() {
  const pathname = usePathname();
  return <nav className="bottom-nav" aria-label="Navegación principal móvil"><div className="container flex items-center justify-around">{items.map((item) => {
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><item.icon size={22} /><span>{item.label}</span></Link>;
  })}</div></nav>;
}

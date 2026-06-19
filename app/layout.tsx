import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Heart, Home, UserRound } from "lucide-react";
import Link from "next/link";
import { NotificationsBell } from "@/components/notifications-bell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Huella | Mascotas Perdidas",
  description: "Plataforma comunitaria para encontrar mascotas perdidas en Perú.",
};

const nav = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/mis-mascotas", label: "Mis Mascotas", icon: Heart },
  { href: "/mis-reportes", label: "Mis Reportes", icon: UserRound },
  { href: "/auth", label: "Perfil", icon: UserRound },
];

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="container flex h-16 items-center gap-4">
              <Link href="/" className="flex items-center gap-3" aria-label="Huella inicio">
                <span className="brand-mark"><Heart size={19} fill="currentColor" /></span>
                <span className="brand-word">hue<em>lla</em></span>
              </Link>
              <nav className="nav-desktop ml-auto hidden items-center gap-1">
                {nav.map((item) => <Link key={item.href} href={item.href} className="rounded-full px-4 py-2 text-sm font-medium text-[#6B6860] hover:bg-[#F8F7F4] hover:text-[#1D9E75]">{item.label}</Link>)}
              </nav>
              <div className="ml-auto md:ml-2"><NotificationsBell /></div>
            </div>
          </header>
          {children}
          <nav className="bottom-nav">
            <div className="container flex items-center justify-around">
              {nav.map((item) => <Link key={item.href} href={item.href} className="nav-item"><item.icon size={22} /><span>{item.label}</span></Link>)}
            </div>
          </nav>
        </div>
      </body>
    </html>
  );
}



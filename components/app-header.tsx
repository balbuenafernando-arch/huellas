"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  Heart,
  HelpCircle,
  Home,
  Lightbulb,
  MapPin,
  Menu,
  PawPrint,
  Settings,
  Share2,
  UserCircle,
  X,
} from "lucide-react";
import { NotificationsBell } from "@/components/notifications-bell";
import { ShareHuellaButton } from "@/components/share-huella-button";

const mainNav = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/buscar-cerca", label: "Buscar cerca de mí", icon: MapPin },
  { href: "/historias-de-exito", label: "Reencuentros", icon: Heart },
  { href: "/como-funciona", label: "Cómo funciona", icon: Lightbulb },
];

const mobileNav = [
  ...mainNav.slice(0, 2),
  { href: "/mis-mascotas", label: "Mis mascotas", icon: Heart },
  { href: "/mis-reportes", label: "Mis búsquedas", icon: ClipboardList },
  { href: "/mis-reportes", label: "Mis avistamientos", icon: PawPrint },
  ...mainNav.slice(2),
  { href: "/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/feedback", label: "Ayúdanos a mejorar HUELLA", icon: HelpCircle },
  { href: "/auth", label: "Configuración", icon: Settings },
];

const moreNav = [
  { href: "/mis-mascotas", label: "Mis mascotas", icon: Heart },
  { href: "/mis-reportes", label: "Mis búsquedas", icon: ClipboardList },
  { href: "/mis-reportes", label: "Mis avistamientos", icon: PawPrint },
  { href: "/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/feedback", label: "Ayúdanos a mejorar HUELLA", icon: HelpCircle },
  { href: "/auth", label: "Perfil", icon: UserCircle },
  { href: "/auth", label: "Ayuda", icon: HelpCircle },
];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" className="brand-link" aria-label="Ir a la página de inicio de HUELLA" onClick={onNavigate}>
      <span className="brand-mark"><Heart size={19} fill="currentColor" /></span>
      <span className="brand-word">hue<em>lla</em></span>
    </Link>
  );
}

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function closeMenu() {
    setOpen(false);
  }

  function toggleMenu() {
    setOpen((value) => {
      const next = !value;
      if (next) window.dispatchEvent(new Event("huella:mobile-menu-open"));
      return next;
    });
  }

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <button
            type="button"
            className="header-icon-btn lg:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={toggleMenu}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>

          <Brand />

          <nav className="nav-desktop" aria-label="Navegación principal">
            {mainNav.map((item) => (
              <Link key={item.href} href={item.href} className="desktop-nav-link">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="topbar-actions">
            <div className="hidden sm:block"><ShareHuellaButton compact /></div>
            <NotificationsBell />
            <details className="more-menu hidden lg:block">
              <summary className="more-menu-trigger" aria-label="Abrir más opciones">
                Más <ChevronDown size={15} />
              </summary>
              <div className="more-menu-panel">
                {moreNav.map((item) => (
                  <Link key={`${item.href}-${item.label}`} href={item.href} className="more-menu-link">
                    <item.icon size={17} />
                    <span>{item.label}</span>
                  </Link>
                ))}
                <div className="more-menu-share"><ShareHuellaButton compact /></div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className={`mobile-menu-backdrop ${open ? "is-open" : ""}`} onClick={closeMenu} aria-hidden="true" />
      <aside id="mobile-menu" className={`mobile-sidebar ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="mobile-sidebar-header">
          <Brand onNavigate={closeMenu} />
          <button type="button" className="header-icon-btn" aria-label="Cerrar menú" onClick={closeMenu}>
            <X size={21} />
          </button>
        </div>
        <nav className="mobile-sidebar-nav" aria-label="Menú móvil">
          {mobileNav.map((item) => (
            <Link key={`${item.href}-${item.label}`} href={item.href} className="mobile-sidebar-link" onClick={closeMenu}>
              <item.icon size={19} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <button type="button" className="mobile-sidebar-link w-full" onClick={async () => {
          const url = window.location.origin;
          const text = "Estoy usando HUELLA para ayudar a encontrar mascotas perdidas. Únete a la comunidad.";
          if (navigator.share) await navigator.share({ title: "HUELLA", text, url });
          else await navigator.clipboard.writeText(`${text} ${url}`);
          closeMenu();
        }}>
          <Share2 size={19} />
          <span>Compartir HUELLA</span>
        </button>
      </aside>
    </>
  );
}

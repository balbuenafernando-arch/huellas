"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ClipboardList,
  Heart,
  HelpCircle,
  Home,
  Lightbulb,
  MapPin,
  Menu,
  PawPrint,
  Share2,
  UserCircle,
  Eye,
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
  { href: "/mis-busquedas", label: "Mis búsquedas", icon: ClipboardList },
  { href: "/mis-avistamientos", label: "Mis avistamientos", icon: Eye },
  { href: "/historias-de-exito", label: "Reencuentros", icon: Heart },
  { href: "/como-funciona", label: "Cómo funciona", icon: Lightbulb },
  { href: "/feedback", label: "Ayúdanos a mejorar HUELLA", icon: HelpCircle },
  { href: "/auth", label: "Perfil", icon: UserCircle },
];

const moreNav = [
  { href: "/mis-mascotas", label: "Mis mascotas", icon: PawPrint },
  { href: "/mis-busquedas", label: "Mis búsquedas", icon: ClipboardList },
  { href: "/mis-avistamientos", label: "Mis avistamientos", icon: Eye },
  { href: "/feedback", label: "Ayúdanos a mejorar HUELLA", icon: HelpCircle },
  { href: "/auth", label: "Perfil", icon: UserCircle },
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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
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
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    function closeMoreMenu(event: PointerEvent) {
      if (!moreMenuRef.current?.contains(event.target as Node)) setMoreOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeMoreMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMoreMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

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
              <Link key={item.href} href={item.href} className={`desktop-nav-link ${pathname === item.href ? "text-[#085041]" : ""}`} aria-current={pathname === item.href ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="topbar-actions">
            <div className="hidden sm:block"><ShareHuellaButton compact /></div>
            <NotificationsBell />
            <div ref={moreMenuRef} className="more-menu hidden lg:block">
              <button type="button" className="more-menu-trigger" aria-label="Abrir más opciones" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}>
                Más <ChevronDown size={15} />
              </button>
              {moreOpen && <div className="more-menu-panel">
                {moreNav.map((item) => (
                  <Link key={`${item.href}-${item.label}`} href={item.href} className="more-menu-link" onClick={() => setMoreOpen(false)} aria-current={pathname === item.href ? "page" : undefined}>
                    <item.icon size={17} />
                    <span>{item.label}</span>
                  </Link>
                ))}
                <div className="more-menu-share"><ShareHuellaButton compact /></div>
              </div>}
            </div>
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
        <p className="px-4 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#7A7871]">Actividad y cuenta</p>
        <nav className="mobile-sidebar-nav" aria-label="Actividad, información y cuenta">
          {mobileNav.map((item) => (
            <Link key={`${item.href}-${item.label}`} href={item.href} className={`mobile-sidebar-link ${pathname === item.href ? "bg-[#E1F5EE] text-[#085041]" : ""}`} onClick={closeMenu} aria-current={pathname === item.href ? "page" : undefined}>
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

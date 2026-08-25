"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ClipboardList,
  Heart,
  HelpCircle,
  Home,
  Lightbulb,
  LogOut,
  MapPin,
  Menu,
  PawPrint,
  Share2,
  UserCircle,
  Eye,
  X,
} from "lucide-react";
import { NotificationsBell } from "@/components/notifications-bell";
import { shareHuella, ShareHuellaButton } from "@/components/share-huella-button";
import { signOut } from "@/lib/sprint14-store";

const mainNav = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/buscar-cerca", label: "Buscar cerca de mí", icon: MapPin },
  { href: "/historias-de-exito", label: "Reencuentros", icon: Heart },
  { href: "/como-funciona", label: "Cómo funciona", icon: Lightbulb },
];

const mobileNav = [
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

function Brand({ onNavigate }: { onNavigate?: (event: ReactMouseEvent<HTMLAnchorElement>) => void }) {
  return (
    <Link href="/" className="brand-link" aria-label="Ir a la página de inicio de HUELLA" onClick={onNavigate}>
      <span className="brand-mark"><Heart size={19} fill="currentColor" /></span>
      <span className="brand-word">hue<em>lla</em></span>
    </Link>
  );
}

export function AppHeader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerWasOpenRef = useRef(false);
  const closingFromHistoryRef = useRef(false);
  const pendingNavigationRef = useRef<string | null>(null);
  const pathname = usePathname();

  function closeMenu() {
    if (open && window.history.state?.huellaDrawer) {
      window.history.back();
      return;
    }
    setOpen(false);
  }

  function navigateFromDrawer(event: ReactMouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();
    pendingNavigationRef.current = href;
    closeMenu();
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

  useEffect(() => {
    if (!open) {
      if (drawerWasOpenRef.current) menuButtonRef.current?.focus();
      drawerWasOpenRef.current = false;
      return;
    }
    drawerWasOpenRef.current = true;
    closingFromHistoryRef.current = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.history.pushState({ ...window.history.state, huellaDrawer: true }, "");
    function closeFromBrowserHistory() {
      closingFromHistoryRef.current = true;
      setOpen(false);
      const href = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      if (href) router.push(href);
    }
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("popstate", closeFromBrowserHistory);
    document.addEventListener("keydown", trapFocus);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.removeEventListener("popstate", closeFromBrowserHistory);
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      if (!closingFromHistoryRef.current && window.history.state?.huellaDrawer) window.history.back();
    };
  }, [open, router]);

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <button
            ref={menuButtonRef}
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
              </div>}
            </div>
          </div>
        </div>
      </header>

      <div className={`mobile-menu-backdrop ${open ? "is-open" : ""}`} onClick={closeMenu} aria-hidden="true" />
      <aside ref={drawerRef} id="mobile-menu" className={`mobile-sidebar ${open ? "is-open" : ""}`} aria-hidden={!open} aria-label="Menú secundario" role="dialog" aria-modal={open}>
        <div className="mobile-sidebar-header">
          <Brand onNavigate={(event) => navigateFromDrawer(event, "/")} />
          <button ref={closeButtonRef} type="button" className="header-icon-btn" aria-label="Cerrar menú" onClick={closeMenu}>
            <X size={21} />
          </button>
        </div>
        <p className="px-4 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#7A7871]">Actividad y cuenta</p>
        <nav className="mobile-sidebar-nav" aria-label="Actividad, información y cuenta">
          {mobileNav.map((item) => (
            <Link key={`${item.href}-${item.label}`} href={item.href} className={`mobile-sidebar-link ${pathname === item.href ? "bg-[#E1F5EE] text-[#085041]" : ""}`} onClick={(event) => navigateFromDrawer(event, item.href)} aria-current={pathname === item.href ? "page" : undefined}>
              <item.icon size={19} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <button type="button" className="mobile-sidebar-link w-full" onClick={async () => {
          await shareHuella();
          closeMenu();
        }}>
          <Share2 size={19} />
          <span>Compartir HUELLA</span>
        </button>
        <button type="button" className="mobile-sidebar-link w-full" onClick={async () => {
          await signOut();
          pendingNavigationRef.current = "/";
          closeMenu();
        }}>
          <LogOut size={19} />
          <span>Cerrar sesión</span>
        </button>
      </aside>
    </>
  );
}

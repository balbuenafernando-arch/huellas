import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ClipboardList, Heart, Home, MapPin } from "lucide-react";
import Link from "next/link";
import { OfflineBanner } from "@/components/feedback";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/components/auth-gate";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { ScrollToTop } from "@/components/scroll-to-top";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUELLA | Reencuentro de mascotas",
  description: "Conecta búsquedas y avistamientos para ayudar a reunir mascotas con sus familias.",
  manifest: "/manifest.webmanifest",
  applicationName: "HUELLA",
  appleWebApp: {
    capable: true,
    title: "HUELLA",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1D9E75",
  viewportFit: "cover",
};

const primaryNav = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/buscar-cerca", label: "Buscar cerca de mí", icon: MapPin },
  { href: "/mis-mascotas", label: "Mis mascotas", icon: Heart },
  { href: "/mis-reportes", label: "Mis búsquedas", icon: ClipboardList },
];

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <AuthGate>
          <AppErrorBoundary>
            <div className="shell">
              <AppHeader />
              <OfflineBanner />
              {children}
              <ScrollToTop />
              <nav className="bottom-nav">
                <div className="container flex items-center justify-around">
                  {primaryNav.map((item) => <Link key={item.href} href={item.href} className="nav-item"><item.icon size={22} /><span>{item.label}</span></Link>)}
                </div>
              </nav>
            </div>
          </AppErrorBoundary>
        </AuthGate>
      </body>
    </html>
  );
}

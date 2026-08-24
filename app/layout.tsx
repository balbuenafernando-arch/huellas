import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { OfflineBanner } from "@/components/feedback";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/components/auth-gate";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { ScrollToTop } from "@/components/scroll-to-top";
import { BottomNavigation } from "@/components/bottom-navigation";
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
              <BottomNavigation />
            </div>
          </AppErrorBoundary>
        </AuthGate>
      </body>
    </html>
  );
}

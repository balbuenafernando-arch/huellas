"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Bell, CheckCircle2, Heart, PawPrint, Search, ShieldCheck } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { signInWithGoogle } from "@/lib/sprint14-store";
import { Button } from "@/components/ui/button";

function WelcomeScreen({ onContinue, loading, error }: { onContinue: () => void; loading: boolean; error: string }) {
  return (
    <main className="container grid min-h-[100svh] place-items-center py-8">
      <section className="form-card mx-auto w-full max-w-xl space-y-5">
        <div className="flex items-center gap-3">
          <span className="brand-mark"><Heart size={22} fill="currentColor" /></span>
          <span className="brand-word text-3xl">hue<em>lla</em></span>
        </div>
        <div>
          <h1 className="font-serif text-4xl">Bienvenido a HUELLA</h1>
          <p className="mt-2 text-sm leading-6 text-[#6B6860]">Una cuenta ayuda a proteger cada caso y mantener trazabilidad de la comunidad.</p>
        </div>
        <div className="grid gap-3 text-sm">
          {[
            [PawPrint, "Registra tus mascotas."],
            [Search, "Reporta pérdidas."],
            [CheckCircle2, "Reporta que la viste."],
            [Bell, "Recibe notificaciones."],
            [ShieldCheck, "Da seguimiento a los casos."],
          ].map(([Icon, text]) => (
            <div key={text as string} className="flex items-center gap-3 rounded-xl bg-[#F8F7F4] p-3 font-semibold text-[#4D4A43]">
              <Icon size={18} className="text-[#1D9E75]" />
              <span>{text as string}</span>
            </div>
          ))}
        </div>
        <p className="rounded-xl bg-[#E1F5EE] p-3 text-sm font-semibold text-[#085041]">Tu cuenta Google solo se utiliza para identificarte y proteger la comunidad.</p>
        {error && <p className="rounded-xl bg-[#FFF7F3] p-3 text-sm font-semibold text-[#712B13]">{error}</p>}
        <Button type="button" className="w-full" onClick={onContinue} disabled={loading}>
          {loading ? "Conectando..." : "Continuar con Google"}
        </Button>
      </section>
    </main>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function continueWithGoogle() {
    setSigningIn(true);
    setAuthError("");
    try {
      await signInWithGoogle();
    } catch {
      setAuthError("No se pudo iniciar con Google. Inténtalo otra vez.");
    } finally {
      setSigningIn(false);
    }
  }

  if (loading) {
    return <main className="container grid min-h-[100svh] place-items-center py-8"><div className="form-card text-sm font-semibold text-[#6B6860]">Verificando sesión...</div></main>;
  }

  if (!user) return <WelcomeScreen onContinue={continueWithGoogle} loading={signingIn} error={authError} />;

  return <>{children}</>;
}

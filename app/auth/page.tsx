"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LogOut, Mail, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/sprint14-store";

function displayName(user: User) {
  return String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Usuario HUELLA");
}

function avatarUrl(user: User) {
  return String(user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? "");
}

export default function AuthPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function closeSession() {
    setMessage("");
    await signOut();
    setUser(null);
    router.replace("/");
  }

  if (loading) {
    return <main className="container py-6"><section className="form-card mx-auto max-w-md text-sm font-semibold text-[#6B6860]">Cargando perfil...</section></main>;
  }

  if (!user) return null;

  const avatar = avatarUrl(user);

  return (
    <main className="container py-6">
      <section className="form-card mx-auto max-w-md space-y-5">
        <div>
          <h1 className="font-serif text-4xl">Perfil</h1>
          <p className="mt-2 text-sm text-[#6B6860]">Datos vinculados a tu cuenta Google.</p>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-[#F8F7F4] p-4">
          {avatar ? <img src={avatar} alt={displayName(user)} className="h-16 w-16 rounded-full object-cover" /> : <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-[#1D9E75]"><UserCircle size={34} /></span>}
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{displayName(user)}</p>
            <p className="mt-1 flex items-center gap-2 truncate text-sm text-[#6B6860]"><Mail size={15} />{user.email}</p>
          </div>
        </div>
        {message && <p className="text-sm text-[#712B13]">{message}</p>}
        <Button type="button" variant="outline" className="w-full" onClick={closeSession}><LogOut size={18} />Cerrar sesión</Button>
      </section>
    </main>
  );
}

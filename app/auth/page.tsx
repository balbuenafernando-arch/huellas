"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail } from "@/lib/sprint14-store";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => setSignedIn(Boolean(user)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await authenticate("login");
  }

  async function authenticate(mode: "login" | "signup") {
    setLoading(true);
    setMessage("");
    try {
      if (mode === "login") await signInWithEmail(email, password);
      else await signUpWithEmail(email, password);
      setSignedIn(true);
      router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la acción.");
    } finally {
      setLoading(false);
    }
  }

  async function closeSession() {
    await signOut();
    setSignedIn(false);
    setMessage("Sesión cerrada.");
  }

  async function google() {
    setLoading(true);
    setMessage("");
    try {
      await signInWithGoogle();
      setSignedIn(true);
      router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar con Google.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container py-6">
      <section className="form-card mx-auto max-w-md space-y-4">
        <div><h1 className="font-serif text-4xl">Perfil</h1><p className="mt-2 text-sm text-[#6B6860]">Entra para cuidar tus casos, tus mascotas y las pistas que recibas.</p></div>
        {signedIn && <div className="rounded-xl bg-[#E1F5EE] p-3 text-sm text-[#085041]">Sesión activa.</div>}
        <Button type="button" className="w-full" onClick={google} disabled={loading}>Continuar con Google</Button>
        <form className="space-y-3" onSubmit={submit}>
          <div><label className="label">Email</label><input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <div><label className="label">Contraseña</label><input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /></div>
          {message && <p className="text-sm text-[#712B13]">{message}</p>}
          <div className="grid gap-2 min-[390px]:grid-cols-2">
            <Button disabled={loading}>{loading ? "Entrando..." : "Iniciar sesión"}</Button>
            <Button type="button" variant="outline" disabled={loading} onClick={() => authenticate("signup")}>Registrarme</Button>
          </div>
        </form>
        {signedIn && <Button type="button" variant="outline" className="w-full" onClick={closeSession}>Cerrar sesión</Button>}
      </section>
      <section className="form-card mx-auto mt-5 max-w-md space-y-3">
        <h2 className="font-bold">Ayuda</h2>
        <details className="rounded-xl border border-black/10 p-3"><summary className="font-semibold">Preguntas frecuentes</summary><p className="mt-2 text-sm text-[#6B6860]">Puedes explorar casos y enviar pistas sin cuenta. La cuenta sirve para cuidar tus mascotas y dar seguimiento.</p></details>
        <details className="rounded-xl border border-black/10 p-3"><summary className="font-semibold">Cómo funciona HUELLA</summary><p className="mt-2 text-sm text-[#6B6860]">Una búsqueda y un avistamiento pueden conectarse por zona, rasgos y momento.</p></details>
        <details className="rounded-xl border border-black/10 p-3"><summary className="font-semibold">Política de privacidad</summary><p className="mt-2 text-sm text-[#6B6860]">HUELLA evita mostrar teléfonos, correos e identificadores internos de forma pública.</p></details>
        <details className="rounded-xl border border-black/10 p-3"><summary className="font-semibold">Consejos de búsqueda</summary><p className="mt-2 text-sm text-[#6B6860]">Actualiza el caso, revisa coincidencias cercanas y prioriza zonas del último avistamiento confirmado.</p></details>
      </section>
    </main>
  );
}

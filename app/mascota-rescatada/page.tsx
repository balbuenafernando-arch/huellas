"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RescuedPetRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/reportar-avistamiento"); }, [router]);
  return <main className="container py-10">Redirigiendo a Vi una mascota...</main>;
}

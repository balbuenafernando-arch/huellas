"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReportarPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/perdi-mi-mascota");
  }, [router]);

  return (
    <main className="container py-6">
      <section className="form-card mx-auto max-w-md text-sm font-semibold text-[#6B6860]">Abriendo el flujo de reporte...</section>
    </main>
  );
}

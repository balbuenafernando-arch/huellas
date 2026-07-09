"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createContentReport, type ContentReportReason } from "@/lib/pet-store";
import { FriendlyError } from "@/components/feedback";
import { friendlyError } from "@/lib/form-validation";

const reasons: Array<{ value: ContentReportReason; label: string }> = [
  { value: "spam", label: "Spam" },
  { value: "informacion_falsa", label: "Información falsa" },
  { value: "foto_incorrecta", label: "Foto incorrecta" },
  { value: "broma", label: "Broma" },
];

export function ContentReportButton({ targetType, targetId }: { targetType: "pet" | "sighting"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(motivo: ContentReportReason) {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await createContentReport({ target_type: targetType, target_id: targetId, motivo });
      setSent(true);
      setOpen(false);
    } catch (caught) {
      setError(friendlyError(caught, "No pudimos enviar el aviso. Inténtalo otra vez."));
    } finally {
      setSaving(false);
    }
  }

  if (sent) return <div className="rounded-xl bg-[#E1F5EE] p-3 text-sm text-[#085041]">Gracias. Revisaremos este contenido.</div>;

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={() => setOpen((value) => !value)}><Flag size={17} />Avisar problema</Button>
      {error && <FriendlyError message={error} />}
      {open && <div className="grid gap-2 rounded-xl border border-black/10 p-3">
        {reasons.map((reason) => <Button key={reason.value} type="button" variant="outline" disabled={saving} onClick={() => submit(reason.value)}>{reason.label}</Button>)}
      </div>}
    </div>
  );
}

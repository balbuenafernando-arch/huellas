"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createContactRequest, contactReasonLabels, listContactRequests, updateContactRequestStatus, type ContactReason, type ContactRequest } from "@/lib/contact-requests";
import { getCurrentUser } from "@/lib/sprint14-store";
import { normalizePeruWhatsapp, peruWhatsappUrl } from "@/lib/whatsapp";

const reasons: ContactReason[] = ["vista", "resguardada", "siguiendo", "fotografias", "informacion"];

export function SafeContact({
  reportId,
  petId,
  ownerId,
  petName,
  whatsapp,
  owned,
  signedIn,
}: {
  reportId: string;
  petId: string | null;
  ownerId: string | null;
  petName: string;
  whatsapp: string;
  owned: boolean;
  signedIn: boolean;
}) {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [reason, setReason] = useState<ContactReason>("vista");
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const phone = normalizePeruWhatsapp(whatsapp);

  async function load() {
    const [user, items] = await Promise.all([getCurrentUser(), listContactRequests(reportId)]);
    setCurrentUserId(user?.id ?? null);
    setRequests(items);
  }

  useEffect(() => { load(); }, [reportId]);

  const ownRequest = useMemo(() => requests.find((request) => request.requester_id === currentUserId), [currentUserId, requests]);
  const pendingRequests = requests.filter((request) => request.status === "pendiente");
  const authorizedRequest = ownRequest?.status === "autorizada" ? ownRequest : null;
  const rejectedRequest = ownRequest?.status === "rechazada" ? ownRequest : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || ownRequest) return;
    setStatusMessage("");
    setSaving(true);
    try {
      await createContactRequest({ report_id: reportId, pet_id: petId, owner_id: ownerId, reason, message: message.trim().slice(0, 200) || null });
      setMessage("");
      setStatusMessage("Solicitud enviada. El dueño decidirá si comparte su contacto.");
      await load();
    } catch {
      setStatusMessage("No se pudo enviar la solicitud. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setSaving(false);
    }
  }

  async function setRequestStatus(id: string, status: "autorizada" | "rechazada") {
    await updateContactRequestStatus(id, status);
    setStatusMessage(status === "autorizada" ? "Tu WhatsApp fue compartido únicamente con esta persona." : "Solicitud rechazada. No se compartió tu contacto.");
    await load();
  }

  if (!signedIn) {
    return (
      <div className="rounded-2xl border border-black/10 bg-[#F8F7F4] p-4">
        <p className="text-sm font-semibold text-[#4D4A43]">Para proteger datos personales, inicia sesión antes de solicitar contacto.</p>
      </div>
    );
  }

  if (owned) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 font-bold"><ShieldCheck size={18} className="text-[#1D9E75]" />Solicitudes de contacto</div>
        {pendingRequests.length === 0 && <p className="text-sm text-[#6B6860]">Aún no hay solicitudes pendientes.</p>}
        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <div key={request.id} className="rounded-xl bg-[#F8F7F4] p-3 text-sm">
              <p className="font-semibold">{request.requester_name} quiere contactarte.</p>
              <p className="mt-1 text-[#6B6860]">Motivo: {contactReasonLabels[request.reason]}</p>
              {request.message && <p className="mt-1 text-[#4D4A43]">{request.message}</p>}
              <div className="mt-3 grid gap-2 min-[390px]:flex">
                <Button size="sm" type="button" onClick={() => setRequestStatus(request.id, "autorizada")}>Autorizar contacto</Button>
                <Button size="sm" type="button" variant="outline" onClick={() => setRequestStatus(request.id, "rechazada")}>Rechazar</Button>
              </div>
            </div>
          ))}
        </div>
        {statusMessage && <p className="mt-3 rounded-xl bg-[#E1F5EE] p-3 text-sm font-semibold text-[#085041]">{statusMessage}</p>}
      </div>
    );
  }

  if (authorizedRequest && phone) {
    return (
      <Button asChild>
        <a href={peruWhatsappUrl(phone, `Hola. Creo tener información sobre ${petName} en HUELLA.`)} target="_blank" rel="noreferrer">
          <MessageCircle size={18} />Abrir conversación por WhatsApp
        </a>
      </Button>
    );
  }

  if (rejectedRequest) {
    return <div className="rounded-2xl border border-black/10 bg-[#F8F7F4] p-4 text-sm font-semibold text-[#6B6860]">El dueño no autorizó compartir su contacto.</div>;
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 font-bold"><ShieldCheck size={18} className="text-[#1D9E75]" />Quiero contactar al dueño</div>
      {ownRequest ? <p className="text-sm font-semibold text-[#6B6860]">Tu solicitud está pendiente de revisión.</p> : <>
        <label className="label">Motivo</label>
        <select className="select" value={reason} onChange={(event) => setReason(event.target.value as ContactReason)}>
          {reasons.map((item) => <option key={item} value={item}>{contactReasonLabels[item]}</option>)}
        </select>
        <label className="mt-3 block">
          <span className="label">Mensaje opcional</span>
          <textarea className="textarea min-h-20" value={message} maxLength={200} onChange={(event) => setMessage(event.target.value)} placeholder="Máximo 200 caracteres" />
        </label>
        <Button type="submit" className="mt-3 w-full" disabled={saving}>{saving ? "Enviando solicitud..." : "Enviar solicitud"}</Button>
      </>}
      {statusMessage && <p className="mt-3 text-sm font-semibold text-[#1D9E75]">{statusMessage}</p>}
    </form>
  );
}

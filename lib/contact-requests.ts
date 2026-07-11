"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/sprint14-store";

export type ContactReason = "vista" | "resguardada" | "siguiendo" | "fotografias" | "informacion";
export type ContactRequestStatus = "pendiente" | "autorizada" | "rechazada";

export type ContactRequest = {
  id: string;
  report_id: string;
  pet_id: string | null;
  owner_id: string | null;
  requester_id: string | null;
  requester_name: string;
  reason: ContactReason;
  message: string | null;
  status: ContactRequestStatus;
  created_at: string;
  updated_at: string;
};

const KEY = "huella:contact-requests";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value?: string | null) {
  return Boolean(value && UUID_RE.test(value));
}

function readLocal(): ContactRequest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as ContactRequest[];
  } catch {
    return [];
  }
}

function writeLocal(items: ContactRequest[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export const contactReasonLabels: Record<ContactReason, string> = {
  vista: "La vi.",
  resguardada: "La tengo resguardada.",
  siguiendo: "La estoy siguiendo.",
  fotografias: "Tengo fotografías.",
  informacion: "Tengo información importante.",
};

export async function listContactRequests(reportId: string) {
  const user = await getCurrentUser();
  if (isSupabaseConfigured && supabase && user && isUuid(reportId)) {
    const { data, error } = await supabase
      .from("contact_requests")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (data) return data as ContactRequest[];
  }
  return readLocal().filter((request) => request.report_id === reportId && (!user || request.owner_id === user.id || request.requester_id === user.id));
}

export async function createContactRequest(input: Pick<ContactRequest, "report_id" | "pet_id" | "owner_id" | "reason" | "message">) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Necesitas iniciar sesión para solicitar contacto.");
  const now = new Date().toISOString();
  const request: ContactRequest = {
    ...input,
    id: crypto.randomUUID(),
    requester_id: user.id,
    requester_name: user.email?.split("@")[0] || "Una persona",
    status: "pendiente",
    created_at: now,
    updated_at: now,
  };
  if (isSupabaseConfigured && supabase && isUuid(request.report_id) && isUuid(request.pet_id) && isUuid(request.owner_id)) {
    const { data, error } = await supabase.from("contact_requests").insert(request).select().single();
    if (error) throw error;
    return data as ContactRequest;
  }
  writeLocal([request, ...readLocal()]);
  return request;
}

export async function updateContactRequestStatus(id: string, status: ContactRequestStatus) {
  const patch = { status, updated_at: new Date().toISOString() };
  if (isSupabaseConfigured && supabase && isUuid(id)) {
    const { error } = await supabase.from("contact_requests").update(patch).eq("id", id);
    if (error) throw error;
  }
  writeLocal(readLocal().map((request) => request.id === id ? { ...request, ...patch } : request));
}

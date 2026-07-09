export type ProfileRow = {
  id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type PetRow = {
  id: string;
  owner_id: string | null;
  nombre: string;
  especie: string | null;
  raza: string | null;
  tamano: string | null;
  color: string | null;
  foto_principal: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type LostReportRow = {
  id: string;
  pet_id: string;
  owner_id: string;
  status: "active" | "reunited" | "archived";
  district: string;
  approximate_address: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  lost_at: string | null;
  reunited_at: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type SightingRow = {
  id: string;
  report_id: string | null;
  pet_id: string | null;
  reporter_id: string | null;
  especie: string | null;
  tamano: string | null;
  color: string | null;
  district: string | null;
  approximate_address: string | null;
  description: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  observed_at: string | null;
  status: "pending" | "confirmed" | "dismissed";
  created_at: string;
  updated_at: string;
};

export type ReportImageRow = {
  id: string;
  report_id: string | null;
  pet_id: string | null;
  sighting_id: string | null;
  owner_id: string | null;
  bucket: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  file_size: number;
  sort_order: number;
  created_at: string;
};

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
  photo_urls: string[];
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
  photo_urls: string[];
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
  photo_urls: string[];
  latitude: number | null;
  longitude: number | null;
  observed_at: string | null;
  status: "pending" | "confirmed" | "dismissed";
  created_at: string;
  updated_at: string;
};

export type ReunionStoryRow = {
  id: string;
  report_id: string;
  owner_id: string;
  story: string | null;
  photo_url: string | null;
  photo_urls: string[];
  created_at: string;
  updated_at: string;
};

export type FeedbackRow = {
  id: string;
  user_id: string | null;
  tipo: string | null;
  comentario: string | null;
  screenshot_url: string | null;
  photo_urls: string[];
  created_at: string;
};

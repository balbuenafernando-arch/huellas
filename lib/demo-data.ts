export type PetStatus = "perdido" | "encontrado" | "reunido";

export type Pet = {
  id: string;
  nombre: string;
  tipo: string;
  raza: string;
  descripcion: string;
  estado: PetStatus;
  distrito: string;
  direccion: string;
  latitud: number;
  longitud: number;
  whatsapp: string;
  foto_principal: string;
  fecha_reporte: string;
  creado_en: string;
  recompensa_ofrecida?: boolean;
  recompensa_monto?: number | null;
  fotos?: string[];
  caracteristicas?: string[];
  caracteristicas_personalizadas?: string;
  condiciones_especiales?: string[];
  alias?: string[];
  edad?: string | null;
  salud?: string | null;
  esterilizado?: boolean | null;
  observaciones?: string | null;
  cerrado_en?: string | null;
  owner_token?: string | null;
};

export type Sighting = {
  id: string;
  pet_id: string | null;
  report_id?: string | null;
  especie?: string | null;
  tamano?: string | null;
  color?: string | null;
  distrito?: string | null;
  comentario: string;
  foto: string | null;
  latitud: number | null;
  longitud: number | null;
  ubicacion?: string | null;
  estado?: "pendiente" | "confirmado" | "descartado";
  estado_avistamiento?: "pendiente" | "confirmado" | "descartado";
  estado_revision?: "por_revisar" | "posible_coincidencia" | "descartado" | "alerta_falsa" | "informacion_enganosa" | "encontrada";
  situacion?: "solo_la_vi" | "sigue_en_la_zona" | "la_tengo_conmigo" | "veterinaria" | "refugio" | "herida" | "siguiendo";
  llevaba_placa?: "si" | "no" | "no_pude_verificar";
  nombre_observado?: string | null;
  feedback_reportero?: string | null;
  visto_en?: string;
  owner_token?: string | null;
  reporter_name?: string | null;
  reporter_is_anonymous?: boolean;
  creado_en: string;
};

export type Notification = {
  id: string;
  pet_id: string;
  tipo: "nuevo_avistamiento" | "avistamiento_confirmado" | "reporte_actualizado" | "reporte_cerrado" | "coincidencia_alta" | "caso_cercano";
  mensaje: string;
  leido: boolean;
  creado_en: string;
};

function demoDate(daysAgo: number, time = "10:00:00") {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.toISOString().slice(0, 10)}T${time}Z`;
}

export const demoPets: Pet[] = [
  { id: "luna", nombre: "Luna", tipo: "Perro", raza: "Labrador dorada", descripcion: "Lleva collar rojo con chapita. Es sociable, pero puede asustarse con el ruido.", estado: "perdido", distrito: "Miraflores", direccion: "Malecón de la Reserva", latitud: -12.1297, longitud: -77.0305, whatsapp: "51987654321", foto_principal: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(1, "10:00:00"), creado_en: demoDate(1, "10:00:00") },
  { id: "kira", nombre: "Kira", tipo: "Perro", raza: "Beagle", descripcion: "Beagle tricolor, mediana, responde a su nombre.", estado: "perdido", distrito: "Surco", direccion: "Av. Primavera", latitud: -12.1278, longitud: -76.9849, whatsapp: "51987654322", foto_principal: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(2, "09:30:00"), creado_en: demoDate(2, "09:30:00") },
  { id: "max", nombre: "Max", tipo: "Perro", raza: "Golden Retriever", descripcion: "Golden grande, dócil, collar azul.", estado: "perdido", distrito: "San Borja", direccion: "Pentagonito", latitud: -12.0969, longitud: -76.9996, whatsapp: "51987654323", foto_principal: "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(4, "15:10:00"), creado_en: demoDate(4, "15:10:00") },
  { id: "coco", nombre: "Coco", tipo: "Perro", raza: "Mestizo", descripcion: "Pequeño, marrón claro, tímido.", estado: "perdido", distrito: "Barranco", direccion: "Parque Municipal", latitud: -12.1499, longitud: -77.0215, whatsapp: "51987654324", foto_principal: "https://images.unsplash.com/photo-1588421357574-87938a86fa28?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(3, "19:15:00"), creado_en: demoDate(3, "19:15:00") },
  { id: "nala", nombre: "Nala", tipo: "Gato", raza: "Gato naranja", descripcion: "Gata naranja, ojos verdes, no usa collar.", estado: "perdido", distrito: "San Isidro", direccion: "El Olivar", latitud: -12.0975, longitud: -77.0366, whatsapp: "51987654325", foto_principal: "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(1, "14:00:00"), creado_en: demoDate(1, "14:00:00") },
  { id: "toby", nombre: "Toby", tipo: "Perro", raza: "Schnauzer", descripcion: "Encontrado con arnés negro cerca del mercado.", estado: "encontrado", distrito: "Magdalena", direccion: "Mercado de Magdalena", latitud: -12.0916, longitud: -77.0679, whatsapp: "51987654326", foto_principal: "https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(0, "08:40:00"), creado_en: demoDate(0, "08:40:00") },
  { id: "pelusa", nombre: "Pelusa", tipo: "Gato", raza: "Gato blanco", descripcion: "Gato blanco encontrado, muy tranquilo.", estado: "encontrado", distrito: "Pueblo Libre", direccion: "Av. Bolívar", latitud: -12.0763, longitud: -77.0611, whatsapp: "51987654327", foto_principal: "https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(0, "12:10:00"), creado_en: demoDate(0, "12:10:00") },
  { id: "rocky", nombre: "Rocky", tipo: "Perro", raza: "Poodle", descripcion: "Poodle blanco encontrado en Chorrillos.", estado: "encontrado", distrito: "Chorrillos", direccion: "Morro Solar", latitud: -12.1823, longitud: -77.0301, whatsapp: "51987654328", foto_principal: "https://images.unsplash.com/photo-1594149929911-78975a43d4f5?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(0, "16:20:00"), creado_en: demoDate(0, "16:20:00") },
  { id: "bruno", nombre: "Bruno", tipo: "Perro", raza: "Pastor Alemán", descripcion: "Reunido con su familia gracias a la comunidad.", estado: "reunido", distrito: "La Molina", direccion: "Av. La Molina", latitud: -12.0864, longitud: -76.9224, whatsapp: "51987654329", foto_principal: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(8, "11:00:00"), creado_en: demoDate(8, "11:00:00") },
  { id: "misha", nombre: "Misha", tipo: "Gato", raza: "Gata gris", descripcion: "Ya volvió a casa.", estado: "reunido", distrito: "Jesús María", direccion: "Campo de Marte", latitud: -12.0706, longitud: -77.0432, whatsapp: "51987654330", foto_principal: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(10, "11:00:00"), creado_en: demoDate(10, "11:00:00") },
  { id: "thor", nombre: "Thor", tipo: "Perro", raza: "Husky", descripcion: "Fue reconocido por vecinos de Surquillo.", estado: "reunido", distrito: "Surquillo", direccion: "Av. Angamos", latitud: -12.1121, longitud: -77.0116, whatsapp: "51987654331", foto_principal: "https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(12, "11:00:00"), creado_en: demoDate(12, "11:00:00") },
  { id: "canela", nombre: "Canela", tipo: "Perro", raza: "Mestiza", descripcion: "Reunida después de un reporte en Lince.", estado: "reunido", distrito: "Lince", direccion: "Parque Ramón Castilla", latitud: -12.0846, longitud: -77.0348, whatsapp: "51987654332", foto_principal: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=900&q=80", fecha_reporte: demoDate(13, "11:00:00"), creado_en: demoDate(13, "11:00:00") }
];

export const demoSightings: Sighting[] = [
  { id: "s1", pet_id: "luna", comentario: "Vista cerca de Larcomar, iba hacia el malecón.", foto: null, latitud: -12.1314, longitud: -77.0308, ubicacion: "Larcomar", estado: "confirmado", creado_en: demoDate(0, "13:20:00") },
  { id: "s2", pet_id: "luna", comentario: "Vista en Parque Kennedy por la tarde.", foto: null, latitud: -12.1211, longitud: -77.0297, ubicacion: "Parque Kennedy", estado: "pendiente", creado_en: demoDate(0, "15:40:00") },
  { id: "s3", pet_id: "luna", comentario: "Vista en Malecón Cisneros, tenía collar rojo.", foto: null, latitud: -12.1198, longitud: -77.0391, ubicacion: "Malecón Cisneros", estado: "pendiente", creado_en: demoDate(0, "18:05:00") },
  { id: "s4", pet_id: "max", comentario: "Vista en Pentagonito cerca al circuito.", foto: null, latitud: -12.0973, longitud: -76.9985, ubicacion: "Pentagonito", estado: "confirmado", creado_en: demoDate(1, "17:15:00") },
  { id: "s5", pet_id: "max", comentario: "Vista en Av. San Borja, parecía desorientado.", foto: null, latitud: -12.1009, longitud: -77.0032, ubicacion: "Av. San Borja", estado: "pendiente", creado_en: demoDate(0, "10:15:00") },
  { id: "s6", pet_id: "nala", comentario: "Vista en El Olivar escondida entre arbustos.", foto: null, latitud: -12.0988, longitud: -77.0361, ubicacion: "El Olivar", estado: "pendiente", creado_en: demoDate(0, "09:05:00") }
];

export const demoNotifications: Notification[] = [
  { id: "n1", pet_id: "luna", tipo: "nuevo_avistamiento", mensaje: "Nuevo reporte recibido para Luna", leido: false, creado_en: demoDate(0, "18:05:00") },
  { id: "n2", pet_id: "max", tipo: "avistamiento_confirmado", mensaje: "Reporte confirmado para Max", leido: false, creado_en: demoDate(1, "17:30:00") }
];

"use client";

export type LocationDetails = {
  latitude: number;
  longitude: number;
  address: string;
  district: string;
  province: string;
  department: string;
};

const peruFallback = {
  latitude: -9.19,
  longitude: -75.0152,
};

function geolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "No tenemos permiso para usar tu ubicación. Activa el permiso del navegador o escribe una referencia.";
  if (error.code === error.POSITION_UNAVAILABLE) return "El GPS no entregó una ubicación. Revisa que esté activado o escribe la zona manualmente.";
  if (error.code === error.TIMEOUT) return "El GPS tardó demasiado. Intenta otra vez o escribe una referencia.";
  return "No se pudo obtener tu ubicación. Puedes continuar escribiendo la zona.";
}

function readAddress(address: Record<string, unknown>, fallback: string) {
  const district = String(address.suburb ?? address.city_district ?? address.town ?? address.city ?? address.village ?? address.county ?? "");
  const province = String(address.province ?? address.county ?? address.city ?? "");
  const department = String(address.state ?? address.region ?? "");
  return {
    address: fallback,
    district,
    province,
    department,
  };
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<Omit<LocationDetails, "latitude" | "longitude">> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("accept-language", "es");
    url.searchParams.set("addressdetails", "1");
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("No reverse geocode");
    const data = await response.json() as { display_name?: string; address?: Record<string, unknown> };
    return readAddress(data.address ?? {}, data.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
  } catch {
    return {
      address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      district: "",
      province: "",
      department: "",
    };
  }
}

export async function getCurrentLocationDetails(): Promise<LocationDetails> {
  if (!navigator.geolocation) throw new Error("Tu navegador no permite obtener ubicación. Escribe una referencia manualmente.");
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, (error) => reject(new Error(geolocationErrorMessage(error))), {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const details = await reverseGeocode(latitude, longitude);
  return { latitude, longitude, ...details };
}

export async function locationDetailsFromCoords(latitude: number, longitude: number): Promise<LocationDetails> {
  const details = await reverseGeocode(latitude, longitude);
  return { latitude, longitude, ...details };
}

export async function searchPeruLocation(query: string): Promise<LocationDetails | null> {
  const text = query.trim();
  if (!text) return null;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", `${text}, Perú`);
  url.searchParams.set("limit", "1");
  url.searchParams.set("accept-language", "es");
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("No se pudo buscar esa ubicación. Prueba con otra referencia.");
  const results = await response.json() as Array<{ lat: string; lon: string; display_name?: string; address?: Record<string, unknown> }>;
  const first = results[0];
  if (!first) return null;
  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  const details = readAddress(first.address ?? {}, first.display_name ?? text);
  return { latitude, longitude, ...details };
}

export function defaultPeruCoords() {
  return peruFallback;
}

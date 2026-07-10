"use client";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type PickedLocation = {
  latitude: number;
  longitude: number;
};

type Props = {
  value: PickedLocation;
  onChange: (value: PickedLocation) => void;
};

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:34px;height:34px;border-radius:999px 999px 999px 4px;transform:rotate(-45deg);background:#1D9E75;border:3px solid white;box-shadow:0 10px 22px rgba(0,0,0,.28)"><div style="width:10px;height:10px;border-radius:999px;background:white;margin:9px auto 0"></div></div>',
  iconSize: [34, 34],
  iconAnchor: [17, 30],
});

function Recenter({ value }: { value: PickedLocation }) {
  const map = useMap();

  useEffect(() => {
    map.setView([value.latitude, value.longitude], Math.max(map.getZoom(), 15), { animate: true });
  }, [map, value.latitude, value.longitude]);

  return null;
}

function MapClick({ onChange }: Pick<Props, "onChange">) {
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

export default function LeafletLocationPicker({ value, onChange }: Props) {
  const center = useMemo<[number, number]>(() => [value.latitude, value.longitude], [value.latitude, value.longitude]);

  return (
    <MapContainer center={center} zoom={15} scrollWheelZoom className="min-h-[inherit]">
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter value={value} />
      <MapClick onChange={onChange} />
      <Marker
        draggable
        icon={pinIcon}
        position={center}
        eventHandlers={{
          dragend(event) {
            const marker = event.target as L.Marker;
            const point = marker.getLatLng();
            onChange({ latitude: point.lat, longitude: point.lng });
          },
        }}
      />
    </MapContainer>
  );
}

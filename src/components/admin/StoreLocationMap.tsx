"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface StoreLocationMapProps {
  latitude: string;
  longitude: string;
  onSelect: (lat: number, lng: number) => void;
}

function LocationPicker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function StoreLocationMap({ latitude, longitude, onSelect }: StoreLocationMapProps) {
  const lat = parseFloat(latitude || "37.9838");
  const lng = parseFloat(longitude || "23.7275");

  return (
    <div className="h-80 w-full rounded-md overflow-hidden border">
      <MapContainer
        key={`${lat}-${lng}`} // ensures re-render without error
        center={[lat, lng] as LatLngExpression}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationPicker onSelect={onSelect} />
        <Marker
          position={[lat, lng]}
          icon={L.icon({
            iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          })}
        />
      </MapContainer>
    </div>
  );
}

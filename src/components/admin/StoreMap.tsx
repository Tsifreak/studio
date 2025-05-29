
// StoreMap.tsx
import React, { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface StoreMapProps {
  latitude: number;
  longitude: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
  mapRef?: React.MutableRefObject<L.Map | null>; // Accept mapRef as a prop
}

// Component to handle map clicks and update coordinates
function LocationPickerInline({ onCoordinatesChange, currentLat, currentLng }: { onCoordinatesChange: (lat: number, lng: number) => void; currentLat: number; currentLng: number}) {
  const map = useMap(); // Get map instance

  useMapEvents({
    click(e) {
      onCoordinatesChange(e.latlng.lat, e.latlng.lng);
      map.setView(e.latlng, map.getZoom()); // Center map on click
    },
  });
  
  // Effect to update marker position when lat/lng props change
  useEffect(() => {
    // Check if marker exists to avoid errors if map isn't fully ready
    // (This is more relevant if you were creating/managing the Marker instance here)
    // For a simple Marker prop change, Leaflet handles it.
    // But we ensure the map view updates if external changes occur to lat/lng
    if (currentLat !== map.getCenter().lat || currentLng !== map.getCenter().lng) {
        map.setView([currentLat, currentLng], map.getZoom());
    }
  }, [currentLat, currentLng, map]);


  return <Marker position={[currentLat, currentLng]} icon={markerIcon} />;
}

export function StoreMap({ latitude, longitude, onCoordinatesChange, mapRef: passedMapRef }: StoreMapProps) {
  // Use a local ref if one isn't passed, primarily for the MapContainer
  const localMapRef = useRef<L.Map | null>(null);
  const mapRefToUse = passedMapRef || localMapRef;

  // When the component mounts or latitude/longitude props change, update the map's view.
  useEffect(() => {
    if (mapRefToUse.current && (mapRefToUse.current.getCenter().lat !== latitude || mapRefToUse.current.getCenter().lng !== longitude)) {
      mapRefToUse.current.setView([latitude, longitude], mapRefToUse.current.getZoom() || 13);
    }
  }, [latitude, longitude, mapRefToUse]);


  return (
    <MapContainer
      key={`store-map-instance-${latitude}-${longitude}`} // More dynamic key based on initial center might help re-renders
      center={[latitude, longitude]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
      whenReady={(mapInstance) => { // Use whenReady to get map instance
        if (mapRefToUse) {
            mapRefToUse.current = mapInstance.target;
        }
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationPickerInline onCoordinatesChange={onCoordinatesChange} currentLat={latitude} currentLng={longitude} />
    </MapContainer>
  );
}

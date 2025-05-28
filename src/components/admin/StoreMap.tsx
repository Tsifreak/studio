// StoreMap.tsx
import React, { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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
}

export function StoreMap({ latitude, longitude, onCoordinatesChange }: StoreMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [position, setPosition] = useState<[number, number]>([latitude, longitude]);

  // Effect to update internal position state when props change
  useEffect(() => {
    // Only update position if latitude/longitude props actually change
    // This prevents unnecessary re-renders or map movements if position is already correct
    if (position[0] !== latitude || position[1] !== longitude) {
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude, position]);

  // Effect to set map view when position changes
  // This effect needs to be careful not to run if the map is not yet initialized or has been removed
  useEffect(() => {
    if (mapRef.current && mapRef.current.getContainer()) { // Add .getContainer() check for robustness
      mapRef.current.setView(position, mapRef.current.getZoom());
    }
  }, [position]);

  // Component to handle map clicks and update coordinates
  function LocationPickerInline() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        onCoordinatesChange(e.latlng.lat, e.latlng.lng);
      },
      // IMPORTANT: If you allow dragging the marker/map, you might need to update coordinates on dragend too
      // moveend: (e) => { // Map move (pan, zoom)
      //   if (mapRef.current) {
      //     const newCenter = mapRef.current.getCenter();
      //     // Only update if significantly different to avoid infinite loops
      //     if (Math.abs(newCenter.lat - position[0]) > 0.000001 || Math.abs(newCenter.lng - position[1]) > 0.000001) {
      //       onCoordinatesChange(newCenter.lat, newCenter.lng);
      //     }
      //   }
      // }
    });
    return null;
  }

  // CRITICAL: Ensure MapContainer is mounted once and properly destroyed
  // This useEffect will run once on mount and its cleanup function on unmount
  useEffect(() => {
    // No op in here, the cleanup is the main purpose of this useEffect.
    // The MapContainer handles initialization via react-leaflet.
    return () => {
      // Defensive check before trying to remove: ensure mapRef.current is a valid L.Map instance
      // and that its container exists (not null or detached).
      if (mapRef.current && mapRef.current.getContainer()) {
        try {
          mapRef.current.remove(); // Explicitly remove the Leaflet map instance
          mapRef.current = null;   // Clear the ref
          // console.log("Map instance removed successfully."); // For debugging
        } catch (error) {
          // console.error("Error removing map instance:", error); // For debugging
        }
      }
    };
  }, []); // Empty dependency array means it runs once on mount and cleanup on unmount


  return (
    // CRITICAL: Use a stable and unique key for MapContainer.
    // Use a constant key to help with Strict Mode and Fast Refresh.
    // The key on DynamicStoreMap in the parent handles the "new vs edit store" scenario.
    <MapContainer
      key="store-map-leaflet-instance" // Changed to a simpler, highly constant key
      center={position}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
      ref={mapRef} // Pass the ref here
      // Consider adding a whenReady prop to ensure map is fully loaded before interactions
      // whenReady={(map) => {
      //   mapRef.current = map; // Manually set ref on ready
      //   // Any initial interactions with the map instance go here
      //   // e.g., map.invalidateSize(); if there are initial sizing issues
      // }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={markerIcon}>
        {/* You can add a Popup here if needed */}
      </Marker>
      <LocationPickerInline />
    </MapContainer>
  );
}
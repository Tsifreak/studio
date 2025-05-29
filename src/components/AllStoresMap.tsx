"use client";

import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SerializedStoreForMap } from '@/lib/storeService'; // Adjust path

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface AllStoresMapProps {
  shops: SerializedStoreForMap[]; // Array of all your shops
}

export function AllStoresMap({ shops }: AllStoresMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Set initial map center (e.g., center of Greece)
  const initialCenter: [number, number] = [37.9838, 23.7275];
  const initialZoom = 7;

  // Effect to fit map bounds to all markers when shops data changes
  useEffect(() => {
    if (mapRef.current && shops.length > 0) {
      const bounds = L.latLngBounds(shops.map(shop => [shop.latitude, shop.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] }); // Add padding so markers aren't on the edge
    } else if (mapRef.current) {
        // If no shops, just set to a default view
        mapRef.current.setView(initialCenter, initialZoom);
    }
  }, [shops]);


  return (
    <MapContainer
      key="all-stores-map-instance"
      center={initialCenter}
      zoom={initialZoom}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {shops.map((shop) => (
        <Marker key={shop.id} position={[shop.latitude, shop.longitude]} icon={markerIcon}>
          <Popup>
            <b>{shop.name}</b><br/>
            {shop.address}<br/>
            {shop.logoUrl && <img src={shop.logoUrl} alt={shop.name} style={{ width: '50px', height: '50px', objectFit: 'cover', marginTop: '5px' }} />}
            {/* Add more shop details here as needed */}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
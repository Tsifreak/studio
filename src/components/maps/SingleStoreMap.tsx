
"use client";

import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Direct imports, rendering will be conditional
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// Leaflet type import
import type { Map as LeafletMapType } from 'leaflet';


interface SingleStoreMapProps {
  latitude: number;
  longitude: number;
  storeName: string;
  zoom?: number;
  className?: string;
}

export function SingleStoreMap({ latitude, longitude, storeName, zoom = 15, className }: SingleStoreMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [LModule, setLModule] = useState<typeof import('leaflet') | null>(null); // Store the leaflet module
  const mapInstanceRef = useRef<LeafletMapType | null>(null); // Ref for the Leaflet map instance

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      import('leaflet/dist/leaflet.css');
      import('leaflet').then(leaflet => {
        setLModule(leaflet);
        // Fix for default icon path issue with webpack
        if (leaflet.Icon?.Default?.prototype && (leaflet.Icon.Default.prototype as any)._getIconUrl) {
          delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
        }
        leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
      }).catch(error => {
        console.error("Failed to load Leaflet module:", error);
      });
    }
  }, []);

  useEffect(() => {
    // This effect is to update the map view if props change *after* initial render
    if (mapInstanceRef.current && LModule) {
      const currentCenter = mapInstanceRef.current.getCenter();
      const currentZoom = mapInstanceRef.current.getZoom();
      if (currentCenter.lat !== latitude || currentCenter.lng !== longitude || currentZoom !== zoom) {
        mapInstanceRef.current.setView([latitude, longitude], zoom);
      }
    }
  }, [latitude, longitude, zoom, LModule]);

  if (!isClient || !LModule) {
    return <Skeleton className={cn("h-full w-full rounded-md", className)} />;
  }

  const markerIcon = LModule ? new LModule.Icon.Default() : undefined;

  // Using a highly unique key including Math.random() to force remount of MapContainer.
  // This is a more aggressive approach for stubborn initialization issues.
  const mapKey = `${storeName}-${latitude}-${longitude}-${zoom}-${Date.now()}-${Math.random()}`;

  return (
    <MapContainer
      key={mapKey}
      center={[latitude, longitude]}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
      className={cn("rounded-md", className)}
      whenCreated={map => { mapInstanceRef.current = map; }} // Use whenCreated to get the map instance
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markerIcon && (
        <Marker position={[latitude, longitude]} icon={markerIcon}>
          <Popup>{storeName}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

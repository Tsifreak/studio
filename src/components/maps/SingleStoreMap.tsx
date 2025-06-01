
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Map as LeafletMapType } from 'leaflet'; // Leaflet type import
import dynamic from 'next/dynamic'; // Import next/dynamic

// Dynamically import react-leaflet components with ssr: false
const DynamicMapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-md" />,
});
const DynamicTileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), {
  ssr: false,
});
const DynamicMarker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), {
  ssr: false,
});
const DynamicPopup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), {
  ssr: false,
});


interface SingleStoreMapProps {
  latitude: number;
  longitude: number;
  storeName: string;
  zoom?: number;
  className?: string;
}

export function SingleStoreMap({ latitude, longitude, storeName, zoom = 15, className }: SingleStoreMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [LModule, setLModule] = useState<typeof import('leaflet') | null>(null);
  const mapInstanceRef = useRef<LeafletMapType | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      import('leaflet/dist/leaflet.css'); // Import CSS here, only on client
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
    if (mapInstanceRef.current && LModule && isClient) {
      const currentCenter = mapInstanceRef.current.getCenter();
      const currentZoom = mapInstanceRef.current.getZoom();
      if (currentCenter.lat !== latitude || currentCenter.lng !== longitude || currentZoom !== zoom) {
        mapInstanceRef.current.setView([latitude, longitude], zoom);
      }
    }
  }, [latitude, longitude, zoom, LModule, isClient]);

  if (!isClient || !LModule) {
    return <Skeleton className={cn("h-full w-full rounded-md", className)} />;
  }

  // Define markerIcon only when LModule is available
  const markerIcon = new LModule.Icon.Default();

  // Using a highly unique key including Math.random() to force remount of DynamicMapContainer.
  const mapKey = `${storeName}-${latitude}-${longitude}-${zoom}-${Date.now()}-${Math.random()}`;

  return (
    <DynamicMapContainer
      key={mapKey}
      center={[latitude, longitude]}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
      className={cn("rounded-md", className)}
      whenCreated={map => { mapInstanceRef.current = map; }}
    >
      <DynamicTileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markerIcon && ( // Ensure markerIcon is defined
        <DynamicMarker position={[latitude, longitude]} icon={markerIcon}>
          <DynamicPopup>{storeName}</DynamicPopup>
        </DynamicMarker>
      )}
    </DynamicMapContainer>
  );
}

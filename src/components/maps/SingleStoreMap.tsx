
"use client";

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface SingleStoreMapProps {
  latitude: number;
  longitude: number;
  storeName: string;
  zoom?: number;
  className?: string;
}

// Lazy load react-leaflet components
const MapContainer = React.lazy(() => import('react-leaflet').then(module => ({ default: module.MapContainer })));
const TileLayer = React.lazy(() => import('react-leaflet').then(module => ({ default: module.TileLayer })));
const Marker = React.lazy(() => import('react-leaflet').then(module => ({ default: module.Marker })));
const Popup = React.lazy(() => import('react-leaflet').then(module => ({ default: module.Popup })));

export function SingleStoreMap({ latitude, longitude, storeName, zoom = 15, className }: SingleStoreMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      import('leaflet').then(leaflet => {
        setL(leaflet);
        // Fix for default icon path issue with webpack
        delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
        leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
      });
      import('leaflet/dist/leaflet.css');
    }
  }, []);

  useEffect(() => {
    if (mapRef.current && L) {
      mapRef.current.setView([latitude, longitude], zoom);
    }
  }, [latitude, longitude, zoom, L]);

  if (!isClient || !L) {
    return <Skeleton className={cn("h-full w-full rounded-md", className)} />;
  }

  const markerIcon = L ? new L.Icon.Default() : undefined;

  return (
    <Suspense fallback={<Skeleton className={cn("h-full w-full rounded-md", className)} />}>
      <MapContainer
        key={`${storeName}-${latitude}-${longitude}-${zoom}`} // Unique key to force re-render
        center={[latitude, longitude]}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }} // Ensure MapContainer fills its parent
        className={cn("rounded-md", className)}
        whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
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
    </Suspense>
  );
}

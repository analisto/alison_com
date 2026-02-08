'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Stop {
  id: number;
  code: string | null;
  name: string;
  latitude: number;
  longitude: number;
  is_transport_hub: boolean;
}

interface MapComponentProps {
  stops: Stop[];
}

function MapUpdater({ stops }: { stops: Stop[] }) {
  const map = useMap();

  useEffect(() => {
    if (stops.length > 0) {
      const bounds = L.latLngBounds(
        stops.map(stop => [Number(stop.latitude), Number(stop.longitude)])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stops, map]);

  return null;
}

export default function MapComponent({ stops }: MapComponentProps) {
  // Baku center coordinates
  const center: [number, number] = [40.4093, 49.8671];

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="w-full h-full rounded-xl"
      style={{ minHeight: '600px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapUpdater stops={stops} />

      {stops.map((stop) => {
        const lat = Number(stop.latitude);
        const lng = Number(stop.longitude);
        return (
          <CircleMarker
            key={stop.id}
            center={[lat, lng]}
            radius={stop.is_transport_hub ? 8 : 5}
            pathOptions={{
              fillColor: stop.is_transport_hub ? '#EF4444' : '#3B82F6',
              color: stop.is_transport_hub ? '#DC2626' : '#2563EB',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-gray-800 mb-1">{stop.name}</h3>
                {stop.code && (
                  <p className="text-xs text-gray-600 mb-1">Code: {stop.code}</p>
                )}
                <p className="text-xs text-gray-500">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
                {stop.is_transport_hub && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    🚇 Transport Hub
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RouteData {
  id: number;
  bus_number: string;
  coordinates: { latitude: number; longitude: number }[];
  color: string;
}

interface LiveMapComponentProps {
  routes: RouteData[];
  stops?: { id: number; latitude: number; longitude: number; name: string }[];
}

function AnimatedRoute({ route, delay }: { route: RouteData; delay: number }) {
  const [visiblePoints, setVisiblePoints] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setVisiblePoints(prev => {
          if (prev >= route.coordinates.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 20);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [route.coordinates.length, delay]);

  const positions = route.coordinates
    .slice(0, visiblePoints)
    .map(coord => [Number(coord.latitude), Number(coord.longitude)] as [number, number]);

  if (positions.length < 2) return null;

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{
          color: route.color,
          weight: 3,
          opacity: 0.7,
          className: 'route-line-animated'
        }}
      />
      {visiblePoints === route.coordinates.length && positions.length > 0 && (
        <CircleMarker
          center={positions[positions.length - 1]}
          radius={6}
          pathOptions={{
            fillColor: route.color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1,
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold text-gray-800">Bus {route.bus_number}</h3>
              <p className="text-xs text-gray-600">Route endpoint</p>
            </div>
          </Popup>
        </CircleMarker>
      )}
    </>
  );
}

function MapController({ routes }: { routes: RouteData[] }) {
  const map = useMap();

  useEffect(() => {
    if (routes.length > 0) {
      const allCoords = routes.flatMap(route =>
        route.coordinates.map(c => [Number(c.latitude), Number(c.longitude)] as [number, number])
      );

      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [routes, map]);

  return null;
}

export default function LiveMapComponent({ routes, stops = [] }: LiveMapComponentProps) {
  const center: [number, number] = [40.4093, 49.8671];

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full rounded-xl"
        style={{ minHeight: '600px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController routes={routes} />

        {/* Animated Routes */}
        {routes.map((route, index) => (
          <AnimatedRoute
            key={route.id}
            route={route}
            delay={index * 100}
          />
        ))}

        {/* Transport Hubs */}
        {stops.map((stop) => (
          <CircleMarker
            key={stop.id}
            center={[Number(stop.latitude), Number(stop.longitude)]}
            radius={4}
            pathOptions={{
              fillColor: '#EF4444',
              color: '#DC2626',
              weight: 1,
              opacity: 0.8,
              fillOpacity: 0.6,
            }}
          >
            <Popup>
              <div className="p-1">
                <p className="text-xs font-semibold text-gray-800">{stop.name}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <style jsx global>{`
        .route-line-animated {
          animation: dash 2s linear infinite;
        }

        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
      `}</style>
    </div>
  );
}

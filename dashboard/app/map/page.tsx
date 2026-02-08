'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-200 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

interface Stop {
  id: number;
  code: string | null;
  name: string;
  latitude: number;
  longitude: number;
  is_transport_hub: boolean;
}

export default function MapPage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHubsOnly, setShowHubsOnly] = useState(false);

  useEffect(() => {
    fetch('/api/stops')
      .then((res) => res.json())
      .then((data) => {
        setStops(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching stops:', error);
        setLoading(false);
      });
  }, []);

  const filteredStops = stops.filter((stop) => {
    const matchesSearch = stop.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHub = !showHubsOnly || stop.is_transport_hub;
    return matchesSearch && matchesHub;
  });

  const transportHubs = stops.filter(s => s.is_transport_hub).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Network Map</h1>
        <p className="text-blue-100 text-lg">
          Interactive map showing all {stops.length} bus stops across Baku
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Stops</p>
              <p className="text-3xl font-bold text-gray-800">{stops.length}</p>
            </div>
            <div className="text-4xl">📍</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Transport Hubs</p>
              <p className="text-3xl font-bold text-red-600">{transportHubs}</p>
            </div>
            <div className="text-4xl">🚇</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Regular Stops</p>
              <p className="text-3xl font-bold text-blue-600">{stops.length - transportHubs}</p>
            </div>
            <div className="text-4xl">🚏</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Map Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Stops
            </label>
            <input
              type="text"
              placeholder="Search by stop name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showHubsOnly}
                onChange={(e) => setShowHubsOnly(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Show Transport Hubs Only
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-sm text-gray-600">
            Showing {filteredStops.length} of {stops.length} stops
          </p>
          {(searchTerm || showHubsOnly) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setShowHubsOnly(false);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Map Legend */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-bold text-gray-800 mb-3">Map Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-700"></div>
            <span className="text-sm text-gray-700">Regular Stop</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-red-700"></div>
            <span className="text-sm text-gray-700">Transport Hub</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl shadow-xl p-6">
        <MapComponent stops={filteredStops} />
      </div>

      {filteredStops.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            No stops found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const LiveMapComponent = dynamic(() => import('@/components/LiveMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-200 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading live map...</p>
      </div>
    </div>
  ),
});

interface Route {
  id: number;
  bus_id: number;
  bus_number?: string;
  direction_type_id: number;
}

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface Stop {
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  is_transport_hub: boolean;
}

export default function LiveMapPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoutes, setSelectedRoutes] = useState<number[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);

  // Color palette for routes
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];

  useEffect(() => {
    // Fetch all routes first
    fetch('/api/routes')
      .then(res => res.json())
      .then((data: Route[]) => {
        setAllRoutes(data);
        // Auto-select first 10 routes
        const firstTen = data.slice(0, 10).map(r => r.id);
        setSelectedRoutes(firstTen);
      })
      .catch(error => console.error('Error fetching routes:', error));
  }, []);

  useEffect(() => {
    if (selectedRoutes.length === 0) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch coordinates for selected routes
    Promise.all(
      selectedRoutes.map((routeId, index) =>
        fetch(`/api/routes/${routeId}/coordinates`)
          .then(res => res.json())
          .then((coords: RouteCoordinate[]) => {
            const route = allRoutes.find(r => r.id === routeId);
            return {
              id: routeId,
              bus_number: route?.bus_number || 'N/A',
              coordinates: coords,
              color: colors[index % colors.length]
            };
          })
      )
    )
      .then(routesData => {
        setRoutes(routesData.filter(r => r.coordinates.length > 0));
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching route coordinates:', error);
        setLoading(false);
      });
  }, [selectedRoutes, allRoutes]);

  const toggleRoute = (routeId: number) => {
    setSelectedRoutes(prev =>
      prev.includes(routeId)
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const selectAll = () => {
    setSelectedRoutes(allRoutes.map(r => r.id));
  };

  const clearAll = () => {
    setSelectedRoutes([]);
  };

  const selectRandom = () => {
    const shuffled = [...allRoutes].sort(() => 0.5 - Math.random());
    setSelectedRoutes(shuffled.slice(0, 10).map(r => r.id));
  };

  if (loading && routes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading live map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">🚌 Live Route Map</h1>
        <p className="text-red-100 text-lg">
          Watch bus routes animate in real-time across Baku
        </p>
        <div className="mt-4 flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-red-100">Live Animation Active</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600">Total Routes</div>
          <div className="text-2xl font-bold text-gray-800">{allRoutes.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600">Selected</div>
          <div className="text-2xl font-bold text-green-600">{selectedRoutes.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600">Visible</div>
          <div className="text-2xl font-bold text-purple-600">{routes.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500">
          <div className="text-sm text-gray-600">Animating</div>
          <div className="text-2xl font-bold text-orange-600">
            {loading ? '...' : routes.length}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Route Selection</h2>
          <div className="flex gap-2">
            <button
              onClick={selectRandom}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Random 10
            </button>
            <button
              onClick={selectAll}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
          {allRoutes.slice(0, 60).map((route, index) => (
            <button
              key={route.id}
              onClick={() => toggleRoute(route.id)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${selectedRoutes.includes(route.id)
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              Bus {route.bus_number}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl shadow-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Live Route Animation</h2>
          {loading && routes.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
              Updating routes...
            </div>
          )}
        </div>
        <div className="min-h-[600px]">
          <LiveMapComponent routes={routes} />
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-bold text-gray-800 mb-3">Active Routes</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {routes.slice(0, 10).map((route, index) => (
            <div key={route.id} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: route.color }}
              ></div>
              <span className="text-sm text-gray-700">Bus {route.bus_number}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

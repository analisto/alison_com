'use client';

import { useEffect, useState } from 'react';

interface Route {
  id: number;
  code: string;
  name: string;
  destination: string;
  variant: string;
  operator: string;
  bus_id: number;
  direction_type_id: number;
  bus_number?: string;
  bus_carrier?: string;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all');

  useEffect(() => {
    fetch('/api/routes')
      .then((res) => res.json())
      .then((data) => {
        setRoutes(data);
        setFilteredRoutes(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching routes:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let filtered = routes;

    if (searchTerm) {
      filtered = filtered.filter((route) =>
        route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.bus_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (directionFilter !== 'all') {
      filtered = filtered.filter((route) =>
        route.direction_type_id.toString() === directionFilter
      );
    }

    setFilteredRoutes(filtered);
  }, [searchTerm, directionFilter, routes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading routes...</p>
        </div>
      </div>
    );
  }

  const getDirectionBadge = (directionId: number) => {
    return directionId === 1 ? (
      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
        <span>→</span> Outbound
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">
        <span>←</span> Inbound
      </span>
    );
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Route Variants</h1>
        <p className="text-purple-100 text-lg">
          Explore all {routes.length} route directions and variants
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Routes
            </label>
            <input
              type="text"
              placeholder="Route name, destination, or bus number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Direction
            </label>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Directions</option>
              <option value="1">Outbound Only</option>
              <option value="2">Inbound Only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-600">
            Showing {filteredRoutes.length} of {routes.length} routes
          </p>
          {(searchTerm || directionFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDirectionFilter('all');
              }}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Routes Grid */}
      <div className="space-y-3">
        {filteredRoutes.map((route) => (
          <div
            key={route.id}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="bg-purple-600 text-white rounded-lg px-4 py-2 font-bold text-lg shrink-0">
                  {route.bus_number || 'N/A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 truncate">
                      {route.name}
                    </h3>
                    {getDirectionBadge(route.direction_type_id)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Destination:</span> {route.destination}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      Variant: {route.variant}
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      Code: {route.code}
                    </span>
                    {route.bus_carrier && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {route.bus_carrier}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Future: Open map view for this route
                    alert(`View route ${route.name} on map (Coming soon)`);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  View on Map
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRoutes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛣️</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            No routes found
          </h3>
          <p className="text-gray-600">
            Try adjusting your filters or search term
          </p>
        </div>
      )}
    </div>
  );
}

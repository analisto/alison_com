'use client';

import { useEffect, useState } from 'react';

interface Bus {
  id: number;
  carrier: string;
  number: string;
  route_length: number;
  duration_minuts: number;
  region_name?: string;
  zone_type_name?: string;
}

interface Stats {
  totalBuses: number;
  totalStops: number;
  totalRoutes: number;
  totalCoordinates: number;
}

export default function InsightsPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/buses').then(res => res.json()),
      fetch('/api/stats').then(res => res.json()),
    ])
      .then(([busesData, statsData]) => {
        setBuses(busesData);
        setStats(statsData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  // Calculate insights
  const carrierStats = buses.reduce((acc, bus) => {
    acc[bus.carrier] = (acc[bus.carrier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const regionStats = buses.reduce((acc, bus) => {
    if (bus.region_name) {
      acc[bus.region_name] = (acc[bus.region_name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const zoneStats = buses.reduce((acc, bus) => {
    if (bus.zone_type_name) {
      acc[bus.zone_type_name] = (acc[bus.zone_type_name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const avgRouteLength = buses.reduce((sum, bus) => sum + bus.route_length, 0) / buses.length;
  const avgDuration = buses.reduce((sum, bus) => sum + bus.duration_minuts, 0) / buses.length;
  const totalRouteLength = buses.reduce((sum, bus) => sum + bus.route_length, 0);

  const longestRoute = buses.reduce((max, bus) => bus.route_length > max.route_length ? bus : max, buses[0]);
  const shortestRoute = buses.reduce((min, bus) => bus.route_length < min.route_length ? bus : min, buses[0]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Live Insights</h1>
        <p className="text-purple-100 text-lg">
          Real-time analytics and statistics for Baku's bus network
        </p>
        <p className="text-purple-200 text-sm mt-2">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90 mb-2">Average Route Length</div>
          <div className="text-3xl font-bold">{avgRouteLength.toFixed(2)} km</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90 mb-2">Average Duration</div>
          <div className="text-3xl font-bold">{avgDuration.toFixed(0)} min</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90 mb-2">Total Network Length</div>
          <div className="text-3xl font-bold">{totalRouteLength.toFixed(0)} km</div>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90 mb-2">Data Points</div>
          <div className="text-3xl font-bold">{stats?.totalCoordinates.toLocaleString()}</div>
        </div>
      </div>

      {/* Route Extremes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🏆</span> Longest Route
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Bus Number:</span>
              <span className="font-bold text-blue-600 text-xl">{longestRoute?.number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Length:</span>
              <span className="font-semibold text-gray-800">{longestRoute?.route_length} km</span>
            </div>
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500 mb-1">Route</div>
              <div className="text-sm text-gray-700">
                {longestRoute?.carrier}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>⚡</span> Shortest Route
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Bus Number:</span>
              <span className="font-bold text-blue-600 text-xl">{shortestRoute?.number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Length:</span>
              <span className="font-semibold text-gray-800">{shortestRoute?.route_length} km</span>
            </div>
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500 mb-1">Route</div>
              <div className="text-sm text-gray-700">
                {shortestRoute?.carrier}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carrier Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Buses by Carrier</h2>
          <div className="space-y-3">
            {Object.entries(carrierStats)
              .sort(([, a], [, b]) => b - a)
              .map(([carrier, count]) => {
                const percentage = (count / buses.length) * 100;
                return (
                  <div key={carrier}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {carrier}
                      </span>
                      <span className="text-sm text-gray-600 font-semibold">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Region Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Buses by Region</h2>
          <div className="space-y-3">
            {Object.entries(regionStats)
              .sort(([, a], [, b]) => b - a)
              .map(([region, count]) => {
                const percentage = (count / buses.length) * 100;
                return (
                  <div key={region}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {region}
                      </span>
                      <span className="text-sm text-gray-600 font-semibold">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Zone Type Distribution */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Service Type Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(zoneStats)
            .sort(([, a], [, b]) => b - a)
            .map(([zone, count]) => {
              const percentage = (count / buses.length) * 100;
              return (
                <div
                  key={zone}
                  className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200"
                >
                  <div className="text-sm text-purple-700 font-medium mb-2 truncate">
                    {zone}
                  </div>
                  <div className="text-2xl font-bold text-purple-900 mb-1">
                    {count}
                  </div>
                  <div className="text-xs text-purple-600">
                    {percentage.toFixed(1)}% of total
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Network Overview */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl shadow-xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-6">Network Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{buses.length}</div>
            <div className="text-indigo-200">Total Buses</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{stats?.totalStops}</div>
            <div className="text-indigo-200">Bus Stops</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{stats?.totalRoutes}</div>
            <div className="text-indigo-200">Route Variants</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{Object.keys(carrierStats).length}</div>
            <div className="text-indigo-200">Carriers</div>
          </div>
        </div>
      </div>
    </div>
  );
}

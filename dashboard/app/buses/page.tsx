'use client';

import { useEffect, useState } from 'react';

interface Bus {
  id: number;
  carrier: string;
  number: string;
  first_point: string;
  last_point: string;
  route_length: number;
  tariff_str: string;
  duration_minuts: number;
  region_name?: string;
  zone_type_name?: string;
  payment_type_name?: string;
}

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [filteredBuses, setFilteredBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');

  useEffect(() => {
    fetch('/api/buses')
      .then((res) => res.json())
      .then((data) => {
        setBuses(data);
        setFilteredBuses(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching buses:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let filtered = buses;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((bus) =>
        bus.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bus.first_point.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bus.last_point.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Carrier filter
    if (carrierFilter !== 'all') {
      filtered = filtered.filter((bus) => bus.carrier === carrierFilter);
    }

    // Region filter
    if (regionFilter !== 'all') {
      filtered = filtered.filter((bus) => bus.region_name === regionFilter);
    }

    setFilteredBuses(filtered);
  }, [searchTerm, carrierFilter, regionFilter, buses]);

  const carriers = Array.from(new Set(buses.map((b) => b.carrier)));
  const regions = Array.from(new Set(buses.map((b) => b.region_name).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading buses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Bus Routes</h1>
        <p className="text-green-100 text-lg">
          Browse all {buses.length} bus routes in Baku
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Bus number, origin, or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Carrier Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Carrier
            </label>
            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Carriers</option>
              {carriers.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Region
            </label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Regions</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-600">
            Showing {filteredBuses.length} of {buses.length} buses
          </p>
          {(searchTerm || carrierFilter !== 'all' || regionFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCarrierFilter('all');
                setRegionFilter('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Bus List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBuses.map((bus) => (
          <div
            key={bus.id}
            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-600 text-white rounded-lg px-4 py-2 font-bold text-xl">
                {bus.number}
              </div>
              <div className="text-green-600 font-bold text-lg">
                {bus.tariff_str}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Route</div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-medium">📍</span>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {bus.first_point}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-6">
                  <span className="text-gray-400">↓</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-medium">📍</span>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {bus.last_point}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div>
                  <div className="text-xs text-gray-500">Length</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {bus.route_length} km
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Duration</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {bus.duration_minuts} min
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="text-xs text-gray-500 mb-1">Carrier</div>
                <div className="text-sm text-gray-700">{bus.carrier}</div>
              </div>

              {bus.zone_type_name && (
                <div className="pt-2">
                  <span className="inline-block bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full">
                    {bus.zone_type_name}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredBuses.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚌</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            No buses found
          </h3>
          <p className="text-gray-600">
            Try adjusting your filters or search term
          </p>
        </div>
      )}
    </div>
  );
}

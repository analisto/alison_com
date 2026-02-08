'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching stats:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Buses',
      value: stats?.totalBuses || 0,
      icon: '🚌',
      color: 'from-blue-500 to-blue-600',
      link: '/buses',
    },
    {
      title: 'Bus Stops',
      value: stats?.totalStops || 0,
      icon: '📍',
      color: 'from-green-500 to-green-600',
      link: '/map',
    },
    {
      title: 'Routes',
      value: stats?.totalRoutes || 0,
      icon: '🛣️',
      color: 'from-purple-500 to-purple-600',
      link: '/routes',
    },
    {
      title: 'Route Points',
      value: stats?.totalCoordinates || 0,
      icon: '📌',
      color: 'from-orange-500 to-orange-600',
      link: '/map',
    },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Welcome to Baku Bus Dashboard</h1>
        <p className="text-blue-100 text-lg">
          Real-time insights into Baku&#39;s public transportation network
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Link
            key={index}
            href={card.link}
            className="group"
          >
            <div className={`
              bg-gradient-to-br ${card.color}
              rounded-xl p-6 text-white shadow-lg
              transform transition-all duration-300
              hover:scale-105 hover:shadow-2xl
              cursor-pointer
            `}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
                <div className="bg-white/20 rounded-full p-2">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">
                {card.value.toLocaleString()}
              </div>
              <div className="text-white/90 font-medium">
                {card.title}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/map"
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="text-4xl">🗺️</div>
            <div>
              <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">
                View Network Map
              </h3>
              <p className="text-sm text-gray-600">Explore all routes and stops</p>
            </div>
          </Link>

          <Link
            href="/buses"
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <div className="text-4xl">🚌</div>
            <div>
              <h3 className="font-semibold text-gray-800 group-hover:text-green-600">
                Browse Buses
              </h3>
              <p className="text-sm text-gray-600">View all bus routes</p>
            </div>
          </Link>

          <Link
            href="/insights"
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all group"
          >
            <div className="text-4xl">📈</div>
            <div>
              <h3 className="font-semibold text-gray-800 group-hover:text-purple-600">
                Live Insights
              </h3>
              <p className="text-sm text-gray-600">Real-time analytics</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
          <h3 className="text-2xl font-bold mb-4">About This Dashboard</h3>
          <p className="text-indigo-100 mb-4">
            This dashboard provides comprehensive insights into Baku&#39;s public transportation
            network, featuring 206 bus routes across the city.
          </p>
          <ul className="space-y-2 text-indigo-100">
            <li className="flex items-center gap-2">
              <span>✓</span>
              <span>Real-time data updates every 3 hours</span>
            </li>
            <li className="flex items-center gap-2">
              <span>✓</span>
              <span>Interactive map visualization</span>
            </li>
            <li className="flex items-center gap-2">
              <span>✓</span>
              <span>Comprehensive route information</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-8 text-white shadow-lg">
          <h3 className="text-2xl font-bold mb-4">Coverage Area</h3>
          <div className="space-y-4">
            <div>
              <div className="text-teal-100 mb-1">Regions</div>
              <div className="text-3xl font-bold">Bakı & Sumqayıt</div>
            </div>
            <div>
              <div className="text-teal-100 mb-1">Service Types</div>
              <div className="space-y-1">
                <div className="bg-white/20 rounded-lg px-3 py-1 inline-block mr-2 mb-2">
                  Urban
                </div>
                <div className="bg-white/20 rounded-lg px-3 py-1 inline-block mr-2 mb-2">
                  Suburban
                </div>
                <div className="bg-white/20 rounded-lg px-3 py-1 inline-block mr-2 mb-2">
                  Express
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

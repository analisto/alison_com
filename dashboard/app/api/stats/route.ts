import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { DashboardStats } from '@/lib/types';

export async function GET() {
  try {
    const stats = await query<{
      total_buses: string;
      total_stops: string;
      total_routes: string;
      total_coordinates: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM ayna.buses) as total_buses,
        (SELECT COUNT(*) FROM ayna.stops) as total_stops,
        (SELECT COUNT(*) FROM ayna.routes) as total_routes,
        (SELECT COUNT(*) FROM ayna.route_coordinates) as total_coordinates
    `);

    const dashboardStats: DashboardStats = {
      totalBuses: parseInt(stats[0].total_buses) || 0,
      totalStops: parseInt(stats[0].total_stops) || 0,
      totalRoutes: parseInt(stats[0].total_routes) || 0,
      totalCoordinates: parseInt(stats[0].total_coordinates) || 0,
    };

    return NextResponse.json(dashboardStats);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

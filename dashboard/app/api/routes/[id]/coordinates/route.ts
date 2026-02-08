import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { RouteCoordinate } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const routeId = parseInt(params.id);

    if (isNaN(routeId)) {
      return NextResponse.json(
        { error: 'Invalid route ID' },
        { status: 400 }
      );
    }

    const coordinates = await query<RouteCoordinate>(`
      SELECT
        id,
        route_id,
        latitude,
        longitude,
        sequence_order
      FROM ayna.route_coordinates
      WHERE route_id = $1
      ORDER BY sequence_order
    `, [routeId]);

    return NextResponse.json(coordinates);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch route coordinates' },
      { status: 500 }
    );
  }
}

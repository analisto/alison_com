import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { StopDetail } from '@/lib/types';

export async function GET() {
  try {
    const stops = await query<StopDetail>(`
      SELECT
        id,
        code,
        name,
        name_monitor,
        utm_coord_x,
        utm_coord_y,
        longitude,
        latitude,
        is_transport_hub
      FROM ayna.stop_details
      ORDER BY name
    `);

    return NextResponse.json(stops);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stops' },
      { status: 500 }
    );
  }
}

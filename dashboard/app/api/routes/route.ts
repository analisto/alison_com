import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Route } from '@/lib/types';

export async function GET() {
  try {
    const routes = await query<Route>(`
      SELECT
        r.id,
        r.code,
        r.customer_name,
        r.type,
        r.name,
        r.destination,
        r.variant,
        r.operator,
        r.bus_id,
        r.direction_type_id,
        b.number as bus_number,
        b.carrier as bus_carrier
      FROM ayna.routes r
      LEFT JOIN ayna.buses b ON r.bus_id = b.id
      ORDER BY b.number, r.direction_type_id
    `);

    return NextResponse.json(routes);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Bus } from '@/lib/types';

export async function GET() {
  try {
    const buses = await query<Bus>(`
      SELECT
        b.id,
        b.carrier,
        b.number,
        b.first_point,
        b.last_point,
        b.route_length,
        b.payment_type_id,
        b.card_payment_date,
        b.tariff,
        b.tariff_str,
        b.region_id,
        b.working_zone_type_id,
        b.duration_minuts,
        r.name as region_name,
        wzt.name as zone_type_name,
        pt.name as payment_type_name
      FROM ayna.buses b
      LEFT JOIN ayna.regions r ON b.region_id = r.id
      LEFT JOIN ayna.working_zone_types wzt ON b.working_zone_type_id = wzt.id
      LEFT JOIN ayna.payment_types pt ON b.payment_type_id = pt.id
      ORDER BY CAST(NULLIF(REGEXP_REPLACE(b.number, '[^0-9]', '', 'g'), '') AS INTEGER) NULLS LAST, b.number
    `);

    return NextResponse.json(buses);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch buses' },
      { status: 500 }
    );
  }
}

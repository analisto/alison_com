import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM quotes.quotes ORDER BY category'
    );
    
    const categories: string[] = result.rows.map(row => row.category);
    
    return NextResponse.json({
      categories
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
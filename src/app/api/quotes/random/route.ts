import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { Quote } from '@/types/quote';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT "quote", author, category FROM quotes.quotes ORDER BY RANDOM() LIMIT 1'
    );
    
    const quote: Quote | null = result.rows[0] || null;
    
    if (!quote) {
      return NextResponse.json(
        { error: 'No quotes found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(quote);
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch random quote' },
      { status: 500 }
    );
  }
}
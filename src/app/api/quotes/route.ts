import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { Quote } from '@/types/quote';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const random = searchParams.get('random');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Cap at 50
    
    let query = 'SELECT "quote", author, category FROM quotes.quotes WHERE "quote" IS NOT NULL AND author IS NOT NULL';
    let params: any[] = [];
    
    if (category) {
      query += ' AND author = $1';
      params.push(category);
    }
    
    if (random === 'true') {
      query += ' ORDER BY RANDOM()';
    } else {
      query += ' ORDER BY RANDOM()'; // Always randomize for variety
    }
    
    query += ` LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    const quotes: Quote[] = result.rows;
    
    return NextResponse.json({
      quotes,
      total: quotes.length
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
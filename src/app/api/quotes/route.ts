import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { Quote } from '@/types/quote';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const random = searchParams.get('random');
    const limit = searchParams.get('limit') || '10';
    
    let query = 'SELECT "quote", author, category FROM quotes.quotes';
    let params: any[] = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    if (random === 'true') {
      query += ' ORDER BY RANDOM()';
    }
    
    query += ` LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
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
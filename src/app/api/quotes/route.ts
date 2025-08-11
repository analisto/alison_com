import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { Quote } from '@/types/quote';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const random = searchParams.get('random');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Cap at 50
    
    let query = 'SELECT "quote", author, category FROM quotes.quotes WHERE "quote" IS NOT NULL AND author IS NOT NULL';
    let params: any[] = [];
    
    if (search && search.trim()) {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      query += ` AND (LOWER("quote") LIKE $${params.length + 1} OR LOWER(author) LIKE $${params.length + 1} OR LOWER(category) LIKE $${params.length + 1})`;
      params.push(searchPattern);
    }
    
    if (category) {
      query += ` AND author = $${params.length + 1}`;
      params.push(category);
    }
    
    if (random === 'true') {
      query += ' ORDER BY RANDOM()';
    } else if (search && search.trim()) {
      // When searching, order by relevance (quote matches first, then random)
      query += ' ORDER BY CASE WHEN LOWER("quote") LIKE $1 THEN 1 WHEN LOWER(author) LIKE $1 THEN 2 ELSE 3 END, RANDOM()';
    } else {
      query += ' ORDER BY RANDOM()';
    }
    
    query += ` LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    const quotes: Quote[] = result.rows;
    
    return NextResponse.json({
      quotes,
      total: quotes.length,
      searchTerm: search || null
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get popular authors to use as "categories" since the category field contains author names
    const result = await pool.query(
      `SELECT author, COUNT(*) as quote_count 
       FROM quotes.quotes 
       WHERE author IS NOT NULL 
       AND author != '' 
       AND LENGTH(author) BETWEEN 3 AND 50
       GROUP BY author 
       HAVING COUNT(*) >= 2
       ORDER BY quote_count DESC, author ASC
       LIMIT 12`
    );
    
    let categories: string[] = result.rows
      .map(row => row.author.trim())
      .filter(author => {
        const words = author.split(' ');
        return words.length <= 4 && words.every((word: string) => word.length > 1) && 
               !author.includes('(') && !author.includes(')') && 
               !author.includes('"') && !author.includes('.');
      });

    // Fallback to topic-based categories if we don't get good authors
    if (categories.length < 5) {
      categories = [
        'Albert Einstein', 'Gandhi', 'Winston Churchill', 'Mark Twain', 
        'Maya Angelou', 'Steve Jobs', 'Abraham Lincoln', 'Buddha',
        'Nelson Mandela', 'Oscar Wilde', 'Martin Luther King Jr', 'Confucius'
      ];
    }
    
    return NextResponse.json({
      categories: categories.slice(0, 10)
    });
    
  } catch (error) {
    console.error('Database error:', error);
    // Return fallback famous authors as categories
    return NextResponse.json({
      categories: ['Albert Einstein', 'Gandhi', 'Mark Twain', 'Maya Angelou', 'Steve Jobs', 'Buddha']
    });
  }
}
'use client';

import { useState, useEffect } from 'react';
import QuoteCard from '@/components/QuoteCard';
import CategoryFilter from '@/components/CategoryFilter';
import SearchBar from '@/components/SearchBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Quote } from '@/types/quote';

export default function Home() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [randomLoading, setRandomLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchQuotes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchQuotes(searchQuery);
  }, [selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchQuotes = async (searchTerm?: string) => {
    setLoading(true);
    try {
      let url = '/api/quotes?limit=20';
      if (selectedCategory) {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      if (searchTerm && searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setQuotes(data.quotes);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      alert('Failed to fetch quotes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRandomQuote = async () => {
    setRandomLoading(true);
    try {
      const response = await fetch('/api/quotes/random');
      if (!response.ok) throw new Error('Failed to fetch');
      const quote = await response.json();
      setQuotes([quote]);
      setSelectedCategory(null);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to fetch random quote:', error);
      alert('Failed to fetch random quote. Please try again.');
    } finally {
      setRandomLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshLoading(true);
    try {
      setSelectedCategory(null);
      setSearchQuery('');
      await fetchQuotes('');
    } catch (error) {
      console.error('Failed to refresh quotes:', error);
      alert('Failed to refresh quotes. Please try again.');
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    fetchQuotes(query);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Inspirational Quotes
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8">
            Discover wisdom from great minds throughout history
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={fetchRandomQuote}
              disabled={randomLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-400 disabled:to-blue-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none"
            >
              {randomLoading ? '🔄 Loading...' : '🎲 Random Quote'}
            </button>
            <button
              onClick={handleRefreshAll}
              disabled={refreshLoading}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-green-400 disabled:to-teal-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none"
            >
              {refreshLoading ? '🔄 Loading...' : '🔄 Refresh All'}
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto">
          <SearchBar onSearch={handleSearch} />
          
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-6">
              {quotes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-600 dark:text-gray-400">
                    No quotes found. Try adjusting your search or filter.
                  </p>
                </div>
              ) : (
                quotes.map((quote, index) => (
                  <QuoteCard key={index} quote={quote} />
                ))
              )}
            </div>
          )}
        </div>

        <footer className="text-center mt-16 py-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            © 2024 Quotes App. Inspiring minds, one quote at a time.
          </p>
        </footer>
      </div>
    </div>
  );
}
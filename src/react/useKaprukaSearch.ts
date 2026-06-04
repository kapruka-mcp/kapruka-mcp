// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { useState, useEffect, useCallback, useRef } from 'react';
import { useKaprukaContext } from './context.js';
import type { Product } from '../sdk/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseKaprukaSearchOptions {
  category?: string;
  debounceMs?: number;
  limit?: number;
}

export interface UseKaprukaSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: Product[];
  total: number;
  isLoading: boolean;
  error: string | null;
  category: string | null;
  setCategory: (c: string | null) => void;
  search: (q: string) => void;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useKaprukaSearch(
  options: UseKaprukaSearchOptions = {}
): UseKaprukaSearchResult {
  const { client } = useKaprukaContext();
  const debounceMs = options.debounceMs ?? 300;
  const limit = options.limit ?? 20;

  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategoryState] = useState<string | null>(options.category ?? null);

  const queryRef = useRef(query);
  const categoryRef = useRef(category);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(0);
  const resultsLenRef = useRef(0);

  queryRef.current = query;
  categoryRef.current = category;
  resultsLenRef.current = results.length;

  // Core search function
  const doSearch = useCallback(
    async (q: string, cat: string | null, append: boolean = false) => {
      if (!q.trim()) {
        setResults([]);
        setTotal(0);
        return;
      }

      const searchId = ++abortRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const res = await client.searchProducts(q, {
          category: cat ?? undefined,
          limit: append ? limit * (Math.floor(resultsLenRef.current / limit) + 1) : limit,
        });

        if (searchId !== abortRef.current) return;

        if (append) {
          // Deduplicate by product ID
          const existingIds = new Set(results.map(p => p.id));
          const newProducts = res.products.filter(p => !existingIds.has(p.id));
          setResults(prev => [...prev, ...newProducts]);
        } else {
          setResults(res.products);
        }
        setTotal(res.total);
      } catch (err) {
        if (searchId !== abortRef.current) return;
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        if (searchId === abortRef.current) {
          setIsLoading(false);
        }
      }
    },
    [client, limit]
  );

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      doSearch(query, categoryRef.current);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debounceMs, doSearch]);

  // Refetch when category changes
  useEffect(() => {
    if (queryRef.current.trim()) {
      doSearch(queryRef.current, category);
    }
  }, [category, doSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current++;
    };
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
  }, []);

  const setCategory = useCallback((c: string | null) => {
    setCategoryState(c);
  }, []);

  const search = useCallback(
    (q: string) => {
      setQueryState(q);
      doSearch(q, categoryRef.current);
    },
    [doSearch]
  );

  const loadMore = useCallback(async () => {
    if (!queryRef.current.trim() || isLoading) return;
    await doSearch(queryRef.current, categoryRef.current, true);
  }, [doSearch, isLoading]);

  const hasMore = results.length < total;

  return {
    query,
    setQuery,
    results,
    total,
    isLoading,
    error,
    category,
    setCategory,
    search,
    loadMore,
    hasMore,
  };
}

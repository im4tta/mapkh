import { useState, useEffect, useCallback } from 'react';
import { getTips } from '@/app/actions';
import { Tip } from '@/lib/types';

interface TipsCacheState {
  tips: Tip[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'tips_cache';

export function useTipsCache() {
  const [state, setState] = useState<TipsCacheState>({
    tips: [],
    isLoading: true,
    error: null,
    lastFetched: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const loadFromCache = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { tips, lastFetched } = JSON.parse(cached);
          const now = Date.now();
          
          // Check if cache is still valid
          if (lastFetched && (now - lastFetched) < CACHE_DURATION) {
            setState(prev => ({
              ...prev,
              tips,
              lastFetched,
              isLoading: false,
            }));
            return true; // Cache hit
          }
        }
      } catch (error) {
        console.warn('Failed to load tips from cache:', error);
        localStorage.removeItem(CACHE_KEY);
      }
      return false; // Cache miss
    };

    const cacheHit = loadFromCache();
    if (!cacheHit) {
      fetchTips();
    }
  }, []);

  const fetchTips = useCallback(async (forceRefresh = false) => {
    // If not forcing refresh and we have recent data, don't fetch
    if (!forceRefresh && state.lastFetched && 
        (Date.now() - state.lastFetched) < CACHE_DURATION) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await getTips();
      
      if (result.success && result.data) {
        const now = Date.now();
        const newState = {
          tips: result.data,
          lastFetched: now,
          isLoading: false,
          error: null,
        };

        setState(newState);

        // Save to localStorage
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            tips: result.data,
            lastFetched: now,
          }));
        } catch (error) {
          console.warn('Failed to cache tips:', error);
        }
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to load tips',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }));
    }
  }, [state.lastFetched]);

  const invalidateCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setState(prev => ({ ...prev, lastFetched: null }));
    fetchTips(true);
  }, [fetchTips]);

  return {
    tips: state.tips,
    isLoading: state.isLoading,
    error: state.error,
    fetchTips,
    invalidateCache,
    isStale: state.lastFetched ? (Date.now() - state.lastFetched) > CACHE_DURATION : true,
  };
}
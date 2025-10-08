import { useState, useEffect, useCallback, useMemo } from 'react';
import { getReports, getAllReports } from '@/app/actions';
import { Report } from '@/lib/types';

interface RecordsCacheState {
  allRecords: Report[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  totalCount: number;
}

interface FilterOptions {
  violationTerm?: string;
  status?: string;
  priority?: string;
  subViolationType?: string;
  province?: string;
  search?: string;
}

interface SortingOptions {
  id: string;
  desc: boolean;
}

interface PaginationOptions {
  pageIndex: number;
  pageSize: number;
}

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for faster updates
const CACHE_KEY = 'records_cache';
const BACKGROUND_REFRESH_INTERVAL = 30 * 1000; // 30 seconds background refresh

export function useRecordsCache() {
  const [state, setState] = useState<RecordsCacheState>({
    allRecords: [],
    isLoading: true,
    error: null,
    lastFetched: null,
    totalCount: 0,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const loadFromCache = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { allRecords, lastFetched, totalCount } = JSON.parse(cached);
          const now = Date.now();
          
          // Check if cache is still valid
          if (lastFetched && (now - lastFetched) < CACHE_DURATION) {
            setState(prev => ({
              ...prev,
              allRecords,
              lastFetched,
              totalCount,
              isLoading: false,
            }));
            return true; // Cache hit
          }
        }
      } catch (error) {
        console.warn('Failed to load records from cache:', error);
        localStorage.removeItem(CACHE_KEY);
      }
      return false; // Cache miss
    };

    const cacheHit = loadFromCache();
    if (!cacheHit) {
      fetchAllRecords();
    }
  }, []);

  // Background refresh effect
  useEffect(() => {
    if (!state.lastFetched) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - state.lastFetched! > BACKGROUND_REFRESH_INTERVAL) {
        fetchAllRecords(true); // Silent background refresh
      }
    }, BACKGROUND_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [state.lastFetched]);

  const fetchAllRecords = useCallback(async (silent = false) => {
    if (!silent) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const result = await getAllReports();
      
      if (result.success && result.data) {
        const now = Date.now();
        const newState = {
          allRecords: result.data,
          lastFetched: now,
          isLoading: false,
          error: null,
          totalCount: result.data.length,
        };

        setState(newState);

        // Save to localStorage
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            allRecords: result.data,
            lastFetched: now,
            totalCount: result.data.length,
          }));
        } catch (error) {
          console.warn('Failed to cache records:', error);
        }
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to load records',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }));
    }
  }, []);

  // Client-side filtering and search function
  const filterRecords = useCallback((
    records: Report[],
    filters: FilterOptions = {},
    sorting?: SortingOptions
  ): Report[] => {
    let filtered = [...records];

    // Apply filters
    if (filters.violationTerm && filters.violationTerm !== 'all') {
      filtered = filtered.filter(record => 
        record.violationTerm === filters.violationTerm
      );
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(record => 
        record.status === filters.status
      );
    }

    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(record => 
        record.priority === filters.priority
      );
    }

    if (filters.subViolationType && filters.subViolationType !== 'all') {
      filtered = filtered.filter(record => 
        record.subViolationType?.includes(filters.subViolationType!)
      );
    }

    if (filters.province && filters.province !== 'all') {
      filtered = filtered.filter(record => 
        record.province === filters.province
      );
    }

    // Apply search filter
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(record => {
        const searchableFields = [
          record.reportNumber?.toString(),
          record.placeId,
          record.englishLanguage,
          record.nativeKhmerLanguage,
          record.description,
          record.province,
          record.violationTerm,
          record.status,
          record.priority,
        ].filter(Boolean);

        return searchableFields.some(field => 
          field?.toString().toLowerCase().includes(searchTerm)
        );
      });
    }

    // Apply sorting
    if (sorting) {
      filtered.sort((a, b) => {
        const aValue = (a as any)[sorting.id];
        const bValue = (b as any)[sorting.id];

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sorting.desc ? 1 : -1;
        if (bValue == null) return sorting.desc ? -1 : 1;

        // Handle different data types
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sorting.desc ? -comparison : comparison;
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          const comparison = aValue - bValue;
          return sorting.desc ? -comparison : comparison;
        }

        // Handle dates
        if (aValue instanceof Date && bValue instanceof Date) {
          const comparison = aValue.getTime() - bValue.getTime();
          return sorting.desc ? -comparison : comparison;
        }

        // Default string comparison
        const comparison = String(aValue).localeCompare(String(bValue));
        return sorting.desc ? -comparison : comparison;
      });
    }

    return filtered;
  }, []);

  // Get paginated and filtered results
  const getFilteredRecords = useCallback((
    filters: FilterOptions = {},
    sorting?: SortingOptions,
    pagination?: PaginationOptions
  ) => {
    const filtered = filterRecords(state.allRecords, filters, sorting);
    
    if (pagination) {
      const start = pagination.pageIndex * pagination.pageSize;
      const end = start + pagination.pageSize;
      return {
        data: filtered.slice(start, end),
        totalCount: filtered.length,
        pageCount: Math.ceil(filtered.length / pagination.pageSize),
      };
    }

    return {
      data: filtered,
      totalCount: filtered.length,
      pageCount: 1,
    };
  }, [state.allRecords, filterRecords]);

  const invalidateCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setState(prev => ({ ...prev, lastFetched: null }));
    fetchAllRecords();
  }, [fetchAllRecords]);

  const isStale = useMemo(() => {
    return state.lastFetched ? (Date.now() - state.lastFetched) > CACHE_DURATION : true;
  }, [state.lastFetched]);

  return {
    allRecords: state.allRecords,
    isLoading: state.isLoading,
    error: state.error,
    totalCount: state.totalCount,
    getFilteredRecords,
    fetchAllRecords,
    invalidateCache,
    isStale,
    isCacheReady: !state.isLoading && state.allRecords.length > 0,
  };
}
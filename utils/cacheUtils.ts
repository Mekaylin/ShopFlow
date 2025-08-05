/**
 * Unified caching and data fetching utilities for ShopFlow
 * Consolidates repetitive patterns from cloud.js
 */

import { supabase } from '../lib/supabase';

// Types
interface FetchOptions {
  limit?: number;
  cursor?: string | null;
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, any>;
}

// Global cache and fetch management
const cache = new Map<string, any>();
const fetchFlags = new Set<string>();

// Unified retry function
async function retryFetch<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Retry failed');
}

// Unified debounced fetch function
const debouncedFetch = <T>(key: string, fetchFn: () => Promise<T>, delay = 1000): Promise<T> => {
  if (fetchFlags.has(key)) {
    return new Promise(resolve => {
      setTimeout(() => resolve(debouncedFetch(key, fetchFn, delay)), 100);
    });
  }

  fetchFlags.add(key);
  
  return fetchFn().then((result: T) => {
    cache.set(key, result);
    fetchFlags.delete(key);
    
    // Auto-expire cache after 5 minutes
    setTimeout(() => cache.delete(key), 5 * 60 * 1000);
    
    return result;
  }).catch((error: any) => {
    fetchFlags.delete(key);
    throw error;
  });
};

// Generic cached fetcher factory
export const createCachedFetcher = (tableName: string, selectFields = '*') => {
  return async (businessId: string, options: FetchOptions = {}): Promise<any[]> => {
    const { limit = 20, cursor = null, orderBy = 'created_at', ascending = false, filters = {} } = options;
    const cacheKey = `${tableName}_${businessId}_${cursor || 'start'}_${limit}_${JSON.stringify(filters)}`;
    
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    
    return debouncedFetch(cacheKey, async () => {
      return retryFetch(async () => {
        let query = supabase
          .from(tableName)
          .select(selectFields)
          .eq('business_id', businessId)
          .order(orderBy, { ascending })
          .limit(limit);
        
        // Apply cursor pagination
        if (cursor) {
          query = query.gt('id', cursor);
        }
        
        // Apply additional filters
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      });
    });
  };
};

// Generic single record fetcher
export const createSingleFetcher = (tableName: string, selectFields = '*') => {
  return async (id: string, businessId: string | null = null): Promise<any | null> => {
    const cacheKey = businessId ? `${tableName}_single_${id}_${businessId}` : `${tableName}_single_${id}`;
    
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    
    return debouncedFetch(cacheKey, async () => {
      return retryFetch(async () => {
        let query = supabase
          .from(tableName)
          .select(selectFields)
          .eq('id', id);
        
        if (businessId) {
          query = query.eq('business_id', businessId);
        }
        
        const { data, error } = await query.single();
        if (error) {
          console.warn(`${tableName} fetch error:`, error);
          return null;
        }
        return data;
      });
    });
  };
};

// Cache management utilities
export const clearCache = (): void => {
  cache.clear();
  fetchFlags.clear();
};

export const invalidateCache = (prefix = ''): void => {
  if (prefix) {
    const keys = Array.from(cache.keys());
    keys.forEach(key => {
      if (key.startsWith(prefix)) cache.delete(key);
    });
  } else {
    cache.clear();
  }
};

// Unified timestamp utility
export const getCurrentTimestamp = (): string => new Date().toISOString();

// Error handling utility
export const handleError = (operation: string, error: any): { error: string } => {
  console.error(`Error in ${operation}:`, error);
  return { error: error.message || 'Unknown error occurred' };
};

// Validation utilities
export const validateRequired = (...fields: any[]): void => {
  const missing = fields.filter(field => !field);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

export const validateBusinessId = (businessId: any): void => {
  if (!businessId) {
    throw new Error('Business ID is required');
  }
};

// Export the retry function for external use
export { retryFetch };

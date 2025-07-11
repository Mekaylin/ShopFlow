// services/cloud.js
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Cross-platform session storage
export const getSession = async (key) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};
export const setSession = async (key, value) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

// Cache for preventing repeated API calls
const cache = new Map();
const fetchFlags = new Set();

// Debounced fetch function to prevent rate limits
const debouncedFetch = (key, fetchFn, delay = 1000) => {
  if (fetchFlags.has(key)) return Promise.resolve(null);
  
  fetchFlags.add(key);
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const result = await fetchFn();
        cache.set(key, result);
        resolve(result);
      } catch (error) {
        console.error(`Error in debounced fetch for ${key}:`, error);
        resolve(null);
      } finally {
        fetchFlags.delete(key);
      }
    }, delay);
  });
};

// Helper: Retry logic with exponential backoff
async function retryFetch(fn, retries = 3, delay = 500) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

// Progressive loading functions
export const fetchUserData = async (userId) => {
  const cacheKey = `user_${userId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  
  return debouncedFetch(cacheKey, async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.warn('User fetch error:', error);
      return null;
    }
    return data;
  });
};

export const fetchBusinessData = async (businessId) => {
  const cacheKey = `business_${businessId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  
  return debouncedFetch(cacheKey, async () => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    
    if (error) {
      console.warn('Business fetch error:', error);
      return null;
    }
    return data;
  });
};

// Cursor-based pagination for employees
export const fetchEmployees = async (businessId, { limit = 20, cursor = null } = {}) => {
  const cacheKey = `employees_${businessId}_${cursor || 'start'}_${limit}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  return debouncedFetch(cacheKey, async () => {
    return retryFetch(async () => {
      let query = supabase
        .from('employees')
        .select('id, name, code, lunchStart, lunchEnd, photoUri, department')
        .eq('business_id', businessId)
        .order('name', { ascending: true })
        .limit(limit);
      if (cursor) query = query.gt('id', cursor);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    });
  });
};

// Cursor-based pagination for tasks
export const fetchTasks = async (businessId, { limit = 20, cursor = null } = {}) => {
  const cacheKey = `tasks_${businessId}_${cursor || 'start'}_${limit}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  return debouncedFetch(cacheKey, async () => {
    return retryFetch(async () => {
      let query = supabase
        .from('tasks')
        .select('id, name, start, deadline, completed, assignedTo, completedAt, materialsUsed')
        .eq('business_id', businessId)
        .order('start', { ascending: false })
        .limit(limit);
      if (cursor) query = query.gt('id', cursor);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    });
  });
};

// Fetch employee task summary view
export const fetchEmployeeTaskSummary = async (businessId) => {
  const cacheKey = `employee_task_summary_${businessId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  return debouncedFetch(cacheKey, async () => {
    return retryFetch(async () => {
      const { data, error } = await supabase
        .from('employee_task_summary')
        .select('employee_id, employee_name, business_id, total_tasks, completed_tasks, average_rating')
        .eq('business_id', businessId);
      if (error) throw error;
      return data || [];
    });
  });
};

export const fetchMaterials = async (businessId) => {
  const cacheKey = `materials_${businessId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  
  return debouncedFetch(cacheKey, async () => {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('business_id', businessId);
    
    if (error) {
      console.warn('Materials fetch error:', error);
      return [];
    }
    return data || [];
  });
};

export const fetchPerformanceSettings = async (businessId) => {
  const cacheKey = `performance_${businessId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  
  return debouncedFetch(cacheKey, async () => {
    const { data, error } = await supabase
      .from('performance_settings')
      .select('*')
      .eq('business_id', businessId)
      .single();
    
    if (error) {
      console.warn('Performance settings fetch error:', error);
      return {
        ratingSystemEnabled: false,
        autoRateCompletedTasks: false,
        defaultRating: 3,
      };
    }
    return {
      ratingSystemEnabled: data?.rating_system_enabled ?? false,
      autoRateCompletedTasks: data?.auto_rate_completed_tasks ?? false,
      defaultRating: data?.default_rating ?? 3,
    };
  });
};

export const fetchClockEvents = async (businessId, employeeId = null) => {
  const cacheKey = `clock_${businessId}_${employeeId || 'all'}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  
  return debouncedFetch(cacheKey, async () => {
    let query = supabase
      .from('clock_events')
      .select('*')
      .eq('business_id', businessId)
      .order('clock_in', { ascending: false });
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.warn('Clock events fetch error:', error);
      return [];
    }
    return data || [];
  });
};

// Clear cache when needed (e.g., after logout)
export const clearCache = () => {
  cache.clear();
  fetchFlags.clear();
};

// Local cache invalidation
export const invalidateCache = (prefix = '') => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};

// Lookup business by code for employee login
export async function getBusinessByCode(code) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('code', code)
    .single();
  if (error || !data) return null;
  return data;
}

// Get business code by business_id
export async function getBusinessCode(business_id) {
  const { data, error } = await supabase
    .from('businesses')
    .select('code')
    .eq('id', business_id)
    .single();
  if (error || !data) return null;
  return data.code;
}

// Update business code by business_id
export async function updateBusinessCode(business_id, code) {
  const { data, error } = await supabase
    .from('businesses')
    .update({ code })
    .eq('id', business_id)
    .select('code')
    .single();
  if (error || !data) throw new Error(error.message);
  return data.code;
}

// Generate a random business code (6 uppercase alphanumeric)
export function generateBusinessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Fetch employee code by employee_id
export async function getEmployeeCode(employee_id) {
  const { data, error } = await supabase
    .from('employees')
    .select('code')
    .eq('id', employee_id)
    .single();
  if (error || !data) return null;
  return data.code;
}

// Batch insert/update utility
export const batchUpsert = async (table, rows) => {
  return retryFetch(async () => {
    const { data, error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: 'id' });
    if (error) throw error;
    return data;
  });
};

export { SecureStore, supabase };

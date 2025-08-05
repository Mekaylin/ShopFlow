// components/utility/utils.ts
// Utility functions for ShopFlow admin components
import { Alert } from 'react-native';
import { ClockEvent, Employee, Material, PerformanceMetrics, Task } from './types';

// Date and time utilities
// Date utilities - imported from centralized utils
import {
    formatDate as _formatDate,
    formatDateTime as _formatDateTime,
    formatTime as _formatTime,
    getDaysUntilDeadline as _getDaysUntilDeadline,
    getTimeDifference as _getTimeDifference,
    isOverdue as _isOverdue
} from '../../utils/dateUtils';

// Re-export centralized date functions
export const formatDate = _formatDate;
export const formatDateTime = _formatDateTime;
export const formatTime = _formatTime;
export const getTimeDifference = _getTimeDifference;
export const isOverdue = _isOverdue;
export const getDaysUntilDeadline = _getDaysUntilDeadline;

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

export const generateCode = (length: number = 6): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

export const validateRequired = (value: any): boolean => {
  return value !== null && value !== undefined && value.toString().trim() !== '';
};

export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

// Array utilities
export const arrayUtils = {
  groupBy: <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },
  sortBy: <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },
  filterBy: <T>(array: T[], predicate: (item: T) => boolean): T[] => array.filter(predicate),
  uniqueBy: <T>(array: T[], key: keyof T): T[] => {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  },
};

// Validation utilities
export const validationUtils = {
  validateRequired: (value: any): boolean => value !== null && value !== undefined && value.toString().trim() !== '',
  validateTaskForm: (data: { name: string; start: string; deadline: string; assignedTo: string; }): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!validationUtils.validateRequired(data.name)) errors.push('Task name is required');
    if (!validationUtils.validateRequired(data.start)) errors.push('Start date is required');
    if (!validationUtils.validateRequired(data.deadline)) errors.push('Deadline is required');
    if (data.start && data.deadline) {
      const startDate = new Date(data.start);
      const deadlineDate = new Date(data.deadline);
      if (startDate >= deadlineDate) errors.push('Deadline must be after start date');
    }
    if (!validationUtils.validateRequired(data.assignedTo)) errors.push('Employee assignment is required');
    return { isValid: errors.length === 0, errors };
  },
};

// Task utilities
export const getTaskStatus = (task: Task): 'completed' | 'pending' | 'late' => {
  if (task.completed) return 'completed';
  if (isOverdue(task.deadline)) return 'late';
  return 'pending';
};

export const getTaskProgress = (task: Task): number => {
  if (task.completed) return 100;
  
  const start = new Date(task.start);
  const deadline = new Date(task.deadline);
  const now = new Date();
  
  const totalTime = deadline.getTime() - start.getTime();
  const elapsedTime = now.getTime() - start.getTime();
  
  if (elapsedTime <= 0) return 0;
  if (elapsedTime >= totalTime) return 100;
  
  return Math.round((elapsedTime / totalTime) * 100);
};

/**
 * Returns all tasks assigned to a given employee by their ID.
 */
export const getTasksByEmployee = (tasks: Task[], employeeId: string): Task[] => {
  return tasks.filter(task => task.assigned_to === employeeId);
};

export const getCompletedTasks = (tasks: Task[]): Task[] => {
  return tasks.filter(task => task.completed);
};

export const getPendingTasks = (tasks: Task[]): Task[] => {
  return tasks.filter(task => !task.completed && !isOverdue(task.deadline));
};

export const getLateTasks = (tasks: Task[]): Task[] => {
  return tasks.filter(task => !task.completed && isOverdue(task.deadline));
};

// Employee utilities
/**
 * Returns stats for an employee by their ID.
 */
export const getEmployeeStats = (employee: Employee, tasks: Task[]): {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  lateTasks: number;
  completionRate: number;
} => {
  const employeeTasks = getTasksByEmployee(tasks, employee.id);
  const completedTasks = getCompletedTasks(employeeTasks);
  const pendingTasks = getPendingTasks(employeeTasks);
  const lateTasks = getLateTasks(employeeTasks);
  return {
    totalTasks: employeeTasks.length,
    completedTasks: completedTasks.length,
    pendingTasks: pendingTasks.length,
    lateTasks: lateTasks.length,
    completionRate: employeeTasks.length > 0 ? (completedTasks.length / employeeTasks.length) * 100 : 0,
  };
};

export const getEmployeesByDepartment = (employees: Employee[], department: string): Employee[] => {
  return employees.filter(employee => employee.department === department);
};

// Material utilities
export const getMaterialUsage = (materials: Material[], tasks: Task[]): Record<string, number> => {
  const usage: Record<string, number> = {};
  
  tasks.forEach(task => {
    if (task.materials_used) {
      task.materials_used.forEach((materialUsage: any) => {
        const materialId = materialUsage.materialId;
        const quantity = materialUsage.quantity || 0;
        usage[materialId] = (usage[materialId] || 0) + quantity;
      });
    }
  });
  
  return usage;
};

export const getMaterialStock = (material: Material, usage: Record<string, number>): number => {
  const usedQuantity = usage[material.id] || 0;
  return Math.max(0, material.quantity - usedQuantity);
};

// Performance utilities
export const calculatePerformanceScore = (metrics: PerformanceMetrics): number => {
  const taskWeight = 0.7;
  const ratingWeight = 0.3;
  
  const taskScore = metrics.completed_tasks / Math.max(metrics.total_tasks, 1) * 100;
  const ratingScore = (metrics.average_rating / 5) * 100;
  
  return Math.round(taskScore * taskWeight + ratingScore * ratingWeight);
};

export const getPerformanceLevel = (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'average';
  return 'poor';
};

// Clock event utilities
export const getClockEventsByEmployee = (clockEvents: ClockEvent[], employeeId: string): ClockEvent[] => {
  return clockEvents.filter(event => event.employee_id === employeeId);
};

export const getTodayClockEvents = (clockEvents: ClockEvent[]): ClockEvent[] => {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  return clockEvents.filter(event => {
    if (!event.clock_in) return false;
    const eventDate = new Date(event.clock_in).toISOString().split('T')[0];
    return eventDate === todayString;
  });
};

export const calculateWorkHours = (clockEvents: ClockEvent[]): number => {
  let totalHours = 0;
  
  clockEvents.forEach(event => {
    if (event.clock_out && event.clock_in) {
      const start = new Date(event.clock_in);
      const end = new Date(event.clock_out);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      totalHours += hours;
    }
  });
  
  return Math.round(totalHours * 100) / 100; // Round to 2 decimal places
};

// Alert utilities
export const showAlert = (title: string, message: string, onPress?: () => void): void => {
  Alert.alert(title, message, [
    {
      text: 'OK',
      onPress,
    },
  ]);
};

export const showConfirmAlert = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  Alert.alert(title, message, [
    {
      text: 'Cancel',
      style: 'cancel',
      onPress: onCancel,
    },
    {
      text: 'Confirm',
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
};

// Color utilities
export const getStatusColor = (status: 'completed' | 'pending' | 'late'): string => {
  switch (status) {
    case 'completed':
      return '#4caf50';
    case 'pending':
      return '#ff9800';
    case 'late':
      return '#f44336';
    default:
      return '#666';
  }
};

export const getPerformanceColor = (level: 'excellent' | 'good' | 'average' | 'poor'): string => {
  switch (level) {
    case 'excellent':
      return '#4caf50';
    case 'good':
      return '#8bc34a';
    case 'average':
      return '#ff9800';
    case 'poor':
      return '#f44336';
    default:
      return '#666';
  }
};


// Generic form validation utility
export type ValidationSchema = Record<string, (value: any) => string | null>;
export function validateForm<T extends Record<string, any>>(data: T, schema: ValidationSchema): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const key in schema) {
    const error = schema[key](data[key]);
    if (error) errors.push(error);
  }
  return { isValid: errors.length === 0, errors };
}

// Formatting utilities
export const formatUtils = {
  date: (date: string | Date): string => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
  dateTime: (date: string | Date): string => new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  time: (date: string | Date): string => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  percentage: (num: number): string => `${Math.round(num)}%`,
  currency: (amount: number, currency: string = 'USD'): string => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount),
};

// Export utilities
export const generateCSV = (data: any[], headers: string[]): string => {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};

export const downloadCSV = (csvContent: string, filename: string): void => {
  // Implementation depends on platform (React Native)
  console.log('CSV content:', csvContent);
  console.log('Filename:', filename);
};

// Error handling utilities
export const handleError = (error: any, context: string): void => {
  console.error(`Error in ${context}:`, error);
  
  let message = 'An unexpected error occurred';
  
  if (error?.message) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  showAlert('Error', message);
};



// Performance utilities
export const measurePerformance = <T>(fn: () => T, label: string): T => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`${label} took ${end - start}ms`);
  return result;
};

export const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  getKey: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey(...args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}; 

// --- Restored utility functions for admin tabs ---

/**
 * Filters tasks by a date range (inclusive).
 */
export const filterTasksByDate = (tasks: Task[], start: string, end: string): Task[] => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return tasks.filter(task => {
    const taskDate = new Date(task.start);
    return taskDate >= startDate && taskDate <= endDate;
  });
};

/**
 * Returns the top N performers by performance score.
 */
export const getBestPerformers = (metrics: PerformanceMetrics[], topN: number = 5): PerformanceMetrics[] => {
  return [...metrics].sort((a, b) => b.performance_score - a.performance_score).slice(0, topN);
};

/**
 * Returns employees who have late clock events (clock in after threshold hour).
 */
export const getLateEmployeesByClockEvents = (clockEvents: ClockEvent[], employees: Employee[], thresholdHour: number = 9): string[] => {
  const lateEmployees = new Set<string>();
  employees.forEach(emp => {
    const empEvents = clockEvents.filter(e => e.employee_id === emp.id);
    empEvents.forEach(event => {
      if (event.clock_in) {
        const clockIn = new Date(event.clock_in);
        if (clockIn.getHours() >= thresholdHour) {
          lateEmployees.add(emp.name);
        }
      }
    });
  });
  return Array.from(lateEmployees);
};

/**
 * Returns the first N items of an array (for limiting lines in UI).
 */
export const limitLines = <T>(arr: T[], n: number): T[] => arr.slice(0, n);

/**
 * Returns the number of minutes late given a deadline and completion time.
 */
export const minutesLate = (deadline: string, completedAt: string): number => {
  const d = new Date(deadline);
  const c = new Date(completedAt);
  return Math.max(0, Math.round((c.getTime() - d.getTime()) / 60000));
};

/**
 * Alias for getMaterialUsage for backward compatibility.
 */
export { getMaterialUsage as getMaterialsUsed };

/**
 * Simulated async fetch for business code (replace with real API as needed).
 */
export const getBusinessCode = async (businessId: string): Promise<string> => {
  // Use real API to fetch the business code
  const { getBusinessCode } = await import('../../services/cloud');
  return getBusinessCode(businessId);
};

/**
 * Simulated async generator for a new business code (replace with real API as needed).
 */
export const generateBusinessCode = async (businessId: string): Promise<string> => {
  // Deprecated: Business code should only be generated once at business creation
  throw new Error('Business code can only be generated at business signup.');
}; 
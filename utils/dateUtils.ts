/**
 * Unified date utilities for ShopFlow
 * Consolidates all date operations into a single source of truth
 */

export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

export const getCurrentDate = (): Date => {
  return new Date();
};

export const getCurrentTimeHM = (): string => {
  const now = getCurrentDate();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return pad(now.getHours()) + ':' + pad(now.getMinutes());
};

export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
};

export const formatDateTime = (date: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString();
};

export const formatTime = (date: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString();
};

export const getTimeDifference = (start: string | Date, end: string | Date): number => {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  return endDate.getTime() - startDate.getTime();
};

export const isOverdue = (deadline: string | Date): boolean => {
  const now = getCurrentDate();
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  return deadlineDate < now;
};

export const getDaysUntilDeadline = (deadline: string | Date): number => {
  const now = getCurrentDate();
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const diffTime = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Time checking utilities
export const isTimeBetween = (start: string, end: string, time: string): boolean => {
  return time >= start && time <= end;
};

export const calculateWorkHours = (clockIn: string | Date, clockOut: string | Date): number => {
  if (!clockIn || !clockOut) return 0;
  const diff = getTimeDifference(clockIn, clockOut);
  return diff / (1000 * 60 * 60); // Convert to hours
};

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + (minutes * 60 * 1000));
};

export const addHours = (date: Date, hours: number): Date => {
  return new Date(date.getTime() + (hours * 60 * 60 * 1000));
};

// Validation utilities
export const isValidDate = (date: any): boolean => {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  return !isNaN(d.getTime());
};

export const dateToISOString = (date: Date | string): string => {
  if (typeof date === 'string') return date;
  return date.toISOString();
};

export const parseDateSafely = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

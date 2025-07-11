// components/utility/types.ts
// TypeScript interfaces and types for ShopFlow admin components

export interface Employee {
  id: string;
  name: string;
  code: string;
  lunchStart?: string;
  lunchEnd?: string;
  photoUri?: string;
  department?: string;
  business_id: string;
}

export interface Task {
  id: string;
  name: string;
  start: string;
  deadline: string;
  completed: boolean;
  assignedTo?: string;
  completedAt?: string;
  materialsUsed?: any[];
  business_id: string;
}

export interface Material {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  business_id: string;
}

export interface ClockEvent {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out?: string;
  business_id: string;
}

export interface TaskRating {
  id: string;
  task_id: string;
  employee_id: string;
  admin_id: string;
  rating: number;
  feedback?: string;
  rated_at: string;
  business_id: string;
}

export interface PerformanceSettings {
  ratingSystemEnabled: boolean;
  autoRateCompletedTasks: boolean;
  defaultRating: number;
}

export interface PerformanceMetrics {
  employee_id: string;
  employee_name: string;
  total_tasks: number;
  completed_tasks: number;
  average_rating: number;
  performance_score: number;
}

export interface BusinessSettings {
  workStart: string;
  workEnd: string;
  lateThreshold: number;
  businessCode: string;
}

export interface Department {
  id: string;
  name: string;
  business_id: string;
}

export interface BusinessStatistics {
  total_employees: number;
  total_tasks: number;
  completed_tasks: number;
  total_materials: number;
  average_rating: number;
  total_ratings: number;
}

export interface DashboardData {
  period_type: string;
  period_start: string;
  period_end: string;
  statistics: BusinessStatistics;
  top_performers: PerformanceMetrics[];
  recent_tasks: Task[];
}

export interface ExportOptions {
  includeTasks: boolean;
  includeMaterials: boolean;
  includeEmployees: boolean;
  includeAttendance: boolean;
  startDate?: string;
  endDate?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'employee';
  business_id: string;
}

export interface Business {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface MaterialType {
  id: string;
  name: string;
  business_id: string;
}

export interface LateTask {
  task_id: string;
  task_name: string;
  assigned_to: string;
  deadline: string;
  minutes_late: number;
}

export interface EmployeeAttendance {
  employee_id: string;
  employee_name: string;
  clock_in: string;
  clock_out?: string;
  hours_worked: number;
}

export interface MaterialUsage {
  material_id: string;
  material_name: string;
  total_quantity: number;
  unit: string;
}

export interface TaskStatistics {
  total_tasks: number;
  completed_tasks: number;
  late_tasks: number;
  average_completion_time: number;
  tasks_by_employee: Record<string, number>;
}

export interface DepartmentStatistics {
  department_name: string;
  employee_count: number;
  total_tasks: number;
  completed_tasks: number;
  average_rating: number;
}

export interface PerformanceCalculationResult {
  employees: {
    employee_id: string;
    employee_name: string;
    tasks_completed: number;
    average_rating: number;
    tasks_rated: number;
  }[];
}

export interface BulkPerformanceMetrics {
  employees: {
    employee_id: string;
    employee_name: string;
    period_type: string;
    period_start: string;
    period_end: string;
    tasks_completed: number;
    average_rating: number;
    tasks_rated: number;
  }[];
}

// Form validation types
export interface TaskFormData {
  name: string;
  start: string;
  deadline: string;
  assignedTo: string;
  materialsUsed: any[];
}

export interface EmployeeFormData {
  name: string;
  code: string;
  department?: string;
  lunchStart?: string;
  lunchEnd?: string;
}

export interface MaterialFormData {
  name: string;
  type: string;
  quantity: number;
  unit: string;
}

// Modal state types
export interface ModalState {
  isVisible: boolean;
  data?: any;
}

export interface TaskRatingModalProps {
  visible: boolean;
  task: Task;
  employee: Employee;
  onClose: () => void;
  onRate: (rating: number, feedback?: string) => void;
}

export interface PerformanceManagementProps {
  visible: boolean;
  employee: Employee;
  tasks: Task[];
  onClose: () => void;
  onUpdate: (metrics: PerformanceMetrics) => void;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  cursor?: string;
}

// Theme types
export interface Theme {
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
}

// Navigation types
export interface NavigationProps {
  navigation: any;
  route: any;
}

// Component prop types
export interface TabProps {
  user: User;
  employees: Employee[];
  tasks: Task[];
  materials: Material[];
  clockEvents: ClockEvent[];
  performanceSettings: PerformanceSettings;
  setPerformanceSettings: (settings: PerformanceSettings) => void;
  darkMode: boolean;
  onRefresh: () => void;
}

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  user: User;
  darkMode: boolean;
}

// Utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingStateData<T> {
  state: LoadingState;
  data?: T;
  error?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  search: string;
  department?: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Generic event type
export interface EntityEvent<T> {
  type: string;
  entity: T;
  timestamp: string;
}

// Specific event type aliases
export type TaskEvent = EntityEvent<Task>;
export type EmployeeEvent = EntityEvent<Employee>;
export type MaterialEvent = EntityEvent<Material>;

// Export types
export interface ExportData {
  tasks: Task[];
  materials: Material[];
  employees: Employee[];
  attendance: EmployeeAttendance[];
  metadata: {
    exportDate: string;
    businessId: string;
    businessName: string;
    period?: {
      start: string;
      end: string;
    };
  };
}

// Settings types
export interface AppSettings {
  biometricEnabled: boolean;
  darkMode: boolean;
  notifications: boolean;
  autoSync: boolean;
  language: string;
}

export interface BusinessSettingsForm {
  workStart: string;
  workEnd: string;
  lateThreshold: number;
  businessCode: string;
  departments: Department[];
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Success types
export interface SuccessMessage {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
}

// Analytics types
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  userId: string;
  businessId: string;
}

export interface AnalyticsData {
  totalEvents: number;
  uniqueUsers: number;
  topEvents: Array<{
    event: string;
    count: number;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
} 
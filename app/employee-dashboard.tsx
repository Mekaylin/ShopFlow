import { useRouter } from 'expo-router';
import { Business, Employee } from '../components/utility/types';
import EmployeeDashboardScreen from './screens/EmployeeDashboardScreen';

// Correct placeholder objects with all required fields
const placeholderEmployee: Employee = { id: 'placeholder', name: 'Placeholder', code: '0000', business_id: 'placeholder' };
const placeholderBusiness: Business = { id: 'placeholder', name: 'Placeholder Business', code: '0000', created_at: new Date().toISOString() };

export default function EmployeeDashboard() {
  const router = useRouter();
  return <EmployeeDashboardScreen onLogout={() => router.replace('/')} />;
} 
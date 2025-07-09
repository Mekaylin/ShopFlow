import { useRouter } from 'expo-router';
import EmployeeDashboardScreen from './screens/EmployeeDashboardScreen';

export default function EmployeeDashboardRoute() {
  const router = useRouter();
  return <EmployeeDashboardScreen onLogout={() => router.replace('/')} />;
} 
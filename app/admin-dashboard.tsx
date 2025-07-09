import { useRouter } from 'expo-router';
import AdminDashboardScreen from './screens/AdminDashboardScreen';

export default function AdminDashboardRoute() {
  const router = useRouter();
  return <AdminDashboardScreen onLogout={() => router.replace('/')} />;
} 
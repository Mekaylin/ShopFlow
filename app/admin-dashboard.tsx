import { useRouter } from 'expo-router';
import AdminDashboardScreen from './screens/AdminDashboardScreen';

const placeholderUser = { id: 'placeholder', business_id: 'placeholder', role: 'admin' };

export default function AdminDashboard() {
  const router = useRouter();
  return <AdminDashboardScreen onLogout={() => router.replace('/')} user={placeholderUser} />;
} 
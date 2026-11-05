import type { Metadata } from 'next';
import AdminView from '@/components/admin/AdminView';

export const metadata: Metadata = {
  title: '后台 | 易林寻踪',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminView />;
}

import type { Metadata } from 'next';
import AdminView from '@/components/admin/AdminView';

export const metadata: Metadata = {
  title: '后台 | 六爻 · 小成图',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminView />;
}

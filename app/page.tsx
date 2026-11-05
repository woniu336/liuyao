import type { Metadata } from 'next';
import CastPage from '@/components/cast/CastPage';

export const metadata: Metadata = {
  title: '六爻 · 三钱摇卦',
  description: '三钱摇卦或手动指定卦象，纳甲装卦、安世应、定六亲，再依盘面事实作四段解读。',
};

export default function HomePage() {
  return <CastPage />;
}

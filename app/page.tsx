import type { Metadata } from 'next';
import CastPage from '@/components/cast/CastPage';

export const metadata: Metadata = {
  title: '六爻 · 三钱摇卦',
  description: '三钱摇卦或手动指定卦象，起卦后可选六爻纳甲解卦或小成图九宫解盘。',
};

export default function HomePage() {
  return <CastPage />;
}

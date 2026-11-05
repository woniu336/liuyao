import type { Metadata } from 'next';
import LiuyaoView from '@/components/liuyao/LiuyaoView';

export const metadata: Metadata = {
  title: '六爻排盘 · 纳甲装卦 | 确定性排盘',
  description:
    '三钱摇卦、大衍筮法与手工录入起的六爻排盘：纳甲装卦、安世应、定六亲、旬空、伏神、六神、天医文昌神煞。',
};

export default function LiuyaoPage() {
  return <LiuyaoView />;
}

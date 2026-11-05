import type { Metadata } from 'next';
import XiaoChengTuView from '@/components/xct/XiaoChengTuView';

export const metadata: Metadata = {
  title: '小成图排盘 · 四象八断 | 确定性排盘',
  description:
    '霍氏小成图：天地数 / 梅花时间 / 自定选卦起局，布八宫天盘、立中宫归藏，按阖辟往来与阴阳得配作四象八断，并追踪正推气路。',
};

export default function XctPage() {
  return <XiaoChengTuView />;
}

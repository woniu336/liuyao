import type { Metadata } from 'next';
import CasesView from '@/components/cases/CasesView';

export const metadata: Metadata = {
  title: '历史排盘 | 易林寻踪',
  description: '六爻与小成图的历史排盘：只存起卦输入，打开时由确定性引擎重排同一卦。',
};

export default function CasesPage() {
  return <CasesView />;
}

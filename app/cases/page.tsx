import type { Metadata } from 'next';
import CasesView from '@/components/cases/CasesView';

export const metadata: Metadata = {
  title: '卦例夹 | 六爻 · 小成图',
  description: '保存在本机的六爻与小成图卦例：只存起卦输入，打开时由确定性引擎重排同一卦。',
};

export default function CasesPage() {
  return <CasesView />;
}

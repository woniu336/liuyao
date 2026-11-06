import type { Metadata } from 'next';
import ExamplesView from '@/components/examples/ExamplesView';

export const metadata: Metadata = {
  title: '案例 · 增删卜易卦例 | 野鹤六爻',
  description:
    '《增删卜易》卦例 100 例：据朱辰彬《增删卜易卦例初探》整理文本抽取，含古筮知识、原注与用神 / 吉凶 / 应期要点，供对照研读。',
};

export default function ExamplesPage() {
  return <ExamplesView />;
}

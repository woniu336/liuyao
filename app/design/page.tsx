import type { Metadata } from 'next';
import DesignPreview from '@/components/design/DesignPreview';

/** 设计稿仅供评审：不进索引 */
export const metadata: Metadata = {
  title: '设计稿 · 六爻',
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return <DesignPreview />;
}

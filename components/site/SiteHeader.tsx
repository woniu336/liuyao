'use client';

/**
 * 全站页头
 * =========
 * 左：篆印 + 站名「易林寻踪」；右：六爻 / 小成图 / 古籍 三入口。
 * 页面特有的动作（历史排盘、截图、保存卦例…）通过 `actions` 插到导航右侧，
 * 保证「同一块牌子」出现在所有页面，而不用各页各写一套 header。
 */

import React from 'react';
import Link from 'next/link';

export type SiteSection = 'liuyao' | 'xct' | 'classics';

const NAV: { id: SiteSection; label: string; href: string }[] = [
  { id: 'liuyao', label: '六爻', href: '/' },
  { id: 'xct', label: '小成图', href: '/xct' },
  { id: 'classics', label: '古籍', href: '/classics' },
];

export interface SiteHeaderProps {
  /** 当前所在栏目（高亮用），不传则都不高亮 */
  active?: SiteSection;
  /** 右侧附加动作（页面专属） */
  actions?: React.ReactNode;
  /** 是否显示三入口导航，默认显示 */
  showNav?: boolean;
  /** 吸顶（结果页用） */
  sticky?: boolean;
  /** 额外容器类名（如结果页的窄版式） */
  className?: string;
  /** 内容最大宽度，默认 1120 */
  maxWidthClassName?: string;
}

export default function SiteHeader({
  active,
  actions,
  showNav = true,
  sticky = false,
  className = '',
  maxWidthClassName = 'max-w-[1120px]',
}: SiteHeaderProps) {
  return (
    <header
      className={[
        sticky ? 'safe-top sticky top-0 z-30' : 'relative z-20',
        'border-b border-[#C8BEA8]/60 bg-[#F6F2E9]/92 backdrop-blur-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={`mx-auto flex h-[54px] w-full ${maxWidthClassName} items-center justify-between gap-3 px-4 sm:px-6 lg:px-8`}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-[#35443D] no-underline">
          <span
            className="flex h-8 w-8 items-center justify-center border border-[#9A7040] font-song text-[18px] text-[#8E6337]"
            style={{ borderRadius: 3 }}
            aria-hidden
          >
            易
          </span>
          <span className="font-song text-[17px] font-semibold tracking-[0.14em] sm:text-[19px]">易林寻踪</span>
        </Link>

        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          {showNav && (
            <nav
              aria-label="主导航"
              className="flex items-center gap-3 whitespace-nowrap font-song text-[12.5px] text-[#625E52] sm:gap-5 sm:text-[13.5px]"
            >
              {NAV.map((item) =>
                item.id === active ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current="page"
                    className="border-b-2 border-[#49675B] pb-1 font-medium text-[#34483E]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <Link key={item.id} href={item.href} className="hover:text-[#8E6337]">
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          )}
          {actions && (
            <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap sm:gap-3">
              {showNav && <span aria-hidden className="hidden h-4 w-px bg-[#C8BEA8] sm:block" />}
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

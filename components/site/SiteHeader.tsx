'use client';

/**
 * 全站页头
 * =========
 * 左：站名「野鹤六爻」（毛笔艺术字）；右：六爻 / 案例 / 历史排盘 + 设置。
 * 「设置」只管一件事：解卦用的大模型（存在本机浏览器）。
 * 页面特有的动作（历史排盘、截图、保存卦例…）通过 `actions` 插到导航右侧，
 * 保证「同一块牌子」出现在所有页面，而不用各页各写一套 header。
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Settings } from 'lucide-react';
import SettingsDialog from './SettingsDialog';

export type SiteSection = 'liuyao' | 'examples' | 'history' | 'classics';

const NAV: { id: SiteSection; label: string; href: string }[] = [
  { id: 'liuyao', label: '六爻', href: '/' },
  { id: 'examples', label: '案例', href: '/examples' },
  { id: 'history', label: '历史排盘', href: '/cases' },
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // 页头有 backdrop-blur（会成为 fixed 后代的包含块），弹窗必须挂到 body 上
  useEffect(() => setMounted(true), []);

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
        <Link href="/" className="flex shrink-0 items-center text-[#35443D] no-underline">
          <span className="font-brand text-[21px] leading-none tracking-[0.1em] text-[#2F4438] sm:text-[23px]">
            野鹤六爻
          </span>
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
          <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap sm:gap-3">
            {actions && (
              <>
                {showNav && <span aria-hidden className="hidden h-4 w-px bg-[#C8BEA8] sm:block" />}
                {actions}
              </>
            )}
            <span aria-hidden className="hidden h-4 w-px bg-[#C8BEA8] sm:block" />
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="设置大模型"
              title="设置（大模型解读）"
              className="press flex h-8 items-center gap-1.5 rounded-full border border-[#C3B79E] bg-[#FCF9F0]/70 px-3 font-song text-[12px] text-[#4A4438] transition-colors hover:border-[#9A7040] hover:text-[#8E6337]"
            >
              <Settings size={13} strokeWidth={1.7} />
              设置
            </button>
          </div>
        </div>
      </div>
      {mounted && createPortal(
        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />,
        document.body,
      )}
    </header>
  );
}

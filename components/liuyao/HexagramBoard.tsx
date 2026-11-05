'use client';

/**
 * 六爻古法卦单（盘面）
 * =====================
 * 版式逐行取自 bazi-web `components/zhanbu/MobileHexagramPoster.tsx` 的 embedded 分支：
 *   - 占问 + 男占/女占落款
 *   - 时空看板（公历 / 月建+日辰 / 旬空 / 十三神煞）
 *   - 双卦对瞻表头（本卦 · 之 · 变卦，附归魂/游魂/六冲/六合）
 *   - 定宽栅格：六神 32 / 本卦纳甲 68 / 爻画 46 / 世应 18 / 动爻 22 / 变卦纳甲 68 / 变爻画 46 / 动变标签 52
 *   - 伏神就地引出 `↑伏神: 妻财子水`
 *
 * 只改数据来源（本地确定性引擎），不改版式与字号；不含吉凶结论与解卦内容。
 */

import React, { forwardRef, useMemo } from 'react';
import { getChangedHexagramLinesMap } from './hexagram-changed-lines';
import { calcGuShiShenSha, extractLiuyaoTimeInfo, SHENSHA_ORDER, type GuShiShenSha } from '@/lib/zhanbu/shensha';
import { BRANCH_ELEMENTS, formatSolarDateDisplay, getMutatedRelationTags, type BoardViewProps } from '@/lib/liuyao/board-view';

/** 古籍盘面的设计基准宽度：低于此宽度按比例整体缩放，版式关系不变 */
export const BOARD_BASE_WIDTH = 390;

/** 爻画：阳爻一整条，阴爻两段（与原版同一几何：宽 46 / 高 9.5 / 阴爻 gap 8） */
export function MobileYaoBar({
  isYang,
  width = 46,
  height = 9.5,
  color = '#1F2937',
}: {
  isYang: boolean;
  width?: number;
  height?: number;
  color?: string;
}) {
  const barColor = color;
  if (isYang) {
    return (
      <div style={{ width, height, backgroundColor: barColor, borderRadius: 1.5, flexShrink: 0 }} />
    );
  }

  const segmentWidth = Math.floor((width - 8) / 2);
  return (
    <div
      style={{
        display: 'flex',
        width,
        height,
        gap: 8,
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <div style={{ width: segmentWidth, height, backgroundColor: barColor, borderRadius: 1.5 }} />
      <div style={{ width: segmentWidth, height, backgroundColor: barColor, borderRadius: 1.5 }} />
    </div>
  );
}

/** 十大六冲卦 */
const SIX_CHONG_HEXAGRAMS = new Set([
  '乾为天', '坎为水', '艮为山', '震为雷',
  '巽为风', '离为火', '坤为地', '兑为泽',
  '天雷无妄', '雷天大壮',
]);

/** 八大六合卦 */
const SIX_HE_HEXAGRAMS = new Set([
  '天地否', '地天泰', '水泽节', '泽水困',
  '火山旅', '山火贲', '雷地豫', '地雷复',
]);

/** 八大游魂卦 */
const YOU_HUN_HEXAGRAMS = new Set([
  '火地晋', '地火明夷', '风泽中孚', '泽风大过',
  '山雷颐', '天水讼', '水天需', '雷山小过',
]);

/** 八大归魂卦 */
const GUI_HUN_HEXAGRAMS = new Set([
  '火天大有', '地水师', '风山渐', '泽雷随',
  '山风蛊', '天火同人', '水地比', '雷泽归妹',
]);

/** 表头属性标记：优先 归魂 > 游魂 > 六冲 > 六合，都不是则退回宫位/变卦 */
export function getHexagramHeaderTag(name: string, fallback: string): string {
  if (!name) return fallback;
  if (GUI_HUN_HEXAGRAMS.has(name)) return '归魂';
  if (YOU_HUN_HEXAGRAMS.has(name)) return '游魂';
  if (SIX_CHONG_HEXAGRAMS.has(name)) return '六冲';
  if (SIX_HE_HEXAGRAMS.has(name)) return '六合';
  return fallback;
}

/** 严格中文字符清洗器（杜绝外文与 OCR 垃圾混入伏神） */
export function sanitizeYaoText(str?: string): string {
  if (!str) return '';
  return str.replace(/[^\u4e00-\u9fa5]/g, '').trim();
}

/** 纯中文伏神四字（如「妻财子水」） */
export function getSanitizedHiddenSpirit(hidden?: BoardViewProps['lines'][number]['hidden_spirit']): string {
  if (!hidden) return '';
  const s = sanitizeYaoText(`${hidden.relation}${hidden.branch}${hidden.element}`);
  return s.length >= 2 ? s : '';
}

export interface HexagramBoardProps extends BoardViewProps {
  /** 需要高亮的爻位（1..6），用于标出「用神」 */
  highlightPosition?: number | null;
  /** 高亮标签，默认「用神」 */
  highlightLabel?: string;
}

const HexagramBoard = forwardRef<HTMLDivElement, HexagramBoardProps>(function HexagramBoard(props, ref) {
  const { question, gender, datetime_info, hexagram_info, lines, highlightPosition, highlightLabel = '用神' } = props;
  const barColor = '#2C2723';

  // 上爻(6) → 初爻(1)
  const sortedLines = useMemo(() => [...lines].sort((a, b) => b.position - a.position), [lines]);

  const timeInfo = useMemo(
    () => extractLiuyaoTimeInfo(datetime_info.ganzhi, datetime_info.void_branches || []),
    [datetime_info.ganzhi, datetime_info.void_branches],
  );

  const shensha = useMemo(
    () => calcGuShiShenSha(timeInfo.dayDisplay, timeInfo.monthDisplay),
    [timeInfo.dayDisplay, timeInfo.monthDisplay],
  );

  const displayDate = formatSolarDateDisplay(datetime_info.solar_date, datetime_info.ganzhi);

  const hasMoving = lines.some((l) => l.is_moving);
  const changedTitle =
    hasMoving && hexagram_info.changed_name && hexagram_info.changed_name !== hexagram_info.base_name
      ? hexagram_info.changed_name
      : '';

  const changedLinesMap = useMemo(
    () =>
      getChangedHexagramLinesMap(
        { ...hexagram_info, changed_name: hexagram_info.changed_name ?? undefined },
        lines,
        datetime_info.void_branches || [],
      ),
    [hexagram_info, lines, datetime_info.void_branches],
  );

  const baseFallback = hexagram_info.palace ? `${hexagram_info.palace}宫` : '本宫';
  const baseAttrTag = getHexagramHeaderTag(hexagram_info.base_name, baseFallback);
  const changedAttrTag = getHexagramHeaderTag(changedTitle, '变卦');
  const genderLabel = gender && gender.includes('女') ? '女占' : '男占';

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        maxWidth: '100%',
        backgroundColor: 'transparent',
        color: '#2C2723',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        padding: 0,
        margin: '0 auto',
        position: 'relative',
        borderRadius: 0,
        border: 'none',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 1. 占问事由与性别落款 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span
              style={{
                backgroundColor: '#9E9A8E',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 3,
                letterSpacing: 0.5,
              }}
            >
              {genderLabel}
            </span>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#2C2723', margin: 0, lineHeight: 1.35 }}>
            {question || '占问事宜'}
          </h1>
        </div>
      </div>

      {/* 2. 时空干支与神煞看板（月建不写月干，日辰保留日干，不写年柱时柱） */}
      <div
        style={{
          backgroundColor: '#F1EFE4',
          borderRadius: 6,
          padding: '10px 12px',
          fontSize: 12,
          lineHeight: 1.6,
          color: '#4B443B',
          marginBottom: 14,
          border: '1px solid #E5E1D0',
        }}
      >
        <div>
          <span style={{ color: '#7A7165' }}>公历：</span>
          <span style={{ fontWeight: 600 }}>{displayDate}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 8px', marginTop: 2 }}>
          <span style={{ color: '#7A7165' }}>干支：</span>
          <span style={{ color: '#B91C1C', fontWeight: 700 }}>{timeInfo.monthDisplay}</span>
          <span style={{ color: '#B91C1C', fontWeight: 700 }}>{timeInfo.dayDisplay}</span>
          <span style={{ color: '#B91C1C', fontWeight: 700, marginLeft: 2 }}>(旬空 {timeInfo.voidStr})</span>
        </div>

        {/* 十三实用星煞 */}
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12.5, lineHeight: 1.6 }}>
          <span style={{ color: '#7A7165', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>神煞：</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 8px', flex: 1 }}>
            {SHENSHA_ORDER.map(({ key, label }) => {
              const val = shensha[key as keyof GuShiShenSha];
              if (!val) return null;
              return (
                <span key={key} style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ color: '#7A7165' }}>{label}-</span>
                  <span style={{ fontWeight: 600, color: '#2C2723' }}>{val}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. 分割线 */}
      <div style={{ height: 1, backgroundColor: '#E2DEC8', marginBottom: 14 }} />

      {/* 4. 排盘表格视口 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: changedTitle ? '100%' : 'fit-content',
          maxWidth: 430,
          margin: '0 auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* 双卦对瞻表头 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 13,
            fontWeight: 800,
            paddingBottom: 6,
            borderBottom: '1.5px solid #2C2723',
            color: '#2C2723',
            minWidth: changedTitle ? 390 : undefined,
          }}
        >
          <span style={{ width: 32, textAlign: 'center', fontSize: 13, color: '#5C5449', flexShrink: 0 }}>六神</span>
          <div style={{ width: 6, flexShrink: 0 }} />

          <div style={{ width: 144, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ color: '#1E40AF', fontSize: 16, fontWeight: 800 }}>{hexagram_info.base_name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#5C5449' }}>({baseAttrTag})</span>
          </div>

          {changedTitle && (
            <>
              <div style={{ width: 30, flexShrink: 0 }} />
              <div style={{ width: 178, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ color: '#1E40AF', fontSize: 16, fontWeight: 800 }}>{changedTitle}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#5C5449' }}>({changedAttrTag})</span>
              </div>
            </>
          )}
        </div>

        {/* 5. 六爻核心排盘列表 */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sortedLines.map((line) => {
            const changed = line.changed_line;
            const chLine = changedLinesMap.get(line.position);
            const hiddenStr = getSanitizedHiddenSpirit(line.hidden_spirit);
            const baseElem = line.element || BRANCH_ELEMENTS[line.branch] || '';
            const baseInfo = `${line.relation}${line.branch}${baseElem}`;

            let changedInfo = '';
            let changedBarIsYang = line.is_yang;
            let relationTags: string[] = [];

            if (changedTitle) {
              changedBarIsYang = chLine ? chLine.is_yang : line.is_moving ? !line.is_yang : line.is_yang;
              if (line.is_moving && changed) {
                const cRel = changed.relation || chLine?.relation || line.relation;
                const cBranch = changed.branch || chLine?.branch || '';
                const cElem = changed.element || chLine?.element || BRANCH_ELEMENTS[cBranch] || '';
                changedInfo = `${cRel}${cBranch}${cElem}`;
                relationTags = getMutatedRelationTags(
                  line.branch,
                  line.element,
                  changed.branch,
                  changed.element,
                  line.mutated_relation,
                );
              } else if (chLine) {
                changedInfo = `${chLine.relation}${chLine.branch}${chLine.element}`;
              }
            }

            return (
              <div
                key={line.position}
                style={{
                  position: 'relative',
                  height: 35,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  paddingTop: 3,
                  boxSizing: 'border-box',
                  borderBottom: '1px solid #EAE5D4',
                  backgroundColor: highlightPosition === line.position ? 'rgba(138,106,58,0.07)' : 'transparent',
                  minWidth: changedTitle ? 390 : undefined,
                }}
              >
                {highlightPosition === line.position && (
                  <>
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: '#8A6A3A',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 2,
                        fontSize: 9.5,
                        letterSpacing: 1,
                        color: '#8A6A3A',
                      }}
                    >
                      {highlightLabel}
                    </span>
                  </>
                )}
                <div style={{ display: 'flex', alignItems: 'center', height: 20 }}>
                  {/* 1. 六神 */}
                  <span style={{ width: 32, textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: '#4B443B', flexShrink: 0 }}>
                    {line.six_god}
                  </span>
                  <div style={{ width: 6, flexShrink: 0 }} />

                  {/* 2. 本卦纳甲（六亲 + 地支 + 五行，无天干） */}
                  <span
                    style={{
                      width: 68,
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: 0.2,
                      color: '#2C2723',
                      flexShrink: 0,
                      textAlign: 'left',
                    }}
                  >
                    {baseInfo}
                  </span>
                  <div style={{ width: 6, flexShrink: 0 }} />

                  {/* 3. 本卦爻画 */}
                  <div style={{ width: 46, flexShrink: 0 }}>
                    <MobileYaoBar isYang={line.is_yang} width={46} height={9.5} color={barColor} />
                  </div>
                  <div style={{ width: 6, flexShrink: 0 }} />

                  {/* 4. 世 / 应 */}
                  <span
                    style={{
                      width: 18,
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                      color: line.is_world ? '#B91C1C' : line.is_response ? '#059669' : 'transparent',
                      flexShrink: 0,
                    }}
                  >
                    {line.is_world ? '世' : line.is_response ? '应' : ''}
                  </span>

                  {changedTitle && (
                    <>
                      <div style={{ width: 4, flexShrink: 0 }} />

                      {/* 5. 动爻标记 ○ / × → */}
                      <div
                        style={{
                          width: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          color: line.is_moving ? '#B91C1C' : 'transparent',
                          flexShrink: 0,
                          userSelect: 'none',
                        }}
                      >
                        {line.is_moving && (
                          <>
                            <span style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1 }}>{line.is_yang ? '○' : '×'}</span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                lineHeight: 1,
                                opacity: 0.85,
                                transform: 'translateY(-0.5px)',
                              }}
                            >
                              →
                            </span>
                          </>
                        )}
                      </div>

                      <div style={{ width: 8, flexShrink: 0 }} />

                      {/* 6. 变卦：纳甲 + 爻画 + 动变标签 */}
                      <div style={{ width: 178, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <span
                          style={{
                            width: 68,
                            fontSize: 13,
                            fontWeight: line.is_moving ? 700 : 500,
                            color: line.is_moving ? '#B91C1C' : '#4B443B',
                            letterSpacing: 0.2,
                            flexShrink: 0,
                          }}
                        >
                          {changedInfo}
                        </span>

                        <div style={{ width: 6, flexShrink: 0 }} />

                        <div style={{ width: 46, flexShrink: 0 }}>
                          <MobileYaoBar isYang={changedBarIsYang} width={46} height={9.5} color={barColor} />
                        </div>

                        <div style={{ width: 6, flexShrink: 0 }} />

                        <div style={{ width: 52, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          {relationTags.length > 0 && (
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#B91C1C', whiteSpace: 'nowrap' }}>
                              [{relationTags.join('')}]
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 伏神就地引出（锁在爻位下方，零挤占流式高度） */}
                {hiddenStr && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 11,
                      color: '#B45309',
                      fontWeight: 600,
                      paddingLeft: 38,
                      height: 12,
                      marginTop: 1,
                      lineHeight: 1,
                    }}
                  >
                    <span>↑伏神:</span>
                    <span>{hiddenStr}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 6. 底部正统落款 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 14,
            paddingTop: 8,
            borderTop: '1px dashed #DCD6C5',
            fontSize: 11,
            color: '#8C7E6D',
            letterSpacing: 0.5,
          }}
        >
          <span>《火珠林》纳甲筮法排盘</span>
        </div>
      </div>
    </div>
  );
});

HexagramBoard.displayName = 'HexagramBoard';
export default HexagramBoard;

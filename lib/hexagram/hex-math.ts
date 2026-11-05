/**
 * 纯几何六爻与八卦矢量计算核心引擎
 * 对齐 YiStep 原生位运算与几何度量模型
 */

export const TRIGRAM_BITS: Record<string, number> = {
  qian: 7,
  dui: 3,
  li: 5,
  zhen: 1,
  xun: 6,
  kan: 2,
  gen: 4,
  kun: 0,
};

export const LINE_VALUES: Record<number, { key: number; yang: boolean; moving: boolean }> = {
  6: { key: 6, yang: false, moving: true },
  7: { key: 7, yang: true, moving: false },
  8: { key: 8, yang: false, moving: false },
  9: { key: 9, yang: true, moving: true },
};

export const GEO = {
  bar: 0.108,
  gap: 0.085,
  splitGap: 0.09,
  height: 0.2,
} as const;

const ORDINALS = ['初', '二', '三', '四', '五', '上'];

/**
 * 爻题生成: 初九/初六/九二/六三...上九/上六 (pos 1..6, 自下而上)
 */
export function lineTitle(pos: number, yang: boolean): string {
  if (!Number.isInteger(pos) || pos < 1 || pos > 6) {
    throw new RangeError(`line position out of range: ${pos}`);
  }
  const num = yang ? '九' : '六';
  return pos === 1 || pos === 6 ? `${ORDINALS[pos - 1]}${num}` : `${num}${ORDINALS[pos - 1]}`;
}

/**
 * 将 6 次三钱投掷数值拆分为 本卦掩码 / 动爻掩码 / 变卦掩码
 */
export function masksOf(values: number[]): { primary: number; moving: number; resulting: number } {
  let primary = 0;
  let moving = 0;
  values.forEach((v, i) => {
    const line = LINE_VALUES[v];
    if (!line) throw new RangeError(`invalid line value: ${v}`);
    if (line.yang) primary |= 1 << i;
    if (line.moving) moving |= 1 << i;
  });
  return { primary, moving, resulting: primary ^ moving };
}

/**
 * 动爻在投掷序中的位置 (0-based)
 */
export const movingPositions = (values: number[]): number[] =>
  values.flatMap((v, i) => (LINE_VALUES[v]?.moving ? [i] : []));

/**
 * 动爻爻位 (1-based，自下而上)：界面文案一律用这个。
 *
 * 踩过的坑：`movingPositions` 是 0-based 投掷序，直接拿去查「初/二/三…」
 * 会整体错一位（初爻动查不到，二爻动显示成初爻）。
 */
export const movingLineNumbers = (values: number[]): number[] =>
  movingPositions(values).map((i) => i + 1);

/**
 * 拆解掩码各位为爻序与阴阳对象
 */
export function bitsOfMask(mask: number, n = 6): Array<{ pos: number; yang: boolean }> {
  return Array.from({ length: n }, (_, i) => ({
    pos: i + 1,
    yang: ((mask >> i) & 1) === 1,
  }));
}

/**
 * 上下卦掩码拼装为六爻掩码 (上卦三位 << 3 | 下卦三位)
 */
export const composeHex = (upperBits: number, lowerBits: number): number =>
  ((upperBits & 7) << 3) | (lowerBits & 7);

export const upperBits = (mask: number): number => (mask >> 3) & 7;
export const lowerBits = (mask: number): number => mask & 7;

export const round2 = (v: number): number => Math.round(v * 100) / 100;
export const esc = (s: string | number): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export interface HexSvgOptions {
  width?: number;
  label?: string;
  split?: boolean;
  filled?: number;
  stagger?: boolean;
  text?: {
    hexLine?: string | null;
    triLine?: string;
    triPos?: string[];
    yin?: string;
    yang?: string;
    moving?: string;
    idle?: string;
    sep?: string;
    labelSep?: string;
  };
}

export interface LineGeometry {
  pos: number;
  yang: boolean;
  moving: boolean;
  yy: string;
  title: string;
  y: number;
  cast: boolean;
}

/**
 * 计算纯几何排版参数
 */
export function calculateGeometry(
  mask: number,
  n: number,
  movingMask: number = 0,
  opts: HexSvgOptions = {}
) {
  const {
    width = 120,
    label,
    split = false,
    filled,
    text = {
      hexLine: null,
      triLine: '{pos}爻（{yy}）',
      triPos: ['下', '中', '上'],
      yin: '阴',
      yang: '阳',
      moving: '（动爻）',
      idle: '尚未起卦',
      sep: '，',
      labelSep: '：',
    },
  } = opts;

  const castLines = filled ?? n;
  const bar = Math.max(width * GEO.bar, 2);
  const gap = Math.max(width * GEO.gap, 1.5);
  const splitGap = width * GEO.splitGap;
  const radius = Math.max(bar * 0.18, 0.5);
  const thin = Math.max(width * 0.012, 1.5);
  const yinWidth = width * 0.2;
  const half = (width - yinWidth) / 2;

  const offsets = Array.from(
    { length: n },
    (_, i) => i * (bar + gap) + (split && n === 6 && i >= 3 ? splitGap : 0)
  );
  const total = offsets[n - 1] + bar;

  const lines: LineGeometry[] = Array.from({ length: n }, (_, i) => {
    const pos = i + 1;
    const yang = ((mask >> i) & 1) === 1;
    const moving = ((movingMask >> i) & 1) === 1;
    const yy = yang ? (text.yang ?? '阳') : (text.yin ?? '阴');
    const title =
      n === 6
        ? text.hexLine
          ? format(text.hexLine, { n: pos, yy })
          : lineTitle(pos, yang)
        : format(text.triLine ?? '{pos}爻（{yy}）', {
            pos: (text.triPos ?? ['下', '中', '上'])[i],
            yy,
          });
    return {
      pos,
      yang,
      moving,
      yy,
      title,
      y: total - offsets[i] - bar,
      cast: pos <= castLines,
    };
  });

  const drawn = lines.filter((l) => l.cast);
  const description = drawn.length
    ? drawn
        .slice()
        .reverse()
        .map((l) => `${l.title}${l.moving ? (text.moving ?? '（动爻）') : ''}`)
        .join(text.sep ?? '，')
    : (text.idle ?? '尚未起卦');

  const aria = label ? `${label}${text.labelSep ?? '：'}${description}` : description;
  const height = round2(total);

  return {
    width,
    height,
    bar,
    radius,
    thin,
    yinWidth,
    half,
    lines,
    aria,
    total,
  };
}

/**
 * 字符串级渲染 hexSVG，供服务端纯文本输出或逆向测试逐字节对账
 */
export function hexSVG(mask: number, movingMask = 0, opts: HexSvgOptions = {}): string {
  return renderSvgString(mask, 6, movingMask, opts);
}

export function trigramSVG(mask: number, opts: HexSvgOptions = {}): string {
  return renderSvgString(mask, 3, 0, opts);
}

function renderSvgString(
  mask: number,
  n: number,
  movingMask: number,
  opts: HexSvgOptions
): string {
  const { width = 120, stagger = false, filled } = opts;
  const geo = calculateGeometry(mask, n, movingMask, opts);

  const body = geo.lines
    .map((l, i) => {
      if (!l.cast) {
        const y = l.y + (geo.bar - geo.thin) / 2;
        return `<g class="line pending" data-pos="${l.pos}"><rect class="ph" x="0" y="${round2(
          y
        )}" width="${width}" height="${round2(geo.thin)}" rx="${round2(geo.thin / 2)}"/></g>`;
      }
      const shape = l.yang
        ? `<rect x="0" y="${round2(l.y)}" width="${width}" height="${round2(
            geo.bar
          )}" rx="${round2(geo.radius)}"/>`
        : `<rect x="0" y="${round2(l.y)}" width="${round2(geo.half)}" height="${round2(
            geo.bar
          )}" rx="${round2(geo.radius)}"/><rect x="${round2(
            geo.half + geo.yinWidth
          )}" y="${round2(l.y)}" width="${round2(geo.half)}" height="${round2(
            geo.bar
          )}" rx="${round2(geo.radius)}"/>`;
      const mark = l.moving
        ? `<circle class="mark" cx="${round2(width + width * 0.085)}" cy="${round2(
            l.y + geo.bar / 2
          )}" r="${round2(Math.max(width * 0.03, 2.5))}"/>`
        : '';
      const style = stagger ? ` style="--i:${i}"` : '';
      return `<g class="line${l.moving ? ' moving' : ''}" data-pos="${l.pos}"${style}>${shape}${mark}</g>`;
    })
    .join('');

  const cls = `hex${stagger ? ' stagger' : ''}${filled === undefined ? '' : ' stage'}`;
  return `<svg class="${cls}" viewBox="0 0 ${width} ${geo.height}" width="${width}" height="${geo.height}" role="img" aria-label="${esc(
    geo.aria
  )}" xmlns="http://www.w3.org/2000/svg"><title>${esc(geo.aria)}</title>${body}</svg>`;
}

/**
 * 模板变量替换
 */
export function format(template: string, vars: Record<string, unknown>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
    template
  );
}

/**
 * 单枚硬币投掷: 3 (阳面) 概率 1/2，否则 2 (阴面)
 */
export const tossCoin = (): number => (Math.random() < 0.5 ? 2 : 3);

/**
 * 三枚硬币 -> 一爻数值 (6, 7, 8, 9)
 */
export function castLine(): number {
  return tossCoin() + tossCoin() + tossCoin();
}

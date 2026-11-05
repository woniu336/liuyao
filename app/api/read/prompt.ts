/**
 * 解卦 prompt（服务端专用）
 * ========================
 * 只在这里拼 prompt：客户端 bundle 里不应出现任何提示词模板，
 * 否则「换口径 / 调风格」就必须重新发版，而且模板会被直接读走。
 *
 * TODO(产品口径)：宗法取用（父母/官鬼/妻财…）、吉凶表达与应期写法尚未定稿。
 * 目前 prompt 刻意保守：只复述事实 + 作象理说明，不承诺结果。
 * 等口径确定，只改这个文件即可，不需要动路由与前端。
 */

import type { ReadingFacts } from '@/lib/readings/types';

const SYSTEM_PROMPT = `你是易学盘面解读助手。规则：
1. 只能使用用户提供的盘面事实（JSON）。不得增补、改写或臆造任何卦爻、六亲、纳甲、旬空、世应、动变、神煞、宫位。
2. 先复述关键事实（本卦/变卦、动爻、旬空、用到的神煞；小成图则复述九宫与中宫、正推链），再作象理说明。
3. 盘面事实里没有「用神」。如果你要按用神讲，必须先说明「我依据什么取用」，并明确这是解读者的取用，不是盘面事实。
4. 语言平实克制，不堆砌辞藻；不下绝对化的凶灾、疾病、诉讼、投资结论，不承诺必然结果。
5. 不虚构盘面之外的个人信息（职业、年龄、亲眷、病史等）。信息不足就直说不足。`;

function liuyaoBrief(facts: Extract<ReadingFacts, { kind: 'liuyao' }>): string {
  const lines = [...facts.lines].sort((a, b) => b.position - a.position);
  const lineText = lines
    .map((l) => {
      const marks = [
        l.isWorld ? '世' : '',
        l.isResponse ? '应' : '',
        l.isMoving ? (l.isYang ? '○动' : '×动') : '',
        l.void ? '旬空' : '',
        l.monthBroken ? '月破' : '',
        ...l.stars,
      ]
        .filter(Boolean)
        .join('/');
      const hidden = l.hidden ? `，伏神${l.hidden.relation}${l.hidden.najia}` : '';
      const changed = l.changed ? `，动化${l.changed.relation}${l.changed.najia}` : '';
      return `${l.position}爻｜${l.sixGod}｜${l.relation}${l.najia}${marks ? `｜${marks}` : ''}${hidden}${changed}`;
    })
    .join('\n');

  return [
    `【六爻盘面】`,
    `起卦：${facts.time.solar} · ${facts.time.ganzhi}`,
    `问句：${facts.question || '（未填写）'}`,
    `本卦：${facts.base.name}（${facts.base.palace}宫·${facts.base.element}${facts.base.tags.length ? '·' + facts.base.tags.join('') : ''}）`,
    `变卦：${facts.changed ? `${facts.changed.name}（${facts.changed.palace}宫·${facts.changed.element}）` : '无（六爻安静）'}`,
    `动爻：${facts.movingLines.length ? facts.movingLines.join('、') : '无'}`,
    `旬空：${facts.voidBranches.join('')}`,
    `月卦身：${facts.monthBody.branch}${facts.monthBody.position ? `（${facts.monthBody.position}爻）` : '（不现）'}`,
    `神煞：驿马${facts.shensha.yima} 桃花${facts.shensha.taohua} 禄神${facts.shensha.lushen} 贵人${facts.shensha.guiren.join('')} 天医${facts.shensha.tianyi} 文昌${facts.shensha.wenchang}`,
    `六爻（上→初）：\n${lineText}`,
  ].join('\n');
}

function xctBrief(facts: Extract<ReadingFacts, { kind: 'xct' }>): string {
  const palaceText = facts.palaces
    .map(
      (p) =>
        `${p.palaceName}｜天盘${p.heaven}／地盘${p.earth}｜${p.hexName || `${p.heaven}之${p.earth}`}｜${
          p.mode ? `${p.mode}式·` : ''
        }${p.matched === null ? '' : p.matched ? '得配·' : '失配·'}${p.verdict}`,
    )
    .join('\n');

  return [
    `【小成图盘面】`,
    `起卦：${facts.time.solar} · ${facts.time.ganzhi}`,
    `问句：${facts.question || '（未填写）'}`,
    `本图：${facts.ben.name}（${facts.ben.upper}上${facts.ben.lower}下）`,
    `之图：${facts.zhi.name}（${facts.zhi.upper}上${facts.zhi.lower}下）`,
    `中宫归藏：${facts.center}`,
    `九宫（洛书序 4-9-2 / 3-5-7 / 8-1-6）：\n${palaceText}`,
    `正推链：${facts.chain.path.join(' → ')}（${facts.chain.endReason}${facts.chain.hasCycle ? '·闭环' : ''}）`,
    `链注：${facts.chain.summary}`,
  ].join('\n');
}

export function buildReadingPrompt(facts: ReadingFacts): { system: string; user: string } {
  const brief = facts.kind === 'liuyao' ? liuyaoBrief(facts) : xctBrief(facts);
  const ask =
    facts.kind === 'liuyao'
      ? '请按上面的事实解读这一卦：先复述关键事实，再说象理与走势。'
      : '请按上面的事实解读这一图：先复述关键事实，再说九宫气路与走势。';
  return {
    system: SYSTEM_PROMPT,
    user: `${brief}\n\n${ask}\n（以上事实由引擎确定性排出；不要改写事实本身。）`,
  };
}

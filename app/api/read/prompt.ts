/**
 * 解卦 prompt（服务端专用）
 * ========================
 * 原则：
 *   1. 盘面由引擎确定性排出，模型**不重排**、不改写干支/六亲/世应/旬空/动变；
 *   2. 只使用事实里出现的爻辞与神煞，缺的不补、不编；
 *   3. prompt 只在这里拼，不随客户端 bundle 下发；
 *   4. 输出走「禅意」写法：四段、少而准，不写报告体、不罗列盘面。
 */

import type { ReadingFacts } from '@/lib/readings/types';

const SYSTEM_PROMPT = `# 你是谁
你是一位六爻解卦者。熟悉《易冒》《黄金策》《增删卜易》《卜筮正宗》等通行法理，也清楚自己的边界：只作传统文化参考，不替代医疗、法律、财务的专业判断。

# 你收到的是已经排好的盘
用户消息是一份由引擎确定性排出的盘面事实：起卦时间、所问、本卦与变卦、宫位、动爻、旬空、月卦身、十三神煞，六爻的纳甲/六亲/六神/世应/伏神/动变，以及本卦与变卦的卦辞、动爻爻辞。
- 不要重排盘，不要改写任何干支、六亲、世应、旬空、动爻、神煞；
- 只使用事实中出现的爻辞与神煞，没有给出的不要补、不要编；
- 不要虚构古籍原文。能确证才引；不确定就写「通行法理如此」。

# 断卦次序（内部执行，不要把这些步骤逐条复述）
1. 取用神：自占取世爻；问父母/文书取父母；问财/妻取妻财；问官/工作/病邪取官鬼；问子女/医药取子孙；问同辈/竞争取兄弟。代占先说明关系。用神多现时取动、取世应、取旺、取近，并说明取舍。
2. 看月建日辰：用神旺相休囚、月破日破、生扶冲克、旬空、墓绝。
3. 看动变：动爻生克、回头生克、化进退、化空破墓绝、六合六冲、三合、反吟伏吟，以及变爻对本爻的作用。
4. 看世应：世为己，应为对方或事所；看生克冲合。
5. 看六神与神煞：只作象，不单断。白虎血光、朱雀口舌、勾陈迟滞、螣蛇惊忧、青龙喜庆、玄武暗昧。
6. 看卦象与辞：卦名、六冲六合、卦辞与动爻爻辞，作取象层。

# 判断原则
- 主干是用神、月建日辰与动变；六神、神煞、卦辞只是象。多条独立线索同指一事时可上调象的权重，但不得越过主干。
- 吉象与凶象并见时，分别列出，并说明各自成立的条件；不要只挑一边。
- 区分：盘面事实 / 卦理推断 / 应期推测 / 现实建议。
- 不断死，不断人的价值，不把或然当必然，不保证准确。
- 应期给区间与触发条件（冲实、填实、值日、合日等）；证据不足就写「应期需更多信息」，不精确到时辰，也不把卦理应期当成现实承诺。
- 涉及健康、急症：先提醒以医生判断为准；涉及法律、财务：提醒咨询专业人士。
- 六神与神煞只作辅助象，不可喧宾夺主。

# 写法（禅意：少而准）
- 平实、克制，不写报告体；不要 Markdown 表格，不要罗列盘面（界面已经给出）。
- 分四段，每段一到三个短段，段落之间空一行：
  一、取用
  二、盘面
  三、走势
  四、应期
- 结尾只留一句可执行的提醒，不承诺结果。
- 总长控制在 500–800 字；宁可少说，不要凑。`;

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
        .join('·');
      const hidden = l.hidden ? `，伏神${l.hidden.relation}${l.hidden.najia}` : '';
      const changed = l.changed ? `，动化${l.changed.relation}${l.changed.najia}` : '';
      return `${l.position}爻 ${l.sixGod} ${l.relation}${l.najia}${marks ? `［${marks}］` : ''}${hidden}${changed}`;
    })
    .join('\n');

  const s = facts.shensha;
  const shensha = [
    `贵人 ${s.guiren}`,
    `禄神 ${s.lushen}`,
    `羊刃 ${s.yangren}`,
    `文昌 ${s.wenchang}`,
    `驿马 ${s.yima}`,
    `桃花 ${s.taohua}`,
    `将星 ${s.jiangxing}`,
    `华盖 ${s.huagai}`,
    `谋星 ${s.mouxing}`,
    `劫煞 ${s.jiesha}`,
    `灾煞 ${s.zaisha}`,
    `天医 ${s.tianyi}`,
    `天喜 ${s.tianxi}`,
  ].join('｜');

  const oracleBits: string[] = [`本卦卦辞：${facts.oracle.baseGuaCi ?? '（未收）'}`];
  if (facts.oracle.changedGuaCi && facts.changed) {
    oracleBits.push(`变卦卦辞：${facts.oracle.changedGuaCi}`);
  }
  for (const y of facts.oracle.movingLines) oracleBits.push(`动爻爻辞：${y.text}`);
  if (facts.oracle.yong) oracleBits.push(`${facts.oracle.yong.title}：${facts.oracle.yong.text}`);

  return [
    `【起卦】${facts.time.solar} · ${facts.time.ganzhi}`,
    `【所问】${facts.question || '（未填写）'}`,
    `【本卦】${facts.base.name}（${facts.base.palace}宫·${facts.base.element}${facts.base.tags.length ? '·' + facts.base.tags.join('') : ''}）`,
    `【变卦】${facts.changed ? `${facts.changed.name}（${facts.changed.palace}宫·${facts.changed.element}）` : '无（六爻安静）'}`,
    `【动爻】${facts.movingLines.length ? facts.movingLines.join('、') : '无'}`,
    `【旬空】${facts.voidBranches.join('')}　【月卦身】${facts.monthBody.branch}${facts.monthBody.position ? `（${facts.monthBody.position}爻）` : '（不现）'}`,
    `【十三神煞】${shensha}`,
    `【经文】${oracleBits.join('\n')}`,
    `【六爻（上→初）】\n${lineText}`,
  ].join('\n');
}

function xctBrief(facts: Extract<ReadingFacts, { kind: 'xct' }>): string {
  const palaceText = facts.palaces
    .map(
      (p) =>
        `${p.palaceName} 天盘${p.heaven}／地盘${p.earth} ${p.hexName || `${p.heaven}之${p.earth}`}｜${
          p.mode ? `${p.mode}式·` : ''
        }${p.matched === null ? '' : p.matched ? '得配·' : '失配·'}${p.verdict}`,
    )
    .join('\n');

  return [
    `【小成图】`,
    `起卦：${facts.time.solar} · ${facts.time.ganzhi}`,
    `所问：${facts.question || '（未填写）'}`,
    `本图：${facts.ben.name}（${facts.ben.upper}上${facts.ben.lower}下）`,
    `之图：${facts.zhi.name}（${facts.zhi.upper}上${facts.zhi.lower}下）`,
    `中宫归藏：${facts.center}`,
    `九宫：\n${palaceText}`,
    `正推链：${facts.chain.path.join(' → ')}（${facts.chain.endReason}${facts.chain.hasCycle ? '·闭环' : ''}）`,
    `链注：${facts.chain.summary}`,
  ].join('\n');
}

export function buildReadingPrompt(facts: ReadingFacts): { system: string; user: string } {
  const brief = facts.kind === 'liuyao' ? liuyaoBrief(facts) : xctBrief(facts);
  const ask =
    facts.kind === 'liuyao'
      ? '请按四段写出这一卦的解读。盘面已是定局，不必重排，也不要复述全部爻位。'
      : '请按盘面事实解读这一图，先说九宫气路，再谈走势。';
  return {
    system: SYSTEM_PROMPT,
    user: `${brief}\n\n${ask}\n（以上事实由引擎确定性排出；不要改写事实本身。）`,
  };
}

/**
 * 小成图解卦 prompt（服务端专用）
 * =================================
 * 口径来源：`docs/xct-prompt-spec.md`（v0.2，已与项目方确认）
 *   - 取「用宫」不看爻位；绝弃五行生克，纯象数（阖辟往来 + 阴阳得配）
 *   - 主用宫做完整推演，兼看宫只作参考
 *   - 正推链不预计算：给九宫天盘 + 卦→本宫对照 + 收敛规则，由解卦者自行推演
 *   - 生育：不论求测者性别，一律看坤宫天盘卦；卦象与中爻两法并列
 *   - 本版禁用：用宫空亡、归藏九星（伏位/延年/生气/天医/绝命/祸害/五鬼/六煞）、卦气旺弱
 *     （资料只有用法没有定义，原著 PDF 无文本层，无法查证 —— 宁可不说，不许臆造）
 */

import type { ReadingFacts } from '@/lib/readings/types';
import { birthGenderByHeaven, gongTableText, PALACE_NAMES_TEXT } from '@/lib/xct/yong-gong';
import type { PalaceNumber, Trigram } from '@/lib/xct/types';

const SYSTEM_PROMPT = `# 你是谁
你是一位小成图解卦者，恪守霍斐然一脉宗法：绝弃五行生克，纯以象数立论。
你手上只有三样东西：九宫天地盘、阖辟往来四象、阴阳得配失配。
不冒充古籍原文；能确证才引，不能确证就写「通行法理如此」。

# 你收到的是已经排好的盘
用户消息是一份由程序确定性排出的盘面：起卦时间、所问、性别与婚否、本图与之图、中宫归藏、
九宫（地盘卦 / 天盘卦 / 天盘地盘升降 / 四象 / 得配失配 / 八断）、卦→本宫对照表、
天盘出现、缺席与重复的卦；六爻安静时另给宜变之爻。
- 不要重排盘、不要改宫位与四象、不要增补不存在的卦；
- 不要引入五行、六亲、世应、旬空、月建日辰——本门不用这些。

# 断法次序（内部执行，不必逐条复述）
1. 定用宫：按「八宫取用表」把题干归到某一宫；婚占按性别与婚否分路；父母、考学、官运另有专宫。
   **主用宫只取一个**，其余相关宫列为「兼看」，只作参考，不做完整推演。
2. 看主用宫四象：天盘何卦临地盘何卦，成阖／辟／往／来，阴阳得配或失配，落为八断之一。
3. 正推：主用宫天盘卦 → 查「卦→本宫」得其本宫 → 再看该宫天盘卦，逐跳推进。
   收敛只有三种：归位（天盘即本宫地盘）、闭环（A 飞 B、B 飞 A）、入中宫（归藏定调）。
4. 旁推：推至多叉、吉凶相抵或含混处，用对冲宫一推定：乾⟷坤、艮⟷兑、震⟷巽、坎⟷离。
5. 反推（仅当题干是「为何如此／谁在阻／何时丢的」）：取当前宫天盘卦，逆查其地盘本宫，逐级回溯至发端。
6. 应期：三分法——兑乾离属上（上旬、早、青年），震巽属中（中旬、午、中年），坎艮坤属下（下旬、晚、老年）；
   两分法可定单双。
7. 专项：婚姻、生育、父母、考学、官运、财、疾病、失物出行，各按专条。

# 八宫取用表
${gongTableText()}

# 专项要领（仅当题干相关时启用）
婚姻·已婚：男看坤二宫，女看乾六宫；看该宫四象与飞宫路线。
  天盘无坤（已婚男）或天盘无乾（已婚女）＝无配偶或生离之象；飞宫路线凶而末宫转吉＝先风波后圆满。
  触类（进阶，次于主用宫）：触巽主摇摆不专、触兑主第三者、触坎主隐情。
婚姻·未婚：男在天盘寻巽，无巽寻兑；女在天盘寻震，无震寻艮，以该卦本宫为用。
  用神卦落乾宫或坤宫，多主父辈包办或媒人介绍；落他宫多为自由恋爱。
生育：**不论求测者性别，一律看地盘坤二宫所落的天盘卦**。
  卦象法：落乾、坎、巽、兑为男；落坤、离、震、艮为女。
  中爻法：取坤宫所得卦的第二爻，阳爻为男、阴爻为女（胎儿未生前可用）。
  两法若不一致，并列呈现，说明分歧，不强行定一。
父母：父看乾六宫、母看坤二宫；以该宫四象与飞宫路线断吉凶。
子女：坤宫四象吉则顺产，凶则难产或流产。
考学：以坤二宫直断；四象吉可考取，凶则不成；再以天盘坤所落之宫参看。
官运：以乾六宫为用；四象吉、飞宫顺者可期；再以天盘乾所落之宫定行业。
牢狱：看天盘坎所在之宫；四象凶可论官非，飞宫顺出者轻、反者重。
财：以巽四宫为用；四象吉则得财，飞宫入乾震（升）者进，入坎艮坤（降）者滞。
失物出行：以震三宫为用；正推入中宫归藏者，物入深库难全。

# 本版禁用（资料未定义，不得臆造）
- 不写「用宫空亡」「某宫空亡」这类判语；
- 不写「归藏出伏位／延年／生气／天医／绝命／祸害／五鬼／六煞」；
- 不写「卦气旺弱」。
若题干必须靠这些才能断，就直接说明「这一条需另定口径」，不要编。

# 铁律
- 法无定法，以初卦为准：不因结果不合心意而改取用、改宫位。
- 触类可为其象：见文书看离、见动静看震、见货物看巽、见言谈看兑，但须说明理由。
- 不断死、不断人的价值、不把或然当必然、不保证准确。
- 涉及健康、法律、财务：提醒以医生／律师／专业人士判断为准。

# 写法（禅意：少而准）
- 不写报告体，不用任何 Markdown 标记（不加粗、不表格、不用层级符号）。
- 四段固定，段首必须是下面四行原文，单独成行，正文另起一行：
一、定宫
二、四象
三、推演
四、应期
- 字数：定宫约 100 字、四象约 150 字、推演约 150 字、应期约 80 字；全文 400–520 字，硬上限 550 字。
- 正推**不要逐站复述**：只写「起点 → 关键阻点 → 终局」两三站，中间同质的跳宫一句带过；
  收敛方式（归位／闭环／入中宫）一句话点明即可。
- 不要复述整个九宫，只写真正改变结论的宫位与卦。
- 写完自查：超过 550 字就删修饰句与重复宫位。`;

function brief(facts: Extract<ReadingFacts, { kind: 'xct' }>): string {
  const heaven = Object.fromEntries(facts.palaces.map((p) => [p.palace, p.heaven])) as Record<PalaceNumber, Trigram>;
  const birth = birthGenderByHeaven(heaven);

  const palaceRows = facts.palaces
    .map((p) => {
      if (p.palace === 5) {
        return `${p.palaceName}（中宫）　归藏 ${facts.center}`;
      }
      const mode = p.mode ? `${p.mode}式` : '—';
      const matched = p.matched === null ? '—' : p.matched ? '得配' : '失配';
      return `${p.palaceName}　地盘${p.earth}（${p.rising.earth}）／天盘${p.heaven}（${p.rising.heaven}）　${p.hexName || '—'}　${mode}·${matched}·${p.verdict}`;
    })
    .join('\n');

  const maritalText =
    facts.marital === 'married' ? '已婚' : facts.marital === 'unmarried' ? '未婚' : '婚否未明';
  const castFromText =
    facts.castFrom === 'coin' ? '六爻三钱摇卦转化' : facts.castFrom === 'four' ? '天地数起卦' : facts.castFrom === 'time' ? '时间起卦' : '自定选卦';

  const lines = [
    `【起卦】${facts.time.solar} · ${facts.time.ganzhi}　（${castFromText}）`,
    `【所问】${facts.question || '（未填写）'}`,
    `【求测者】${facts.gender}　${maritalText}`,
    `【本图】${facts.ben.name}（${facts.ben.upper}上${facts.ben.lower}下）　【之图】${facts.zhi.name}（${facts.zhi.upper}上${facts.zhi.lower}下）`,
    `【中宫归藏】${facts.center}＝${PALACE_NAMES_TEXT[facts.center as Trigram] ?? ''}`,
  ];

  if (facts.movingLines.length) {
    lines.push(`【动爻】${facts.movingLines.join('、')}`);
  }
  if (facts.yiBian) {
    const yb = facts.yiBian;
    lines.push(
      `【宜变】${yb.position ? `第${yb.position}爻` : '无'}　营数合 ${yb.sum}　之卦来源：${
        yb.zhiSource === 'yibian' ? '静卦取宜变之爻' : '动爻'
      }　${yb.note}`,
    );
  }

  lines.push(
    `【九宫】\n${palaceRows}`,
    `【卦→本宫】${Object.entries(facts.guaToPalace)
      .map(([g, p]) => `${g}${p}`)
      .join('　')}`,
    `【天盘出现】${facts.heavenSeen.join('、')}　【缺席】${facts.heavenMissing.join('、') || '无'}　【重复】${
      facts.heavenDuplicate.join('、') || '无'
    }`,
  );

  if (facts.question.includes('孕') || facts.question.includes('怀') || facts.question.includes('生')) {
    lines.push(
      `【生育判据（坤宫）】天盘卦 ${birth.gua}　卦象法：${birth.byTrigram}　中爻法：第2爻${birth.middleYao.yang ? '阳' : '阴'}→${birth.middleYao.gender}　两法${birth.agree ? '一致' : '不一致（并列呈现）'}`,
    );
  }

  return lines.join('\n');
}

export function buildXctPrompt(facts: Extract<ReadingFacts, { kind: 'xct' }>): { system: string; user: string } {
  const ask =
    '请按四段解读这一图：先定用宫（主用一句、兼看一句），再看主用宫四象，再自行正推并旁推定性，最后给应期。不必复述整个九宫。';
  return {
    system: SYSTEM_PROMPT,
    user: `${brief(facts)}\n\n${ask}\n（以上事实由引擎确定性排出；不要改写事实本身，也不要引入五行六亲。）`,
  };
}

"""差分基准生成器：用原 bazi-web 的 Python 六爻排盘引擎输出 canonical 指纹。

用途：验证 liuyao(TS) 的纳甲装卦 / 世应 / 六亲 / 六神 / 伏神 / 旬空 / 月卦身 / 神煞
与原引擎逐案一致。仅做基准生成，不参与运行时。

    python tests/generate_python_baseline.py > tests/fixtures/python-baseline.json
"""
from __future__ import annotations

import hashlib
import json
import os
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "bazi-web"
sys.path.insert(0, str(ROOT))

from src.engine.core import HexagramEngine  # noqa: E402


def canonical(engine: HexagramEngine) -> str:
    s = engine.shensha
    guiren = s.get("guiren", "").replace("、", ",")
    parts = [
        engine.base_name,
        engine.changed_name or "",
        ",".join(str(x) for x in engine.moving_lines),
        engine.void_branches[0],
        engine.void_branches[1],
        engine.month_body_branch,
        str(engine.month_body_pos),
        s.get("yima", ""),
        s.get("taohua", ""),
        s.get("lushen", ""),
        guiren,
    ]
    for ln in engine.lines:
        hs = ln.get("hidden_spirit")
        hid = (
            f"{hs['stem']}{hs['branch']}{hs['element']}{hs['relation']}/{hs['fly_relation_desc']}"
            if hs
            else ""
        )
        ch = ln.get("changed_line")
        chs = f"{ch['stem']}{ch['branch']}{ch['element']}{ch['relation']}" if ch else ""
        parts.append(
            "|".join(
                [
                    str(ln["position"]),
                    "1" if ln["is_world"] else "0",
                    "1" if ln["is_response"] else "0",
                    f"{ln['stem']}{ln['branch']}{ln['element']}",
                    ln["relation"],
                    "1" if ln["is_moving"] else "0",
                    ln["six_god"],
                    hid,
                    chs,
                ]
            )
        )
    return "|".join(parts)


def main() -> None:
    cases = []
    idx = 0

    # A. 全部 4096 种三钱投掷组合（固定己丑日 / 申月，与 core.py 自检同一组）
    for a in range(4):
        for b in range(4):
            for c in range(4):
                for d in range(4):
                    for e in range(4):
                        for f in range(4):
                            coins = [a, b, c, d, e, f]
                            engine = HexagramEngine("丙午", "申", "己丑", "申", coins)
                            cases.append(
                                {
                                    "i": idx,
                                    "year_gz": "丙午",
                                    "month_b": "申",
                                    "day_gz": "己丑",
                                    "hour_b": "申",
                                    "coins": coins,
                                    "hash": hashlib.sha256(canonical(engine).encode()).hexdigest(),
                                }
                            )
                            idx += 1

    # B. 随机日柱 / 月建 / 时辰，覆盖十神起例与神煞的全部干支
    stems = "甲乙丙丁戊己庚辛壬癸"
    branches = "子丑寅卯辰巳午未申酉戌亥"
    rng = random.Random(20261105)
    for _ in range(600):
        day_gz = rng.choice(stems) + rng.choice(branches)
        month_b = rng.choice(branches)
        hour_b = rng.choice(branches)
        year_gz = rng.choice(stems) + rng.choice(branches)
        coins = [rng.randrange(4) for _ in range(6)]
        engine = HexagramEngine(year_gz, month_b, day_gz, hour_b, coins)
        cases.append(
            {
                "i": idx,
                "year_gz": year_gz,
                "month_b": month_b,
                "day_gz": day_gz,
                "hour_b": hour_b,
                "coins": coins,
                "hash": hashlib.sha256(canonical(engine).encode()).hexdigest(),
            }
        )
        idx += 1

    json.dump({"engine": "bazi-web/src/engine/core.py", "count": len(cases), "cases": cases}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()

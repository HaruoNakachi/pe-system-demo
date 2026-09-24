/* scoring.js
 * 回答対象の組み立て・集計・レベル認定の判定。
 *
 * 集計の約束
 *  - 適用外（資格要件を満たさない実践例）は分母から外す。
 *  - 担当外・観察機会なしは低評価と区別し、分母から外す。
 *  - 有効な回答が0件の評価領域は平均を「—」とし、重み付き総合スコアからも外して
 *    残りの重みを再正規化する。
 *  - 各個人の目標の領域スコアは、合意した目標ごとのスコア（その目標の実践例の平均）を
 *    目標ごとの重みで加重平均したもの（改訂方針D・R28）。有効な回答が0件の目標は外し、
 *    残りの目標で重みを再正規化する。他者評価も同じ計算方法で算出する。
 *  - 3領域の重みは個人ごとの値（pe_demo_personal_weight）を使う（R30）。
 *  - レベル認定の判定は専門実践評価のみが対象であり、目標・重みの影響を受けない（R21・R27）。
 */

var PE_Scoring = (function () {

  function romanOf(level) {
    for (var i = 0; i < PE_LEVEL_DEFINITIONS.length; i++) {
      if (PE_LEVEL_DEFINITIONS[i].level === level) return PE_LEVEL_DEFINITIONS[i].roman;
    }
    return String(level);
  }

  function levelDefinitionOf(level) {
    for (var i = 0; i < PE_LEVEL_DEFINITIONS.length; i++) {
      if (PE_LEVEL_DEFINITIONS[i].level === level) return PE_LEVEL_DEFINITIONS[i];
    }
    return null;
  }

  /* 画面表記のための補助。
   * 内部の区分名は「適用外」のままで、集計・判定は一切これを見ない。
   * 画面には資格名を動的に埋め込んだ「要資格（○○）項目」と表示する。 */
  function licenseNamesOf(items) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var n = items[i] && items[i].licenseName;
      if (n && out.indexOf(n) === -1) out.push(n);
    }
    return out;
  }

  function licenseTerm(names) {
    var list = (names && names.length) ? names.join('・') : '';
    return list ? '要資格（' + list + '）項目' : '要資格項目';
  }

  /* 回答対象の実践例を、親（基礎評価の項目／レベル毎の目標／合意した目標）ごとの
   * グループとして組み立てる（R2）。
   * personalGoals を渡した場合は、合意した目標をマスターのプリセットではなくそちらから作る
   * （設定画面で編集した合意した目標。改訂方針D）。 */
  function buildGroups(master, profile, personalGoals) {
    var groups = [];

    /* 基礎評価：設定によらず常に全項目（R26） */
    for (var i = 0; i < master.basicItems.length; i++) {
      var bi = master.basicItems[i];
      groups.push({
        key: 'basic:' + bi.id,
        domainId: 'basic',
        domainName: '基礎評価',
        parentKind: '基礎評価の項目',
        parentName: bi.name,
        parentText: '',
        ladderId: null,
        ladderName: null,
        competencyId: null,
        competencyName: null,
        level: null,
        requiresLicense: false,
        notApplicable: false,
        items: bi.practiceItems.map(function (pi) {
          return {
            id: pi.id, text: pi.text, source: pi.source,
            domainId: 'basic', ladderId: null, competencyId: null,
            level: null, notApplicable: false
          };
        })
      });
    }

    /* 専門実践評価：チャレンジレベル1レベル分（R4） */
    for (var l = 0; l < master.ladders.length; l++) {
      var ladder = master.ladders[l];
      if (ladder.id === 'management' && !profile.managementLadder) continue;
      var targetLevel = (ladder.fixedLevel === null || ladder.fixedLevel === undefined)
        ? profile.challengeLevel : ladder.fixedLevel;

      for (var c = 0; c < ladder.competencies.length; c++) {
        var comp = ladder.competencies[c];
        for (var g = 0; g < comp.levelGoals.length; g++) {
          var goal = comp.levelGoals[g];
          if (goal.level !== targetLevel) continue;
          var na = !!(goal.requiresLicense && !profile.hasLicense);
          /* 資格名は画面表記にのみ使う。判定には使わない。 */
          var licenseName = goal.requiresLicense ? (goal.licenseName || '') : '';
          (function (ladder, comp, goal, na, licenseName) {
            groups.push({
              key: 'prof:' + ladder.id + ':' + comp.id + ':' + goal.level,
              domainId: 'professional',
              domainName: '専門実践評価',
              parentKind: 'レベル毎の目標',
              parentName: ladder.name + '｜' + comp.name + '｜レベル' + romanOf(goal.level),
              parentText: goal.text,
              ladderId: ladder.id,
              ladderName: ladder.name,
              competencyId: comp.id,
              competencyName: comp.name,
              level: goal.level,
              requiresLicense: !!goal.requiresLicense,
              licenseName: licenseName,
              notApplicable: na,
              items: goal.practiceItems.map(function (pi) {
                return {
                  id: pi.id, text: pi.text, source: pi.source,
                  domainId: 'professional', ladderId: ladder.id, competencyId: comp.id,
                  level: goal.level, notApplicable: na, licenseName: licenseName
                };
              })
            });
          })(ladder, comp, goal, na, licenseName);
        }
      }
    }

    /* 各個人の目標（R28）。合意した目標は複数持てる。目標ごとに親としてまとめる（R2）。 */
    var goals = personalGoals || master.personalGoals;
    for (var p = 0; p < goals.length; p++) {
      (function (pg, index, count) {
        groups.push({
          key: 'personal:' + pg.id,
          domainId: 'personal',
          domainName: '各個人の目標',
          parentKind: '合意した目標',
          parentName: '合意した目標',
          parentText: pg.text,
          goalId: pg.id,
          goalWeight: (typeof pg.weight === 'number') ? pg.weight : null,
          goalIndex: index,
          goalCount: count,
          ladderId: null,
          ladderName: null,
          competencyId: null,
          competencyName: null,
          level: null,
          requiresLicense: false,
          notApplicable: false,
          items: pg.practiceItems.map(function (pi) {
            return {
              id: pi.id, text: pi.text, source: pi.source,
              domainId: 'personal', goalId: pg.id, ladderId: null, competencyId: null,
              level: null, notApplicable: false
            };
          })
        });
      })(goals[p], p, goals.length);
    }

    return groups;
  }

  function flatten(groups) {
    var out = [];
    for (var i = 0; i < groups.length; i++) {
      for (var j = 0; j < groups[i].items.length; j++) {
        var item = groups[i].items[j];
        item.group = groups[i];
        out.push(item);
      }
    }
    return out;
  }

  function answerOf(answers, id) {
    var a = answers[id];
    if (!a) return { score: null, na: false, note: '' };
    return {
      score: (typeof a.score === 'number') ? a.score : null,
      na: !!a.na,
      note: a.note || ''
    };
  }

  /* 進捗：適用外は対象数から除く */
  function progress(items, answers) {
    var total = 0, answered = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].notApplicable) continue;
      total++;
      var a = answerOf(answers, items[i].id);
      if (a.na || a.score !== null) answered++;
    }
    return { answered: answered, total: total };
  }

  /* 合意した目標ごとのスコアを、目標ごとの重みで加重平均する（改訂方針D・R28）。
   * goals: [{ id, weight }]（weight は目標どうしの比率％。合計100）
   * goalAcc: { 目標ID: { selfSum, selfCount, otherSum, otherCount } }
   *
   *   目標のスコア g_i        ＝ その目標の有効な実践例の評価基準の合計 ÷ 件数
   *   各個人の目標の領域スコア ＝ Σ g_i × (w_i ÷ W)   … W は有効な回答がある目標の重みの合計
   *
   * 有効な回答が0件の目標は加重平均から外し、残りの目標で重みを再正規化する。
   * 重みを先に w_i ÷ W の比にしてから掛けるのは、目標が1つのとき比が厳密に 1 になり、
   * 従来の単純平均と浮動小数点の値まで一致させるためである。 */
  function weightedGoalAverage(goals, goalAcc, sumKey, countKey) {
    var used = [], weightSum = 0;
    for (var i = 0; i < goals.length; i++) {
      var g = goalAcc[goals[i].id];
      if (!g || g[countKey] === 0) continue;
      var w = (typeof goals[i].weight === 'number' && goals[i].weight > 0) ? goals[i].weight : 0;
      used.push({ avg: g[sumKey] / g[countKey], weight: w });
      weightSum += w;
    }
    if (used.length === 0 || weightSum <= 0) return null;
    var value = 0;
    for (var j = 0; j < used.length; j++) value += used[j].avg * (used[j].weight / weightSum);
    return value;
  }

  /* 目標ごとのスコア（ダッシュボードの目標ごとの表示用）。
   * 集計の約束は領域別スコアと同じ（要資格・担当外・観察機会なし・未回答は分母から外す。
   * 他者評価は本人評価に評価基準の値がある実践例のうち、他者評価の値があるものだけを数える）。 */
  function goalScores(items, answers, otherAnswers, goals) {
    var acc = accumulateGoals(items, answers, otherAnswers);
    var out = [];
    for (var i = 0; i < goals.length; i++) {
      var g = acc[goals[i].id] || { selfSum: 0, selfCount: 0, otherSum: 0, otherCount: 0, targetCount: 0 };
      out.push({
        id: goals[i].id,
        text: goals[i].text,
        weight: goals[i].weight,
        selfCount: g.selfCount,
        otherCount: g.otherCount,
        targetCount: g.targetCount,
        selfAverage: g.selfCount > 0 ? g.selfSum / g.selfCount : null,
        otherAverage: g.otherCount > 0 ? g.otherSum / g.otherCount : null
      });
    }
    return out;
  }

  function accumulateGoals(items, answers, otherAnswers) {
    var acc = {};
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.domainId !== 'personal' || !it.goalId) continue;
      var g = acc[it.goalId];
      if (!g) g = acc[it.goalId] = { selfSum: 0, selfCount: 0, otherSum: 0, otherCount: 0, targetCount: 0 };
      if (it.notApplicable) continue;
      g.targetCount++;
      var ans = answerOf(answers, it.id);
      if (ans.na || ans.score === null) continue;
      g.selfSum += ans.score; g.selfCount++;
      var other = otherAnswers[it.id];
      if (typeof other === 'number') { g.otherSum += other; g.otherCount++; }
    }
    return acc;
  }

  /* 領域別スコア。本人評価・他者評価の両方を算出する。
   * options（任意）:
   *   weights: { basic, professional, personal }  個人ごとの3領域の重み（R30）。省略時は PE_DOMAINS の既定値
   *   goals:   [{ id, weight }]                   合意した目標と目標ごとの重み（R28）。
   *            渡した場合、各個人の目標の平均は目標ごとの加重平均になる。 */
  function domainScores(items, answers, otherAnswers, options) {
    var weights = (options && options.weights) || null;
    var goals = (options && options.goals) || null;
    var acc = {};
    for (var d = 0; d < PE_DOMAINS.length; d++) {
      var id = PE_DOMAINS[d].id;
      acc[id] = {
        id: id, name: PE_DOMAINS[d].name,
        weight: (weights && typeof weights[id] === 'number') ? weights[id] : PE_DOMAINS[d].weight,
        defaultWeight: PE_DOMAINS[d].weight,
        selfSum: 0, selfCount: 0, otherSum: 0, otherCount: 0,
        notApplicableCount: 0, unobservedCount: 0, unansweredCount: 0, targetCount: 0
      };
    }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var a = acc[it.domainId];
      if (!a) continue;
      if (it.notApplicable) { a.notApplicableCount++; continue; }
      a.targetCount++;
      var ans = answerOf(answers, it.id);
      if (ans.na) {
        a.unobservedCount++;
      } else if (ans.score !== null) {
        a.selfSum += ans.score; a.selfCount++;
        var other = otherAnswers[it.id];
        if (typeof other === 'number') { a.otherSum += other; a.otherCount++; }
      } else {
        a.unansweredCount++;
      }
    }
    var list = [];
    for (var k = 0; k < PE_DOMAINS.length; k++) {
      var x = acc[PE_DOMAINS[k].id];
      x.selfAverage = x.selfCount > 0 ? (x.selfSum / x.selfCount) : null;
      x.otherAverage = x.otherCount > 0 ? (x.otherSum / x.otherCount) : null;
      if (x.id === 'personal' && goals) {
        var goalAcc = accumulateGoals(items, answers, otherAnswers);
        x.selfAverage = weightedGoalAverage(goals, goalAcc, 'selfSum', 'selfCount');
        x.otherAverage = weightedGoalAverage(goals, goalAcc, 'otherSum', 'otherCount');
        x.goalWeighted = true;
      }
      list.push(x);
    }
    return list;
  }

  /* 重み付き総合スコア。有効回答0件の領域は重みごと除き、残りを再正規化する。
   * 3領域の重みは個人ごとに調整できる（R30）ため、重みが0の領域がありうる。
   * 再正規化の注記は「重みを持つ領域を除いたとき」だけ出す（重み0の領域は除いても配分が変わらない）。 */
  function weightedTotal(domainList, which) {
    var key = which === 'other' ? 'otherAverage' : 'selfAverage';
    var sum = 0, weightSum = 0, excluded = [], excludedWeight = 0;
    for (var i = 0; i < domainList.length; i++) {
      var d = domainList[i];
      if (d[key] === null) {
        if (d.weight > 0) { excluded.push(d.name); excludedWeight += d.weight; }
        continue;
      }
      sum += d[key] * d.weight;
      weightSum += d.weight;
    }
    return {
      value: weightSum > 0 ? (sum / weightSum) : null,
      usedWeight: weightSum,
      excluded: excluded,
      renormalized: weightSum > 0 && excludedWeight > 0
    };
  }

  /* レベル認定の判定。実践ラダーとマネジメントラダーを別々に判定する（R20）。
   * 対象は専門実践評価のみ（R21・R27）。判定に使うのは本人評価。 */
  function certification(items, answers, ladderId, master, profile) {
    var ladder = null;
    for (var i = 0; i < master.ladders.length; i++) {
      if (master.ladders[i].id === ladderId) ladder = master.ladders[i];
    }
    var targetLevel = (!ladder || ladder.fixedLevel === null || ladder.fixedLevel === undefined)
      ? profile.challengeLevel : ladder.fixedLevel;

    var met = [], notMet = [], undecidable = [], unanswered = [], notApplicable = [];
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      if (it.domainId !== 'professional' || it.ladderId !== ladderId) continue;
      if (it.notApplicable) { notApplicable.push(it); continue; }
      var a = answerOf(answers, it.id);
      if (a.na) { undecidable.push(it); continue; }
      if (a.score === null) { unanswered.push(it); continue; }
      if (a.score >= 3) met.push(it); else notMet.push(it);
    }

    var targetCount = met.length + notMet.length + undecidable.length + unanswered.length;
    var status, message;
    if (targetCount === 0) {
      status = 'none';
      message = notApplicable.length > 0
        ? '対象の実践例がすべて' + licenseTerm(licenseNamesOf(notApplicable)) + 'のため、判定の対象がありません。'
        : '判定の対象となる実践例がありません。';
    } else if (unanswered.length > 0) {
      status = 'pending';
      message = '未回答の実践例があるため、判定を保留しています。';
    } else if (notMet.length > 0) {
      status = 'notMet';
      message = '上位2段階（3・4）がついていない実践例があるため、認定の要件を満たしていません。';
    } else if (undecidable.length > 0) {
      status = 'pending';
      message = '担当外・観察機会なしの実践例があるため、判定を保留しています（未達としては扱いません）。';
    } else {
      status = 'met';
      message = '対象の実践例すべてに上位2段階（3・4）がついており、認定の要件を満たしています。';
    }

    return {
      ladderId: ladderId,
      ladderName: ladder ? ladder.name : ladderId,
      level: targetLevel,
      levelRoman: romanOf(targetLevel),
      status: status,
      message: message,
      met: met, notMet: notMet, undecidable: undecidable,
      unanswered: unanswered, notApplicable: notApplicable
    };
  }

  /* 本人評価と他者評価の差。評価基準が1つ以上違う項目を返す（FR-14）。
   *
   * この関数は病院内管理者の画面で使う。スタッフ画面には表示しない（改訂方針A）。
   * 差の一覧と評価者の見立ては面談の場で対話とともに扱うものであり、本人が事前に単独で見ると
   * 面談前に身構える材料になりやすいためである。
   * そのためダッシュボード（スタッフ画面）からは呼び出していない。
   * 病院内管理者の画面を作るときにそのまま再利用するため、ロジックは残してある。
   * 集計・レベル認定の判定はこの関数を一切参照しない。 */
  function gaps(items, answers, otherAnswers) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.notApplicable) continue;
      var a = answerOf(answers, it.id);
      if (a.na || a.score === null) continue;
      var other = otherAnswers[it.id];
      if (typeof other !== 'number') continue;
      var diff = Math.abs(a.score - other);
      if (diff >= 1) {
        out.push({ item: it, self: a.score, other: other, diff: diff });
      }
    }
    out.sort(function (x, y) { return y.diff - x.diff; });
    return out;
  }

  /* 実践ラダーの4つの力のレーダーチャート用データ */
  function radarAxes(items, answers, otherAnswers, master) {
    var practice = null;
    for (var i = 0; i < master.ladders.length; i++) {
      if (master.ladders[i].id === 'practice') practice = master.ladders[i];
    }
    var axes = [];
    if (!practice) return axes;
    for (var c = 0; c < practice.competencies.length; c++) {
      var comp = practice.competencies[c];
      var selfSum = 0, selfCount = 0, otherSum = 0, otherCount = 0;
      var state = 'unanswered';
      for (var j = 0; j < items.length; j++) {
        var it = items[j];
        if (it.ladderId !== 'practice' || it.competencyId !== comp.id) continue;
        if (it.notApplicable) { state = 'notApplicable'; continue; }
        var a = answerOf(answers, it.id);
        if (a.na) { if (state !== 'answered') state = 'unobserved'; continue; }
        if (a.score === null) continue;
        state = 'answered';
        selfSum += a.score; selfCount++;
        var other = otherAnswers[it.id];
        if (typeof other === 'number') { otherSum += other; otherCount++; }
      }
      axes.push({
        label: comp.name,
        state: state,
        self: selfCount > 0 ? selfSum / selfCount : null,
        other: otherCount > 0 ? otherSum / otherCount : null
      });
    }
    return axes;
  }

  /* ---- チャート用のデータ（表示専用。集計・判定には一切使わない） ----
   * 値のない軸（適用外・担当外・観察機会なし・未回答）の扱いは
   * 既存の radarAxes と同じ方針である（値を null にし、state で理由を返す）。 */

  function aggregateItems(list, answers, otherAnswers) {
    var selfSum = 0, selfCount = 0, otherSum = 0, otherCount = 0;
    var state = 'unanswered';
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.notApplicable) { if (state === 'unanswered') state = 'notApplicable'; continue; }
      var a = answerOf(answers, it.id);
      if (a.na) { if (state !== 'answered') state = 'unobserved'; continue; }
      if (a.score === null) continue;
      state = 'answered';
      selfSum += a.score; selfCount++;
      var other = otherAnswers[it.id];
      if (typeof other === 'number') { otherSum += other; otherCount++; }
    }
    return {
      state: state,
      self: selfCount > 0 ? selfSum / selfCount : null,
      other: otherCount > 0 ? otherSum / otherCount : null
    };
  }

  /* 基礎評価のレーダー用。軸＝基礎評価の項目（マスターから取得）。
   * 値はその項目に属する実践例の平均。実践例が増えても平均で動く。 */
  function basicAxes(items, answers, otherAnswers, master) {
    var axes = [];
    for (var b = 0; b < master.basicItems.length; b++) {
      var bi = master.basicItems[b];
      var ids = {};
      for (var p = 0; p < bi.practiceItems.length; p++) ids[bi.practiceItems[p].id] = true;
      var list = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].domainId === 'basic' && ids[items[i].id]) list.push(items[i]);
      }
      var v = aggregateItems(list, answers, otherAnswers);
      axes.push({ label: bi.name, state: v.state, self: v.self, other: v.other });
    }
    return axes;
  }

  /* 指定したラダーの力ごとのレーダー用。軸名はマスターから取得する。 */
  function ladderAxes(items, answers, otherAnswers, master, ladderId) {
    var ladder = null;
    for (var l = 0; l < master.ladders.length; l++) {
      if (master.ladders[l].id === ladderId) ladder = master.ladders[l];
    }
    var axes = [];
    if (!ladder) return axes;
    for (var c = 0; c < ladder.competencies.length; c++) {
      var comp = ladder.competencies[c];
      var list = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].ladderId === ladderId && items[i].competencyId === comp.id) list.push(items[i]);
      }
      var v = aggregateItems(list, answers, otherAnswers);
      axes.push({ label: comp.name, state: v.state, self: v.self, other: v.other });
    }
    return axes;
  }

  /* 各個人の目標の横棒グラフ用。実践例1つにつき1本組。
   * goalId を渡すと、その合意した目標の実践例だけを返す（目標ごとにまとめて表示するため）。 */
  function personalBars(items, answers, otherAnswers, goalId) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].domainId !== 'personal') continue;
      if (goalId && items[i].goalId !== goalId) continue;
      var v = aggregateItems([items[i]], answers, otherAnswers);
      out.push({ label: items[i].text, state: v.state, self: v.self, other: v.other });
    }
    return out;
  }

  function counts(items, answers) {
    var notApplicable = 0, unobserved = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].notApplicable) { notApplicable++; continue; }
      if (answerOf(answers, items[i].id).na) unobserved++;
    }
    return { notApplicable: notApplicable, unobserved: unobserved };
  }

  return {
    romanOf: romanOf,
    levelDefinitionOf: levelDefinitionOf,
    licenseNamesOf: licenseNamesOf,
    licenseTerm: licenseTerm,
    buildGroups: buildGroups,
    flatten: flatten,
    answerOf: answerOf,
    progress: progress,
    domainScores: domainScores,
    goalScores: goalScores,
    weightedTotal: weightedTotal,
    certification: certification,
    gaps: gaps,
    radarAxes: radarAxes,
    basicAxes: basicAxes,
    ladderAxes: ladderAxes,
    personalBars: personalBars,
    counts: counts
  };
})();

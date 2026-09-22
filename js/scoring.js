/* scoring.js
 * 回答対象の組み立て・集計・レベル認定の判定。
 *
 * 集計の約束
 *  - 適用外（資格要件を満たさない実践例）は分母から外す。
 *  - 担当外・観察機会なしは低評価と区別し、分母から外す。
 *  - 有効な回答が0件の評価領域は平均を「—」とし、重み付き総合スコアからも外して
 *    残りの重みを再正規化する。
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
   * グループとして組み立てる（R2）。 */
  function buildGroups(master, profile) {
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

    /* 各個人の目標（R28） */
    for (var p = 0; p < master.personalGoals.length; p++) {
      var pg = master.personalGoals[p];
      groups.push({
        key: 'personal:' + pg.id,
        domainId: 'personal',
        domainName: '各個人の目標',
        parentKind: '合意した目標',
        parentName: '合意した目標',
        parentText: pg.text,
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
            domainId: 'personal', ladderId: null, competencyId: null,
            level: null, notApplicable: false
          };
        })
      });
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

  /* 領域別スコア。本人評価・他者評価の両方を算出する。 */
  function domainScores(items, answers, otherAnswers) {
    var acc = {};
    for (var d = 0; d < PE_DOMAINS.length; d++) {
      acc[PE_DOMAINS[d].id] = {
        id: PE_DOMAINS[d].id, name: PE_DOMAINS[d].name, weight: PE_DOMAINS[d].weight,
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
      list.push(x);
    }
    return list;
  }

  /* 重み付き総合スコア。有効回答0件の領域は重みごと除き、残りを再正規化する。 */
  function weightedTotal(domainList, which) {
    var key = which === 'other' ? 'otherAverage' : 'selfAverage';
    var sum = 0, weightSum = 0, excluded = [];
    for (var i = 0; i < domainList.length; i++) {
      var d = domainList[i];
      if (d[key] === null) { excluded.push(d.name); continue; }
      sum += d[key] * d.weight;
      weightSum += d.weight;
    }
    return {
      value: weightSum > 0 ? (sum / weightSum) : null,
      usedWeight: weightSum,
      excluded: excluded,
      renormalized: weightSum > 0 && weightSum < 100
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

  /* 各個人の目標の横棒グラフ用。実践例1つにつき1本組。 */
  function personalBars(items, answers, otherAnswers) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].domainId !== 'personal') continue;
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

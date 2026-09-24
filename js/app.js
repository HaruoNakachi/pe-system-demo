/* app.js
 * 画面制御（SPA・ハッシュルーティング）。
 * 画面：ログイン／ダッシュボード／評価入力／マイページ／設定／評価完了
 */

(function () {
  'use strict';

  /* ---------------- state ---------------- */

  var state = {
    session: null,
    profile: null,
    answers: {},
    otherAnswers: {},
    submitted: { submitted: false, at: null },
    /* 各個人の目標（改訂方針D）。{ goals: [{ id, text, source, weight, practiceItems: [{ id, text, source }] }], seq } */
    personalGoals: { goals: [], seq: 0 },
    /* 個人ごとの3領域の重み（R30）。{ basic, professional, personal, updatedAt } */
    personalWeight: null
  };

  /* 設定画面の「各個人の目標（デモ用の編集）」の一時的な画面状態（保存しない） */
  var goalEditor = null;   /* { mode: 'new' | 'edit', goalId, text, items: [{ id, text }], error } */
  var goalFlash = null;    /* 直前の操作結果の一言。描画したら消す */

  var ROUTES = ['login', 'dashboard', 'input', 'mypage', 'settings', 'complete'];

  /* ---------------- デモの見た目（比較用） ----------------
   * 配色の候補を見比べてもらうためだけの仕組みである。
   * 保存先は仕様書9節にない一時的なキー pe_demo_theme。評価データとは独立させ、
   * データリセットとシード版の不一致による初期化のどちらでも消さない。
   * 配色が決まったら、この節・viewSettings 内の「デモの見た目（比較用）」の節・
   * onChange 内の theme の分岐・boot 内の applyTheme 呼び出しを削除すればよい。
   */

  var PE_THEME_KEY = 'pe_demo_theme';
  /* 既定はミント。css/style.css の素の :root がミントなので、
     未保存・不正値のときは data-theme を付けず、初回表示からミントになる。 */
  var PE_THEME_DEFAULT = 'mint';
  var PE_THEMES = [
    { id: 'default', label: '現行（ブルー）' },
    { id: 'rose', label: 'くすみピンク' },
    { id: 'mint', label: 'ミント' },
    { id: 'coral', label: 'コーラル' }
  ];

  function isKnownTheme(id) {
    for (var i = 0; i < PE_THEMES.length; i++) {
      if (PE_THEMES[i].id === id) return true;
    }
    return false;
  }

  function readTheme() {
    var v = null;
    try {
      v = window.localStorage.getItem(PE_THEME_KEY);
    } catch (e) {
      v = null;
    }
    return isKnownTheme(v) ? v : PE_THEME_DEFAULT;
  }

  function writeTheme(id) {
    try {
      window.localStorage.setItem(PE_THEME_KEY, id);
    } catch (e) {
      /* 保存できなくても表示は切り替わる。評価データには影響しない。 */
    }
  }

  function applyTheme(id) {
    var theme = isKnownTheme(id) ? id : PE_THEME_DEFAULT;
    if (theme === PE_THEME_DEFAULT) document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  function refreshThemeUI() {
    var options = document.querySelectorAll('.theme-option');
    for (var i = 0; i < options.length; i++) {
      var input = options[i].querySelector('input');
      if (input && input.checked) options[i].classList.add('is-selected');
      else options[i].classList.remove('is-selected');
    }
  }

  /* ---------------- 説明の開閉 ----------------
   * 長い説明を既定で閉じ、見出し（summary）の操作で開閉する（改訂方針B）。
   * 素の <details> / <summary> を使うため、開閉そのものに JavaScript は要らない。
   * ここで行うのは「前回の開閉状態を思い出す」ことだけである。
   *
   * 保存先は仕様書9節にない一時的なキー pe_demo_ui。評価データとは独立させ、
   * データリセットとシード版の不一致による初期化のどちらでも消さない（配色テーマと同じ扱い）。
   * 読み書きはすべて try/catch で囲む。保存できない環境でも開閉そのものは動く。
   */

  var PE_UI_KEY = 'pe_demo_ui';

  /* 既定はすべて閉じた状態。開いたものだけを { 開閉ID: true } で持つ。 */
  var explainState = {};

  function readExplainState() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(PE_UI_KEY);
    } catch (e) {
      raw = null;
    }
    var parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch (e) {
      parsed = null;
    }
    var out = {};
    if (parsed && typeof parsed === 'object' && parsed.explainOpen
      && typeof parsed.explainOpen === 'object') {
      for (var k in parsed.explainOpen) {
        if (Object.prototype.hasOwnProperty.call(parsed.explainOpen, k)) {
          out[k] = (parsed.explainOpen[k] === true);
        }
      }
    }
    return out;
  }

  function writeExplainState() {
    try {
      window.localStorage.setItem(PE_UI_KEY, JSON.stringify({ explainOpen: explainState }));
    } catch (e) {
      /* 保存できなくても開閉そのものは動く。評価データには影響しない。 */
    }
  }

  /* 説明の開閉ブロックを組み立てる。
   * summary には「何の説明か」が分かる見出しを入れる（「詳細」のような見出しにしない）。 */
  function explainBlock(id, summary, bodyHtml) {
    return '<details class="explain" data-explain="' + esc(id) + '"'
      + (explainState[id] === true ? ' open' : '') + '>'
      + '<summary class="explain-summary">' + esc(summary) + '</summary>'
      + '<div class="explain-body">' + bodyHtml + '</div>'
      + '</details>';
  }

  /* toggle イベントは伝播しないため、描画のたびに各 details へ直接付ける。 */
  function bindExplain() {
    var list = document.querySelectorAll('details[data-explain]');
    for (var i = 0; i < list.length; i++) {
      list[i].addEventListener('toggle', onExplainToggle, false);
    }
  }

  function onExplainToggle(e) {
    var el = e.currentTarget;
    if (!el || !el.getAttribute) return;
    var id = el.getAttribute('data-explain');
    if (!id) return;
    if (el.open) explainState[id] = true;
    else delete explainState[id];
    writeExplainState();
  }

  /* ---------------- 共通ユーティリティ ---------------- */

  function $(sel) { return document.querySelector(sel); }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDateTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 '
      + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function fmtScore(v) {
    if (v === null || v === undefined) return '—';
    return (Math.round(v * 100) / 100).toFixed(2);
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
  }

  /* 画面表記：内部の区分名「適用外」は、画面上は「要資格（○○）項目」と表示する。
   * ○○はレベル毎の目標が持つ資格要件（licenseName）から動的に組み立てる。
   * 幅の狭い箇所（バッジ・レーダーチャートの軸注記）では短縮形「要資格」を使い、
   * 同じ画面に資格名を含む正式表記が出るようにしている。 */
  function licenseTermOf(items) {
    return PE_Scoring.licenseTerm(PE_Scoring.licenseNamesOf(items || []));
  }

  /* ---------------- 初期化 ---------------- */

  function initData() {
    var storedVersion = PE_Storage.getString(PE_KEYS.version);
    if (storedVersion !== PE_SEED_VERSION) {
      resetAll(false);
      PE_Storage.setString(PE_KEYS.version, PE_SEED_VERSION);
    }
    state.session = PE_Storage.getJSON(PE_KEYS.session, null);

    var profile = PE_Storage.getJSON(PE_KEYS.profile, null);
    if (!profile || typeof profile !== 'object') {
      profile = {
        name: PE_DEFAULT_PROFILE.name,
        jobType: PE_DEFAULT_PROFILE.jobType,
        hasLicense: PE_DEFAULT_PROFILE.hasLicense,
        managementLadder: PE_DEFAULT_PROFILE.managementLadder,
        challengeLevel: PE_DEFAULT_PROFILE.challengeLevel
      };
      PE_Storage.setJSON(PE_KEYS.profile, profile);
    }
    if ([1, 2, 3, 4].indexOf(profile.challengeLevel) === -1) profile.challengeLevel = 2;
    state.profile = profile;

    /* マスターは読み取り専用のシードとして保存する（R1） */
    PE_Storage.setJSON(PE_KEYS.master, PE_MASTER);

    state.answers = PE_Storage.getJSON(PE_KEYS.answers, {});
    if (!state.answers || typeof state.answers !== 'object') state.answers = {};

    var others = PE_Storage.getJSON(PE_KEYS.otherAnswers, null);
    if (!others || typeof others !== 'object') {
      others = {};
      for (var k in PE_OTHER_ANSWERS) {
        if (Object.prototype.hasOwnProperty.call(PE_OTHER_ANSWERS, k)) others[k] = PE_OTHER_ANSWERS[k];
      }
      PE_Storage.setJSON(PE_KEYS.otherAnswers, others);
    }
    state.otherAnswers = others;

    var sub = PE_Storage.getJSON(PE_KEYS.submitted, null);
    state.submitted = (sub && typeof sub === 'object') ? sub : { submitted: false, at: null };

    /* 各個人の目標と個人ごとの重み（改訂方針D）。
     * キーが無い・壊れているときはシードから初期化する（pe_demo_other_answers と同じ考え方）。
     * 既定はプリセット目標1つ（実践例 gp_1・gp_2、IDは変えない）と 50／40／10。 */
    var goals = PE_Storage.getJSON(PE_KEYS.personalGoals, null);
    if (!isValidGoalsData(goals)) {
      goals = PE_initialPersonalGoals();
      PE_Storage.setJSON(PE_KEYS.personalGoals, goals);
    }
    if (typeof goals.seq !== 'number' || goals.seq < 0) goals.seq = 0;
    state.personalGoals = goals;

    var weight = PE_Storage.getJSON(PE_KEYS.personalWeight, null);
    if (!isValidWeight(weight)) {
      weight = PE_defaultPersonalWeight();
      PE_Storage.setJSON(PE_KEYS.personalWeight, weight);
    }
    state.personalWeight = weight;
  }

  function resetAll(reinit) {
    /* 合意した目標と個人ごとの重みは評価データなので消す。
     * 配色（pe_demo_theme）と開閉状態（pe_demo_ui）は消さない。 */
    PE_Storage.clearKeys([
      PE_KEYS.version, PE_KEYS.session, PE_KEYS.profile, PE_KEYS.master,
      PE_KEYS.answers, PE_KEYS.otherAnswers, PE_KEYS.submitted,
      PE_KEYS.personalGoals, PE_KEYS.personalWeight
    ]);
    state.session = null;
    state.profile = null;
    state.answers = {};
    state.otherAnswers = {};
    state.submitted = { submitted: false, at: null };
    state.personalGoals = { goals: [], seq: 0 };
    state.personalWeight = null;
    goalEditor = null;
    goalFlash = null;
    if (reinit) initData();
  }

  /* ---- 各個人の目標：保存形式の検証 ---- */

  function isPercentInt(v) {
    return typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= 0 && v <= 100;
  }

  function isValidGoalsData(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.goals)) return false;
    var seen = {}, sum = 0;
    for (var i = 0; i < data.goals.length; i++) {
      var g = data.goals[i];
      if (!g || typeof g.id !== 'string' || !g.id || seen[g.id]) return false;
      if (typeof g.text !== 'string' || !isPercentInt(g.weight)) return false;
      if (!Array.isArray(g.practiceItems) || g.practiceItems.length === 0) return false;
      seen[g.id] = true;
      sum += g.weight;
      for (var j = 0; j < g.practiceItems.length; j++) {
        var p = g.practiceItems[j];
        if (!p || typeof p.id !== 'string' || !p.id || seen[p.id] || typeof p.text !== 'string') return false;
        seen[p.id] = true;
      }
    }
    return data.goals.length === 0 || sum === 100;
  }

  function isValidWeight(w) {
    if (!w || typeof w !== 'object') return false;
    var sum = 0;
    for (var i = 0; i < PE_DOMAINS.length; i++) {
      var v = w[PE_DOMAINS[i].id];
      if (!isPercentInt(v)) return false;
      sum += v;
    }
    return sum === 100;
  }

  /* 保存に失敗した場合は、その場で「保存できない」バナーを出し直す。 */
  function persist(key, value) {
    var ok = PE_Storage.setJSON(key, value);
    renderStorageBanner();
    return ok;
  }

  function saveProfile() { return persist(PE_KEYS.profile, state.profile); }
  function saveAnswers() { return persist(PE_KEYS.answers, state.answers); }
  function saveSubmitted() { return persist(PE_KEYS.submitted, state.submitted); }
  function saveSession() { return persist(PE_KEYS.session, state.session); }
  function savePersonalGoals() { return persist(PE_KEYS.personalGoals, state.personalGoals); }
  function savePersonalWeight() { return persist(PE_KEYS.personalWeight, state.personalWeight); }

  /* ---------------- 導出データ ---------------- */

  function derived() {
    var groups = PE_Scoring.buildGroups(PE_MASTER, state.profile, state.personalGoals.goals);
    var items = PE_Scoring.flatten(groups);
    return { groups: groups, items: items };
  }

  /* 集計に渡す個人ごとの重み（3領域・目標ごと） */
  function scoreOptions() {
    return { weights: state.personalWeight, goals: state.personalGoals.goals };
  }

  /* ---------------- 各個人の目標：表示の補助 ---------------- */

  function domainNameOf(id) {
    for (var i = 0; i < PE_DOMAINS.length; i++) {
      if (PE_DOMAINS[i].id === id) return PE_DOMAINS[i].name;
    }
    return id;
  }

  /* 「基礎評価50％／専門実践評価40％／各個人の目標10％」 */
  function weightLabel(w) {
    var parts = [];
    for (var i = 0; i < PE_DOMAINS.length; i++) {
      parts.push(PE_DOMAINS[i].name + w[PE_DOMAINS[i].id] + '％');
    }
    return parts.join('／');
  }

  /* 「50／40／10」 */
  function weightShort(w) {
    var parts = [];
    for (var i = 0; i < PE_DOMAINS.length; i++) parts.push(String(w[PE_DOMAINS[i].id]));
    return parts.join('／');
  }

  function isDefaultWeight(w) {
    for (var i = 0; i < PE_DOMAINS.length; i++) {
      if (w[PE_DOMAINS[i].id] !== PE_DOMAINS[i].weight) return false;
    }
    return true;
  }

  /* 目標が総合スコアに占める割合（％）＝ 目標ごとの重み × 各個人の目標の重み ÷ 100 */
  function goalShareText(goalWeight, personalWeight) {
    var pw = (typeof personalWeight === 'number') ? personalWeight : state.personalWeight.personal;
    return (Math.round(goalWeight * pw / 100 * 10) / 10).toFixed(1);
  }

  function goalWeightLine(goalWeight) {
    return '目標内の重み ' + goalWeight + '％（各個人の目標 ' + state.personalWeight.personal
      + '％のうち ' + goalShareText(goalWeight) + '％）';
  }

  function goalLabel(index, count) {
    return count > 1 ? '合意した目標（' + (index + 1) + '／' + count + '）' : '合意した目標';
  }

  /* 上限と入力時間の目安（R5・R24 改訂／改訂方針D 5-5）。
   * 20項目の上限は基礎評価＋専門実践評価に適用し、各個人の目標は対象外とする。
   * 要資格項目は回答しないため数えない（従来の「3領域の合計」と同じ数え方）。
   * 入力時間の目安は1問あたり30〜60秒（デモアプリ仕様11-2）。 */
  function limitSummary(items) {
    var core = 0, personal = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].notApplicable) continue;
      if (items[i].domainId === 'personal') personal++;
      else core++;
    }
    var total = core + personal;
    return {
      core: core, personal: personal, total: total,
      minMinutes: Math.ceil(total * 30 / 60),
      maxMinutes: Math.ceil(total * 60 / 60)
    };
  }

  function limitSummaryHtml(items) {
    var s = limitSummary(items);
    return '<ul class="limit-list">'
      + '<li>基礎評価＋専門実践評価：<strong>' + s.core + '項目</strong>／上限20項目'
      + (s.core <= 20 ? '（上限内）' : '　<span class="warn-text">上限を超えています。</span>') + '</li>'
      + '<li>各個人の目標：<strong>' + s.personal + '項目</strong>（上限の対象外）</li>'
      + '<li>合計 <strong>' + s.total + '問</strong>・入力時間の目安 '
      + (s.total > 0 ? '<strong>約' + s.minMinutes + '〜' + s.maxMinutes + '分</strong>' : '—（回答対象がありません）')
      + '</li>'
      + '</ul>'
      + '<p class="limit-note">1回の評価で回答する実践例は、基礎評価と専門実践評価の合計で20項目以内に収める決まりです。'
      + '各個人の目標は上限の対象外ですが、問数が増えるほど入力時間が延びます。'
      + '入力時間の目安は1問あたり30〜60秒で計算しています。</p>';
  }

  /* ---------------- 各個人の目標：編集（設定画面のデモ用の編集） ---------------- */

  /* 衝突しない安定したIDを振る。回答の保存キーになるため、
   * マスター・他者評価のダミー値・保存済みの回答・既存の目標のいずれのIDとも重ならないことを確かめる。 */
  function collectUsedIds() {
    var used = {};
    var k;
    for (var b = 0; b < PE_MASTER.basicItems.length; b++) {
      used[PE_MASTER.basicItems[b].id] = true;
      for (var bp = 0; bp < PE_MASTER.basicItems[b].practiceItems.length; bp++) {
        used[PE_MASTER.basicItems[b].practiceItems[bp].id] = true;
      }
    }
    for (var l = 0; l < PE_MASTER.ladders.length; l++) {
      var comps = PE_MASTER.ladders[l].competencies;
      for (var c = 0; c < comps.length; c++) {
        for (var g = 0; g < comps[c].levelGoals.length; g++) {
          var pis = comps[c].levelGoals[g].practiceItems;
          for (var p = 0; p < pis.length; p++) used[pis[p].id] = true;
        }
      }
    }
    var lists = [PE_MASTER.personalGoals, state.personalGoals.goals];
    for (var s = 0; s < lists.length; s++) {
      for (var q = 0; q < lists[s].length; q++) {
        used[lists[s][q].id] = true;
        for (var r = 0; r < lists[s][q].practiceItems.length; r++) used[lists[s][q].practiceItems[r].id] = true;
      }
    }
    for (k in state.answers) if (Object.prototype.hasOwnProperty.call(state.answers, k)) used[k] = true;
    for (k in state.otherAnswers) if (Object.prototype.hasOwnProperty.call(state.otherAnswers, k)) used[k] = true;
    for (k in PE_OTHER_ANSWERS) if (Object.prototype.hasOwnProperty.call(PE_OTHER_ANSWERS, k)) used[k] = true;
    return used;
  }

  /* 目標は pg_u…、実践例は gp_u…（シードのIDと接頭辞で区別する） */
  function newId(prefix, used) {
    var id;
    do {
      state.personalGoals.seq = (state.personalGoals.seq || 0) + 1;
      id = prefix + Date.now().toString(36) + '_' + state.personalGoals.seq.toString(36);
    } while (used[id]);
    used[id] = true;
    return id;
  }

  function findGoal(id) {
    var goals = state.personalGoals.goals;
    for (var i = 0; i < goals.length; i++) if (goals[i].id === id) return goals[i];
    return null;
  }

  function applyEqualGoalWeights() {
    var goals = state.personalGoals.goals;
    var w = PE_equalGoalWeights(goals.length);
    for (var i = 0; i < goals.length; i++) goals[i].weight = w[i];
  }

  function goalWeightsText() {
    var goals = state.personalGoals.goals;
    var parts = [];
    for (var i = 0; i < goals.length; i++) parts.push(goals[i].weight + '％');
    return parts.join('／');
  }

  /* 削除した実践例に紐づく本人評価の回答を消す（孤立データを残さない） */
  function removeAnswersFor(ids) {
    var removed = 0;
    for (var i = 0; i < ids.length; i++) {
      if (Object.prototype.hasOwnProperty.call(state.answers, ids[i])) {
        delete state.answers[ids[i]];
        removed++;
      }
    }
    if (removed > 0) saveAnswers();
    return removed;
  }

  function addGoal(text, items, source) {
    var used = collectUsedIds();
    var goal = { id: newId('pg_u', used), text: text, source: source, weight: 0, practiceItems: [] };
    for (var i = 0; i < items.length; i++) {
      goal.practiceItems.push({ id: newId('gp_u', used), text: items[i].text, source: items[i].source || source });
    }
    state.personalGoals.goals.push(goal);
    applyEqualGoalWeights();
    savePersonalGoals();
    return goal;
  }

  function addSampleGoal() {
    var items = [];
    for (var i = 0; i < PE_SAMPLE_PERSONAL_GOAL.practiceItems.length; i++) {
      items.push({
        text: PE_SAMPLE_PERSONAL_GOAL.practiceItems[i].text,
        source: PE_SAMPLE_PERSONAL_GOAL.practiceItems[i].source
      });
    }
    addGoal(PE_SAMPLE_PERSONAL_GOAL.text, items, PE_SAMPLE_PERSONAL_GOAL.source);
    goalFlash = { type: 'ok', text: 'サンプルの目標を追加しました。目標ごとの重みを均等に割り振り直しました（' + goalWeightsText() + '）。' };
  }

  function deleteGoal(id) {
    var goals = state.personalGoals.goals;
    var goal = findGoal(id);
    if (!goal) return;
    var ids = goal.practiceItems.map(function (p) { return p.id; });
    state.personalGoals.goals = goals.filter(function (g) { return g.id !== id; });
    applyEqualGoalWeights();
    savePersonalGoals();
    var removed = removeAnswersFor(ids);
    if (goalEditor && goalEditor.goalId === id) goalEditor = null;
    goalFlash = {
      type: 'ok',
      text: '合意した目標を削除しました。その実践例に対する本人評価の回答（' + removed + '件）も削除しました。'
        + (state.personalGoals.goals.length > 0
          ? '目標ごとの重みを均等に割り振り直しました（' + goalWeightsText() + '）。'
          : '合意した目標が0件になったため、各個人の目標の回答対象はありません。')
    };
  }

  function openGoalEditor(mode, goalId) {
    if (mode === 'edit') {
      var goal = findGoal(goalId);
      if (!goal) return;
      goalEditor = {
        mode: 'edit', goalId: goalId, text: goal.text, error: '',
        items: goal.practiceItems.map(function (p) { return { id: p.id, text: p.text }; })
      };
    } else {
      goalEditor = { mode: 'new', goalId: null, text: '', error: '', items: [{ id: null, text: '' }] };
    }
  }

  function saveGoalEditor() {
    var ed = goalEditor;
    if (!ed) return false;
    var text = String(ed.text || '').trim();
    if (!text) { ed.error = '目標文を入力してください。'; return false; }
    if (ed.items.length === 0) {
      ed.error = '実践例が0件の目標は保存できません。回答する対象がなくなるため、実践例を1つ以上入れてください。';
      return false;
    }
    for (var i = 0; i < ed.items.length; i++) {
      if (!String(ed.items[i].text || '').trim()) {
        ed.error = '空欄の実践例があります。文を入力するか、その実践例を削除してください。';
        return false;
      }
    }

    if (ed.mode === 'new') {
      addGoal(text, ed.items.map(function (it) { return { text: String(it.text).trim(), source: 'user' }; }), 'user');
      goalFlash = { type: 'ok', text: '合意した目標を追加しました。目標ごとの重みを均等に割り振り直しました（' + goalWeightsText() + '）。' };
    } else {
      var goal = findGoal(ed.goalId);
      if (!goal) { goalEditor = null; return true; }
      var used = collectUsedIds();
      var before = {};
      for (var b = 0; b < goal.practiceItems.length; b++) before[goal.practiceItems[b].id] = goal.practiceItems[b];
      var next = [], kept = {};
      for (var n = 0; n < ed.items.length; n++) {
        var t = String(ed.items[n].text).trim();
        var old = ed.items[n].id ? before[ed.items[n].id] : null;
        if (old) {
          /* 既存の実践例はIDを変えない（回答を引き継ぐ）。文を変えたときだけ出所を user にする */
          next.push({ id: old.id, text: t, source: (old.text === t) ? old.source : 'user' });
          kept[old.id] = true;
        } else {
          next.push({ id: newId('gp_u', used), text: t, source: 'user' });
        }
      }
      var removedIds = [];
      for (var id in before) if (Object.prototype.hasOwnProperty.call(before, id) && !kept[id]) removedIds.push(id);
      if (goal.text !== text) goal.source = 'user';
      goal.text = text;
      goal.practiceItems = next;
      savePersonalGoals();
      var removed = removeAnswersFor(removedIds);
      goalFlash = {
        type: 'ok',
        text: '合意した目標を保存しました。'
          + (removedIds.length > 0 ? '削除した実践例（' + removedIds.length + '件）に対する本人評価の回答（' + removed + '件）も削除しました。' : '')
      };
    }
    goalEditor = null;
    return true;
  }

  /* 重みの入力値を 0〜100 の整数として読む。読めないときは null */
  function readPercentInput(el) {
    if (!el) return null;
    var raw = String(el.value).trim();
    if (!/^\d{1,3}$/.test(raw)) return null;
    var v = parseInt(raw, 10);
    return (v >= 0 && v <= 100) ? v : null;
  }

  function readDomainWeightInputs() {
    var out = { values: {}, sum: 0, invalid: false };
    for (var i = 0; i < PE_DOMAINS.length; i++) {
      var v = readPercentInput(document.getElementById('dw-' + PE_DOMAINS[i].id));
      if (v === null) out.invalid = true;
      else { out.values[PE_DOMAINS[i].id] = v; out.sum += v; }
    }
    return out;
  }

  function readGoalWeightInputs() {
    var goals = state.personalGoals.goals;
    var out = { values: {}, sum: 0, invalid: false };
    for (var i = 0; i < goals.length; i++) {
      var v = readPercentInput(document.getElementById('gw-' + goals[i].id));
      if (v === null) out.invalid = true;
      else { out.values[goals[i].id] = v; out.sum += v; }
    }
    return out;
  }

  function showFieldError(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
  }

  function saveDomainWeights() {
    var r = readDomainWeightInputs();
    var keep = '保存していません。保存済みの重み（' + weightLabel(state.personalWeight) + '）のままです。';
    if (r.invalid) { showFieldError('domain-weight-error', '各値は 0〜100 の整数で入力してください。' + keep); return false; }
    if (r.sum !== 100) { showFieldError('domain-weight-error', '合計が100％になっていません（現在 ' + r.sum + '％）。' + keep); return false; }
    var w = {};
    for (var i = 0; i < PE_DOMAINS.length; i++) w[PE_DOMAINS[i].id] = r.values[PE_DOMAINS[i].id];
    w.updatedAt = new Date().toISOString();
    state.personalWeight = w;
    savePersonalWeight();
    goalFlash = { type: 'ok', text: '3領域の重みを保存しました（' + weightLabel(w) + '）。' };
    return true;
  }

  function resetDomainWeights() {
    var w = PE_defaultPersonalWeight();
    w.updatedAt = new Date().toISOString();
    state.personalWeight = w;
    savePersonalWeight();
    goalFlash = { type: 'ok', text: '3領域の重みを既定値（' + weightLabel(w) + '）に戻しました。' };
  }

  function saveGoalWeights() {
    var r = readGoalWeightInputs();
    var keep = '保存していません。保存済みの重み（' + goalWeightsText() + '）のままです。';
    if (r.invalid) { showFieldError('goal-weight-error', '目標ごとの重みは 0〜100 の整数で入力してください。' + keep); return false; }
    if (r.sum !== 100) { showFieldError('goal-weight-error', '目標ごとの重みの合計が100％になっていません（現在 ' + r.sum + '％）。' + keep); return false; }
    var goals = state.personalGoals.goals;
    for (var i = 0; i < goals.length; i++) goals[i].weight = r.values[goals[i].id];
    savePersonalGoals();
    goalFlash = { type: 'ok', text: '目標ごとの重みを保存しました（' + goalWeightsText() + '）。' };
    return true;
  }

  /* 入力中の合計と、総合スコアに占める割合をその場で更新する（保存はしない） */
  function refreshDomainWeightSum() {
    var r = readDomainWeightInputs();
    var el = document.getElementById('domain-weight-sum');
    if (!el) return;
    el.textContent = r.invalid ? '合計 —（0〜100 の整数で入力してください）' : '合計 ' + r.sum + '％';
    el.className = 'weight-sum' + ((r.invalid || r.sum !== 100) ? ' is-bad' : '');
  }

  function refreshGoalWeightSum() {
    var r = readGoalWeightInputs();
    var el = document.getElementById('goal-weight-sum');
    if (el) {
      el.textContent = r.invalid ? '目標ごとの重みの合計 —（0〜100 の整数で入力してください）' : '目標ごとの重みの合計 ' + r.sum + '％';
      el.className = 'weight-sum' + ((r.invalid || r.sum !== 100) ? ' is-bad' : '');
    }
    var goals = state.personalGoals.goals;
    for (var i = 0; i < goals.length; i++) {
      var share = document.getElementById('gs-' + goals[i].id);
      if (!share) continue;
      var v = r.values[goals[i].id];
      share.textContent = (typeof v === 'number')
        ? '総合スコアに占める割合 ' + goalShareText(v) + '％'
        : '総合スコアに占める割合 —';
    }
  }

  /* 設定画面の描画し直し（スクロール位置を保つ） */
  function renderKeepScroll(focusId) {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    render();
    window.scrollTo(0, y);
    if (focusId) {
      var el = document.getElementById(focusId);
      if (el) {
        try { el.focus({ preventScroll: false }); } catch (e) { el.focus(); }
      }
      return;
    }
    /* 操作結果の一言が画面外にあるときだけ、見える位置まで最小限スクロールする */
    var flash = document.querySelector('.goal-flash');
    if (flash && flash.scrollIntoView) {
      try { flash.scrollIntoView({ block: 'nearest' }); } catch (e2) { flash.scrollIntoView(false); }
    }
  }

  /* ---------------- ルーティング ---------------- */

  function currentRoute() {
    var hash = (window.location.hash || '').replace(/^#\/?/, '');
    if (ROUTES.indexOf(hash) === -1) return state.session ? 'dashboard' : 'login';
    return hash;
  }

  function go(route) {
    if (window.location.hash === '#/' + route) render();
    else window.location.hash = '#/' + route;
  }

  function render() {
    var route = currentRoute();
    if (!state.session && route !== 'login') { go('login'); return; }
    if (state.session && route === 'login') { go('dashboard'); return; }

    renderStorageBanner();
    renderNav(route);

    var main = $('#main');
    if (route === 'login') main.innerHTML = viewLogin();
    else if (route === 'dashboard') main.innerHTML = viewDashboard();
    else if (route === 'input') main.innerHTML = viewInput();
    else if (route === 'mypage') main.innerHTML = viewMypage();
    else if (route === 'settings') main.innerHTML = viewSettings();
    else if (route === 'complete') main.innerHTML = viewComplete();

    if (route === 'dashboard') afterDashboard();
    window.scrollTo(0, 0);
  }

  function renderStorageBanner() {
    var el = $('#storage-banner');
    if (PE_Storage.isAvailable()) {
      el.hidden = true;
      el.innerHTML = '';
    } else {
      el.hidden = false;
      el.innerHTML = '<strong>保存できません。</strong>'
        + 'このブラウザでは localStorage が使えないため、入力内容は画面を閉じると失われます。'
        + '操作と表示はそのまま続けられます。';
    }
  }

  function renderNav(route) {
    var nav = $('#nav');
    if (!state.session) { nav.hidden = true; nav.innerHTML = ''; return; }
    nav.hidden = false;
    var links = [
      { route: 'dashboard', label: 'ダッシュボード' },
      { route: 'input', label: '評価入力' },
      { route: 'mypage', label: 'マイページ' },
      { route: 'settings', label: '設定' }
    ];
    var html = '<ul class="nav-list">';
    for (var i = 0; i < links.length; i++) {
      html += '<li><a class="nav-link' + (route === links[i].route ? ' is-current' : '') + '" href="#/'
        + links[i].route + '">' + esc(links[i].label) + '</a></li>';
    }
    html += '<li><button type="button" class="nav-link nav-logout" data-action="logout">ログアウト</button></li>';
    html += '</ul>';
    nav.innerHTML = html;
  }

  /* ---------------- 画面：ログイン ---------------- */

  function viewLogin() {
    return ''
      + '<section class="card">'
      + '<h1>動物病院 評価制度アプリ（デモ）</h1>'
      + '<p class="lead">スタッフ向け画面のデモです。評価期間は「' + esc(PE_MASTER.period) + '」に固定しています。</p>'
      + '<div class="notice notice-warn">'
      + '<p><strong>デモ専用の認証です。</strong>パスワードは <code>password</code> の固定値です。本番の認証仕様ではありません。</p>'
      + '<p><strong>架空データのみを入力してください。</strong>実在するスタッフの氏名・評価・根拠記述を入力しないでください。</p>'
      + '</div>'
      + '<form id="login-form" novalidate>'
      + '<div class="field">'
      + '<label for="login-email">メールアドレス（email 形式であれば任意の値）</label>'
      + '<input type="text" id="login-email" name="email" autocomplete="off" placeholder="demo@example.com" value="demo@example.com">'
      + '</div>'
      + '<div class="field">'
      + '<label for="login-password">パスワード</label>'
      + '<input type="password" id="login-password" name="password" autocomplete="off" placeholder="password" value="password">'
      + '</div>'
      + '<p class="form-error" id="login-error" role="alert" hidden></p>'
      + '<button type="submit" class="btn btn-primary btn-block">ログイン</button>'
      + '</form>'
      + '</section>';
  }

  function handleLogin(e) {
    e.preventDefault();
    var email = $('#login-email').value.trim();
    var pw = $('#login-password').value;
    var err = $('#login-error');
    if (!isEmail(email)) {
      err.hidden = false;
      err.textContent = 'メールアドレスの形式で入力してください。';
      return;
    }
    if (pw !== 'password') {
      err.hidden = false;
      err.textContent = 'パスワードが違います。デモの固定パスワードは password です。';
      return;
    }
    err.hidden = true;
    state.session = { email: email, loggedInAt: new Date().toISOString() };
    saveSession();
    go('dashboard');
  }

  /* ---------------- 画面：評価入力 ---------------- */

  function viewInput() {
    var d = derived();
    var prog = PE_Scoring.progress(d.items, state.answers);
    var cnt = PE_Scoring.counts(d.items, state.answers);

    var html = ''
      + '<section class="card">'
      + '<h1>評価入力（本人評価）</h1>'
      + '<p class="lead">評価期間：' + esc(PE_MASTER.period) + '</p>'
      + '<div class="progress-box">'
      + '<p class="progress-text">回答済み <strong>' + prog.answered + '</strong> ／ 対象 <strong>' + prog.total + '</strong>'
      + '（' + esc(licenseTermOf(d.items)) + 'の' + cnt.notApplicable + '件は対象数から除いています）</p>'
      + '<div class="progress-bar"><span style="width:' + (prog.total ? Math.round(prog.answered / prog.total * 100) : 0) + '%"></span></div>'
      + limitSummaryHtml(d.items)
      + '</div>'
      + '<p class="hint">回答するのは実践例のみです。親（基礎評価の項目／レベル毎の目標／合意した目標）には回答しません。'
      + '1つ回答するごとに自動保存され、次回そのまま再開できます。</p>'
      + '</section>';

    var lastDomain = null;
    var hasPersonal = false;
    for (var g = 0; g < d.groups.length; g++) {
      var grp = d.groups[g];
      if (grp.domainId !== lastDomain) {
        lastDomain = grp.domainId;
        html += '<h2 class="domain-heading">' + esc(grp.domainName) + domainHeadingNote(grp.domainId) + '</h2>';
      }
      if (grp.domainId === 'personal') hasPersonal = true;
      html += renderGroup(grp);
    }
    /* 合意した目標が0件のときも、領域の見出しと「回答対象がない」旨を出す */
    if (!hasPersonal) {
      html += '<h2 class="domain-heading">' + esc(domainNameOf('personal')) + domainHeadingNote('personal') + '</h2>'
        + '<section class="card"><p class="empty">合意した目標がないため、各個人の目標の回答対象はありません。</p></section>';
    }

    html += '<section class="card submit-card">';
    if (state.submitted.submitted) {
      html += '<p class="notice notice-ok">' + fmtDateTime(state.submitted.at) + ' に提出済みです。'
        + '提出後も回答は保持され、再編集できます。再編集した場合はもう一度提出してください。</p>';
    }
    html += '<button type="button" class="btn btn-primary btn-block" data-action="submit-answers">'
      + (state.submitted.submitted ? '再提出する' : '提出する') + '</button>';
    html += '<p class="hint">未回答があっても提出できます（デモのため）。根拠記述は任意入力です。</p>';
    html += '</section>';

    return html;
  }

  function domainHeadingNote(domainId) {
    if (domainId === 'basic') {
      return '<span class="domain-note">レベル軸を持ちません。設定にかかわらず全員が同じ実践例に回答します。</span>';
    }
    if (domainId === 'professional') {
      return '<span class="domain-note">チャレンジレベル1レベル分の実践例に回答します。</span>';
    }
    var n = state.personalGoals.goals.length;
    return '<span class="domain-note">その期に合意した目標の実践例に回答します。'
      + (n > 0 ? '合意した目標は' + n + '件です。' : '') + '</span>';
  }

  function renderGroup(grp) {
    var head = '';
    if (grp.domainId === 'basic') {
      head = '<p class="group-kind">基礎評価の項目</p><h3 class="group-title">' + esc(grp.parentName) + '</h3>';
    } else if (grp.domainId === 'professional') {
      var def = PE_Scoring.levelDefinitionOf(grp.level);
      head = '<p class="group-kind">' + esc(grp.ladderName) + '｜' + esc(grp.competencyName)
        + '｜レベル' + esc(PE_Scoring.romanOf(grp.level)) + '</p>'
        + '<p class="level-def">レベル毎の定義：' + esc(def ? def.text : '') + '</p>'
        + '<p class="group-kind">レベル毎の目標</p>'
        + '<h3 class="group-title">' + esc(grp.parentText) + '</h3>';
      if (grp.requiresLicense) {
        if (grp.notApplicable) {
          head += '<p class="license-note">'
            + esc(PE_Scoring.licenseTerm(grp.licenseName ? [grp.licenseName] : []))
            + '：資格がないと担当できない業務です。評価の対象から外し、平均点の計算にも含めません。</p>';
        } else {
          head += '<p class="license-note">資格要件：' + esc(grp.licenseName) + '</p>';
        }
      }
    } else {
      /* 合意した目標ごとに親としてまとめる（R2）。目標文は自由入力のため必ずエスケープする */
      head = '<p class="group-kind">' + esc(goalLabel(grp.goalIndex || 0, grp.goalCount || 1)) + '</p>'
        + '<h3 class="group-title">' + esc(grp.parentText) + '</h3>'
        + (typeof grp.goalWeight === 'number'
          ? '<p class="goal-weight-note">' + esc(goalWeightLine(grp.goalWeight)) + '</p>' : '');
    }

    var body = '';
    for (var i = 0; i < grp.items.length; i++) {
      body += renderItem(grp.items[i], grp);
    }
    return '<section class="card group' + (grp.notApplicable ? ' group-na' : '') + '">' + head + body + '</section>';
  }

  function renderItem(item, grp) {
    var a = PE_Scoring.answerOf(state.answers, item.id);
    var html = '<div class="item" data-item="' + esc(item.id) + '">';
    html += '<p class="item-text">' + esc(item.text) + '</p>';

    if (item.notApplicable) {
      html += '<p class="badge badge-na">要資格</p>';
      html += '<p class="hint">' + esc(PE_Scoring.licenseTerm(item.licenseName ? [item.licenseName] : []))
        + 'のため、回答は不要です。資格要件から自動で判定しています。</p>';
      html += '</div>';
      return html;
    }

    html += '<fieldset class="choices"><legend class="sr-only">評価基準</legend>';
    for (var s = 0; s < PE_SCALE.length; s++) {
      var sc = PE_SCALE[s];
      var checked = (!a.na && a.score === sc.value);
      html += '<label class="choice' + (checked ? ' is-selected' : '') + '">'
        + '<input type="radio" name="score-' + esc(item.id) + '" value="' + sc.value + '"'
        + (checked ? ' checked' : '') + ' data-role="score" data-item="' + esc(item.id) + '">'
        + '<span class="choice-value">' + sc.value + '</span>'
        + '<span class="choice-label">' + esc(sc.label) + '</span>'
        + '</label>';
    }
    html += '<label class="choice choice-unobserved' + (a.na ? ' is-selected' : '') + '">'
      + '<input type="radio" name="score-' + esc(item.id) + '" value="unobserved"'
      + (a.na ? ' checked' : '') + ' data-role="unobserved" data-item="' + esc(item.id) + '">'
      + '<span class="choice-value">—</span>'
      + '<span class="choice-label">担当外・観察機会なし</span>'
      + '</label>';
    html += '</fieldset>';

    html += '<div class="field field-note">'
      + '<label for="note-' + esc(item.id) + '">根拠となる具体例（任意）</label>'
      + '<textarea id="note-' + esc(item.id) + '" rows="2" data-role="note" data-item="' + esc(item.id) + '"'
      + ' placeholder="例：9/15、◯◯の症例で実施">' + esc(a.note) + '</textarea>'
      + '</div>';

    html += '</div>';
    return html;
  }

  function setScore(itemId, value) {
    var prev = state.answers[itemId] || {};
    state.answers[itemId] = { score: value, na: false, note: prev.note || '' };
    saveAnswers();
  }

  function setUnobserved(itemId) {
    var prev = state.answers[itemId] || {};
    state.answers[itemId] = { score: null, na: true, note: prev.note || '' };
    saveAnswers();
  }

  function setNote(itemId, text) {
    var prev = state.answers[itemId] || { score: null, na: false };
    state.answers[itemId] = {
      score: (typeof prev.score === 'number') ? prev.score : null,
      na: !!prev.na,
      note: text
    };
    saveAnswers();
  }

  /* ---------------- 画面：評価完了 ---------------- */

  function viewComplete() {
    var d = derived();
    var prog = PE_Scoring.progress(d.items, state.answers);
    var cnt = PE_Scoring.counts(d.items, state.answers);
    return ''
      + '<section class="card">'
      + '<h1>評価を提出しました</h1>'
      + '<dl class="kv">'
      + '<dt>提出日時</dt><dd>' + esc(fmtDateTime(state.submitted.at)) + '</dd>'
      + '<dt>評価期間</dt><dd>' + esc(PE_MASTER.period) + '</dd>'
      + '<dt>回答件数</dt><dd>' + prog.answered + '件 ／ 対象 ' + prog.total + '件</dd>'
      + '<dt>' + esc(licenseTermOf(d.items)) + '</dt><dd>' + cnt.notApplicable + '件（評価の対象から外しています）</dd>'
      + '<dt>担当外・観察機会なし</dt><dd>' + cnt.unobserved + '件（評価の対象から外しています）</dd>'
      + '</dl>'
      + '<p class="hint">提出後も回答内容は保持されます。評価入力の画面から再編集できます。</p>'
      + '<div class="btn-row">'
      + '<a class="btn btn-primary" href="#/dashboard">ダッシュボードへ</a>'
      + '<a class="btn" href="#/input">評価入力に戻る</a>'
      + '</div>'
      + '</section>';
  }

  /* ---------------- 画面：ダッシュボード ---------------- */

  function viewDashboard() {
    var d = derived();
    var prog = PE_Scoring.progress(d.items, state.answers);
    var cnt = PE_Scoring.counts(d.items, state.answers);
    var domains = PE_Scoring.domainScores(d.items, state.answers, state.otherAnswers, scoreOptions());
    var selfTotal = PE_Scoring.weightedTotal(domains, 'self');
    var otherTotal = PE_Scoring.weightedTotal(domains, 'other');
    var challengeRoman = PE_Scoring.romanOf(state.profile.challengeLevel);
    var currentLevel = state.profile.challengeLevel - 1;

    var html = '<section class="card">'
      + '<h1>ダッシュボード</h1>'
      + '<p class="lead">' + esc(state.profile.name) + 'さん（架空のデモ用データ）／評価期間：' + esc(PE_MASTER.period) + '</p>';

    if (!state.submitted.submitted) {
      html += '<p class="notice notice-warn">まだ提出していません。以下は現時点の入力内容にもとづく表示です。'
        + '未回答の実践例は集計の分母に入りません。</p>';
    } else {
      html += '<p class="notice notice-ok">' + esc(fmtDateTime(state.submitted.at)) + ' に提出済みです。</p>';
    }
    html += '<p class="progress-text">回答済み ' + prog.answered + ' ／ 対象 ' + prog.total + '</p>';
    html += '<div class="btn-row"><a class="btn btn-primary" href="#/input">評価入力へ</a></div>';
    html += '</section>';

    /* 現在のレベルとチャレンジレベル */
    var def = PE_Scoring.levelDefinitionOf(state.profile.challengeLevel);
    html += '<section class="card">'
      + '<h2>現在のレベルとチャレンジレベル</h2>'
      + '<div class="level-row">'
      + '<div class="level-box"><p class="level-caption">現在のレベル（認定済み）</p><p class="level-value">'
      + (currentLevel >= 1 ? 'レベル' + esc(PE_Scoring.romanOf(currentLevel)) : '未認定')
      + '</p></div>'
      + '<div class="level-box level-box-target"><p class="level-caption">チャレンジレベル（今期）</p><p class="level-value">レベル'
      + esc(challengeRoman) + '</p></div>'
      + '</div>'
      + '<p class="hint">レベル' + esc(challengeRoman) + 'のレベル毎の定義：' + esc(def ? def.text : '') + '</p>'
      + '<p class="hint">レベルは専門実践評価にのみ適用されます。基礎評価と各個人の目標はレベル軸を持ちません。</p>'
      + '<p class="hint">マネジメントラダーのレベルは実践ラダーのレベルに影響しない（R20）ため、本デモではレベルⅠ固定としています。</p>'
      + '</section>';

    /* レベル認定の判定 */
    html += '<section class="card">'
      + '<h2>レベル認定の判定</h2>'
      + explainBlock('cert-criteria', 'レベル認定の判定基準について',
        '<p class="hint">判定の対象は<strong>専門実践評価のみ</strong>です。基礎評価と各個人の目標はレベル認定に影響しません。'
        + '判定には本人評価を用い、対象の実践例すべてに上位2段階（3・4）がついているかを見ます。'
        + esc(licenseTermOf(d.items)) + 'は判定の対象から外し、担当外・観察機会なしの実践例は未達として扱いません。</p>');

    html += renderCertification(PE_Scoring.certification(d.items, state.answers, 'practice', PE_MASTER, state.profile));

    if (state.profile.managementLadder) {
      html += renderCertification(PE_Scoring.certification(d.items, state.answers, 'management', PE_MASTER, state.profile));
    } else {
      html += '<div class="cert-box cert-none">'
        + '<h3>マネジメントラダー</h3>'
        + '<p>マネジメントラダーを選択していないため、判定は行いません。'
        + '<strong>選択していないことは減点ではありません。</strong>実践ラダーの判定にも影響しません。</p>'
        + '</div>';
    }
    html += '</section>';

    /* 領域別スコア */
    html += '<section class="card">'
      + '<h2>領域別スコア</h2>'
      + '<div class="table-wrap"><table class="table">'
      + '<thead><tr><th>評価領域</th><th>重み</th><th>本人評価</th><th>他者評価</th><th>有効な回答</th></tr></thead><tbody>';
    for (var i = 0; i < domains.length; i++) {
      var dm = domains[i];
      html += '<tr>'
        + '<td>' + esc(dm.name) + '</td>'
        + '<td>' + dm.weight + '％</td>'
        + '<td class="num">' + esc(fmtScore(dm.selfAverage)) + '</td>'
        + '<td class="num">' + esc(fmtScore(dm.otherAverage)) + '</td>'
        + '<td class="num">' + dm.selfCount + ' ／ ' + dm.targetCount + '</td>'
        + '</tr>';
    }
    html += '</tbody></table></div>'
      /* この注記は開いたままにする（改訂方針B）。初見で誤解を生み、
       * 誤解の結果が制度への不信につながるため、<details> にしない。 */
      + '<p class="notice notice-info">本人評価と他者評価に<strong>差があること自体は悪い評価ではありません。</strong>'
      + '見え方の違いを確かめる手がかりとして使ってください。</p>'
      + '<p class="hint">平均は4点満点です。' + esc(licenseTermOf(d.items)) + 'と担当外・観察機会なしは分母から外しています。'
      + '有効な回答が0件の評価領域は「—」と表示します。</p>'
      + '</section>';

    /* 重み付き総合スコア */
    html += '<section class="card">'
      + '<h2>重み付き総合スコア</h2>'
      + '<div class="total-row">'
      + '<div class="total-box"><p class="level-caption">本人評価</p><p class="level-value">' + esc(fmtScore(selfTotal.value)) + '</p></div>'
      + '<div class="total-box"><p class="level-caption">他者評価</p><p class="level-value">' + esc(fmtScore(otherTotal.value)) + '</p></div>'
      + '</div>';
    /* 既定値から調整されている場合は、開閉の外（常に見える位置）に一言出す */
    if (!isDefaultWeight(state.personalWeight)) {
      html += '<p class="notice notice-info">この方の重みは既定値（' + esc(weightShort(PE_defaultPersonalWeight()))
        + '）から調整されています。</p>';
    }
    html += explainBlock('weights', '重みの内訳について', weightsExplainHtml());
    if (selfTotal.renormalized || otherTotal.renormalized) {
      var exc = selfTotal.excluded.concat(otherTotal.excluded).filter(function (v, idx, arr) { return arr.indexOf(v) === idx; });
      html += '<p class="hint">有効な回答が0件の評価領域（' + esc(exc.join('・')) + '）は重みごと除き、'
        + '残りの重みを再正規化して算出しています。</p>';
    }
    html += '</section>';

    /* 本人評価と他者評価の差から自動抽出する一覧（従来の「面談で確認したいこと」）は、
     * 病院内管理者の画面に置くものとする方針に変わったため、スタッフ画面から削除した（改訂方針A）。
     * 抽出ロジックは PE_Scoring.gaps として js/scoring.js に残してある（呼び出さないだけである）。
     * 領域別スコアの本人評価と他者評価の並記と、チャートの他者評価はスタッフ画面に残す。 */

    /* チャートは領域別スコアと同じ順（基礎評価 → 専門実践評価 → 各個人の目標）に並べる。
     * 軸の意味が違うため、3領域を1枚にまとめない。 */

    /* チャート：基礎評価（レベル軸を持たない／R26） */
    html += '<section class="card">'
      + '<h2>基礎評価の' + PE_MASTER.basicItems.length + 'つの項目</h2>'
      + explainBlock('chart-basic', 'このチャートの見方と値の求め方について',
        '<p class="hint">基礎評価の項目ごとに、本人評価と他者評価を重ねて表示しています。'
        + '値はその項目に属する実践例の平均です。</p>'
        + '<p class="hint">現在は各項目に実践例が1つずつのため、表示している値は平均ではなく評価基準の値そのものです。</p>')
      + '<div id="radar-basic" class="radar-wrap"></div>'
      + '</section>';

    /* チャート：実践ラダー（従来どおり） */
    html += '<section class="card">'
      + '<h2>実践ラダーの4つの力</h2>'
      + explainBlock('chart-practice', 'このチャートの見方について',
        '<p class="hint">チャレンジレベル（レベル' + esc(challengeRoman) + '）の実践例について、'
        + '本人評価と他者評価を重ねて表示しています。</p>')
      + '<div id="radar" class="radar-wrap"></div>'
      + '</section>';

    /* チャート：マネジメントラダー（選択しているときだけ出す／R20）。
     * 非選択のときは枠も「なし」表示も出さない。 */
    if (state.profile.managementLadder) {
      var mgmt = ladderOf('management');
      var mgmtLevel = PE_Scoring.romanOf(
        (mgmt && mgmt.fixedLevel) ? mgmt.fixedLevel : state.profile.challengeLevel
      );
      html += '<section class="card">'
        + '<h2>' + esc(mgmt ? mgmt.name : 'マネジメントラダー') + 'の'
        + (mgmt ? mgmt.competencies.length : 0) + 'つの力</h2>'
        + explainBlock('chart-management', 'このチャートの見方について',
          '<p class="hint">レベル' + esc(mgmtLevel) + 'の実践例について、本人評価と他者評価を重ねて表示しています。</p>')
        + '<div id="radar-management" class="radar-wrap"></div>'
        + '</section>';
    }

    /* チャート：各個人の目標（実践例が少ないため横棒グラフ／R28）。
     * 合意した目標ごとにまとめ、見出しに目標内の重みと総合スコアに占める割合を出す。 */
    var goalList = PE_Scoring.goalScores(d.items, state.answers, state.otherAnswers, state.personalGoals.goals);
    html += '<section class="card">'
      + '<h2>各個人の目標の実践例</h2>'
      + explainBlock('chart-personal', 'この横棒グラフの見方と目盛について',
        '<p class="hint">合意した目標ごとにまとめ、実践例ごとに本人評価と他者評価を並べています。目盛は評価基準の1〜4です。</p>'
        + '<p class="hint">各目標の見出しに、目標内の重みと、総合スコアに占める割合（目標内の重み × 各個人の目標の重み）を示しています。'
        + '目標のスコアはその目標の実践例の平均で、各個人の目標の領域スコアは目標のスコアを目標ごとの重みで加重平均した値です。</p>'
        + '<p class="hint">他者評価の値がない実践例は、他者評価を「—」と表示し、他者評価の集計の分母から外しています。</p>');
    if (goalList.length === 0) {
      html += '<p class="empty">合意した目標がないため、各個人の目標の回答対象はありません。</p>';
    }
    for (var gi = 0; gi < goalList.length; gi++) {
      var gs = goalList[gi];
      html += '<div class="goal-chart">'
        + '<p class="group-kind">' + esc(goalLabel(gi, goalList.length)) + '</p>'
        + '<h3 class="goal-chart-title">' + esc(gs.text) + '</h3>'
        + '<p class="goal-chart-meta">目標内の重み <strong>' + esc(gs.weight) + '％</strong>'
        + '／総合スコアに占める割合 <strong>' + esc(goalShareText(gs.weight)) + '％</strong></p>'
        + '<p class="goal-chart-meta">目標のスコア：本人評価 ' + esc(fmtScore(gs.selfAverage))
        + '／他者評価 ' + esc(fmtScore(gs.otherAverage)) + '</p>'
        + '<div id="bars-personal-' + gi + '" class="radar-wrap" data-goal="' + esc(gs.id) + '"></div>'
        + '</div>';
    }
    html += '</section>';

    /* 適用外・担当外の件数（画面表記は「要資格（○○）項目」） */
    var naTerm = licenseTermOf(d.items);
    html += '<section class="card">'
      + '<h2>' + esc(naTerm) + '・担当外の件数</h2>'
      + '<div class="table-wrap"><table class="table">'
      + '<thead><tr><th>区分</th><th>件数</th><th>集計での扱い</th></tr></thead><tbody>'
      + '<tr><td>' + esc(naTerm) + '</td><td class="num">' + cnt.notApplicable + '</td>'
      + '<td>資格がないと担当できない業務です。評価の対象から外し、平均点の計算にも含めません。</td></tr>'
      + '<tr><td>担当外・観察機会なし</td><td class="num">' + cnt.unobserved + '</td>'
      + '<td>今期は担当する機会がなかった項目です。評価の対象から外し、平均点の計算にも含めません。</td></tr>'
      + '</tbody></table></div>'
      + '<p class="hint">どちらも「できていない」とは扱いません。'
      + esc(naTerm) + 'は資格要件から自動で判定し、担当外・観察機会なしは本人が選びます。</p>'
      + '</section>';

    return html;
  }

  function renderCertification(cert) {
    var cls = cert.status === 'met' ? 'cert-met'
      : (cert.status === 'notMet' ? 'cert-notmet'
        : (cert.status === 'pending' ? 'cert-pending' : 'cert-none'));
    var label = cert.status === 'met' ? '認定の要件を満たす'
      : (cert.status === 'notMet' ? '認定の要件を満たしていない'
        : (cert.status === 'pending' ? '保留' : '対象なし'));

    var html = '<div class="cert-box ' + cls + '">'
      + '<h3>' + esc(cert.ladderName) + '（レベル' + esc(cert.levelRoman) + '）</h3>'
      + '<p class="cert-status">' + esc(label) + '</p>'
      + '<p>' + esc(cert.message) + '</p>';

    if (cert.notMet.length > 0) {
      html += '<p class="cert-list-title">上位2段階（3・4）がついていない実践例</p><ul class="cert-list">';
      for (var i = 0; i < cert.notMet.length; i++) {
        html += '<li>' + esc(cert.notMet[i].group.competencyName) + '：' + esc(cert.notMet[i].text) + '</li>';
      }
      html += '</ul>';
    }
    if (cert.undecidable.length > 0) {
      html += '<p class="cert-list-title">判定できない項目（担当外・観察機会なし。未達ではありません）</p><ul class="cert-list">';
      for (var j = 0; j < cert.undecidable.length; j++) {
        html += '<li>' + esc(cert.undecidable[j].group.competencyName) + '：' + esc(cert.undecidable[j].text) + '</li>';
      }
      html += '</ul>';
    }
    if (cert.unanswered.length > 0) {
      html += '<p class="cert-list-title">未回答の実践例</p><ul class="cert-list">';
      for (var k = 0; k < cert.unanswered.length; k++) {
        html += '<li>' + esc(cert.unanswered[k].group.competencyName) + '：' + esc(cert.unanswered[k].text) + '</li>';
      }
      html += '</ul>';
    }
    if (cert.notApplicable.length > 0) {
      html += '<p class="cert-list-title">'
        + esc(PE_Scoring.licenseTerm(PE_Scoring.licenseNamesOf(cert.notApplicable)))
        + '（判定の対象から外しています）</p><ul class="cert-list">';
      for (var m = 0; m < cert.notApplicable.length; m++) {
        html += '<li>' + esc(cert.notApplicable[m].group.competencyName) + '：' + esc(cert.notApplicable[m].text) + '</li>';
      }
      html += '</ul>';
    }
    html += '</div>';
    return html;
  }

  function ladderOf(id) {
    for (var i = 0; i < PE_MASTER.ladders.length; i++) {
      if (PE_MASTER.ladders[i].id === id) return PE_MASTER.ladders[i];
    }
    return null;
  }

  function afterDashboard() {
    bindExplain();

    var wrap = document.getElementById('radar');
    if (!wrap) return;
    var d = derived();
    var axes = PE_Scoring.radarAxes(d.items, state.answers, state.otherAnswers, PE_MASTER);
    PE_Radar.render(wrap, axes);

    var basic = document.getElementById('radar-basic');
    if (basic) {
      PE_Radar.render(basic, PE_Scoring.basicAxes(d.items, state.answers, state.otherAnswers, PE_MASTER),
        { ariaLabel: '基礎評価の項目ごとの本人評価と他者評価のレーダーチャート' });
    }

    var mgmt = document.getElementById('radar-management');
    if (mgmt) {
      PE_Radar.render(mgmt, PE_Scoring.ladderAxes(d.items, state.answers, state.otherAnswers, PE_MASTER, 'management'),
        { ariaLabel: 'マネジメントラダーの力ごとの本人評価と他者評価のレーダーチャート' });
    }

    /* 各個人の目標：合意した目標ごとに1枚。凡例は最後の1枚にだけ付ける */
    var goals = state.personalGoals.goals;
    for (var g = 0; g < goals.length; g++) {
      var box = document.getElementById('bars-personal-' + g);
      if (!box) continue;
      PE_Radar.renderBars(box, PE_Scoring.personalBars(d.items, state.answers, state.otherAnswers, goals[g].id),
        {
          ariaLabel: '合意した目標「' + goals[g].text + '」の実践例ごとの本人評価と他者評価の横棒グラフ',
          legend: g === goals.length - 1
        });
    }
  }

  /* 重み付き総合スコアの説明（開閉の中身）。この方に適用されている重みを示す。 */
  function weightsExplainHtml() {
    var w = state.personalWeight;
    var def = PE_defaultPersonalWeight();
    var goals = state.personalGoals.goals;
    var html = '<p class="notice notice-warn">病院の既定値は ' + esc(weightLabel(def)) + 'です。'
      + 'これは<strong>暫定値</strong>であり、試行運用の結果をふまえて確定します。</p>'
      + '<p class="hint">この方に適用されている重みは <strong>' + esc(weightLabel(w)) + '</strong> です'
      + (isDefaultWeight(w) ? '（既定値のまま）。' : '（既定値から調整）。')
      + '個人ごとの重みは上位職または病院内管理者が調整します。</p>';
    if (goals.length > 0) {
      html += '<p class="hint">各個人の目標の中では、合意した目標ごとに重みを持ちます。</p><ul class="weight-list">';
      for (var i = 0; i < goals.length; i++) {
        html += '<li>' + esc(goals[i].text) + '：' + esc(goalWeightLine(goals[i].weight)) + '</li>';
      }
      html += '</ul>';
    } else {
      html += '<p class="hint">合意した目標がないため、各個人の目標の領域には回答対象がありません。</p>';
    }
    return html;
  }

  /* ---------------- 画面：マイページ ---------------- */

  function viewMypage() {
    var currentLevel = state.profile.challengeLevel - 1;
    var html = '<section class="card">'
      + '<h1>マイページ</h1>'
      + '<p class="notice notice-warn">表示している氏名・職種・評価はすべて<strong>架空のデモ用データ</strong>です。</p>'
      + '<dl class="kv">'
      + '<dt>氏名</dt><dd>' + esc(state.profile.name) + '（架空）</dd>'
      + '<dt>職種</dt><dd>' + esc(state.profile.jobType) + '</dd>'
      + '<dt>愛玩動物看護師の資格</dt><dd>' + (state.profile.hasLicense ? 'あり' : 'なし') + '</dd>'
      + '<dt>マネジメントラダー</dt><dd>' + (state.profile.managementLadder ? '選択する' : '選択しない')
      + '<span class="dd-note">マネジメントラダーは任意です。選択しないこと、途中でやめることを減点として扱いません（R20）。</span></dd>'
      + '<dt>現在のレベル</dt><dd>' + (currentLevel >= 1 ? 'レベル' + esc(PE_Scoring.romanOf(currentLevel)) : '未認定') + '</dd>'
      + '<dt>チャレンジレベル</dt><dd>レベル' + esc(PE_Scoring.romanOf(state.profile.challengeLevel)) + '</dd>'
      + '<dt>ログイン中の ID</dt><dd>' + esc(state.session ? state.session.email : '') + '</dd>'
      + '</dl>'
      + '</section>';

    html += '<section class="card">'
      + '<h2>レベル認定の履歴</h2>'
      + '<p class="hint">デモでは1期分のみを表示します。</p>';
    if (currentLevel >= 1) {
      html += '<div class="table-wrap"><table class="table">'
        + '<thead><tr><th>評価期間</th><th>ラダー</th><th>レベル</th><th>結果</th></tr></thead><tbody>'
        + '<tr><td>前期（架空）</td><td>実践ラダー</td><td>レベル' + esc(PE_Scoring.romanOf(currentLevel)) + '</td><td>認定</td></tr>'
        + '</tbody></table></div>';
    } else {
      html += '<p class="empty">認定の履歴はありません。レベルⅠに挑戦中です。</p>';
    }
    html += '</section>';

    html += viewMypageGoals();

    html += '<section class="card">'
      + '<h2>レベル毎の定義</h2>'
      + '<p class="hint">レベル毎の定義は専門実践評価にのみ適用され、実践ラダーとマネジメントラダーで共通です。</p>'
      + '<div class="table-wrap"><table class="table">'
      + '<thead><tr><th>レベル</th><th>定義文</th><th>判別の目安</th></tr></thead><tbody>';
    for (var i = 0; i < PE_LEVEL_DEFINITIONS.length; i++) {
      var ld = PE_LEVEL_DEFINITIONS[i];
      html += '<tr' + (ld.level === state.profile.challengeLevel ? ' class="row-current"' : '') + '>'
        + '<td>レベル' + esc(ld.roman) + '</td><td>' + esc(ld.text) + '</td><td>' + esc(ld.hint) + '</td></tr>';
    }
    html += '</tbody></table></div></section>';

    html += '<section class="card">'
      + '<div class="btn-row">'
      + '<button type="button" class="btn" data-action="logout">ログアウト</button>'
      + '<a class="btn" href="#/settings">設定へ</a>'
      + '</div>'
      + '<p class="hint">ログアウトしてもセッションのみを削除します。評価データは残ります。</p>'
      + '</section>';

    return html;
  }

  /* マイページ：合意した目標と適用されている重み（参照のみ） */
  function viewMypageGoals() {
    var w = state.personalWeight;
    var def = PE_defaultPersonalWeight();
    var goals = state.personalGoals.goals;
    var html = '<section class="card">'
      + '<h2>各個人の目標と重み</h2>'
      + '<p class="hint">合意した目標は本人と上位職の面談で決め、重みは上位職または病院内管理者が設定します。'
      + 'この画面では参照のみです（デモでは設定画面の「各個人の目標（デモ用の編集）」で変更できます）。</p>'
      + '<h3 class="sub-heading">3領域の重み</h3>'
      + '<div class="table-wrap"><table class="table">'
      + '<thead><tr><th>評価領域</th><th>適用されている重み</th><th>病院の既定値</th></tr></thead><tbody>';
    for (var i = 0; i < PE_DOMAINS.length; i++) {
      var id = PE_DOMAINS[i].id;
      html += '<tr><td>' + esc(PE_DOMAINS[i].name) + '</td>'
        + '<td class="num">' + esc(w[id]) + '％</td>'
        + '<td class="num">' + esc(def[id]) + '％</td></tr>';
    }
    html += '</tbody></table></div>';
    if (!isDefaultWeight(w)) {
      html += '<p class="notice notice-info">この方の重みは既定値（' + esc(weightShort(def)) + '）から調整されています。</p>';
    }
    html += '<h3 class="sub-heading">合意した目標（' + goals.length + '件）</h3>';
    if (goals.length === 0) {
      html += '<p class="empty">合意した目標はありません。各個人の目標の回答対象はありません。</p>';
    } else {
      html += '<ol class="goal-ref-list">';
      for (var g = 0; g < goals.length; g++) {
        html += '<li class="goal-panel">'
          + '<p class="goal-text">' + esc(goals[g].text) + '</p>'
          + '<p class="goal-weight-note">' + esc(goalWeightLine(goals[g].weight)) + '</p>'
          + '<p class="goal-items-title">実践例（' + goals[g].practiceItems.length + '件）</p>'
          + '<ul class="goal-items">';
        for (var p = 0; p < goals[g].practiceItems.length; p++) {
          html += '<li>' + esc(goals[g].practiceItems[p].text) + '</li>';
        }
        html += '</ul></li>';
      }
      html += '</ol>';
    }
    html += '</section>';
    return html;
  }

  /* ---------------- 画面：設定 ---------------- */

  function viewSettings() {
    var d = derived();
    var prog = PE_Scoring.progress(d.items, state.answers);
    var html = '<section class="card">'
      + '<h1>設定</h1>'
      + '<p class="notice notice-info">この設定画面は<strong>デモ専用</strong>です。'
      + '本番ではマネジメントラダーの選択とチャレンジレベルは面談で決めます。'
      + '設定を変えると、回答対象とダッシュボードの表示がその場で切り替わります。</p>'
      + '<p class="progress-text">現在の回答対象：' + prog.total + '項目（' + esc(licenseTermOf(d.items)) + 'を除く）</p>'
      + '</section>';

    html += '<section class="card">'
      + '<h2>マネジメントラダー</h2>'
      + '<div class="seg">'
      + segButton('management', 'true', '選択する', state.profile.managementLadder === true)
      + segButton('management', 'false', '選択しない', state.profile.managementLadder === false)
      + '</div>'
      + '<p class="hint">マネジメントラダーは任意です。選択しないことを減点として扱いません（R20）。'
      + '選択すると人材育成・チーム運営・改善の3つの力の実践例が加わります。</p>'
      + '</section>';

    html += '<section class="card">'
      + '<h2>愛玩動物看護師の資格</h2>'
      + '<div class="seg">'
      + segButton('license', 'true', 'あり', state.profile.hasLicense === true)
      + segButton('license', 'false', 'なし', state.profile.hasLicense === false)
      + '</div>'
      + '<p class="hint">資格を「なし」にすると、資格要件を持つレベル毎の目標（ケアする力）に紐づく実践例が'
      + '<strong>' + esc(licenseTermOf(d.items)) + '</strong>になります。回答はできず、'
      + '評価の対象から外れます（R6）。</p>'
      + '</section>';

    html += '<section class="card">'
      + '<h2>チャレンジレベル</h2>'
      + '<div class="seg seg-level">';
    for (var i = 0; i < PE_LEVEL_DEFINITIONS.length; i++) {
      var ld = PE_LEVEL_DEFINITIONS[i];
      html += segButton('level', String(ld.level), 'レベル' + ld.roman, state.profile.challengeLevel === ld.level);
    }
    html += '</div>'
      + '<p class="hint">チャレンジレベルは<strong>実践ラダー</strong>の回答対象に適用されます。'
      + 'マネジメントラダーのレベルは実践ラダーのレベルに影響しない（R20）ため、本デモではレベルⅠ固定です。</p>'
      + '<p class="hint">基礎評価はレベル軸を持たないため、チャレンジレベルを変えても5項目のまま変わりません（R26）。</p>'
      + '</section>';

    html += viewPersonalGoalSettings(d);

    html += '<section class="card">'
      + '<h2>データリセット</h2>'
      + '<p class="hint">localStorage を初期化し、回答・設定・合意した目標・重み・セッションをすべて消します。'
      + '合意した目標はプリセットの1件に、重みは既定値に戻ります。この操作は取り消せません。</p>'
      + '<button type="button" class="btn btn-danger" data-action="reset">データをリセットする</button>'
      + '</section>';

    /* デモの見た目（比較用）：配色が決まったらこの節ごと削除する */
    html += viewThemeSection();

    return html;
  }

  /* 設定画面：各個人の目標（デモ用の編集）。改訂方針D。
   * 本番では合意した目標は面談で決め、重みは上位職または病院内管理者が設定する。
   * デモでは挙動を確認するため、既存の設定項目と同じ扱いでここに置く。 */
  function viewPersonalGoalSettings(d) {
    var w = state.personalWeight;
    var goals = state.personalGoals.goals;
    var flash = goalFlash;
    goalFlash = null;

    var html = '<section class="card" id="personal-goal-settings">'
      + '<h2>各個人の目標（デモ用の編集）</h2>'
      + '<p class="notice notice-info">本番では、合意した目標は本人と上位職の面談で決め、'
      + '重みは上位職または病院内管理者が設定します。スタッフは参照のみです。'
      + 'デモでは挙動を確認するため、ここで編集できます。</p>'
      + '<div class="progress-box">' + limitSummaryHtml(d.items) + '</div>';
    if (flash) {
      html += '<p class="notice notice-ok goal-flash" role="status">' + esc(flash.text) + '</p>';
    }

    /* 3領域の重み */
    html += '<h3 class="sub-heading">3領域の重み</h3>'
      + '<p class="hint">病院の既定値（' + esc(weightLabel(PE_defaultPersonalWeight())) + '・暫定値）に、個人ごとの調整を重ねます。'
      + '各値は 0〜100 の整数で、合計を100％にしてください。</p>'
      + '<div class="weight-grid">';
    for (var i = 0; i < PE_DOMAINS.length; i++) {
      var dm = PE_DOMAINS[i];
      html += '<div class="weight-field">'
        + '<label for="dw-' + esc(dm.id) + '">' + esc(dm.name) + '</label>'
        + '<span class="weight-input"><input type="number" inputmode="numeric" min="0" max="100" step="1"'
        + ' id="dw-' + esc(dm.id) + '" data-role="domain-weight" value="' + esc(w[dm.id]) + '"><span aria-hidden="true">％</span></span>'
        + '</div>';
    }
    html += '</div>'
      + '<p class="weight-sum" id="domain-weight-sum">合計 ' + (w.basic + w.professional + w.personal) + '％</p>'
      + '<p class="form-error" id="domain-weight-error" role="alert" hidden></p>'
      + '<div class="btn-row">'
      + '<button type="button" class="btn btn-primary" data-action="domain-weights-save">3領域の重みを保存</button>'
      + '<button type="button" class="btn" data-action="domain-weights-default">既定値（' + esc(weightShort(PE_defaultPersonalWeight())) + '）に戻す</button>'
      + '</div>'
      + '<p class="hint">現在の状態：' + (isDefaultWeight(w) ? '既定値のまま' : '<strong>既定値から調整されています</strong>') + '</p>';

    /* 合意した目標の一覧 */
    html += '<h3 class="sub-heading">合意した目標（' + goals.length + '件）</h3>'
      + '<p class="hint">合意した目標は個数の上限なく作れます（R28）。目標ごとの重みは目標どうしの比率（％）で入れ、合計を100％にします。'
      + '総合スコアに占める割合は「目標内の重み × 各個人の目標の重み（' + esc(w.personal) + '％）」で自動計算します。</p>';
    if (goals.length === 0) {
      html += '<p class="notice notice-warn">合意した目標がありません。各個人の目標の領域に回答対象がなくなり、'
        + '重み付き総合スコアは各個人の目標の重みを除いて算出します。</p>';
    } else {
      html += '<ol class="goal-list">';
      for (var g = 0; g < goals.length; g++) {
        if (goalEditor && goalEditor.mode === 'edit' && goalEditor.goalId === goals[g].id) {
          html += '<li class="goal-panel goal-panel-editing">' + goalEditorHtml(g, goals.length) + '</li>';
        } else {
          html += '<li class="goal-panel">' + goalPanelHtml(goals[g], g, goals.length) + '</li>';
        }
      }
      html += '</ol>'
        + '<p class="weight-sum" id="goal-weight-sum">目標ごとの重みの合計 ' + sumGoalWeights() + '％</p>'
        + '<p class="form-error" id="goal-weight-error" role="alert" hidden></p>'
        + '<div class="btn-row">'
        + '<button type="button" class="btn btn-primary" data-action="goal-weights-save">目標ごとの重みを保存</button>'
        + '<button type="button" class="btn" data-action="goal-weights-equal">均等に割り振る</button>'
        + '</div>';
    }

    if (goalEditor && goalEditor.mode === 'new') {
      html += '<div class="goal-panel goal-panel-editing goal-panel-new">' + goalEditorHtml(-1, goals.length) + '</div>';
    } else {
      html += '<div class="btn-row goal-add-row">'
        + '<button type="button" class="btn" data-action="goal-add">合意した目標を追加</button>'
        + '<button type="button" class="btn" data-action="goal-sample">サンプルの目標を追加</button>'
        + '</div>'
        + '<p class="hint">サンプルの目標は、経営・人事に関わる内容を各個人の目標で扱う例（架空）です。'
        + '目標を追加・削除すると、目標ごとの重みは均等に割り振り直します。'
        + '目標や実践例を削除すると、その実践例に対する本人評価の回答も削除します。</p>';
    }
    if (state.submitted.submitted) {
      html += '<p class="hint">提出済みの状態は変わりません。合意した目標を変えた場合は、評価入力の画面から回答し直して再提出してください。</p>';
    }
    html += '</section>';
    return html;
  }

  function sumGoalWeights() {
    var s = 0, goals = state.personalGoals.goals;
    for (var i = 0; i < goals.length; i++) s += goals[i].weight;
    return s;
  }

  function goalPanelHtml(goal, index, count) {
    var html = '<p class="group-kind">' + esc(goalLabel(index, count)) + '</p>'
      + '<p class="goal-text">' + esc(goal.text) + '</p>'
      + '<div class="goal-weight-row">'
      + '<label for="gw-' + esc(goal.id) + '">目標内の重み</label>'
      + '<span class="weight-input"><input type="number" inputmode="numeric" min="0" max="100" step="1"'
      + ' id="gw-' + esc(goal.id) + '" data-role="goal-weight" value="' + esc(goal.weight) + '"><span aria-hidden="true">％</span></span>'
      + '<span class="goal-share" id="gs-' + esc(goal.id) + '">総合スコアに占める割合 ' + esc(goalShareText(goal.weight)) + '％</span>'
      + '</div>'
      + '<p class="goal-items-title">実践例（' + goal.practiceItems.length + '件）</p>'
      + '<ul class="goal-items">';
    for (var i = 0; i < goal.practiceItems.length; i++) {
      html += '<li>' + esc(goal.practiceItems[i].text) + '</li>';
    }
    html += '</ul>'
      + '<div class="btn-row">'
      + '<button type="button" class="btn" data-action="goal-edit" data-goal="' + esc(goal.id) + '">編集</button>'
      + '<button type="button" class="btn btn-danger-outline" data-action="goal-delete" data-goal="' + esc(goal.id) + '">削除</button>'
      + '</div>';
    return html;
  }

  function goalEditorHtml(index, count) {
    var ed = goalEditor;
    var title = ed.mode === 'new' ? '合意した目標を追加' : goalLabel(index, count) + 'を編集';
    var html = '<p class="group-kind">' + esc(title) + '</p>'
      + '<div class="field">'
      + '<label for="ge-text">目標文</label>'
      + '<textarea id="ge-text" rows="2" data-role="ge-text" placeholder="例：入院管理の記録様式を見直す">' + esc(ed.text) + '</textarea>'
      + '</div>'
      + '<fieldset class="ge-items"><legend>実践例（1つ以上）</legend>';
    for (var i = 0; i < ed.items.length; i++) {
      html += '<div class="ge-item">'
        + '<label class="ge-item-label" for="ge-item-' + i + '">実践例 ' + (i + 1) + '</label>'
        + '<div class="ge-item-row">'
        + '<textarea id="ge-item-' + i + '" rows="2" data-role="ge-item" data-index="' + i + '"'
        + ' placeholder="例：新しい記録様式の案を作成し、上位職に提出した">' + esc(ed.items[i].text) + '</textarea>'
        + '<button type="button" class="btn btn-danger-outline" data-action="ge-remove-item" data-index="' + i + '"'
        + ' aria-label="実践例 ' + (i + 1) + ' を削除">削除</button>'
        + '</div></div>';
    }
    if (ed.items.length === 0) {
      html += '<p class="hint warn-text">実践例が0件です。このままでは保存できません。</p>';
    }
    html += '</fieldset>'
      + '<div class="btn-row"><button type="button" class="btn" data-action="ge-add-item">実践例を追加</button></div>'
      + '<p class="form-error" id="ge-error" role="alert"' + (ed.error ? '' : ' hidden') + '>' + esc(ed.error) + '</p>'
      + '<div class="btn-row">'
      + '<button type="button" class="btn btn-primary" data-action="ge-save">この目標を保存</button>'
      + '<button type="button" class="btn" data-action="ge-cancel">取り消す</button>'
      + '</div>';
    if (ed.mode === 'edit') {
      html += '<p class="hint">実践例を削除して保存すると、その実践例に対する本人評価の回答も削除します。'
        + '文を直しただけの実践例は、回答をそのまま引き継ぎます。</p>';
    }
    return html;
  }

  /* デモの見た目（比較用）：配色が決まったらこの関数ごと削除する */
  function viewThemeSection() {
    var current = readTheme();
    var html = '<section class="card">'
      + '<h2>デモの見た目（比較用）</h2>'
      + '<p class="hint">配色の候補を見比べるための切り替えです。評価の内容やスコアには影響しません。'
      + '配色が決まったらこの切り替えは外します。</p>'
      + '<fieldset class="theme-list"><legend class="sr-only">配色の候補</legend>';
    for (var i = 0; i < PE_THEMES.length; i++) {
      var th = PE_THEMES[i];
      var on = (th.id === current);
      html += '<label class="theme-option' + (on ? ' is-selected' : '') + '">'
        + '<input type="radio" name="demo-theme" value="' + esc(th.id) + '"'
        + (on ? ' checked' : '') + ' data-role="theme">'
        + '<span class="theme-swatch" data-swatch="' + esc(th.id) + '" aria-hidden="true">'
        + '<span class="sw sw-bg"></span><span class="sw sw-accent"></span><span class="sw sw-other"></span>'
        + '</span>'
        + '<span class="theme-name">' + esc(th.label) + '</span>'
        + '</label>';
    }
    html += '</fieldset>'
      + '<p class="hint">選ぶとすぐに画面全体へ反映され、このブラウザに記憶されます。'
      + 'データをリセットしても選んだ配色は残ります。</p>'
      + '</section>';
    return html;
  }

  function segButton(group, value, label, active) {
    return '<button type="button" class="seg-btn' + (active ? ' is-active' : '') + '"'
      + ' data-action="set-' + group + '" data-value="' + esc(value) + '"'
      + ' aria-pressed="' + (active ? 'true' : 'false') + '">' + esc(label) + '</button>';
  }

  /* ---------------- イベント ---------------- */

  function onClick(e) {
    var t = e.target;
    while (t && t !== document.body && !t.getAttribute) t = t.parentNode;
    var btn = t && t.closest ? t.closest('[data-action]') : null;
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'logout') {
      PE_Storage.remove(PE_KEYS.session);
      state.session = null;
      go('login');
      return;
    }
    if (action === 'submit-answers') {
      state.submitted = { submitted: true, at: new Date().toISOString() };
      saveSubmitted();
      go('complete');
      return;
    }
    if (action === 'set-management') {
      state.profile.managementLadder = (btn.getAttribute('data-value') === 'true');
      saveProfile(); render(); return;
    }
    if (action === 'set-license') {
      state.profile.hasLicense = (btn.getAttribute('data-value') === 'true');
      saveProfile(); render(); return;
    }
    if (action === 'set-level') {
      state.profile.challengeLevel = parseInt(btn.getAttribute('data-value'), 10);
      saveProfile(); render(); return;
    }
    /* ---- 各個人の目標（デモ用の編集） ----
     * 提出状態は変えない（既存の設定変更と同じ扱い）。 */
    if (action === 'goal-add') {
      openGoalEditor('new');
      renderKeepScroll('ge-text');
      return;
    }
    if (action === 'goal-sample') {
      addSampleGoal();
      renderKeepScroll();
      return;
    }
    if (action === 'goal-edit') {
      openGoalEditor('edit', btn.getAttribute('data-goal'));
      renderKeepScroll('ge-text');
      return;
    }
    if (action === 'goal-delete') {
      var delGoal = findGoal(btn.getAttribute('data-goal'));
      if (delGoal && window.confirm('合意した目標「' + delGoal.text + '」を削除します。'
        + 'その実践例に対する本人評価の回答も削除します。よろしいですか？')) {
        deleteGoal(delGoal.id);
        renderKeepScroll();
      }
      return;
    }
    if (action === 'ge-add-item') {
      if (goalEditor) {
        goalEditor.items.push({ id: null, text: '' });
        goalEditor.error = '';
        renderKeepScroll('ge-item-' + (goalEditor.items.length - 1));
      }
      return;
    }
    if (action === 'ge-remove-item') {
      if (goalEditor) {
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        if (idx >= 0 && idx < goalEditor.items.length) goalEditor.items.splice(idx, 1);
        goalEditor.error = goalEditor.items.length === 0
          ? '実践例が0件の目標は保存できません。回答する対象がなくなるため、実践例を1つ以上入れてください。' : '';
        renderKeepScroll();
      }
      return;
    }
    if (action === 'ge-save') {
      if (saveGoalEditor()) renderKeepScroll();
      else showFieldError('ge-error', goalEditor ? goalEditor.error : '');
      return;
    }
    if (action === 'ge-cancel') {
      goalEditor = null;
      renderKeepScroll();
      return;
    }
    if (action === 'domain-weights-save') {
      if (saveDomainWeights()) renderKeepScroll();
      return;
    }
    if (action === 'domain-weights-default') {
      resetDomainWeights();
      renderKeepScroll();
      return;
    }
    if (action === 'goal-weights-save') {
      if (saveGoalWeights()) renderKeepScroll();
      return;
    }
    if (action === 'goal-weights-equal') {
      applyEqualGoalWeights();
      savePersonalGoals();
      goalFlash = { type: 'ok', text: '目標ごとの重みを均等に割り振りました（' + goalWeightsText() + '）。' };
      renderKeepScroll();
      return;
    }
    if (action === 'reset') {
      if (window.confirm('localStorage を初期化します。回答・設定・合意した目標・重み・セッションがすべて消えます。よろしいですか？')) {
        resetAll(true);
        go('login');
        render();
      }
      return;
    }
  }

  function onChange(e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    var role = el.getAttribute('data-role');

    /* デモの見た目（比較用）：配色が決まったらこの分岐を削除する */
    if (role === 'theme') {
      var picked = applyTheme(el.value);
      writeTheme(picked);
      refreshThemeUI();
      return;
    }

    var itemId = el.getAttribute('data-item');
    if (!role || !itemId) return;

    if (role === 'score') {
      setScore(itemId, parseInt(el.value, 10));
      refreshItemUI(itemId);
      refreshProgress();
    } else if (role === 'unobserved') {
      setUnobserved(itemId);
      refreshItemUI(itemId);
      refreshProgress();
    } else if (role === 'note') {
      setNote(itemId, el.value);
    }
  }

  function onInput(e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    var role = el.getAttribute('data-role');
    if (role === 'domain-weight') { refreshDomainWeightSum(); showFieldError('domain-weight-error', ''); return; }
    if (role === 'goal-weight') { refreshGoalWeightSum(); showFieldError('goal-weight-error', ''); return; }
    if (role === 'ge-text') { if (goalEditor) goalEditor.text = el.value; return; }
    if (role === 'ge-item') {
      var idx = parseInt(el.getAttribute('data-index'), 10);
      if (goalEditor && goalEditor.items[idx]) goalEditor.items[idx].text = el.value;
      return;
    }
    if (role !== 'note') return;
    setNote(el.getAttribute('data-item'), el.value);
  }

  function refreshItemUI(itemId) {
    var box = document.querySelector('.item[data-item="' + itemId + '"]');
    if (!box) return;
    var labels = box.querySelectorAll('.choice');
    for (var i = 0; i < labels.length; i++) {
      var input = labels[i].querySelector('input');
      if (input && input.checked) labels[i].classList.add('is-selected');
      else labels[i].classList.remove('is-selected');
    }
  }

  function refreshProgress() {
    if (currentRoute() !== 'input') return;
    var d = derived();
    var prog = PE_Scoring.progress(d.items, state.answers);
    var cnt = PE_Scoring.counts(d.items, state.answers);
    var text = document.querySelector('.progress-box .progress-text');
    var bar = document.querySelector('.progress-bar span');
    if (text) {
      text.innerHTML = '回答済み <strong>' + prog.answered + '</strong> ／ 対象 <strong>' + prog.total + '</strong>'
        + '（' + esc(licenseTermOf(d.items)) + 'の' + cnt.notApplicable + '件は対象数から除いています）';
    }
    if (bar) bar.style.width = (prog.total ? Math.round(prog.answered / prog.total * 100) : 0) + '%';
  }

  function onSubmitForm(e) {
    if (e.target && e.target.id === 'login-form') handleLogin(e);
  }

  /* ---------------- 起動 ---------------- */

  function boot() {
    /* デモの見た目（比較用）：配色が決まったらこの1行を削除する */
    applyTheme(readTheme());
    /* 説明の開閉：前回の開閉状態を読み込む（既定はすべて閉じた状態） */
    explainState = readExplainState();
    initData();
    document.addEventListener('click', onClick, false);
    document.addEventListener('change', onChange, false);
    document.addEventListener('input', onInput, false);
    document.addEventListener('submit', onSubmitForm, false);
    window.addEventListener('hashchange', render, false);
    if (!window.location.hash) {
      window.location.hash = state.session ? '#/dashboard' : '#/login';
    }
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, false);
  } else {
    boot();
  }
})();

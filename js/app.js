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
    submitted: { submitted: false, at: null }
  };

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
  }

  function resetAll(reinit) {
    PE_Storage.clearKeys([
      PE_KEYS.version, PE_KEYS.session, PE_KEYS.profile, PE_KEYS.master,
      PE_KEYS.answers, PE_KEYS.otherAnswers, PE_KEYS.submitted
    ]);
    state.session = null;
    state.profile = null;
    state.answers = {};
    state.otherAnswers = {};
    state.submitted = { submitted: false, at: null };
    if (reinit) initData();
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

  /* ---------------- 導出データ ---------------- */

  function derived() {
    var groups = PE_Scoring.buildGroups(PE_MASTER, state.profile);
    var items = PE_Scoring.flatten(groups);
    return { groups: groups, items: items };
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
    var totalTarget = prog.total;

    var html = ''
      + '<section class="card">'
      + '<h1>評価入力（本人評価）</h1>'
      + '<p class="lead">評価期間：' + esc(PE_MASTER.period) + '</p>'
      + '<div class="progress-box">'
      + '<p class="progress-text">回答済み <strong>' + prog.answered + '</strong> ／ 対象 <strong>' + prog.total + '</strong>'
      + '（' + esc(licenseTermOf(d.items)) + 'の' + cnt.notApplicable + '件は対象数から除いています）</p>'
      + '<div class="progress-bar"><span style="width:' + (prog.total ? Math.round(prog.answered / prog.total * 100) : 0) + '%"></span></div>'
      + '<p class="limit-note">3領域の合計は <strong>' + totalTarget + '項目</strong>です。'
      + '1回の評価で回答する実践例は<strong>20項目以内</strong>に収める決まりで、'
      + (totalTarget <= 20 ? '上限内に収まっています。' : '<span class="warn-text">上限を超えています。</span>')
      + '</p>'
      + '</div>'
      + '<p class="hint">回答するのは実践例のみです。親（基礎評価の項目／レベル毎の目標／合意した目標）には回答しません。'
      + '1つ回答するごとに自動保存され、次回そのまま再開できます。</p>'
      + '</section>';

    var lastDomain = null;
    for (var g = 0; g < d.groups.length; g++) {
      var grp = d.groups[g];
      if (grp.domainId !== lastDomain) {
        lastDomain = grp.domainId;
        html += '<h2 class="domain-heading">' + esc(grp.domainName) + domainHeadingNote(grp.domainId) + '</h2>';
      }
      html += renderGroup(grp);
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
    return '<span class="domain-note">その期に合意した目標の実践例に回答します。</span>';
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
      head = '<p class="group-kind">合意した目標</p><h3 class="group-title">' + esc(grp.parentText) + '</h3>';
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
    var domains = PE_Scoring.domainScores(d.items, state.answers, state.otherAnswers);
    var selfTotal = PE_Scoring.weightedTotal(domains, 'self');
    var otherTotal = PE_Scoring.weightedTotal(domains, 'other');
    var gapList = PE_Scoring.gaps(d.items, state.answers, state.otherAnswers);
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
      + '<p class="hint">判定の対象は<strong>専門実践評価のみ</strong>です。基礎評価と各個人の目標はレベル認定に影響しません。'
      + '判定には本人評価を用い、対象の実践例すべてに上位2段階（3・4）がついているかを見ます。'
      + esc(licenseTermOf(d.items)) + 'は判定の対象から外し、担当外・観察機会なしの実践例は未達として扱いません。</p>';

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
      + '<p class="hint">平均は4点満点です。' + esc(licenseTermOf(d.items)) + 'と担当外・観察機会なしは分母から外しています。'
      + '有効な回答が0件の評価領域は「—」と表示します。</p>'
      + '</section>';

    /* 重み付き総合スコア */
    html += '<section class="card">'
      + '<h2>重み付き総合スコア</h2>'
      + '<div class="total-row">'
      + '<div class="total-box"><p class="level-caption">本人評価</p><p class="level-value">' + esc(fmtScore(selfTotal.value)) + '</p></div>'
      + '<div class="total-box"><p class="level-caption">他者評価</p><p class="level-value">' + esc(fmtScore(otherTotal.value)) + '</p></div>'
      + '</div>'
      + '<p class="notice notice-warn">重みは 基礎評価50％／専門実践評価40％／各個人の目標10％です。'
      + 'これは<strong>暫定値</strong>であり、試行運用の結果をふまえて確定します。</p>';
    if (selfTotal.renormalized || otherTotal.renormalized) {
      var exc = selfTotal.excluded.concat(otherTotal.excluded).filter(function (v, idx, arr) { return arr.indexOf(v) === idx; });
      html += '<p class="hint">有効な回答が0件の評価領域（' + esc(exc.join('・')) + '）は重みごと除き、'
        + '残りの重みを再正規化して算出しています。</p>';
    }
    html += '</section>';

    /* 面談で確認したいこと */
    html += '<section class="card">'
      + '<h2>面談で確認したいこと</h2>'
      + '<p class="notice notice-info">本人評価と他者評価の評価基準が<strong>1つ以上違う項目</strong>を、面談のテーマ候補として並べています。'
      + '<strong>差があること自体は悪い評価ではありません。</strong>認識をすり合わせる手がかりとして使ってください。</p>';
    if (gapList.length === 0) {
      html += '<p class="empty">該当する項目はありません（未回答の項目は対象外です）。</p>';
    } else {
      html += '<ul class="gap-list">';
      for (var gi = 0; gi < gapList.length; gi++) {
        var gp = gapList[gi];
        html += '<li class="gap-item' + (gp.diff >= 2 ? ' gap-large' : '') + '">'
          + '<p class="gap-meta">' + esc(gp.item.group.domainName)
          + (gp.item.group.competencyName ? '｜' + esc(gp.item.group.competencyName) : '')
          + (gp.item.group.parentKind === '基礎評価の項目' ? '｜' + esc(gp.item.group.parentName) : '')
          + '</p>'
          + '<p class="gap-text">' + esc(gp.item.text) + '</p>'
          + '<p class="gap-scores">本人評価 <strong>' + gp.self + '</strong>／他者評価 <strong>' + gp.other + '</strong>'
          + '（差 ' + gp.diff + '）</p>'
          + '</li>';
      }
      html += '</ul>';
    }
    html += '</section>';

    /* チャートは領域別スコアと同じ順（基礎評価 → 専門実践評価 → 各個人の目標）に並べる。
     * 軸の意味が違うため、3領域を1枚にまとめない。 */

    /* チャート：基礎評価（レベル軸を持たない／R26） */
    html += '<section class="card">'
      + '<h2>基礎評価の' + PE_MASTER.basicItems.length + 'つの項目</h2>'
      + '<p class="hint">基礎評価の項目ごとに、本人評価と他者評価を重ねて表示しています。'
      + '値はその項目に属する実践例の平均です。</p>'
      + '<div id="radar-basic" class="radar-wrap"></div>'
      + '<p class="hint">現在は各項目に実践例が1つずつのため、表示している値は平均ではなく評価基準の値そのものです。</p>'
      + '</section>';

    /* チャート：実践ラダー（従来どおり） */
    html += '<section class="card">'
      + '<h2>実践ラダーの4つの力</h2>'
      + '<p class="hint">チャレンジレベル（レベル' + esc(challengeRoman) + '）の実践例について、本人評価と他者評価を重ねて表示しています。</p>'
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
        + '<p class="hint">レベル' + esc(mgmtLevel) + 'の実践例について、本人評価と他者評価を重ねて表示しています。</p>'
        + '<div id="radar-management" class="radar-wrap"></div>'
        + '</section>';
    }

    /* チャート：各個人の目標（実践例が少ないため横棒グラフ／R28） */
    html += '<section class="card">'
      + '<h2>各個人の目標の実践例</h2>'
      + '<p class="hint">合意した目標の実践例ごとに、本人評価と他者評価を並べています。目盛は評価基準の1〜4です。</p>'
      + '<div id="bars-personal" class="radar-wrap"></div>'
      + '</section>';

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

    var personal = document.getElementById('bars-personal');
    if (personal) {
      PE_Radar.renderBars(personal, PE_Scoring.personalBars(d.items, state.answers, state.otherAnswers),
        { ariaLabel: '各個人の目標の実践例ごとの本人評価と他者評価の横棒グラフ' });
    }
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

    html += '<section class="card">'
      + '<h2>データリセット</h2>'
      + '<p class="hint">localStorage を初期化し、回答・設定・セッションをすべて消します。この操作は取り消せません。</p>'
      + '<button type="button" class="btn btn-danger" data-action="reset">データをリセットする</button>'
      + '</section>';

    /* デモの見た目（比較用）：配色が決まったらこの節ごと削除する */
    html += viewThemeSection();

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
    if (action === 'reset') {
      if (window.confirm('localStorage を初期化します。回答・設定・セッションがすべて消えます。よろしいですか？')) {
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
    if (el.getAttribute('data-role') !== 'note') return;
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

/* seed.js
 * デモアプリのシードデータ（マスター＋他者評価のダミー値）。
 * すべて架空のデモ用データである。実在するスタッフの情報は含まない。
 *
 * source: "spec"       … デモアプリ仕様.md／用語集.md に記載のある文言
 * source: "supplement" … デモの挙動確認のために補完した架空データ
 * source: "user"       … デモの設定画面で入力された合意した目標・実践例（シードには存在しない）
 *
 * 職種ごとのラダー（実践ラダー・マネジメントラダー）は js/jobtypes.js にある。
 * このファイルより先に読み込むこと（index.html の script の順）。
 */

var PE_SEED_VERSION = '1';

/* 評価期間の表記（デモでは固定） */
var PE_PERIOD = '2026年度上期';

/* レベル毎の定義（専門実践評価のみ・全職種・全ラダー共通・4行。職種を増やしても変えない／R22・R31） */
var PE_LEVEL_DEFINITIONS = [
  { level: 1, roman: 'Ⅰ', text: '必要に応じ助言を得て実践する', hint: '手順は追えるが、確認を要する場面がある' },
  { level: 2, roman: 'Ⅱ', text: '標準的な実践を自立して行う', hint: '一人で任せられる' },
  { level: 3, roman: 'Ⅲ', text: '個別の状況に応じた判断と実践を行う', hint: '標準どおりにいかない場面で自分で合わせられる' },
  { level: 4, roman: 'Ⅳ', text: '幅広い視野で予測的に判断し実践を行う', hint: '起きる前に手を打てる' }
];

/* 評価基準（4段階）＋担当外・観察機会なし */
var PE_SCALE = [
  { value: 4, label: 'できている（他の人に示せる）' },
  { value: 3, label: 'できている' },
  { value: 2, label: '部分的にできている' },
  { value: 1, label: 'まだできていない' }
];

/* 評価領域と重み（暫定値・R30） */
var PE_DOMAINS = [
  { id: 'basic', name: '基礎評価', weight: 50 },
  { id: 'professional', name: '専門実践評価', weight: 40 },
  { id: 'personal', name: '各個人の目標', weight: 10 }
];

var PE_MASTER = {
  period: PE_PERIOD,
  levelDefinitions: PE_LEVEL_DEFINITIONS,
  domains: PE_DOMAINS,

  /* 基礎評価：基礎評価の項目 → 実践例（レベル軸なし・全員が毎回同じ内容に回答する。全職種共通／R26・R29） */
  basicItems: [
    {
      id: 'bi_kinmu', name: '勤務姿勢', source: 'spec',
      practiceItems: [
        { id: 'bp_kinmu', text: '始業時刻までに業務を開始できる状態になっている', source: 'spec' }
      ]
    },
    {
      id: 'bi_sekinin', name: '責任感', source: 'spec',
      practiceItems: [
        { id: 'bp_sekinin', text: '担当した業務を最後まで完了させ、できなかった場合は必ず申し送っている', source: 'spec' }
      ]
    },
    {
      id: 'bi_comm', name: 'コミュニケーション', source: 'spec',
      practiceItems: [
        { id: 'bp_comm', text: '申し送り事項を担当者に口頭とメモの両方で伝えている', source: 'spec' }
      ]
    },
    {
      id: 'bi_kyocho', name: '協調性', source: 'spec',
      practiceItems: [
        { id: 'bp_kyocho', text: '手が空いたときに他のスタッフの業務状況を確認し、声をかけている', source: 'spec' }
      ]
    },
    {
      id: 'bi_shutai', name: '主体性', source: 'spec',
      practiceItems: [
        { id: 'bp_shutai', text: '気づいた不具合や改善点を、指示される前に申し出ている', source: 'spec' }
      ]
    }
  ],

  /* 専門実践評価：職種 → ラダー → 力 → レベル毎の目標 → 実践例（改訂方針C・R19・R31）
   * ラダーは職種ごとに1組を持つ。職種のマスターは js/jobtypes.js の PE_JOB_TYPES にある。
   * 画面・集計は PE_masterFor(職種ID) で「その職種のラダーを ladders に持つマスター」を受け取って使う。
   * requiresLicense: true のレベル毎の目標には licenseName（資格名）を持たせる。
   * 画面表記の「要資格（○○）項目」はこの licenseName から組み立てる。
   * 要資格（内部の区分名は「適用外」）かどうかは、licenseName が職種の保有資格（licenses）に
   * 含まれるかで決まる（R6）。 */
  jobTypes: PE_JOB_TYPES,

  /* 各個人の目標：合意した目標 → 実践例（レベル軸なし／R28） */
  personalGoals: [
    {
      id: 'pg_kiroku', source: 'spec',
      text: '入院管理の記録様式を見直し、申し送りの抜けをなくす',
      practiceItems: [
        { id: 'gp_1', source: 'spec', text: '新しい記録様式の案を作成し、上位職に提出した' },
        { id: 'gp_2', source: 'spec', text: '1か月間、新様式で記録を運用し、抜けの件数を記録した' }
      ]
    }
  ]
};

/* 他者評価のダミー値（固定値。本人評価には連動しない）
 * 仕様6-2 の値をそのまま投入する。補完した実践例には固定のダミー値を置く。
 * 基礎評価と各個人の目標は全職種共通のためここに置き、専門実践評価のダミー値は
 * 職種のマスター（PE_JOB_TYPES[].otherAnswers）に置く。PE_OTHER_ANSWERS はその合算である。 */
var PE_COMMON_OTHER_ANSWERS = {
  /* 基礎評価（仕様6-2） */
  bp_kinmu: 4,
  bp_sekinin: 3,
  bp_comm: 2,        /* 仕様6-2：想定する本人評価 4 に対し他者 2（差が 2 の項目その1） */
  bp_kyocho: 4,
  bp_shutai: 3,

  /* 各個人の目標（仕様6-2） */
  gp_1: 4,
  gp_2: 2
};

var PE_OTHER_ANSWERS = (function () {
  var out = {}, k;
  for (k in PE_COMMON_OTHER_ANSWERS) {
    if (Object.prototype.hasOwnProperty.call(PE_COMMON_OTHER_ANSWERS, k)) out[k] = PE_COMMON_OTHER_ANSWERS[k];
  }
  for (var i = 0; i < PE_JOB_TYPES.length; i++) {
    var oa = PE_JOB_TYPES[i].otherAnswers || {};
    for (k in oa) if (Object.prototype.hasOwnProperty.call(oa, k)) out[k] = oa[k];
  }
  return out;
})();

/* ---- 職種（改訂方針C） ----
 * どの関数も PE_MASTER.jobTypes をその場で引く。職種を足すときにコードを変えずに済むようにするため（R31）。 */

/* 職種IDから職種を引く。見つからなければ null */
function PE_jobTypeById(id) {
  var list = PE_MASTER.jobTypes;
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}

/* 職種IDから職種を引く。見つからなければ既定の職種（愛玩動物看護師）を返す */
function PE_jobTypeOrDefault(id) {
  return PE_jobTypeById(id) || PE_jobTypeById(PE_DEFAULT_JOB_TYPE_ID) || PE_MASTER.jobTypes[0];
}

/* 職種ごとのマスター。共通部分（評価期間・レベル毎の定義・評価領域・基礎評価・各個人の目標）に、
 * その職種の実践ラダー・マネジメントラダーを ladders として重ねたもの。
 * 集計（js/scoring.js）はこれを master として受け取る。レベル毎の定義と基礎評価は職種によらず同じ（R22・R26）。 */
function PE_masterFor(jobTypeId) {
  var job = PE_jobTypeOrDefault(jobTypeId);
  return {
    period: PE_MASTER.period,
    levelDefinitions: PE_MASTER.levelDefinitions,
    domains: PE_MASTER.domains,
    basicItems: PE_MASTER.basicItems,
    personalGoals: PE_MASTER.personalGoals,
    jobType: job,
    ladders: job.ladders
  };
}

/* プロフィールと設定の既定値（氏名は架空のプリセット値） */
var PE_DEFAULT_PROFILE = {
  name: 'サンプル 花子',
  /* 職種ID（js/jobtypes.js）。資格の有無は持たない。保有資格は職種から決まる（改訂方針C・R6） */
  jobTypeId: PE_DEFAULT_JOB_TYPE_ID,
  managementLadder: false,
  challengeLevel: 2
};

/* localStorage のキー（仕様9節） */
var PE_KEYS = {
  version: 'pe_demo_version',
  session: 'pe_demo_session',
  profile: 'pe_demo_profile',
  master: 'pe_demo_master',
  answers: 'pe_demo_answers',
  otherAnswers: 'pe_demo_other_answers',
  submitted: 'pe_demo_submitted',
  /* 改訂方針D で追加した評価データ。データリセットとシード版の不一致による初期化の両方で消す。 */
  personalGoals: 'pe_demo_personal_goals',   /* 合意した目標・実践例・目標ごとの重み（personal_goal に対応） */
  personalWeight: 'pe_demo_personal_weight'  /* 個人ごとの3領域の重み（personal_weight に対応） */
};

/* ---- 各個人の目標（改訂方針D） ----
 * 合意した目標は個数の上限を持たず、目標ごとに重みを持つ（R28）。
 * 目標ごとの重みは「目標どうしの比率（％）」で持ち、合計は100。
 * 総合スコアに占める割合 ＝ 目標ごとの重み × 各個人の目標の重み ÷ 100（R28・R30）。
 * 3領域の重みは病院の既定値（PE_DOMAINS）に個人ごとの調整を重ねる（R30）。 */

/* サンプルの目標（経営・人事に関わる目標の例。架空の補完データ）。
 * 設定画面の「サンプルの目標を追加」で、実践例とともに新しいIDを振って追加する。 */
var PE_SAMPLE_PERSONAL_GOAL = {
  source: 'supplement',
  text: '来期の採用計画を院長と作成し、新人の受け入れ体制を整える',
  practiceItems: [
    { source: 'supplement', text: '採用に必要な人数と時期を整理し、院長に提案した' },
    { source: 'supplement', text: '新人の受け入れ手順書を作成し、スタッフに共有した' }
  ]
};

/* 病院の既定値（50／40／10）の複製を返す */
function PE_defaultPersonalWeight() {
  var w = {};
  for (var i = 0; i < PE_DOMAINS.length; i++) w[PE_DOMAINS[i].id] = PE_DOMAINS[i].weight;
  return w;
}

/* 目標の数に応じた均等割り（整数・合計100。端数は先頭の目標から1ずつ配る） */
function PE_equalGoalWeights(count) {
  var out = [];
  if (count <= 0) return out;
  var base = Math.floor(100 / count);
  var rest = 100 - base * count;
  for (var i = 0; i < count; i++) out.push(base + (i < rest ? 1 : 0));
  return out;
}

/* 初期状態の合意した目標（シードのプリセット目標の複製。IDは変えない） */
function PE_initialPersonalGoals() {
  var goals = [];
  var src = PE_MASTER.personalGoals;
  var weights = PE_equalGoalWeights(src.length);
  for (var i = 0; i < src.length; i++) {
    var items = [];
    for (var j = 0; j < src[i].practiceItems.length; j++) {
      var pi = src[i].practiceItems[j];
      items.push({ id: pi.id, text: pi.text, source: pi.source });
    }
    goals.push({ id: src[i].id, text: src[i].text, source: src[i].source, weight: weights[i], practiceItems: items });
  }
  return { goals: goals, seq: 0 };
}

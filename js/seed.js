/* seed.js
 * デモアプリのシードデータ（マスター＋他者評価のダミー値）。
 * すべて架空のデモ用データである。実在するスタッフ・病院の情報は含まない。
 *
 * source: "spec"       … デモアプリ仕様.md／用語集.md に記載のある文言
 * source: "supplement" … デモの挙動確認のために補完した架空データ（暫定案）
 * source: "user"       … デモの設定画面で入力された合意した目標・実践例・C の実践例（シードには存在しない）
 *
 * 評価領域は A｜基礎・職業人としての力／B｜専門実践能力（表示名は職種ごと）／
 * C｜経営・組織に貢献する力／各個人の目標 の4つ（2026-09-24 の ABC 改訂。R25）。
 *
 * 職種ごとのラダー（B の実践ラダー・マネジメントラダー）と B の表示名は js/jobtypes.js にある。
 * このファイルより先に読み込むこと（index.html の script の順）。
 *
 * ■ 実践例ID は公開サイトの閲覧者の回答の保存キーである。既存のIDは変えない。
 *   ABC 改訂での移し替え（IDはそのまま）：
 *     bp_kinmu   旧「勤務姿勢」     → A①勤務姿勢・責任（1つ目）
 *     bp_sekinin 旧「責任感」       → A①勤務姿勢・責任（2つ目）
 *     bp_comm    旧「コミュニケーション」→ A②コミュニケーション
 *     bp_shutai  旧「主体性」       → A③主体性
 *     bp_kyocho  旧「協調性」       → C④チームへの貢献・Lv2 の既定の実践例（A から外した）
 */

var PE_SEED_VERSION = '1';

/* 評価期間の表記（デモでは固定） */
var PE_PERIOD = '2026年度上期';

/* レベル毎の定義（B と C に共通・全職種・全ラダー共通・4行。職種を増やしても変えない／R22・R27・R31）。
 * 表記は Lv1〜Lv4（ABC 改訂）。定義文は変えない。 */
var PE_LEVEL_DEFINITIONS = [
  { level: 1, label: 'Lv1', text: '必要に応じ助言を得て実践する', hint: '手順は追えるが、確認を要する場面がある' },
  { level: 2, label: 'Lv2', text: '標準的な実践を自立して行う', hint: '一人で任せられる' },
  { level: 3, label: 'Lv3', text: '個別の状況に応じた判断と実践を行う', hint: '標準どおりにいかない場面で自分で合わせられる' },
  { level: 4, label: 'Lv4', text: '幅広い視野で予測的に判断し実践を行う', hint: '起きる前に手を打てる' }
];

/* 評価基準（4段階）＋担当外・観察機会なし */
var PE_SCALE = [
  { value: 4, label: 'できている（他の人に示せる）' },
  { value: 3, label: 'できている' },
  { value: 2, label: '部分的にできている' },
  { value: 1, label: 'まだできていない' }
];

/* 評価領域と重み（病院の既定値・暫定値／R30）。
 * id は保存データ（回答・重み）のキーであり、ABC 改訂の前から変えていない（basic＝A、professional＝B）。
 * name     … 画面に出す名称。B は職種ごとの表示名（jobtypes.js の domainBName）で置き換える。
 * short    … 重みの内訳など、幅の狭い箇所で使う略称。
 * optional … 病院ごとに使う／使わないを選べる評価領域（C のみ。R32）。 */
var PE_DOMAINS = [
  { id: 'basic', name: 'A｜基礎・職業人としての力', short: 'A', weight: 40 },
  { id: 'professional', name: 'B｜専門実践能力', short: 'B', weight: 35 },
  { id: 'contribution', name: 'C｜経営・組織に貢献する力', short: 'C', weight: 15, optional: true },
  { id: 'personal', name: '各個人の目標', short: '各個人の目標', weight: 10 }
];

var PE_MASTER = {
  period: PE_PERIOD,
  levelDefinitions: PE_LEVEL_DEFINITIONS,
  domains: PE_DOMAINS,

  /* A：A の項目 → 実践例（レベル軸なし・全員が毎回同じ内容に回答する。全職種共通／R26・R29）。
   * 実践例は観察できる行動のみで書く（R29）。 */
  basicItems: [
    {
      id: 'bi_kinmu', mark: '①', name: '勤務姿勢・責任', source: 'spec',
      practiceItems: [
        { id: 'bp_kinmu', text: '始業時刻までに業務を開始できる状態になっている', source: 'spec' },
        /* 旧「責任感」の実践例。「責任」は①に統合されたため①の2つ目に置く（IDは変えない） */
        { id: 'bp_sekinin', text: '担当した業務を最後まで完了させ、できなかった場合は必ず申し送っている', source: 'spec' }
      ]
    },
    {
      id: 'bi_comm', mark: '②', name: 'コミュニケーション', source: 'spec',
      practiceItems: [
        { id: 'bp_comm', text: '申し送り事項を担当者に口頭とメモの両方で伝えている', source: 'spec' }
      ]
    },
    {
      id: 'bi_shutai', mark: '③', name: '主体性', source: 'spec',
      practiceItems: [
        { id: 'bp_shutai', text: '気づいた不具合や改善点を、指示される前に申し出ている', source: 'spec' }
      ]
    },
    {
      id: 'bi_self', mark: '④', name: 'セルフ・ストレスマネジメント', source: 'spec',
      practiceItems: [
        { id: 'bp_self', text: '体調不良や業務の負担で仕事に支障が出そうなときは、支障が出る前に上位職に申し出て、業務の調整を相談している', source: 'supplement' }
      ]
    },
    {
      id: 'bi_learn', mark: '⑤', name: '学習・成長', source: 'spec',
      practiceItems: [
        { id: 'bp_learn', text: '研修や勉強会で学んだ内容を記録に残し、自分の業務で使える点をスタッフに共有している', source: 'supplement' }
      ]
    }
  ],

  /* B：職種 → ラダー → 力 → レベル毎の目標 → 実践例（R19・R31）
   * ラダーは職種ごとに1組を持つ。職種のマスターは js/jobtypes.js の PE_JOB_TYPES にある。
   * 画面・集計は PE_masterFor(職種ID) で「その職種のラダーを ladders に持つマスター」を受け取って使う。
   * requiresLicense: true のレベル毎の目標には licenseName（資格名）を持たせる。
   * 画面表記の「要資格（○○）項目」はこの licenseName から組み立てる。
   * 要資格（内部の区分名は「適用外」）かどうかは、licenseName が職種の保有資格（licenses）に
   * 含まれるかで決まる（R6）。 */
  jobTypes: PE_JOB_TYPES,

  /* C：C の分類 → C の項目 → 実践例（実践例自身がレベルを持つ。レベル毎の目標は置かない／R2・R32）。
   * 分類・項目・意味は受領資料3節にもとづき確定（病院は編集できない）。全職種共通。
   * defaultPractices は「C の既定の実践例」（contribution_practice_template）。
   * 病院の C の実践例（pe_demo_hospital）はこれを複製して作り、病院ごとに追加・編集・削除する。
   *
   * 既定の実践例の書き方（暫定案。すべて source: "supplement"。ただし bp_kyocho は既存の実践例の流用）：
   *  - レベル毎の定義（Lv1 助言を得て／Lv2 自立して／Lv3 個別の状況に応じた判断／Lv4 幅広い視野で予測的に判断）に沿う。
   *    指導・育成をレベルの軸に入れない（R13）。
   *  - 受領資料5節の C のレベルアップイメージ（Lv1 理解 → Lv2 実践 → Lv3 改善 → Lv4 組織への展開）を目安にする。
   *  - Lv1 に経営成果そのものを求めない（R32）。
   *  - 全員が自分の担当の範囲で自分が行う行動のみを書く。他の人を割り振る・指揮する行動は
   *    マネジメントラダーのものであり、C には書かない（R23）。 */
  contribution: {
    categories: [
      { id: 'business', name: '経営' },
      { id: 'organization', name: '組織' }
    ],
    items: [
      { id: 'ci_resource', category: 'business', mark: '①', name: '資源・コスト管理',
        description: '物品・設備・人員などの資源にはコストがあることを理解し、適切かつ効率的に活用する' },
      { id: 'ci_time', category: 'business', mark: '②', name: '時間・生産性',
        description: '限られた時間の中で優先順位を考え、業務の質を保ちながら効率を高める' },
      { id: 'ci_value', category: 'business', mark: '③', name: 'サービス価値・経営への理解',
        description: '動物看護師の業務やサービスが、飼い主への価値提供や病院の持続的な運営につながることを理解し、行動する' },
      { id: 'ci_team', category: 'organization', mark: '④', name: 'チームへの貢献',
        description: '自分の役割だけでなく、周囲の状況やチーム目標を意識し、組織全体が円滑に働けるよう行動する' },
      { id: 'ci_ikusei', category: 'organization', mark: '⑤', name: '人材育成',
        description: '自身の経験や知識を共有し、後輩・スタッフの成長を支援する' },
      { id: 'ci_kaizen', category: 'organization', mark: '⑥', name: '業務改善',
        description: '日常業務の課題や非効率に気づき、より安全・効率的で質の高い仕組みへ改善する' }
    ],
    /* 項目 × Lv1〜Lv4 ＝ 24件 */
    defaultPractices: [
      /* ①資源・コスト管理 */
      { id: 'cp_resource_1', itemId: 'ci_resource', level: 1, source: 'supplement',
        text: '消耗品や備品を決められた手順と使用量に沿って使い、使い方に迷うときは先輩に確認している' },
      { id: 'cp_resource_2', itemId: 'ci_resource', level: 2, source: 'supplement',
        text: '担当業務で使う消耗品を必要な分だけ準備して使い、使い残しや期限切れが出ないよう自分で管理している' },
      { id: 'cp_resource_3', itemId: 'ci_resource', level: 3, source: 'supplement',
        text: '担当業務で消耗品の無駄や使い方のばらつきに気づいたとき、コストと業務の質の両面から見直した使い方を上位職に提案している' },
      { id: 'cp_resource_4', itemId: 'ci_resource', level: 4, source: 'supplement',
        text: '季節や予約の傾向から物品の必要量の変化を予測し、在庫の持ち方や物品の選び方の見直しを、根拠を添えて病院に提案している' },

      /* ②時間・生産性 */
      { id: 'cp_time_1', itemId: 'ci_time', level: 1, source: 'supplement',
        text: 'その日の自分の業務を先輩に確認しながら優先順位をつけて進め、時間内に終わらなさそうなときは早めに相談している' },
      { id: 'cp_time_2', itemId: 'ci_time', level: 2, source: 'supplement',
        text: '自分の担当業務を、手順どおりの質を保ったまま決められた時間内に一人で終えている' },
      { id: 'cp_time_3', itemId: 'ci_time', level: 3, source: 'supplement',
        text: '急な来院や予定の変更があったとき、業務の質を落とさないよう自分の業務の順番や進め方をその場で組み替えて対応している' },
      { id: 'cp_time_4', itemId: 'ci_time', level: 4, source: 'supplement',
        text: '業務が集中しやすい日や時間帯を予測し、自分の担当業務の段取りを前もって組み替えて、病院全体の業務が滞らないようにしている' },

      /* ③サービス価値・経営への理解 */
      { id: 'cp_value_1', itemId: 'ci_value', level: 1, source: 'supplement',
        text: '自分の担当業務が飼い主へのサービスや病院の運営にどうつながっているかを、説明を受けたうえで自分の言葉で説明できる' },
      { id: 'cp_value_2', itemId: 'ci_value', level: 2, source: 'supplement',
        text: '病院のサービス内容（診療の流れ・料金の目安・予約の取り方など）を、飼い主の質問に応じて一人で正確に案内している' },
      { id: 'cp_value_3', itemId: 'ci_value', level: 3, source: 'supplement',
        text: '飼い主からの要望や感想を記録し、飼い主にとっての分かりやすさや利便性を高める案を、自分の担当業務の範囲で上位職に提案している' },
      { id: 'cp_value_4', itemId: 'ci_value', level: 4, source: 'supplement',
        text: '来院する飼い主の傾向や要望の変化を踏まえ、病院が今後充実させるとよいサービスや見直すとよいサービスを、根拠を添えて病院に提案している' },

      /* ④チームへの貢献 */
      { id: 'cp_team_1', itemId: 'ci_team', level: 1, source: 'supplement',
        text: '自分の担当業務の進み具合や、手が空いたことを、決められた方法で周囲のスタッフに伝えている' },
      /* 旧 A「協調性」の実践例を同じIDのまま流用（仕様 5-1：旧協調性の実践例は C④ の内容に当たる） */
      { id: 'bp_kyocho', itemId: 'ci_team', level: 2, source: 'spec',
        text: '手が空いたときに他のスタッフの業務状況を確認し、声をかけている' },
      { id: 'cp_team_3', itemId: 'ci_team', level: 3, source: 'supplement',
        text: 'チームの業務が一部のスタッフに偏っていると気づいたとき、自分の担当を果たしたうえで、自分が引き受けられる業務を申し出て手伝っている' },
      { id: 'cp_team_4', itemId: 'ci_team', level: 4, source: 'supplement',
        text: 'チームの業務が立て込む場面を予測し、自分の担当業務を前倒しで終えて、他のスタッフを手伝える状態を前もって作っている' },

      /* ⑤人材育成（自分の経験や知識を共有する行動。育成の計画や担当の割り振りはマネジメントラダーで扱う） */
      { id: 'cp_ikusei_1', itemId: 'ci_ikusei', level: 1, source: 'supplement',
        text: '新しく入ったスタッフから自分の担当業務について聞かれたとき、手順書に沿って説明し、分からない点は先輩に確認してから伝えている' },
      { id: 'cp_ikusei_2', itemId: 'ci_ikusei', level: 2, source: 'supplement',
        text: '自分の担当業務のコツや注意点を、後輩・同僚がその業務に入る前に自分から伝えている' },
      { id: 'cp_ikusei_3', itemId: 'ci_ikusei', level: 3, source: 'supplement',
        text: '後輩・同僚が業務でつまずいていることに気づいたとき、その人の理解の程度に合わせて説明の仕方や見せ方を変えて伝えている' },
      { id: 'cp_ikusei_4', itemId: 'ci_ikusei', level: 4, source: 'supplement',
        text: '自分の経験から新しいスタッフがつまずきやすい点を予測し、自分の担当業務の注意点をまとめた資料を前もって作ってスタッフに共有している' },

      /* ⑥業務改善（自分の業務の範囲での改善。手順・仕組みの見直しを主導してチームに定着させる行動はマネジメントラダーで扱う） */
      { id: 'cp_kaizen_1', itemId: 'ci_kaizen', level: 1, source: 'supplement',
        text: '業務の中で起きたヒヤリとした出来事や不便な点を、決められた様式で記録し報告している' },
      { id: 'cp_kaizen_2', itemId: 'ci_kaizen', level: 2, source: 'supplement',
        text: '決められた手順の範囲内で、物の置き場所や準備の順番などの工夫を自分の業務に取り入れ、作業のしやすさや安全性を高めている' },
      { id: 'cp_kaizen_3', itemId: 'ci_kaizen', level: 3, source: 'supplement',
        text: '自分の担当業務の課題について原因を調べ、安全性・効率・質を踏まえた改善案を上位職に提案し、認められた案を自分の業務で試している' },
      { id: 'cp_kaizen_4', itemId: 'ci_kaizen', level: 4, source: 'supplement',
        text: '自分の業務で試した改善の結果を記録してまとめ、他の業務にも使えるよう手順の見直し案として病院に提出している' }
    ]
  },

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
 * A・C・各個人の目標は全職種共通のためここに置き、B のダミー値は
 * 職種のマスター（PE_JOB_TYPES[].otherAnswers）に置く。PE_OTHER_ANSWERS はその合算である。 */
var PE_COMMON_OTHER_ANSWERS = {
  /* A（仕様6-2。IDは ABC 改訂前から変えていない） */
  bp_kinmu: 4,
  bp_sekinin: 3,
  bp_comm: 2,        /* 仕様6-2：想定する本人評価 4 に対し他者 2（差が 2 の項目その1） */
  bp_shutai: 3,
  bp_self: 3,        /* A④（ABC 改訂で補完） */
  bp_learn: 2,       /* A⑤（ABC 改訂で補完） */

  /* C の既定の実践例（bp_kyocho は旧協調性の値をそのまま使う） */
  cp_resource_1: 3, cp_resource_2: 3, cp_resource_3: 2, cp_resource_4: 2,
  cp_time_1: 4, cp_time_2: 3, cp_time_3: 3, cp_time_4: 2,
  cp_value_1: 3, cp_value_2: 2, cp_value_3: 3, cp_value_4: 2,
  cp_team_1: 4, bp_kyocho: 4, cp_team_3: 3, cp_team_4: 2,
  cp_ikusei_1: 3, cp_ikusei_2: 3, cp_ikusei_3: 2, cp_ikusei_4: 2,
  cp_kaizen_1: 4, cp_kaizen_2: 3, cp_kaizen_3: 2, cp_kaizen_4: 2,

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

/* ---- 職種 ----
 * どの関数も PE_MASTER.jobTypes をその場で引く。職種を足すときにコードを変えずに済むようにするため（R31）。 */

/* 職種IDから職種を引く。見つからなければ null */
function PE_jobTypeById(id) {
  var list = PE_MASTER.jobTypes;
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}

/* 職種IDから職種を引く。見つからなければ既定の職種を返す */
function PE_jobTypeOrDefault(id) {
  return PE_jobTypeById(id) || PE_jobTypeById(PE_DEFAULT_JOB_TYPE_ID) || PE_MASTER.jobTypes[0];
}

/* 職種ごとのマスター。共通部分（評価期間・レベル毎の定義・評価領域・A・C・各個人の目標）に、
 * その職種の実践ラダー・マネジメントラダーを ladders として重ねたもの。
 * 集計（js/scoring.js）はこれを master として受け取る。レベル毎の定義・A・C は職種によらず同じ（R22・R26・R32）。 */
function PE_masterFor(jobTypeId) {
  var job = PE_jobTypeOrDefault(jobTypeId);
  return {
    period: PE_MASTER.period,
    levelDefinitions: PE_MASTER.levelDefinitions,
    domains: PE_MASTER.domains,
    basicItems: PE_MASTER.basicItems,
    contribution: PE_MASTER.contribution,
    personalGoals: PE_MASTER.personalGoals,
    jobType: job,
    ladders: job.ladders
  };
}

/* 評価領域の画面上の名称。B は職種ごとの表示名（R25・R31）。職種に表示名が無ければ汎用の名称を使う。 */
function PE_domainName(domainId, job) {
  if (domainId === 'professional' && job && job.domainBName) return job.domainBName;
  for (var i = 0; i < PE_DOMAINS.length; i++) if (PE_DOMAINS[i].id === domainId) return PE_DOMAINS[i].name;
  return domainId;
}

/* 評価領域の略称（A／B／C／各個人の目標） */
function PE_domainShort(domainId) {
  for (var i = 0; i < PE_DOMAINS.length; i++) if (PE_DOMAINS[i].id === domainId) return PE_DOMAINS[i].short;
  return domainId;
}

/* プロフィールと設定の既定値（氏名は架空のプリセット値） */
var PE_DEFAULT_PROFILE = {
  name: 'サンプル 花子',
  /* 職種ID（js/jobtypes.js）。資格の有無は持たない。保有資格は職種から決まる（R6） */
  jobTypeId: PE_DEFAULT_JOB_TYPE_ID,
  managementLadder: false,
  /* B の実践ラダーのチャレンジレベル（キー名は ABC 改訂の前から変えていない） */
  challengeLevel: 2,
  /* C のチャレンジレベル（ABC 改訂で追加。R21）。既存の保存データには Lv1 を補う */
  contributionLevel: 1
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
  /* 評価データ。データリセットとシード版の不一致による初期化の両方で消す。 */
  personalGoals: 'pe_demo_personal_goals',   /* 合意した目標・実践例・目標ごとの重み（personal_goal に対応） */
  personalWeight: 'pe_demo_personal_weight', /* 個人ごとの4領域の重み（personal_weight に対応） */
  hospital: 'pe_demo_hospital'               /* 病院の設定：C を使うか・C の実践例（hospital_domain_selection／practice_item に対応。ABC 改訂で追加） */
};

/* ---- 各個人の目標 ----
 * 合意した目標は個数の上限を持たず、目標ごとに重みを持つ（R28）。
 * 目標ごとの重みは「目標どうしの比率（％）」で持ち、合計は100。
 * 総合スコアに占める割合 ＝ 目標ごとの重み × 各個人の目標の重み（適用後） ÷ 100（R28・R30）。
 * 領域の重みは病院の既定値（PE_DOMAINS）に個人ごとの調整を重ねる（R30）。 */

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

/* 病院の既定値（40／35／15／10）の複製を返す */
function PE_defaultPersonalWeight() {
  var w = {};
  for (var i = 0; i < PE_DOMAINS.length; i++) w[PE_DOMAINS[i].id] = PE_DOMAINS[i].weight;
  return w;
}

/* 集計に使う領域の重み（R30・R32）。
 * C を使うときは保存値（4領域・合計100）そのまま。
 * C を使わないときは C を除き、残りの3領域の比率を保ったまま合計100になるよう再正規化する
 * （既定値なら A 40÷85×100≒47.1／B 35÷85×100≒41.2／各個人の目標 10÷85×100≒11.8）。
 * 戻り値の contribution は、C を使わないときは持たない。 */
function PE_effectiveWeights(stored, useContribution) {
  var out = {}, i, id;
  if (useContribution) {
    for (i = 0; i < PE_DOMAINS.length; i++) {
      id = PE_DOMAINS[i].id;
      out[id] = (stored && typeof stored[id] === 'number') ? stored[id] : PE_DOMAINS[i].weight;
    }
    return out;
  }
  var sum = 0;
  for (i = 0; i < PE_DOMAINS.length; i++) {
    if (PE_DOMAINS[i].optional) continue;
    id = PE_DOMAINS[i].id;
    out[id] = (stored && typeof stored[id] === 'number') ? stored[id] : PE_DOMAINS[i].weight;
    sum += out[id];
  }
  for (id in out) {
    if (Object.prototype.hasOwnProperty.call(out, id)) out[id] = sum > 0 ? out[id] * 100 / sum : 0;
  }
  return out;
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

/* ---- 病院の設定（C。ABC 改訂・R32） ----
 * 本番では病院内管理者が設定する。デモでは挙動を確認するため設定画面で編集できる。
 * { useContribution: true | false, practices: [{ id, itemId, level, text, source }], seq }
 * practices は C の既定の実践例（PE_MASTER.contribution.defaultPractices）を複製して作る（IDは変えない）。 */

/* C の既定の実践例の複製 */
function PE_defaultContributionPractices() {
  var src = PE_MASTER.contribution.defaultPractices, out = [];
  for (var i = 0; i < src.length; i++) {
    out.push({ id: src[i].id, itemId: src[i].itemId, level: src[i].level, text: src[i].text, source: src[i].source });
  }
  return out;
}

/* 病院の設定の初期値（C を使う・既定の実践例） */
function PE_initialHospital() {
  return { useContribution: true, practices: PE_defaultContributionPractices(), seq: 0 };
}

/* C の項目IDから項目を引く。見つからなければ null */
function PE_contributionItemById(id) {
  var items = PE_MASTER.contribution.items;
  for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
  return null;
}

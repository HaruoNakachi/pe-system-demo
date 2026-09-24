/* seed.js
 * デモアプリのシードデータ（マスター＋他者評価のダミー値）。
 * すべて架空のデモ用データである。実在するスタッフの情報は含まない。
 *
 * source: "spec"       … デモアプリ仕様.md／用語集.md に記載のある文言
 * source: "supplement" … デモの挙動確認のために補完した架空データ
 * source: "user"       … デモの設定画面で入力された合意した目標・実践例（シードには存在しない）
 */

var PE_SEED_VERSION = '1';

/* 評価期間の表記（デモでは固定） */
var PE_PERIOD = '2026年度上期';

/* レベル毎の定義（専門実践評価のみ・全ラダー共通・4行） */
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

  /* 基礎評価：基礎評価の項目 → 実践例（レベル軸なし・全員が毎回同じ内容に回答する／R26・R29） */
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

  /* 専門実践評価：ラダー → 力 → レベル毎の目標 → 実践例
   * requiresLicense: true のレベル毎の目標には licenseName（資格名）を持たせる。
   * 画面表記の「要資格（○○）項目」はこの licenseName から組み立てる。
   * 内部の区分名は「適用外」のままである（集計・判定のロジックは licenseName を見ない）。 */
  ladders: [
    {
      id: 'practice',
      name: '実践ラダー',
      required: true,
      /* 実践ラダーは設定のチャレンジレベル（Ⅰ〜Ⅳ）に追随する */
      fixedLevel: null,
      competencies: [
        {
          id: 'needs', name: 'ニーズをとらえる力',
          levelGoals: [
            {
              level: 1, requiresLicense: false, source: 'supplement',
              text: '助言を得ながら、担当する動物と飼い主の状態について必要な情報を集められる',
              practiceItems: [
                { id: 'pp_needs_1', source: 'supplement', text: '担当する入院動物について、先輩に確認しながら観察する項目を挙げ、記録している' }
              ]
            },
            {
              level: 2, requiresLicense: false, source: 'supplement',
              text: '標準的な観察の項目に沿って、担当する動物と飼い主の状態を自立して把握できる',
              practiceItems: [
                { id: 'pp_needs_2', source: 'spec', text: '担当する入院動物について、身体・行動・食欲の変化を自分で情報収集できる' }
              ]
            },
            {
              level: 3, requiresLicense: false, source: 'supplement',
              text: '個体や飼い主の状況に応じて観察の視点を変え、必要な情報を自分で選び取れる',
              practiceItems: [
                { id: 'pp_needs_3', source: 'supplement', text: '標準の観察項目では捉えきれない変化について、その個体に合わせた観察の視点を自分で追加して記録している' }
              ]
            },
            {
              level: 4, requiresLicense: false, source: 'supplement',
              text: '幅広い情報から起こりうる変化を予測し、確認すべき点を先に見立てられる',
              practiceItems: [
                { id: 'pp_needs_4', source: 'supplement', text: '入院時の情報から起こりうる変化を予測し、重点的に観察する項目をあらかじめ決めて申し送っている' }
              ]
            }
          ]
        },
        {
          id: 'care', name: 'ケアする力',
          levelGoals: [
            {
              level: 1, requiresLicense: true, licenseName: '愛玩動物看護師', source: 'supplement',
              text: '指導者の助言を得ながら、標準的な手順に沿って診療の補助を実施できる',
              practiceItems: [
                { id: 'pp_care_1', source: 'supplement', text: '指導者の立ち会いのもとで、標準的な手順に沿って静脈留置を実施できる' }
              ]
            },
            {
              level: 2, requiresLicense: true, licenseName: '愛玩動物看護師', source: 'spec',
              text: '標準的な手順に基づき、指示の下で自立して診療の補助を実施できる',
              practiceItems: [
                { id: 'pp_care_2', source: 'spec', text: '標準的な手順に沿って、静脈留置を一人で実施できる' }
              ]
            },
            {
              level: 3, requiresLicense: true, licenseName: '愛玩動物看護師', source: 'supplement',
              text: '個体の状態に応じて手順や方法を調整し、診療の補助を実施できる',
              practiceItems: [
                { id: 'pp_care_3', source: 'supplement', text: '静脈留置が難しい個体について、保定の仕方や部位の選び方を状態に合わせて変更し実施している' }
              ]
            },
            {
              level: 4, requiresLicense: true, licenseName: '愛玩動物看護師', source: 'supplement',
              text: '起こりうる負担や合併症を予測し、悪化する前に手を打って診療の補助を実施できる',
              practiceItems: [
                { id: 'pp_care_4', source: 'supplement', text: '処置中に起こりうる状態の悪化を予測し、悪化する前に獣医師へ相談して対応を変更している' }
              ]
            }
          ]
        },
        {
          id: 'collab', name: '協働する力',
          levelGoals: [
            {
              level: 1, requiresLicense: false, source: 'supplement',
              text: '助言を得ながら、獣医師や他のスタッフに必要なことを報告・相談できる',
              practiceItems: [
                { id: 'pp_collab_1', source: 'supplement', text: '担当動物の気になる点について、先輩に相談したうえで獣医師に報告している' }
              ]
            },
            {
              level: 2, requiresLicense: false, source: 'supplement',
              text: '標準的な場面で、必要な情報を揃えて獣医師や他のスタッフと自立して連携できる',
              practiceItems: [
                { id: 'pp_collab_2', source: 'spec', text: '担当動物の状態変化を、獣医師に必要な情報を揃えて報告できる' }
              ]
            },
            {
              level: 3, requiresLicense: false, source: 'supplement',
              text: '状況に応じて、伝える相手・時機・伝え方を自分で判断して連携できる',
              practiceItems: [
                { id: 'pp_collab_3', source: 'supplement', text: '急を要する状態変化について、手が離せない獣医師に代わる連絡先と伝える順序を自分で判断して連携している' }
              ]
            },
            {
              level: 4, requiresLicense: false, source: 'supplement',
              text: '幅広い視野で先を見越し、関係する職種に必要な連携を働きかけられる',
              practiceItems: [
                { id: 'pp_collab_4', source: 'supplement', text: '退院後に起こりうる問題を見越して、獣医師・受付・飼い主の間で共有しておく情報を事前に整理して依頼している' }
              ]
            }
          ]
        },
        {
          id: 'decision', name: '意思決定を支える力',
          levelGoals: [
            {
              level: 1, requiresLicense: false, source: 'supplement',
              text: '助言を得ながら、飼い主が説明を理解できるよう支援できる',
              practiceItems: [
                { id: 'pp_decision_1', source: 'supplement', text: '飼い主からの質問について、獣医師に確認したうえで回答している' }
              ]
            },
            {
              level: 2, requiresLicense: false, source: 'supplement',
              text: '標準的な場面で、飼い主が説明を理解し選べるよう自立して支援できる',
              practiceItems: [
                { id: 'pp_decision_2', source: 'spec', text: '飼い主からの質問に対し、獣医師の説明内容を自分の言葉で補足説明できる' }
              ]
            },
            {
              level: 3, requiresLicense: false, source: 'supplement',
              text: '飼い主の理解の程度や事情に応じて、説明の仕方や支援の内容を変えられる',
              practiceItems: [
                { id: 'pp_decision_3', source: 'supplement', text: '飼い主の理解の程度や生活の事情に合わせて、説明の順序や例えを変えて伝えている' }
              ]
            },
            {
              level: 4, requiresLicense: false, source: 'supplement',
              text: '迷いが生じる場面を予測し、飼い主が納得して選べるよう先回りして支えられる',
              practiceItems: [
                { id: 'pp_decision_4', source: 'supplement', text: '飼い主が判断に迷いやすい場面を予測し、必要な情報と選べる方法を事前に整理して獣医師に提案している' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'management',
      name: 'マネジメントラダー',
      required: false,
      /* マネジメントラダーのレベルは実践ラダーのレベルに影響しない（R20）。
         本デモではレベルⅠ固定とする。 */
      fixedLevel: 1,
      competencies: [
        {
          id: 'ikusei', name: '人材育成',
          levelGoals: [
            {
              level: 1, requiresLicense: false, source: 'supplement',
              text: '助言を得ながら、後輩の指導の場に加わり育成に関わることができる',
              practiceItems: [
                { id: 'mp_ikusei_1', source: 'spec', text: '先輩の指導に同席し、新人からの質問に答えている' }
              ]
            }
          ]
        },
        {
          id: 'team', name: 'チーム運営',
          levelGoals: [
            {
              level: 1, requiresLicense: false, source: 'supplement',
              text: '助言を得ながら、任された当番業務を管理し完了できる',
              practiceItems: [
                { id: 'mp_team_1', source: 'spec', text: '担当した当番業務（在庫確認など）を期日どおりに完了している' }
              ]
            }
          ]
        },
        {
          id: 'kaizen', name: '改善',
          levelGoals: [
            {
              level: 1, requiresLicense: false, source: 'supplement',
              text: '助言を得ながら、業務上の課題に気づき改善を提案できる',
              practiceItems: [
                { id: 'mp_kaizen_1', source: 'spec', text: '業務で気づいた非効率を、改善案を添えて上位職に伝えている' }
              ]
            }
          ]
        }
      ]
    }
  ],

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
 * 仕様6-2 の値をそのまま投入する。補完した実践例には固定のダミー値を置く。 */
var PE_OTHER_ANSWERS = {
  /* 基礎評価（仕様6-2） */
  bp_kinmu: 4,
  bp_sekinin: 3,
  bp_comm: 2,        /* 仕様6-2：想定する本人評価 4 に対し他者 2（差が 2 の項目その1） */
  bp_kyocho: 4,
  bp_shutai: 3,

  /* 専門実践評価・実践ラダー・レベルⅡ（仕様6-2） */
  pp_needs_2: 3,
  pp_care_2: 4,
  pp_collab_2: 4,    /* 仕様6-2：想定する本人評価 2 に対し他者 4（差が 2 の項目その2） */
  pp_decision_2: 2,

  /* 専門実践評価・実践ラダー・補完したレベルⅠ・Ⅲ・Ⅳ（固定のダミー値） */
  pp_needs_1: 3,
  pp_needs_3: 3,
  pp_needs_4: 2,
  pp_care_1: 4,
  pp_care_3: 3,
  pp_care_4: 2,
  pp_collab_1: 3,
  pp_collab_3: 2,
  pp_collab_4: 2,
  pp_decision_1: 4,
  pp_decision_3: 3,
  pp_decision_4: 2,

  /* 専門実践評価・マネジメントラダー・レベルⅠ（仕様6-2） */
  mp_ikusei_1: 3,
  mp_team_1: 3,
  mp_kaizen_1: 2,

  /* 各個人の目標（仕様6-2） */
  gp_1: 4,
  gp_2: 2
};

/* プロフィールと設定の既定値（氏名は架空のプリセット値） */
var PE_DEFAULT_PROFILE = {
  name: 'サンプル 花子',
  jobType: '愛玩動物看護師',
  hasLicense: true,
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

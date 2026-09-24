/* jobtypes.js
 * 職種のマスターデータ（改訂方針C・R19・R31）。
 * すべて架空のデモ用データである。実在するスタッフ・病院の情報は含まない。
 *
 * 職種を選ぶと、実践ラダーとマネジメントラダーが丸ごと入れ替わる（R19）。
 * レベル毎の定義（PE_LEVEL_DEFINITIONS）と基礎評価（PE_MASTER.basicItems）は全職種共通であり、
 * ここには置かない（R22・R26）。
 *
 * ■ 職種を増やすとき（例：獣医師）
 *   PE_JOB_TYPES の末尾に、下記と同じ形のオブジェクトを1つ足すだけでよい。
 *   画面・集計のコード（app.js / scoring.js / radar.js）は変更しない（R31）。
 *   設定画面の職種の選択肢、評価入力、ダッシュボード、マイページはこの配列から動的に作られる。
 *
 * ■ 1職種の形
 *   {
 *     id:       'vet_nurse',          職種ID（プロフィールの jobTypeId に入る。一度決めたら変えない）
 *     name:     '愛玩動物看護師',      画面に出す職種名
 *     licenses: ['愛玩動物看護師'],    保有資格。R6 の判定（レベル毎の目標の licenseName が含まれるか）に使う
 *     ladders: [                       実践ラダー（id: 'practice'）とマネジメントラダー（id: 'management'）の2つ
 *       {
 *         id: 'practice', name: '実践ラダー',
 *         required: true,              必須のラダー
 *         fixedLevel: null,            null ＝ 設定のチャレンジレベル（Ⅰ〜Ⅳ）に追随する
 *         competencies: [              力（職種 × ラダーごとに持つ）
 *           { id, name, description,
 *             levelGoals: [            レベル毎の目標（力 × レベル × 職種）。レベルⅠ〜Ⅳ
 *               { level, requiresLicense, licenseName?, source, text,
 *                 practiceItems: [ { id, source, text } ] }   実践例（回答の保存キーになるIDは全職種で重複させない）
 *             ] }
 *         ]
 *       },
 *       { id: 'management', name: 'マネジメントラダー', required: false, fixedLevel: 1, competencies: [...] }
 *     ],
 *     otherAnswers: { 実践例ID: 2〜4 }   他者評価のダミー値（固定値。本人評価には連動しない）
 *   }
 *
 * ■ 実践例ID の接頭辞
 *   愛玩動物看護師：pp_ / mp_（公開済みのID。閲覧者の回答を消さないため変えない）
 *   動物ケアスタッフ：cs_pp_ / cs_mp_　トリマー：gr_pp_ / gr_mp_　受付スタッフ：rc_pp_ / rc_mp_
 *
 * source: "spec"       … デモアプリ仕様.md／用語集.md に記載のある文言
 * source: "supplement" … デモの挙動確認のために補完した架空データ（暫定案）
 */

/* マネジメントラダーは全職種でレベルⅠ固定（チャレンジレベルは実践ラダーにのみ適用。R20）。
 * 力の名前（人材育成／チーム運営／改善）は全職種共通とし、実践例を職種ごとに差し替える。 */

var PE_JOB_TYPES = [

  /* ================================================================
   * 愛玩動物看護師（既存のシードをそのまま使う。IDも変えない）
   * ================================================================ */
  {
    id: 'vet_nurse',
    name: '愛玩動物看護師',
    licenses: ['愛玩動物看護師'],
    ladders: [
      {
        id: 'practice',
        name: '実践ラダー',
        required: true,
        fixedLevel: null,
        competencies: [
          {
            id: 'needs', name: 'ニーズをとらえる力',
            description: '動物と飼い主の状態・状況から必要なことを見極める',
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
            description: '必要なケア・処置を実施する',
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
            description: '獣医師・他職種・飼い主と連携して進める',
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
            description: '飼い主が納得して選べるよう支える',
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
        /* マネジメントラダーのレベルは実践ラダーのレベルに影響しない（R20）。本デモではレベルⅠ固定とする。 */
        fixedLevel: 1,
        competencies: [
          {
            id: 'ikusei', name: '人材育成', description: '後輩の指導と育成',
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
            id: 'team', name: 'チーム運営', description: '業務の管理と調整',
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
            id: 'kaizen', name: '改善', description: '手順・仕組みの見直し',
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
    /* 他者評価のダミー値（既存の値。変えない） */
    otherAnswers: {
      /* 実践ラダー・レベルⅡ（仕様6-2） */
      pp_needs_2: 3,
      pp_care_2: 4,
      pp_collab_2: 4,    /* 仕様6-2：想定する本人評価 2 に対し他者 4（差が 2 の項目その2） */
      pp_decision_2: 2,
      /* 実践ラダー・補完したレベルⅠ・Ⅲ・Ⅳ（固定のダミー値） */
      pp_needs_1: 3, pp_needs_3: 3, pp_needs_4: 2,
      pp_care_1: 4, pp_care_3: 3, pp_care_4: 2,
      pp_collab_1: 3, pp_collab_3: 2, pp_collab_4: 2,
      pp_decision_1: 4, pp_decision_3: 3, pp_decision_4: 2,
      /* マネジメントラダー・レベルⅠ（仕様6-2） */
      mp_ikusei_1: 3,
      mp_team_1: 3,
      mp_kaizen_1: 2
    }
  },

  /* ================================================================
   * 動物ケアスタッフ
   * 力は愛玩動物看護師と同じ4つ。ケアする力のみ新たに作った（診療の補助を含めない）。
   * 残り3つの力とマネジメントラダーは愛玩動物看護師と同じ文言で、別のレコード・別のIDとして持つ。
   * 資格が要る実践例を置かないため、R6 で除外される実践例はない。
   * ================================================================ */
  {
    id: 'care_staff',
    name: '動物ケアスタッフ',
    licenses: [],
    ladders: [
      {
        id: 'practice',
        name: '実践ラダー',
        required: true,
        fixedLevel: null,
        competencies: [
          {
            id: 'needs', name: 'ニーズをとらえる力',
            description: '動物と飼い主の状態・状況から必要なことを見極める',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、担当する動物と飼い主の状態について必要な情報を集められる',
                practiceItems: [
                  { id: 'cs_pp_needs_1', source: 'supplement', text: '担当する入院動物について、先輩に確認しながら観察する項目を挙げ、記録している' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '標準的な観察の項目に沿って、担当する動物と飼い主の状態を自立して把握できる',
                practiceItems: [
                  { id: 'cs_pp_needs_2', source: 'supplement', text: '担当する入院動物について、身体・行動・食欲の変化を自分で情報収集できる' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '個体や飼い主の状況に応じて観察の視点を変え、必要な情報を自分で選び取れる',
                practiceItems: [
                  { id: 'cs_pp_needs_3', source: 'supplement', text: '標準の観察項目では捉えきれない変化について、その個体に合わせた観察の視点を自分で追加して記録している' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: '幅広い情報から起こりうる変化を予測し、確認すべき点を先に見立てられる',
                practiceItems: [
                  { id: 'cs_pp_needs_4', source: 'supplement', text: '入院時の情報から起こりうる変化を予測し、重点的に観察する項目をあらかじめ決めて申し送っている' }
                ]
              }
            ]
          },
          {
            id: 'care', name: 'ケアする力',
            description: '食事・排泄・清潔のケアと保定の補助を行い、観察したことを報告する（診療の補助は含めない）',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、食事・排泄・清潔のケアと保定の補助を手順に沿って行える',
                practiceItems: [
                  { id: 'cs_pp_care_1', source: 'supplement', text: '先輩に確認しながら、入院動物の食事・排泄・清潔のケアを手順書に沿って行い、行ったことを記録している' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '標準的な手順に沿って、食事・排泄・清潔のケアと保定の補助を自立して行える',
                practiceItems: [
                  { id: 'cs_pp_care_2', source: 'supplement', text: '担当する入院動物の食事・排泄・清潔のケアを一人で行い、食べた量や排泄の様子を記録して獣医師・看護担当に報告している' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '個体の性格や状態に応じて、ケアの方法や保定の補助の仕方を自分で判断して変えられる',
                practiceItems: [
                  { id: 'cs_pp_care_3', source: 'supplement', text: '怖がる・嫌がる様子のある個体について、食事の与え方や保定の補助の姿勢をその個体に合わせて変え、変えた内容を記録して申し送っている' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: '起こりうる負担や状態の変化を予測し、悪化する前にケアの準備と報告ができる',
                practiceItems: [
                  { id: 'cs_pp_care_4', source: 'supplement', text: '入院の経過から食欲の低下や体の汚れなどの負担が起こりそうな個体を予測し、寝床や食事の準備を整えたうえで獣医師・看護担当に早めに報告している' }
                ]
              }
            ]
          },
          {
            id: 'collab', name: '協働する力',
            description: '獣医師・他職種・飼い主と連携して進める',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、獣医師や他のスタッフに必要なことを報告・相談できる',
                practiceItems: [
                  { id: 'cs_pp_collab_1', source: 'supplement', text: '担当動物の気になる点について、先輩に相談したうえで獣医師に報告している' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '標準的な場面で、必要な情報を揃えて獣医師や他のスタッフと自立して連携できる',
                practiceItems: [
                  { id: 'cs_pp_collab_2', source: 'supplement', text: '担当動物の状態変化を、獣医師に必要な情報を揃えて報告できる' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '状況に応じて、伝える相手・時機・伝え方を自分で判断して連携できる',
                practiceItems: [
                  { id: 'cs_pp_collab_3', source: 'supplement', text: '急を要する状態変化について、手が離せない獣医師に代わる連絡先と伝える順序を自分で判断して連携している' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: '幅広い視野で先を見越し、関係する職種に必要な連携を働きかけられる',
                practiceItems: [
                  { id: 'cs_pp_collab_4', source: 'supplement', text: '退院後に起こりうる問題を見越して、獣医師・受付・飼い主の間で共有しておく情報を事前に整理して依頼している' }
                ]
              }
            ]
          },
          {
            id: 'decision', name: '意思決定を支える力',
            description: '飼い主が納得して選べるよう支える',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、飼い主が説明を理解できるよう支援できる',
                practiceItems: [
                  { id: 'cs_pp_decision_1', source: 'supplement', text: '飼い主からの質問について、獣医師に確認したうえで回答している' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '標準的な場面で、飼い主が説明を理解し選べるよう自立して支援できる',
                practiceItems: [
                  { id: 'cs_pp_decision_2', source: 'supplement', text: '飼い主からの質問に対し、獣医師の説明内容を自分の言葉で補足説明できる' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '飼い主の理解の程度や事情に応じて、説明の仕方や支援の内容を変えられる',
                practiceItems: [
                  { id: 'cs_pp_decision_3', source: 'supplement', text: '飼い主の理解の程度や生活の事情に合わせて、説明の順序や例えを変えて伝えている' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: '迷いが生じる場面を予測し、飼い主が納得して選べるよう先回りして支えられる',
                practiceItems: [
                  { id: 'cs_pp_decision_4', source: 'supplement', text: '飼い主が判断に迷いやすい場面を予測し、必要な情報と選べる方法を事前に整理して獣医師に提案している' }
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
        fixedLevel: 1,
        competencies: [
          {
            id: 'ikusei', name: '人材育成', description: '後輩の指導と育成',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、後輩の指導の場に加わり育成に関わることができる',
                practiceItems: [
                  { id: 'cs_mp_ikusei_1', source: 'supplement', text: '先輩の指導に同席し、新人からの質問に答えている' }
                ]
              }
            ]
          },
          {
            id: 'team', name: 'チーム運営', description: '業務の管理と調整',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、任された当番業務を管理し完了できる',
                practiceItems: [
                  { id: 'cs_mp_team_1', source: 'supplement', text: '担当した当番業務（在庫確認など）を期日どおりに完了している' }
                ]
              }
            ]
          },
          {
            id: 'kaizen', name: '改善', description: '手順・仕組みの見直し',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、業務上の課題に気づき改善を提案できる',
                practiceItems: [
                  { id: 'cs_mp_kaizen_1', source: 'supplement', text: '業務で気づいた非効率を、改善案を添えて上位職に伝えている' }
                ]
              }
            ]
          }
        ]
      }
    ],
    /* 愛玩動物看護師と同じ文言の実践例は、同じダミー値にした */
    otherAnswers: {
      cs_pp_needs_1: 3, cs_pp_needs_2: 3, cs_pp_needs_3: 3, cs_pp_needs_4: 2,
      cs_pp_care_1: 3, cs_pp_care_2: 4, cs_pp_care_3: 3, cs_pp_care_4: 2,
      cs_pp_collab_1: 3, cs_pp_collab_2: 4, cs_pp_collab_3: 2, cs_pp_collab_4: 2,
      cs_pp_decision_1: 4, cs_pp_decision_2: 2, cs_pp_decision_3: 3, cs_pp_decision_4: 2,
      cs_mp_ikusei_1: 3, cs_mp_team_1: 3, cs_mp_kaizen_1: 2
    }
  },

  /* ================================================================
   * トリマー
   * 実践例に診断・治療を含めない。皮膚や体調の異常に気づいたら獣医師・看護担当に伝える形にする。
   * ================================================================ */
  {
    id: 'groomer',
    name: 'トリマー',
    licenses: [],
    ladders: [
      {
        id: 'practice',
        name: '実践ラダー',
        required: true,
        fixedLevel: null,
        competencies: [
          {
            id: 'assess', name: '状態を見極める力',
            description: '被毛・皮膚・体調・性格を見て、施術の可否と進め方を判断する',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、施術前に被毛・皮膚・体調・性格を確認し、進め方を決められる',
                practiceItems: [
                  { id: 'gr_pp_assess_1', source: 'supplement', text: '施術前に先輩と一緒に被毛・皮膚・体調・性格を確認し、確認した内容を施術記録に残している' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '標準的な確認の項目に沿って、施術の可否と進め方を自立して判断できる',
                practiceItems: [
                  { id: 'gr_pp_assess_2', source: 'supplement', text: '施術前の確認項目に沿って被毛・皮膚・体調・性格を一人で確認し、皮膚の赤みや傷など気になる点があれば施術を始める前に獣医師・看護担当に伝えている' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '個体の状態や性格に応じて、施術の範囲や進め方を自分で判断して変えられる',
                practiceItems: [
                  { id: 'gr_pp_assess_3', source: 'supplement', text: '皮膚が弱い・高齢などの個体について、その日の状態に合わせて施術の範囲や時間を自分で判断して変え、判断の理由を施術記録に残している' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: 'これまでの記録や当日の様子から起こりうる負担を予測し、施術の計画を先に立てられる',
                practiceItems: [
                  { id: 'gr_pp_assess_4', source: 'supplement', text: '前回までの施術記録と当日の様子から施術中に起こりうる負担を予測し、時間配分や日を分けて行う内容を施術前に決めて記録している' }
                ]
              }
            ]
          },
          {
            id: 'groom', name: '施術する力',
            description: 'シャンプー・カット等を安全に、飼い主の希望に沿って仕上げる',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、標準的な手順に沿ってシャンプー・カットを行える',
                practiceItems: [
                  { id: 'gr_pp_groom_1', source: 'supplement', text: '先輩の確認を受けながら、標準的な手順に沿ってシャンプーからカットまでを行っている' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '標準的な施術を、飼い主の希望に沿って自立して仕上げられる',
                practiceItems: [
                  { id: 'gr_pp_groom_2', source: 'supplement', text: '飼い主が希望した仕上がりのとおりに、シャンプーからカットまでを一人で予定の時間内に仕上げている' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '被毛や体型、動物の様子に応じて、施術の方法を自分で判断して調整できる',
                practiceItems: [
                  { id: 'gr_pp_groom_3', source: 'supplement', text: '毛玉が多い・じっとしていられないなど標準どおりに進まない個体について、道具や手順を変えて希望に近い仕上がりにしている' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: '次回の来院までを見越して、施術の内容を組み立てられる',
                practiceItems: [
                  { id: 'gr_pp_groom_4', source: 'supplement', text: '次回の来院までの被毛の伸び方や家庭での手入れを見越してカットの長さや仕上げ方を決め、その理由を飼い主に説明している' }
                ]
              }
            ]
          },
          {
            id: 'safety', name: '安全を守る力',
            description: '動物のストレス・事故・体調の急変を防ぎ、異変があれば対応する',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、施術中の事故を防ぐ基本の手順を守れる',
                practiceItems: [
                  { id: 'gr_pp_safety_1', source: 'supplement', text: '先輩に確認しながら、施術台からの転落防止やドライヤーの温度の確認など、事故を防ぐ手順を守って施術している' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '施術中の動物の様子を自立して見守り、異変に気づいたら施術を止めて院内に知らせられる',
                practiceItems: [
                  { id: 'gr_pp_safety_2', source: 'supplement', text: '施術中に呼吸の乱れやぐったりした様子に気づいたときは、すぐに施術を止めて獣医師・看護担当に知らせている' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '個体の性格や体調に応じて、ストレスや事故を防ぐ方法を自分で判断して取り入れられる',
                practiceItems: [
                  { id: 'gr_pp_safety_3', source: 'supplement', text: '怖がりやすい・体力の落ちた個体について、休憩の入れ方や体の支え方を自分で判断して変え、ストレスや事故を防いでいる' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: '起こりうる事故や体調の急変を予測し、起きる前に施術の環境や体制を整えられる',
                practiceItems: [
                  { id: 'gr_pp_safety_4', source: 'supplement', text: '暑い時期や高齢の個体の予約について体調の急変が起こりうる場面を予測し、室温の調整や、獣医師・看護担当がすぐ対応できる時間帯への予約の調整を事前に行っている' }
                ]
              }
            ]
          },
          {
            id: 'connect', name: '飼い主とつなぐ力',
            description: '希望を聞き取り、施術内容や気づいた異常を飼い主と院内（獣医師・看護側）に伝える',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、飼い主の希望を聞き取り、施術の内容を伝えられる',
                practiceItems: [
                  { id: 'gr_pp_connect_1', source: 'supplement', text: '先輩に同席してもらいながら飼い主の希望を聞き取り、施術後に行った内容を飼い主に伝えている' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '飼い主の希望と施術中に気づいたことを、飼い主と院内に自立して伝えられる',
                practiceItems: [
                  { id: 'gr_pp_connect_2', source: 'supplement', text: '施術中に気づいた皮膚の赤み・しこり・耳の汚れなどを見たままに施術記録に残し、飼い主と獣医師・看護担当に伝えている' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '飼い主の事情や動物の状態に応じて、伝える内容と伝え方を変えられる',
                practiceItems: [
                  { id: 'gr_pp_connect_3', source: 'supplement', text: '希望どおりの仕上がりが難しい場合に、その理由と代わりの仕上がりの案を飼い主の事情に合わせて説明し、合意してから施術している' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: '飼い主と院内で共有しておくべきことを見越して、先回りして情報をつなげられる',
                practiceItems: [
                  { id: 'gr_pp_connect_4', source: 'supplement', text: '施術のたびに気づく被毛や皮膚の変化の経過を整理して獣医師・看護担当に伝え、飼い主にも家庭で見ておいてほしい点を伝えている' }
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
        fixedLevel: 1,
        competencies: [
          {
            id: 'ikusei', name: '人材育成', description: '後輩の指導と育成',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、後輩トリマーの練習や施術に付き添い育成に関わることができる',
                practiceItems: [
                  { id: 'gr_mp_ikusei_1', source: 'supplement', text: '先輩の指導に同席し、後輩トリマーの施術の練習で気づいた点を本人に伝えている' }
                ]
              }
            ]
          },
          {
            id: 'team', name: 'チーム運営', description: '業務の管理と調整',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、任されたトリミングの当番業務を管理し完了できる',
                practiceItems: [
                  { id: 'gr_mp_team_1', source: 'supplement', text: '担当したトリミング用品の在庫確認と道具の手入れを期日どおりに完了している' }
                ]
              }
            ]
          },
          {
            id: 'kaizen', name: '改善', description: '手順・仕組みの見直し',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、トリミング業務の課題に気づき改善を提案できる',
                practiceItems: [
                  { id: 'gr_mp_kaizen_1', source: 'supplement', text: 'トリミングの受付から引き渡しまでで気づいた待ち時間などの非効率を、改善案を添えて上位職に伝えている' }
                ]
              }
            ]
          }
        ]
      }
    ],
    otherAnswers: {
      gr_pp_assess_1: 3, gr_pp_assess_2: 4, gr_pp_assess_3: 3, gr_pp_assess_4: 2,
      gr_pp_groom_1: 4, gr_pp_groom_2: 3, gr_pp_groom_3: 3, gr_pp_groom_4: 2,
      gr_pp_safety_1: 4, gr_pp_safety_2: 3, gr_pp_safety_3: 2, gr_pp_safety_4: 2,
      gr_pp_connect_1: 3, gr_pp_connect_2: 2, gr_pp_connect_3: 3, gr_pp_connect_4: 2,
      gr_mp_ikusei_1: 3, gr_mp_team_1: 4, gr_mp_kaizen_1: 2
    }
  },

  /* ================================================================
   * 受付スタッフ
   * 実践例に診断・治療・緊急度の医学的判断を含めない。
   * 急を要しそうな来院は獣医師・看護担当へすぐにつなぐ形にする。
   * ================================================================ */
  {
    id: 'reception',
    name: '受付スタッフ',
    licenses: [],
    ladders: [
      {
        id: 'practice',
        name: '実践ラダー',
        required: true,
        fixedLevel: null,
        competencies: [
          {
            id: 'guide', name: '受付・案内する力',
            description: '来院受付、予約、待合の案内を行う',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、来院受付・予約・待合の案内を手順に沿って行える',
                practiceItems: [
                  { id: 'rc_pp_guide_1', source: 'supplement', text: '先輩に確認しながら、手順に沿って来院受付と予約の登録を行っている' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '標準的な来院受付・予約・待合の案内を自立して行える',
                practiceItems: [
                  { id: 'rc_pp_guide_2', source: 'supplement', text: '来院受付・予約の登録・待合の案内を一人で行い、待ち時間の目安を飼い主に伝えている' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '混雑や来院の事情に応じて、受付と案内の進め方を自分で判断して変えられる',
                practiceItems: [
                  { id: 'rc_pp_guide_3', source: 'supplement', text: '待合が混み合っているときや動物どうしが落ち着かないときに、待つ場所の割り振りや声のかけ方を自分で判断して変えている' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: '来院の見込みや院内の状況を予測し、受付と案内の体制を先に整えられる',
                practiceItems: [
                  { id: 'rc_pp_guide_4', source: 'supplement', text: '予約の状況や季節の傾向から混み合う時間帯を予測し、予約の枠の調整や待合の準備を前もって行っている' }
                ]
              }
            ]
          },
          {
            id: 'support', name: '飼い主に寄り添う力',
            description: '不安を抱える飼い主や苦情に対応する',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、不安を抱える飼い主や苦情の話を聞き、対応できる',
                practiceItems: [
                  { id: 'rc_pp_support_1', source: 'supplement', text: '不安そうな飼い主や苦情を申し出た飼い主の話を聞き取り、先輩に相談したうえで対応している' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '標準的な場面で、不安を抱える飼い主や苦情に自立して対応できる',
                practiceItems: [
                  { id: 'rc_pp_support_2', source: 'supplement', text: '待ち時間や会計についての苦情に対し、事情を聞き取って一人で説明し、対応した内容を記録している' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '飼い主の気持ちや事情に応じて、対応の仕方を自分で判断して変えられる',
                practiceItems: [
                  { id: 'rc_pp_support_3', source: 'supplement', text: '動物の様子を心配して気が動転している飼い主に対し、話す速さや言葉を相手に合わせて変え、落ち着いて待てるよう声をかけている' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: '不安や不満が生じやすい場面を予測し、先回りして飼い主を支えられる',
                practiceItems: [
                  { id: 'rc_pp_support_4', source: 'supplement', text: '待ち時間が長くなりそうなときを予測し、飼い主に前もって見通しを伝えたり、待ち方を選べるよう案内したりしている' }
                ]
              }
            ]
          },
          {
            id: 'liaison', name: '院内をつなぐ力',
            description: '診察室・看護・トリミングと情報をやり取りする',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、受付で聞いた情報を診察室・看護・トリミングに伝えられる',
                practiceItems: [
                  { id: 'rc_pp_liaison_1', source: 'supplement', text: '受付で飼い主から聞いた来院の理由や伝言を、先輩に確認しながら担当者に伝えている' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '標準的な場面で、診察室・看護・トリミングと必要な情報を自立してやり取りできる',
                practiceItems: [
                  { id: 'rc_pp_liaison_2', source: 'supplement', text: '急を要しそうな様子の来院があったときは、緊急度を自分で判断せず、すぐに獣医師・看護担当に知らせている' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '状況に応じて、伝える相手・時機・伝え方を自分で判断して院内とやり取りできる',
                practiceItems: [
                  { id: 'rc_pp_liaison_3', source: 'supplement', text: '診察の遅れやトリミングのお迎え時間の変更などを、影響する担当者と飼い主に伝える順番を自分で判断して連絡している' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: '院内の動きを見越して、関係する担当に必要な情報を先回りして共有できる',
                practiceItems: [
                  { id: 'rc_pp_liaison_4', source: 'supplement', text: '当日の予約内容から診察室・看護・トリミングで準備が必要になりそうなことを見越し、朝のうちに各担当者へ共有している' }
                ]
              }
            ]
          },
          {
            id: 'accuracy', name: '正確に処理する力',
            description: '会計、書類、記録を正確に処理する',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、会計・書類・記録の処理を手順に沿って行える',
                practiceItems: [
                  { id: 'rc_pp_accuracy_1', source: 'supplement', text: '先輩に確認してもらいながら、手順に沿って会計と領収書の発行を行っている' }
                ]
              },
              {
                level: 2, requiresLicense: false, source: 'supplement',
                text: '標準的な会計・書類・記録の処理を、自立して正確に行える',
                practiceItems: [
                  { id: 'rc_pp_accuracy_2', source: 'supplement', text: '会計・書類の作成・受付記録の入力を一人で行い、締めの時点で金額と記録が一致している' }
                ]
              },
              {
                level: 3, requiresLicense: false, source: 'supplement',
                text: '標準どおりでない会計や書類の依頼にも、状況に応じて判断して正確に処理できる',
                practiceItems: [
                  { id: 'rc_pp_accuracy_3', source: 'supplement', text: '支払い方法の変更や書類の再発行など標準どおりでない依頼について、確認すべき相手を自分で判断して正確に処理している' }
                ]
              },
              {
                level: 4, requiresLicense: false, source: 'supplement',
                text: '起こりうる誤りを予測し、誤りが起きる前に手を打てる',
                practiceItems: [
                  { id: 'rc_pp_accuracy_4', source: 'supplement', text: '月末や混み合う時間帯など誤りが起きやすい場面を予測し、二重確認の時間を前もって確保して誤りを防いでいる' }
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
        fixedLevel: 1,
        competencies: [
          {
            id: 'ikusei', name: '人材育成', description: '後輩の指導と育成',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、新しい受付スタッフの指導の場に加わり育成に関わることができる',
                practiceItems: [
                  { id: 'rc_mp_ikusei_1', source: 'supplement', text: '先輩の指導に同席し、新しい受付スタッフからの受付手順についての質問に答えている' }
                ]
              }
            ]
          },
          {
            id: 'team', name: 'チーム運営', description: '業務の管理と調整',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、任された受付の当番業務を管理し完了できる',
                practiceItems: [
                  { id: 'rc_mp_team_1', source: 'supplement', text: '担当した当番業務（釣り銭の準備や書類の補充など）を期日どおりに完了している' }
                ]
              }
            ]
          },
          {
            id: 'kaizen', name: '改善', description: '手順・仕組みの見直し',
            levelGoals: [
              {
                level: 1, requiresLicense: false, source: 'supplement',
                text: '助言を得ながら、受付業務の課題に気づき改善を提案できる',
                practiceItems: [
                  { id: 'rc_mp_kaizen_1', source: 'supplement', text: '受付や会計で気づいた待ち時間や記入の手間などの非効率を、改善案を添えて上位職に伝えている' }
                ]
              }
            ]
          }
        ]
      }
    ],
    otherAnswers: {
      rc_pp_guide_1: 4, rc_pp_guide_2: 3, rc_pp_guide_3: 3, rc_pp_guide_4: 2,
      rc_pp_support_1: 3, rc_pp_support_2: 4, rc_pp_support_3: 3, rc_pp_support_4: 2,
      rc_pp_liaison_1: 3, rc_pp_liaison_2: 3, rc_pp_liaison_3: 2, rc_pp_liaison_4: 2,
      rc_pp_accuracy_1: 4, rc_pp_accuracy_2: 2, rc_pp_accuracy_3: 3, rc_pp_accuracy_4: 2,
      rc_mp_ikusei_1: 3, rc_mp_team_1: 3, rc_mp_kaizen_1: 2
    }
  }
];

/* 既定の職種（プロフィールに職種が無い・不明なときもこれを使う） */
var PE_DEFAULT_JOB_TYPE_ID = 'vet_nurse';

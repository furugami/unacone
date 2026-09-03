import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// わざ説明の1項目（名前＋効果＋アイコン画像）。とくせい・わざ・ユナイト技で共通の形。
const moveSchema = z.object({
  name: z.string(),
  effect: z.string(),
  icon: z.string().optional(),
});

// ビルドでのわざ1/わざ2の選択（そのまま/派生A/派生B）。2026/08/29追加。
const moveChoiceSchema = z.enum(['base', 'upgrade_a', 'upgrade_b']);

// ポケモン図鑑（人力データ）
// 参照: CLAUDE-2.md「データ設計: 全面人力データ化」
const pokemonJp = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pokemon-jp' }),
  schema: z.object({
    slug: z.string(),
    name_ja: z.string(),
    icon: z.string().optional(),
    role: z.enum(['attacker', 'speedster', 'defender', 'supporter', 'allrounder']),
    // 攻撃分類（物理攻撃寄り/特殊攻撃寄り）。2026/08/29追加、運営者要望。
    attack_type: z.enum(['physical', 'special']).optional(),
    // 使用難易度（このポケモンを使いこなす難易度。記事のカテゴリとは別軸）。2026/08/29追加。
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    // わざ説明（数値は扱わない、名前＋効果の文章のみ。更新頻度は低い想定）。2026/08/29追加。
    moves: z
      .object({
        ability: moveSchema.optional(), // とくせい
        move1: moveSchema.optional(), // わざ1
        move1_upgrade_a: moveSchema.optional(), // わざ1派生A
        move1_upgrade_b: moveSchema.optional(), // わざ1派生B
        move2: moveSchema.optional(), // わざ2
        move2_upgrade_a: moveSchema.optional(), // わざ2派生A
        move2_upgrade_b: moveSchema.optional(), // わざ2派生B
        unite_move: moveSchema.optional(), // ユナイト技
      })
      .optional(),
    // 能力評価（人力・主観、5点満点0.5刻み）。5軸レーダーチャート表示用。2026/08/29追加。
    // 各項目は任意（2026/09/01変更: データ投入がテスト段階のため、5項目揃うまでは
    // 空のままでも保存できるようにした。表示側は5項目すべて揃った場合のみレーダーチャートを出す）。
    abilities: z
      .object({
        combat: z.number().min(0).max(5).multipleOf(0.5).optional(), // 戦闘能力
        durability: z.number().min(0).max(5).multipleOf(0.5).optional(), // 耐久能力
        mobility: z.number().min(0).max(5).multipleOf(0.5).optional(), // 起動能力
        scoring: z.number().min(0).max(5).multipleOf(0.5).optional(), // 得点能力
        support: z.number().min(0).max(5).multipleOf(0.5).optional(), // 補佐能力
      })
      .optional(),
    builds: z
      .array(
        z.object({
          title: z.string(),
          // held-itemsコレクションのslugの配列（CMSではrelationウィジェットで選択、
          // 自由入力ではない。2026/08/29変更）
          held_items: z.array(z.string()),
          // battle-itemsコレクションのslug（同上）
          battle_item: z.string(),
          // このビルドでのわざ1/わざ2の選択（moves内のどの項目を使うか）。任意。
          move1_choice: moveChoiceSchema.optional(),
          move2_choice: moveChoiceSchema.optional(),
          note: z.string().optional(),
        })
      )
      .optional(),
    // 一言使い方メモ・一言対策メモ（任意、1行程度の短文想定）。表示は
    // 立ち回り解説（本文）の直前。2026/09/01追加。
    usage_memo: z.string().optional(),
    counter_memo: z.string().optional(),
  }),
});

// セオリー解説記事
// 参照: CLAUDE.md「セオリー解説記事 コンテンツモデル」
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    category: z.enum(['beginner', 'intermediate', 'advanced']),
    // 内容タグ（任意、複数）。「上ルート」「スピード型」等、難易度以外の切り口で記事を
    // 探しやすくするための自由入力タグ。難易度（category）は引き続き必須・単一で、
    // 一覧ページの3カテゴリ分けの主軸として使う。2026/08/31追加。
    tags: z.array(z.string()).optional(),
    publish_date: z.date(),
    excerpt: z.string(),
    thumbnail: z.string().optional(),
  }),
});

// 配信者プロフィール（スケジュール自体はビルド時にAPIから取得、CMS管理はしない）
// 参照: CLAUDE.md「配信者スケジュールカレンダー 設計」
const streamers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/streamers' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    icon: z.string().optional(),
    twitch_channel: z.string().optional(),
    youtube_channel_id: z.string().optional(),
  }),
});

// もちもの（Held Items）図鑑。
// 参照: CLAUDE-3.md「もちもの／バトルアイテム／メダル 図鑑」
const heldItems = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/held-items' }),
  schema: z.object({
    slug: z.string(),
    name_ja: z.string(),
    icon: z.string().optional(),
    summary: z.string(),
    // 相性のよいポケモン（ポケモン図鑑のslug配列）。battle-itemsのrecommended_pokemonと
    // 同じ設計。ポケモン個別ページ側は、この配列に自分のslugが含まれるもちものを逆引きして
    // 「相性のよいもちもの」として表示する（入力はもちもの側のみで完結させる方針）。
    // 2026/09/03追加。
    recommended_pokemon: z.array(z.string()).optional(),
    // タグ（複数選択可）。用途別の分類。項目名はコード内固定辞書
    // （src/lib/heldItemTags.ts）で管理。2026/09/03追加。
    tags: z
      .array(
        z.enum(['exclusive', 'attack_carry', 'sp_attack_carry', 'support', 'defense', 'goal'])
      )
      .optional(),
    // ステータス上昇（複数選択可）。項目名はコード内固定辞書（src/lib/stats.ts）で管理。
    // 2026/08/30追加。
    stat_boosts: z
      .array(
        z.object({
          stat: z.enum([
            'attack',
            'attack_speed',
            'critical_hit_rate',
            'hp',
            'sp_attack',
            'critical_hit_damage',
            'cooldown_reduction',
            'sp_defense',
            'unite_gauge_charge',
            'movement_speed',
            'defense',
            'hp_recovery',
          ]),
          value: z.number(),
        })
      )
      .optional(),
    // レベル別ステータス（任意、最大40レベル）。stat_boostsが「最大値のみ」なのに対し、
    // こちらはレベル1〜40の推移を持つ。個別ページのスライダー表示用。2026/09/03追加。
    level_stats: z
      .array(
        z.object({
          level: z.number(),
          stats: z.array(
            z.object({
              stat: z.enum([
                'attack',
                'attack_speed',
                'critical_hit_rate',
                'hp',
                'sp_attack',
                'critical_hit_damage',
                'cooldown_reduction',
                'sp_defense',
                'unite_gauge_charge',
                'movement_speed',
                'defense',
                'hp_recovery',
              ]),
              value: z.number(),
            })
          ),
        })
      )
      .optional(),
  }),
});

// バトルアイテム図鑑（疾風の術・きあいのハチマキ等とは別の、試合中に使う専用アイテム枠）
const battleItems = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/battle-items' }),
  schema: z.object({
    slug: z.string(),
    name_ja: z.string(),
    icon: z.string().optional(),
    // クールダウン（秒）。2026/08/29追加。
    cooldown_seconds: z.number().optional(),
    // 解放条件（トレーナーレベルの数値のほか、「ショップで購入」等のレベル制限なしの
    // 入手方法も入力できるよう自由記述にしている。2026/08/29追加、2026/08/29に文字列化）。
    unlock_level: z.coerce.string().optional(),
    // おすすめポケモン（pokemon-jpコレクションのslug配列）。2026/08/30追加。
    recommended_pokemon: z.array(z.string()).optional(),
  }),
});

// よくある質問（FAQ）。ポケモン/もちもの/バトルアイテムの各詳細ページ下部と、
// 一覧ページ（/faq/）の両方に表示する。件数が増えてもCMSでの選択が煩雑にならないよう、
// 「詳細ページ側がFAQを複数選ぶ」のではなく「FAQ側が対象を1つ持つ」設計にしている
// （medalsのpokemon_slugと同じ考え方）。対象を何も設定しなければ/faq/一覧にのみ掲載される
// （サイト全般のFAQ用）。2026/09/01追加。
const faqs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faqs' }),
  schema: z.object({
    slug: z.string(),
    question: z.string(),
    answer: z.string(),
    // 対象は最大1つ（3つのうちどれか、または全て未設定）。
    target_pokemon: z.string().optional(),
    target_held_item: z.string().optional(),
    target_battle_item: z.string().optional(),
  }),
});

// メダル図鑑（特定ポケモンでの実績達成により獲得。ランク別の正確な数値は今回は扱わない）
const medals = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/medals' }),
  schema: z.object({
    slug: z.string(),
    name_ja: z.string(),
    pokemon_slug: z.string().optional(),
    icon: z.string().optional(),
    // 2026/08/31、色属性のみ大量登録するケースに対応するため必須→任意化。
    // 未入力の場合、個別ページでは要約行を表示しないフォールバックにする。
    summary: z.string().optional(),
    // 一覧の表示順（小さい順、任意。2026/08/31追加）。未設定のものは最後に
    // 五十音順で並ぶフォールバック（src/pages/medals/index.astro参照）。
    order: z.number().optional(),
    // メダルの属性色（複数選択可）。src/lib/medals.tsのMEDAL_COLOR_LABELS参照。2026/08/31追加。
    colors: z
      .array(
        z.enum([
          'white',
          'blue',
          'purple',
          'brown',
          'red',
          'pink',
          'yellow',
          'green',
          'black',
          'navy',
          'gray',
        ])
      )
      .optional(),
  }),
});

// おすすめメダルセット。1セット＝メダル図鑑のslugを最大10個組み合わせたもの。
// セット自体の数に制限はなく、いくつでも作成できる（2026/08/31、当初「単一セット」で
// 実装したが運営者要望により「複数セットを作れる」仕様に作り直した）。
// メダル一覧ページ（/medals/）の上部に、セットごとに表示する。
const medalSets = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/medal-sets' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    medals: z.array(z.string()).max(10),
  }),
});

// ポケモンTier表（単一ファイル）。tierは頻繁なメタ変動でポケモンに固定の属性ではないため、
// pokemon-jp側の個別フィールドではなく、ここでTierごとの掲載ポケモン一覧として一元管理する
// （2026/08/31、運営者要望で「tier編集ページ」として独立させた）。
// 全ポケモンを網羅する必要はなく、各Tierに掲載したいポケモンのslugだけを入れる。
const tierList = defineCollection({
  loader: glob({ pattern: 'tier-list.md', base: './src/content/config' }),
  schema: z.object({
    s_tier: z.array(z.string()).optional(),
    a_tier: z.array(z.string()).optional(),
    b_tier: z.array(z.string()).optional(),
    c_tier: z.array(z.string()).optional(),
  }),
});

// 配信スケジュールページの設定（単一ファイル）。YouTube広域検索で見つかっても一覧に載せたくない
// チャンネルを、名前でまとめて除外できるようにする（2026/08/30追加）。
const scheduleSettings = defineCollection({
  loader: glob({ pattern: 'schedule-settings.md', base: './src/content/config' }),
  schema: z.object({
    // 完全一致（前後の空白は無視）で判定。表示されているチャンネル名をそのままコピーする想定。
    excluded_channel_names: z.array(z.string()).optional(),
  }),
});

export const collections = {
  'pokemon-jp': pokemonJp,
  articles,
  streamers,
  'held-items': heldItems,
  'battle-items': battleItems,
  faqs,
  medals,
  'medal-sets': medalSets,
  'tier-list': tierList,
  'schedule-settings': scheduleSettings,
};

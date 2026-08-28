import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ポケモン図鑑（人力データ）
// 参照: CLAUDE-2.md「データ設計: 全面人力データ化」
const pokemonJp = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pokemon-jp' }),
  schema: z.object({
    slug: z.string(),
    name_ja: z.string(),
    role: z.enum(['attacker', 'speedster', 'defender', 'supporter', 'allrounder']),
    // 人力・主観のTier評価。UniteAPI等の数値データとは無関係（CLAUDE-3.md「ポケモンTier表」参照）
    tier: z.enum(['S', 'A', 'B', 'C']).optional(),
    // 攻撃分類（物理攻撃寄り/特殊攻撃寄り）。2026/08/29追加、運営者要望。
    attack_type: z.enum(['physical', 'special']).optional(),
    // 能力評価（人力・主観、5点満点0.5刻み）。5軸レーダーチャート表示用。2026/08/29追加。
    abilities: z
      .object({
        combat: z.number().min(0).max(5).multipleOf(0.5), // 戦闘能力
        durability: z.number().min(0).max(5).multipleOf(0.5), // 耐久能力
        mobility: z.number().min(0).max(5).multipleOf(0.5), // 起動能力
        scoring: z.number().min(0).max(5).multipleOf(0.5), // 得点能力
        support: z.number().min(0).max(5).multipleOf(0.5), // 補佐能力
      })
      .optional(),
    builds: z
      .array(
        z.object({
          title: z.string(),
          held_items: z.array(z.string()),
          battle_item: z.string(),
          note: z.string().optional(),
        })
      )
      .optional(),
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

// もちもの（Held Items）図鑑。数値の精密な再現はせず、文章ベースの説明のみ（Phase 2でステータス
// 計算機を検討する際に数値フィールドを追加する可能性あり）
// 参照: CLAUDE-3.md「もちもの／バトルアイテム／メダル 図鑑」
const heldItems = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/held-items' }),
  schema: z.object({
    slug: z.string(),
    name_ja: z.string(),
    icon: z.string().optional(),
    summary: z.string(),
  }),
});

// バトルアイテム図鑑（疾風の術・きあいのハチマキ等とは別の、試合中に使う専用アイテム枠）
const battleItems = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/battle-items' }),
  schema: z.object({
    slug: z.string(),
    name_ja: z.string(),
    icon: z.string().optional(),
    summary: z.string(),
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
    summary: z.string(),
  }),
});

export const collections = {
  'pokemon-jp': pokemonJp,
  articles,
  streamers,
  'held-items': heldItems,
  'battle-items': battleItems,
  medals,
};

// ロール名の日本語訳・配色辞書（CMS入力にはせず、コード内固定辞書として持つ方針。CLAUDE-2.md参照）
// 表記は暫定。ゲーム内表記と厳密に揃えたい場合は運営者確認のうえここを直す。
export const ROLE_LABELS: Record<string, string> = {
  attacker: 'アタッカー',
  speedster: 'スピーディ',
  defender: 'ディフェンダー',
  supporter: 'サポーター',
  allrounder: 'オールラウンダー',
};

export const ROLE_COLOR_VARS: Record<string, string> = {
  attacker: '--r-attacker',
  speedster: '--r-speedster',
  defender: '--r-defender',
  supporter: '--r-supporter',
  allrounder: '--r-allrounder',
};

// 人力Tier評価（S/A/B/C固定）。CLAUDE-3.md「ポケモンTier表」参照
export const TIER_ORDER = ['S', 'A', 'B', 'C'] as const;

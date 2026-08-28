// ロール名の日本語訳・配色辞書（CMS入力にはせず、コード内固定辞書として持つ方針。CLAUDE-2.md参照）
// ゲーム内表記に統一済み（2026/08/29、運営者確認済み）。
export const ROLE_LABELS: Record<string, string> = {
  attacker: 'アタック型',
  speedster: 'スピード型',
  defender: 'ディフェンス型',
  supporter: 'サポート型',
  allrounder: 'バランス型',
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

// 攻撃分類（物理攻撃寄り/特殊攻撃寄り）。2026/08/29追加。
export const ATTACK_TYPE_LABELS: Record<string, string> = {
  physical: '攻撃',
  special: '特攻',
};

// 使用難易度（このポケモンを使いこなす難易度）。2026/08/29追加。
export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '初心者向け',
  intermediate: '中級者向け',
  advanced: '上級者向け',
};

// わざ説明の表示順・見出し。派生わざはインデント表示する。
export const MOVE_SECTIONS = [
  { key: 'ability', label: 'とくせい', indent: false },
  { key: 'move1', label: 'わざ1', indent: false },
  { key: 'move1_upgrade_a', label: 'わざ1派生A', indent: true },
  { key: 'move1_upgrade_b', label: 'わざ1派生B', indent: true },
  { key: 'move2', label: 'わざ2', indent: false },
  { key: 'move2_upgrade_a', label: 'わざ2派生A', indent: true },
  { key: 'move2_upgrade_b', label: 'わざ2派生B', indent: true },
  { key: 'unite_move', label: 'ユナイト技', indent: false },
] as const;

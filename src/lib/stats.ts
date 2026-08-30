// もちもののステータス上昇項目の日本語訳辞書（CMS入力にはせず、コード内固定辞書として持つ方針。
// ROLE_LABELS等と同じ方針。2026/08/30追加）
export const STAT_LABELS: Record<string, string> = {
  attack: '攻撃',
  attack_speed: '通常攻撃の速さ',
  critical_hit_rate: '急所率',
  hp: 'HP',
  sp_attack: '特攻',
  critical_hit_damage: '急所ダメージ増加',
  cooldown_reduction: 'わざの待ち時間',
  sp_defense: '特防',
  unite_gauge_charge: 'ユナイトわざゲージの溜まりやすさ',
  movement_speed: '移動速度',
  defense: '防御',
  hp_recovery: 'HP回復',
};

export const STAT_ORDER = Object.keys(STAT_LABELS);

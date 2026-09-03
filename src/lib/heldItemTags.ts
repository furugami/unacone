// もちもののタグ（複数選択可）の日本語訳辞書（CMS入力にはせず、コード内固定辞書として持つ方針。
// ROLE_LABELS等と同じ方針。2026/09/03追加）
export const HELD_ITEM_TAG_LABELS: Record<string, string> = {
	exclusive: '専用',
	attack_carry: '攻撃キャリー向け',
	sp_attack_carry: '特攻キャリー向け',
	support: 'サポート向け',
	defense: 'ディフェンス向け',
	goal: 'ゴール向け',
};

export const HELD_ITEM_TAG_ORDER = Object.keys(HELD_ITEM_TAG_LABELS);

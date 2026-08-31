// メダルの属性色（複数持てる）の日本語訳辞書・バッジ配色（CMS入力にはせず、コード内固定辞書として
// 持つ方針。ROLE_LABELS等と同じ方針。2026/08/31追加）
export const MEDAL_COLOR_LABELS: Record<string, string> = {
	white: 'ホワイト',
	blue: 'ブルー',
	purple: 'パープル',
	brown: 'ブラウン',
	red: 'レッド',
	pink: 'ピンク',
	yellow: 'イエロー',
	green: 'グリーン',
	black: 'ブラック',
	navy: 'ネイビー',
	gray: 'グレー',
};

export const MEDAL_COLOR_ORDER = Object.keys(MEDAL_COLOR_LABELS);

// バッジの背景色。
export const MEDAL_COLOR_SWATCH: Record<string, string> = {
	white: '#f5f5f5',
	blue: '#3b82f6',
	purple: '#8b5cf6',
	brown: '#8b5e34',
	red: '#ef4444',
	pink: '#ec4899',
	yellow: '#eab308',
	green: '#22c55e',
	black: '#1f2937',
	navy: '#1e3a8a',
	gray: '#6b7280',
};

// 背景が明るい色（ホワイト・イエロー）は黒文字、それ以外は白文字にする。
export const MEDAL_COLOR_TEXT: Record<string, string> = {
	white: '#1b2233',
	blue: '#fff',
	purple: '#fff',
	brown: '#fff',
	red: '#fff',
	pink: '#fff',
	yellow: '#1b2233',
	green: '#fff',
	black: '#fff',
	navy: '#fff',
	gray: '#fff',
};

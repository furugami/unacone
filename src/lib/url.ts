// GitHub Pagesのプロジェクトサイト（https://furugami.github.io/unacone/ のようにリポジトリ名が
// サブパスに入る）に対応するため、サイト内リンクは必ずこの関数を通して生成する。
// astro.config.mjs の base 設定を読み取って自動的にプレフィックスを付ける。
export function withBase(path: string): string {
	const base = import.meta.env.BASE_URL.replace(/\/$/, '');
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${base}${normalizedPath}`;
}

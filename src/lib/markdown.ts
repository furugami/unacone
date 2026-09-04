import { marked } from 'marked';
import { withBase } from './url';

// Markdownをレンダリングし、"/medals/" のようなサイトルート相対リンクにだけ
// base パス（GitHub Pagesのサブパス）を補完する。外部URL（http/https等）や
// "//" 始まりの プロトコル相対URLは対象外。
export function renderMarkdownWithBase(markdown: string): string {
	const html = marked.parse(markdown) as string;
	return html.replace(/href="\/(?!\/)([^"]*)"/g, (_match, path) => `href="${withBase(`/${path}`)}"`);
}

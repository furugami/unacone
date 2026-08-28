// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// GitHub Pagesのプロジェクトサイト（https://furugami.github.io/unacone/）として公開する想定。
export default defineConfig({
	site: 'https://furugami.github.io',
	base: '/unacone',
});

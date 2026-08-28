// 記事の難易度カテゴリ日本語訳（CLAUDE.md「セオリー解説記事 コンテンツモデル」参照）
export const ARTICLE_CATEGORY_LABELS: Record<string, string> = {
  beginner: '初心者向け',
  intermediate: '中級者向け',
  advanced: '上級者向け',
};

export const ARTICLE_CATEGORY_ORDER = ['beginner', 'intermediate', 'advanced'] as const;

/**
 * カスタムタグ マスタのモックデータ
 * 実装では CustomTagMaster（Type=カテゴリ / SortOrder=カテゴリ内の並び順）に対応する。
 * このファイルがカスタムタグの「名称・カテゴリ・並び順」の単一ソース。
 * 並び替え（タグカテゴリ単位・昇順）も本データの sortOrder を参照する。
 */
export const tagData = [
    // --- 対象・階層 (Target) ---
    { id: 1, type: 'target', sortOrder: 1, name: '新人・内定者', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 6, type: 'target', sortOrder: 2, name: '管理職', corpId: '201129', corpName: '○○食品株式会社', status: 'private' },
    { id: 8, type: 'target', sortOrder: 3, name: '若手社員（1-3年目）', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 9, type: 'target', sortOrder: 4, name: '中堅社員', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 10, type: 'target', sortOrder: 5, name: 'リーダー・係長級', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 11, type: 'target', sortOrder: 6, name: '営業職', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 12, type: 'target', sortOrder: 7, name: '技術・開発職', corpId: '201129', corpName: '○○食品株式会社', status: 'private' },

    // --- ジャンル (Genre) ---
    { id: 4, type: 'genre', sortOrder: 1, name: 'DX・ITスキル', corpId: '201129', corpName: '○○食品株式会社', status: 'private' },
    { id: 7, type: 'genre', sortOrder: 2, name: 'コミュニケーション', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 13, type: 'genre', sortOrder: 3, name: 'コンプライアンス', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 14, type: 'genre', sortOrder: 4, name: '情報セキュリティ', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 15, type: 'genre', sortOrder: 5, name: 'マネジメント', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 16, type: 'genre', sortOrder: 6, name: 'ロジカルシンキング', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 17, type: 'genre', sortOrder: 7, name: 'メンタルヘルス', corpId: '201129', corpName: '○○食品株式会社', status: 'private' },
    { id: 18, type: 'genre', sortOrder: 8, name: 'キャリアデザイン', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 19, type: 'genre', sortOrder: 9, name: 'OAスキル（Excel/PPT）', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },

    // --- 難易度 (Level) ---
    { id: 5, type: 'level', sortOrder: 1, name: '基礎・初級', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 20, type: 'level', sortOrder: 2, name: '応用・実践', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },

    // --- 受講形態 (Format) ---
    { id: 23, type: 'format', sortOrder: 1, name: 'eラーニング', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 24, type: 'format', sortOrder: 2, name: '郵便添削', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 25, type: 'format', sortOrder: 3, name: 'WEB添削', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },

    // --- その他 (Other) ---
    { id: 2, type: 'other', sortOrder: 1, name: '50％補助', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 3, type: 'other', sortOrder: 2, name: '100％補助', corpId: '201129', corpName: '○○食品株式会社', status: 'public' },
    { id: 21, type: 'other', sortOrder: 3, name: '昇格要件', corpId: '201129', corpName: '○○食品株式会社', status: 'private' },
    { id: 22, type: 'other', sortOrder: 4, name: '選抜型研修', corpId: '201129', corpName: '○○食品株式会社', status: 'private' }
];

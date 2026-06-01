// m_flyer_tk + m_course_flyer_tk のモックデータ（v2: 複合ステータス対応）
//
// 各エントリは tkf_code 単位で1件（バージョンをまたいで統合）
//
// compositeStatus:
//   '未承認'       = Ver.1 未承認のみ
//   '申請中'       = Ver.N 申請中のみ（承認済なし）
//   '承認済'       = Ver.N 承認済のみ
//   '改訂中'       = Ver.N 承認済 + Ver.N+1 未承認
//   '改訂申請中'   = Ver.N 承認済 + Ver.N+1 申請中
//   '棄却（改訂）' = Ver.N 承認済 + Ver.N+1 棄却
//
// ver / approvalStatus / courses / updatedAt 等は代表行（承認済行、なければ唯一行）のデータ
// draft: 改訂中バージョンが存在する場合のみ設定（未承認/申請中の最新バージョン行）
// status: フライヤー全体（tkf_code単位）の有効/無効
// standardTagIds: tkf_code 単位で管理（バージョンと独立）

// StandardTagMaster のモック定義（course-master.html のインライン定義と同値）
export const STANDARD_TAGS = [
    { id: 1,  category: 'target', name: '管理職' },
    { id: 2,  category: 'target', name: '一般社員' },
    { id: 3,  category: 'target', name: '新入社員' },
    { id: 4,  category: 'genre',  name: 'ビジネスマナー' },
    { id: 5,  category: 'genre',  name: 'IT・デジタル' },
    { id: 6,  category: 'genre',  name: 'リーダーシップ' },
    { id: 7,  category: 'level',  name: '初級' },
    { id: 8,  category: 'level',  name: '中級' },
    { id: 9,  category: 'level',  name: '上級' },
    { id: 10, category: 'format', name: 'Web通信' },
    { id: 11, category: 'format', name: '通信教育（紙テキスト）' },
    { id: 12, category: 'other',  name: '資格対応' },
    { id: 13, category: 'other',  name: 'eラーニング' },
];

export const courseMasterData = [

  // ── IEC（幹事団体）────────────────────────────────────────────
  // IECコースは承認フロー対象外（approved 固定・バージョンアップ申請不要）
  {
    id: 1,
    tkfCode: "TKF-IEC-001",
    name: "SD制度活用オリエンテーション",
    hanCode: "IEC-OR-001",
    eduCode: "IEC",
    org: "IEC（幹事団体）",
    compositeStatus: "承認済",
    ver: 1,
    approvalStatus: "approved",
    status: "Active",
    note: "SD制度の概要と募集サイトの使い方を解説するオリエンテーション教材。",
    htmlUrl:      "https://example.com/courses/iec-or-001",
    pdfUrl:       "https://example.com/pdfs/iec-or-001.pdf",
    zipUrl:       "",
    thumbnailUrl: "",
    updatedAt: "2026/04/01",
    courses: [
      { sortNo: 1, name: "", price: 5500, period: 1 },
    ],
    standardTagIds: [2, 7, 10],
    draft: null,
  },

  // ── 産業能率大学 (EDU001) ─────────────────────────────────────
  // 複合ステータス「改訂中」: Ver.1 承認済 + Ver.2 未承認（バージョンアップ申請後）
  {
    id: 101,
    tkfCode: "TKF-SAN-001",
    name: "新入社員のためのビジネスマナー基礎",
    hanCode: "SAN-BM-001",
    eduCode: "EDU001",
    org: "産業能率大学",
    compositeStatus: "改訂中",
    // 代表行（承認済 Ver.1）
    ver: 1,
    approvalStatus: "approved",
    status: "Active",
    note: "社会人1〜3年目向け。ビジネス文書・電話応対・身だしなみを含む。",
    htmlUrl:      "https://example.com/courses/san-bm-001",
    pdfUrl:       "https://example.com/pdfs/san-bm-001.pdf",
    zipUrl:       "",
    thumbnailUrl: "https://example.com/thumbnails/san-bm-001.jpg",
    updatedAt: "2026/03/10",
    courses: [
      { sortNo: 1, name: "郵便版", price: 17600, period: 2 },
      { sortNo: 2, name: "WEB版",  price: 17600, period: 2 },
    ],
    // 改訂中バージョン（未承認 Ver.2）
    draft: {
      id: 105,
      ver: 2,
      approvalStatus: "unapproved",
      note: "2026年版に改訂。社会人1〜3年目向け。（改訂作業中）",
      htmlUrl:      "https://example.com/courses/san-bm-001",
      pdfUrl:       "",
      zipUrl:       "",
      thumbnailUrl: "https://example.com/thumbnails/san-bm-001.jpg",
      updatedAt: "2026/05/10",
      courses: [
        { sortNo: 1, name: "郵便版", price: 17600, period: 2 },
        { sortNo: 2, name: "WEB版",  price: 17600, period: 2 },
      ],
    },
    standardTagIds: [2, 3, 4, 10, 11],
  },

  // 複合ステータス「申請中」: Ver.1 申請中のみ（初回IEC承認待ち）
  {
    id: 102,
    tkfCode: "TKF-SAN-002",
    name: "非財務出身者のための決算書の読み方",
    hanCode: "SAN-FN-002",
    eduCode: "EDU001",
    org: "産業能率大学",
    compositeStatus: "申請中",
    ver: 1,
    approvalStatus: "pending",
    status: "Active",
    note: "",
    htmlUrl:      "",
    pdfUrl:       "https://example.com/pdfs/san-fn-002.pdf",
    zipUrl:       "",
    thumbnailUrl: "",
    updatedAt: "2026/02/28",
    courses: [
      { sortNo: 1, name: "", price: 23100, period: 3 },
    ],
    standardTagIds: [1, 2, 8],
    draft: null,
  },

  // 複合ステータス「作成中」: Ver.1 未承認・無効（まだ承認申請前）
  {
    id: 103,
    tkfCode: "TKF-SAN-003",
    name: "人事担当者のための労務トラブル事例集",
    hanCode: "SAN-HR-003",
    eduCode: "EDU001",
    org: "産業能率大学",
    compositeStatus: "作成中",
    ver: 1,
    approvalStatus: "unapproved",
    status: "Inactive",
    note: "2026年版に改訂。最新の法改正（育休・時間外規制）に対応。",
    htmlUrl:      "",
    pdfUrl:       "",
    zipUrl:       "",
    thumbnailUrl: "",
    updatedAt: "2026/01/20",
    courses: [
      { sortNo: 1, name: "", price: 23650, period: 3 },
    ],
    standardTagIds: [1, 9],
    draft: null,
  },

  // 複合ステータス「改訂中」（棄却後）: Ver.1 承認済 + Ver.2 棄却されて未承認に戻った状態
  // 棄却はアクション。結果として draft.approvalStatus = 'unapproved' に戻り、compositeStatus = '改訂中'。
  // draft.rejectionComment に棄却コメントを保持する（再申請時にクリア）。
  {
    id: 104,
    tkfCode: "TKF-SAN-004",
    name: "デザイン思考で考える新規事業アイデア",
    hanCode: "SAN-DT-004",
    eduCode: "EDU001",
    org: "産業能率大学",
    compositeStatus: "改訂中",
    // 代表行（承認済 Ver.1）
    ver: 1,
    approvalStatus: "approved",
    status: "Active",
    note: "",
    htmlUrl:      "https://example.com/courses/san-dt-004",
    pdfUrl:       "",
    zipUrl:       "",
    thumbnailUrl: "https://example.com/thumbnails/san-dt-004.jpg",
    updatedAt: "2026/03/05",
    courses: [
      { sortNo: 1, name: "", price: 25300, period: 3 },
    ],
    // 棄却後に未承認へ戻った改訂版（棄却コメントを保持）
    draft: {
      id: 106,
      ver: 2,
      approvalStatus: "unapproved",
      rejectionComment: "版下PDFが未添付です。申請前に必ず版下PDFをアップロードしてください。",
      note: "",
      htmlUrl:      "https://example.com/courses/san-dt-004",
      pdfUrl:       "",
      zipUrl:       "",
      thumbnailUrl: "https://example.com/thumbnails/san-dt-004.jpg",
      updatedAt: "2026/04/20",
      courses: [
        { sortNo: 1, name: "", price: 25300, period: 3 },
      ],
    },
    standardTagIds: [1, 2, 6, 8],
  },

  // 複合ステータス「承認済」: Ver.1 承認済・バージョンアップ申請フローの確認用
  // Vendorロールで「バージョンアップ申請」→ 改訂版作成 → 承認申請 → IEC承認 の一連の流れを確認できる
  {
    id: 107,
    tkfCode: "TKF-SAN-005",
    name: "グローバル人材育成のための異文化コミュニケーション",
    hanCode: "SAN-GC-005",
    eduCode: "EDU001",
    org: "産業能率大学",
    compositeStatus: "承認済",
    ver: 1,
    approvalStatus: "approved",
    status: "Active",
    note: "海外拠点との協働経験者向け。ケーススタディ演習あり。",
    htmlUrl:      "https://example.com/courses/san-gc-005",
    pdfUrl:       "https://example.com/pdfs/san-gc-005.pdf",
    zipUrl:       "",
    thumbnailUrl: "https://example.com/thumbnails/san-gc-005.jpg",
    updatedAt: "2026/04/15",
    courses: [
      { sortNo: 1, name: "通常版",         price: 26400, period: 3 },
      { sortNo: 2, name: "ケーススタディ版", price: 30800, period: 4 },
    ],
    standardTagIds: [1, 6, 10],
    draft: null,
  },

  // ── JMAM (EDU002) ─────────────────────────────────────────────
  {
    id: 201,
    tkfCode: "TKF-JMM-001",
    name: "Excel実務で使えるショートカット大全",
    hanCode: "JMM-PC-001",
    eduCode: "EDU002",
    org: "JMAM",
    compositeStatus: "承認済",
    ver: 1,
    approvalStatus: "approved",
    status: "Active",
    note: "Excel 2021以降対応。",
    htmlUrl:      "https://example.com/courses/jmm-pc-001",
    pdfUrl:       "",
    zipUrl:       "",
    thumbnailUrl: "",
    updatedAt: "2026/02/18",
    courses: [
      { sortNo: 1, name: "", price: 18920, period: 3 },
    ],
    standardTagIds: [2, 5, 7, 10],
    draft: null,
  },
  {
    id: 202,
    tkfCode: "TKF-JMM-002",
    name: "若手リーダーのためのタイムマネジメント",
    hanCode: "JMM-LM-002",
    eduCode: "EDU002",
    org: "JMAM",
    compositeStatus: "承認済",
    ver: 1,
    approvalStatus: "approved",
    status: "Active",
    note: "",
    htmlUrl:      "",
    pdfUrl:       "https://example.com/pdfs/jmm-lm-002.pdf",
    zipUrl:       "",
    thumbnailUrl: "https://example.com/thumbnails/jmm-lm-002.jpg",
    updatedAt: "2026/01/30",
    courses: [
      { sortNo: 1, name: "通常版",   price: 18700, period: 2 },
      { sortNo: 2, name: "演習追加版", price: 21450, period: 3 },
    ],
    standardTagIds: [2, 6, 7, 11],
    draft: null,
  },
  // Ver.2 承認済（過去にバージョンアップ申請→承認済みのフライヤー）
  {
    id: 203,
    tkfCode: "TKF-JMM-003",
    name: "法人営業のためのヒアリング技術",
    hanCode: "JMM-SL-003",
    eduCode: "EDU002",
    org: "JMAM",
    compositeStatus: "承認済",
    ver: 2,
    approvalStatus: "approved",
    status: "Active",
    note: "ロールプレイ動画付き。",
    htmlUrl:      "https://example.com/courses/jmm-sl-003",
    pdfUrl:       "https://example.com/pdfs/jmm-sl-003.pdf",
    zipUrl:       "https://example.com/zips/jmm-sl-003.zip",
    thumbnailUrl: "",
    updatedAt: "2026/03/01",
    courses: [
      { sortNo: 1, name: "通常版",       price: 20900, period: 3 },
      { sortNo: 2, name: "ロールプレイ版", price: 24200, period: 4 },
    ],
    standardTagIds: [2, 6, 8, 11],
    draft: null,
  },

  // ── JTEX (EDU003) ──────────────────────────────────────────────
  {
    id: 301,
    tkfCode: "TKF-JTX-001",
    name: "入門マーケティングリサーチ",
    hanCode: "JTX-MK-001",
    eduCode: "EDU003",
    org: "JTEX",
    compositeStatus: "承認済",
    ver: 1,
    approvalStatus: "approved",
    status: "Inactive",
    note: "",
    htmlUrl:      "",
    pdfUrl:       "https://example.com/pdfs/jtx-mk-001.pdf",
    zipUrl:       "",
    thumbnailUrl: "",
    updatedAt: "2026/02/05",
    courses: [
      { sortNo: 1, name: "通常版",         price: 21450, period: 3 },
      { sortNo: 2, name: "ケーススタディ版", price: 24640, period: 4 },
    ],
    standardTagIds: [2, 8, 11],
    draft: null,
  },
  {
    id: 302,
    tkfCode: "TKF-JTX-002",
    name: "DX推進担当者のための基礎知識",
    hanCode: "JTX-DX-002",
    eduCode: "EDU003",
    org: "JTEX",
    compositeStatus: "承認済",
    ver: 1,
    approvalStatus: "approved",
    status: "Active",
    note: "2026年版。最新のAI・クラウド動向を含む。",
    htmlUrl:      "https://example.com/courses/jtx-dx-002",
    pdfUrl:       "",
    zipUrl:       "",
    thumbnailUrl: "https://example.com/thumbnails/jtx-dx-002.jpg",
    updatedAt: "2026/03/15",
    courses: [
      { sortNo: 1, name: "WEB版",   price: 24200, period: 3 },
      { sortNo: 2, name: "演習付き版", price: 27500, period: 4 },
    ],
    standardTagIds: [1, 5, 7, 10],
    draft: null,
  },
  {
    id: 303,
    tkfCode: "TKF-JTX-003",
    name: "管理職のためのハラスメント防止",
    hanCode: "JTX-CP-003",
    eduCode: "EDU003",
    org: "JTEX",
    compositeStatus: "承認済",
    ver: 1,
    approvalStatus: "approved",
    status: "Active",
    note: "",
    htmlUrl:      "",
    pdfUrl:       "",
    zipUrl:       "",
    thumbnailUrl: "",
    updatedAt: "2026/01/10",
    courses: [
      { sortNo: 1, name: "", price: 22000, period: 3 },
    ],
    standardTagIds: [1, 2, 8, 10],
    draft: null,
  },
];

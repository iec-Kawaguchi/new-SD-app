/**
 * コースデータ（モック）
 *   - applicants: 申込数（人気順ソート用）。本番では共有の Applications テーブルを
 *     フライヤー単位で集計して算出する想定（モックでは固定値）。
 *   - org:        提供団体名（サムネイルが無い他団体コースのプレースホルダ表示用）。
 * - image は意図的に大半を null にしている（他団体コースはサムネイル未提供が多い実態を再現）。
 */
const courseList = [
    {
        id: "101", title: "Excel マクロ＆VBA入門",
        desc: "業務効率化の決定版。定型業務を自動化するスキルをゼロから習得します。",
        price: 19910, period: 3, url: "course.html", isNew: true,
        image: "../img/course_c.webp", org: "IEC", applicants: 312,
        tags: [{ text: "資格", type: "genre" }, { text: "業務効率", type: "genre" }, { text: "推奨", type: "other" }]
    },
    {
        id: "102", title: "生成AIで学ぶプログラミング基礎",
        desc: "ChatGPTやCopilotを活用して、コードが書けない人でもアプリ開発を体験。",
        price: 19980, period: 3, url: "#", isNew: false,
        image: null, org: "テックアカデミア", applicants: 487,
        tags: [{ text: "AI", type: "genre" }, { text: "全社員", type: "target" }, { text: "50%補助", type: "other" }]
    },
    {
        id: "103", title: "心理的安全性100の実践",
        desc: "チームの生産性を最大化するための心理的安全性の作り方を学ぶ実践講座。",
        price: 14630, period: 3, url: "#", isNew: false,
        image: "../img/course_a.webp", org: "IEC", applicants: 268,
        tags: [{ text: "マネジメント", type: "genre" }, { text: "管理職", type: "target" }, { text: "100%補助", type: "other" }]
    },
    {
        id: "104", title: "ITパスポート試験合格講座",
        desc: "ITの基礎知識を網羅的に学習。非エンジニア職の方にも推奨される国家資格です。",
        price: 19910, period: 3, url: "#", isNew: true,
        image: "../img/course_b.webp", org: "IEC", applicants: 401,
        tags: [{ text: "資格", type: "genre" }, { text: "IT", type: "genre" }, { text: "若手", type: "target" }]
    },
    {
        id: "105", title: "Z世代・新人のためのマネジメント",
        desc: "価値観の多様化に対応し、若手社員のエンゲージメントを高める手法を学びます。",
        price: 19980, period: 3, url: "#", isNew: false,
        image: null, org: "グローバル人材研究所", applicants: 143,
        tags: [{ text: "マネジメント", type: "genre" }, { text: "管理職", type: "target" }]
    },
    {
        id: "106", title: "ビジネス・ベーシック",
        desc: "メール作成、名刺交換、会議の進め方など、社会人としての基礎を短期間で確認。",
        price: 9800, period: 1, url: "#", isNew: false,
        image: null, org: "日本ビジネス教育協会", applicants: 356,
        tags: [{ text: "基礎", type: "level" }, { text: "若手", type: "target" }, { text: "社内推薦", type: "other" }]
    },
    {
        id: "107", title: "財務諸表の読み方・活かし方",
        desc: "貸借対照表、損益計算書の基礎を理解し、会社の数字を読み解く力を養います。",
        price: 15400, period: 2, url: "#", isNew: false,
        image: null, org: "ファイナンス総研", applicants: 198,
        tags: [{ text: "経理", type: "genre" }, { text: "基礎", type: "level" }]
    },
    {
        id: "108", title: "Webマーケティング入門",
        desc: "SEO、SNS、広告運用の基礎知識を習得。デジタル時代に必須の集客スキルです。",
        price: 22000, period: 3, url: "#", isNew: true,
        image: null, org: "デジタルマーケ学院", applicants: 423,
        tags: [{ text: "マーケティング", type: "genre" }, { text: "人気", type: "other" }]
    },
    {
        id: "109", title: "英語メールライティング",
        desc: "依頼、お詫び、交渉など、シチュエーション別の定型表現とマナーを短時間で学習。",
        price: 8800, period: 1, url: "#", isNew: false,
        image: null, org: "グローバル人材研究所", applicants: 231,
        tags: [{ text: "語学", type: "genre" }, { text: "実践", type: "level" }, { text: "グローバル", type: "genre" }]
    },
    {
        id: "110", title: "アンガーマネジメント講座",
        desc: "怒りの感情と上手に付き合い、職場の人間関係を円滑にするテクニックを学びます。",
        price: 12100, period: 2, url: "#", isNew: false,
        image: null, org: "メンタルヘルス研究センター", applicants: 167,
        tags: [{ text: "コミュニケーション", type: "genre" }, { text: "メンタル", type: "genre" }, { text: "全社員", type: "target" }]
    },
    {
        id: "111", title: "人を動かすプレゼンテーション",
        desc: "構成力、資料作成、デリバリースキルを向上させ、相手の行動を促すプレゼン力を習得。",
        price: 16500, period: 2, url: "#", isNew: false,
        image: null, org: "日本ビジネス教育協会", applicants: 289,
        tags: [{ text: "コミュニケーション", type: "genre" }, { text: "実践", type: "level" }]
    },
    {
        id: "112", title: "実践 Pythonデータ分析",
        desc: "ライブラリ（Pandas/Matplotlib）を使ったデータ加工・可視化の基礎をハンズオンで学習。",
        price: 24800, period: 4, url: "#", isNew: false,
        image: null, org: "テックアカデミア", applicants: 376,
        tags: [{ text: "IT", type: "genre" }, { text: "データ", type: "genre" }, { text: "実践", type: "level" }]
    },
    {
        id: "113", title: "日商簿記3級 短期集中コース",
        desc: "商業簿記の基礎を短期間でマスター。試験合格に向けたポイント解説付き。",
        price: 13200, period: 2, url: "#", isNew: false,
        image: null, org: "ファイナンス総研", applicants: 254,
        tags: [{ text: "資格", type: "genre" }, { text: "経理", type: "genre" }, { text: "入門", type: "level" }]
    },
    {
        id: "114", title: "情報セキュリティ・リテラシー",
        desc: "標的型攻撃メールやランサムウェアなど、最新の脅威と対策を全社員向けに解説。",
        price: 5500, period: 1, url: "#", isNew: false,
        image: null, org: "テックアカデミア", applicants: 512,
        tags: [{ text: "全社員", type: "target" }, { text: "100%補助", type: "other" }, { text: "IT", type: "genre" }]
    },
    {
        id: "115", title: "チームビルディング・ワークショップ",
        desc: "信頼関係を構築し、チームのパフォーマンスを最大化するための手法とゲームを学びます。",
        price: 18700, period: 3, url: "#", isNew: true,
        image: null, org: "グローバル人材研究所", applicants: 132,
        tags: [{ text: "マネジメント", type: "genre" }, { text: "組織", type: "genre" }, { text: "管理職", type: "target" }]
    },
    {
        id: "116", title: "はじめての中国語会話",
        desc: "発音（ピンイン）の基礎から日常会話まで。ビジネスで使える簡単なフレーズも収録。",
        price: 11000, period: 3, url: "#", isNew: false,
        image: null, org: "グローバル人材研究所", applicants: 88,
        tags: [{ text: "語学", type: "genre" }, { text: "入門", type: "level" }]
    },
    {
        id: "117", title: "ロジカルシンキング入門",
        desc: "MECE、ロジックツリーなどの思考フレームワークを使いこなし、説得力のある提案を作る。",
        price: 14300, period: 2, url: "#", isNew: false,
        image: null, org: "日本ビジネス教育協会", applicants: 344,
        tags: [{ text: "思考法", type: "genre" }, { text: "基礎", type: "level" }, { text: "定番", type: "other" }]
    },
    {
        id: "118", title: "企業法務・コンプライアンス基礎",
        desc: "契約書のチェックポイントや下請法、個人情報保護法など、実務で必要な法律知識。",
        price: 21000, period: 3, url: "#", isNew: false,
        image: null, org: "リーガル教育サービス", applicants: 119,
        tags: [{ text: "法務", type: "genre" }, { text: "リスク管理", type: "genre" }, { text: "管理職", type: "target" }]
    },
    {
        id: "119", title: "レジリエンス・トレーニング",
        desc: "困難やストレスに直面しても折れない心（回復力）を育てるメンタルヘルスの新常識。",
        price: 12800, period: 2, url: "#", isNew: false,
        image: null, org: "メンタルヘルス研究センター", applicants: 176,
        tags: [{ text: "メンタル", type: "genre" }, { text: "セルフケア", type: "genre" }]
    },
    {
        id: "120", title: "プロジェクトマネジメント基礎(PMBOK)",
        desc: "PMBOKガイドに基づくプロジェクト管理の標準知識。スケジュール、コスト、品質管理の要点。",
        price: 27500, period: 4, url: "#", isNew: false,
        image: null, org: "テックアカデミア", applicants: 207,
        tags: [{ text: "マネジメント", type: "genre" }, { text: "専門", type: "level" }, { text: "資格", type: "genre" }]
    },
    {
        id: "121", title: "PowerPoint 資料デザイン術",
        desc: "伝わる資料の構成・配色・図解のコツを習得。テンプレートに頼らない説得力ある一枚を。",
        price: 13200, period: 2, url: "#", isNew: true,
        image: null, org: "IEC", applicants: 298,
        tags: [{ text: "業務効率", type: "genre" }, { text: "全社員", type: "target" }, { text: "実践", type: "level" }]
    },
    {
        id: "122", title: "Word 差し込み印刷・長文作成",
        desc: "見出し・目次・差し込み印刷など、ビジネス文書を効率よく作る実務テクニックを学習。",
        price: 9900, period: 1, url: "#", isNew: false,
        image: null, org: "IEC", applicants: 176,
        tags: [{ text: "業務効率", type: "genre" }, { text: "入門", type: "level" }]
    },
    {
        id: "123", title: "生成AI 活用 実践ワークショップ",
        desc: "ChatGPTを業務に組み込むためのプロンプト設計と社内活用事例をハンズオンで体験。",
        price: 26400, period: 3, url: "#", isNew: true,
        image: null, org: "テックアカデミア", applicants: 461,
        tags: [{ text: "AI", type: "genre" }, { text: "業務効率", type: "genre" }, { text: "実践", type: "level" }]
    },
    {
        id: "124", title: "管理職のための1on1入門",
        desc: "部下の成長を促す対話の進め方。傾聴・フィードバック・目標設定の基本を身につける。",
        price: 17600, period: 2, url: "#", isNew: false,
        image: null, org: "グローバル人材研究所", applicants: 211,
        tags: [{ text: "マネジメント", type: "genre" }, { text: "管理職", type: "target" }, { text: "実践", type: "level" }]
    },
    {
        id: "125", title: "TOEIC(R) スコアアップ集中講座",
        desc: "頻出パターンを押さえた解法と語彙強化で、短期間でのスコア向上を目指します。",
        price: 23100, period: 4, url: "#", isNew: false,
        image: null, org: "グローバル人材研究所", applicants: 389,
        tags: [{ text: "語学", type: "genre" }, { text: "資格", type: "genre" }, { text: "実践", type: "level" }]
    },
    {
        id: "126", title: "数字に強くなる 管理会計入門",
        desc: "原価・損益分岐点・予実管理など、意思決定に役立つ管理会計の考え方をやさしく解説。",
        price: 16500, period: 2, url: "#", isNew: false,
        image: null, org: "ファイナンス総研", applicants: 163,
        tags: [{ text: "経理", type: "genre" }, { text: "管理職", type: "target" }, { text: "基礎", type: "level" }]
    },
    {
        id: "127", title: "ハラスメント防止研修",
        desc: "パワハラ・セクハラの線引きと、起こさせない職場づくりのポイントを事例で学ぶ。",
        price: 6600, period: 1, url: "#", isNew: false,
        image: null, org: "リーガル教育サービス", applicants: 478,
        tags: [{ text: "コンプライアンス", type: "genre" }, { text: "全社員", type: "target" }, { text: "100%補助", type: "other" }]
    },
    {
        id: "128", title: "SQL ではじめるデータ抽出",
        desc: "業務データを自分で取り出すためのSQL基礎。SELECT・集計・結合をハンズオンで習得。",
        price: 21800, period: 3, url: "#", isNew: true,
        image: null, org: "テックアカデミア", applicants: 254,
        tags: [{ text: "IT", type: "genre" }, { text: "データ", type: "genre" }, { text: "入門", type: "level" }]
    },
    {
        id: "129", title: "デザイン思考ワークショップ",
        desc: "ユーザー起点で課題を発見し、アイデアを形にするデザイン思考のプロセスを体験します。",
        price: 19800, period: 2, url: "#", isNew: false,
        image: null, org: "日本ビジネス教育協会", applicants: 142,
        tags: [{ text: "思考法", type: "genre" }, { text: "実践", type: "level" }]
    },
    {
        id: "130", title: "新入社員のためのビジネスマナー",
        desc: "挨拶・電話応対・報連相など、社会人の第一歩を体系的に。配属前の総仕上げに最適。",
        price: 7700, period: 1, url: "#", isNew: true,
        image: null, org: "日本ビジネス教育協会", applicants: 502,
        tags: [{ text: "基礎", type: "level" }, { text: "若手", type: "target" }, { text: "社内推薦", type: "other" }]
    },
    {
        id: "131", title: "Excel ピボットテーブル実践",
        desc: "大量データを瞬時に集計・分析。ピボットテーブルとグラフで意思決定を加速させる。",
        price: 14300, period: 2, url: "#", isNew: false,
        image: "../img/course_c.webp", org: "IEC", applicants: 327,
        tags: [{ text: "業務効率", type: "genre" }, { text: "データ", type: "genre" }, { text: "実践", type: "level" }]
    },
    {
        id: "132", title: "交渉力・調整力を高める",
        desc: "利害が対立する場面での合意形成のコツ。社内外の交渉に使える実践フレームを学ぶ。",
        price: 18700, period: 2, url: "#", isNew: false,
        image: null, org: "日本ビジネス教育協会", applicants: 188,
        tags: [{ text: "コミュニケーション", type: "genre" }, { text: "実践", type: "level" }, { text: "管理職", type: "target" }]
    },
    {
        id: "133", title: "個人情報保護法・最新実務",
        desc: "改正法のポイントと、現場で求められる個人データの取扱い・安全管理措置を整理。",
        price: 15400, period: 2, url: "#", isNew: false,
        image: null, org: "リーガル教育サービス", applicants: 96,
        tags: [{ text: "法務", type: "genre" }, { text: "コンプライアンス", type: "genre" }, { text: "管理職", type: "target" }]
    },
    {
        id: "134", title: "ストレスマネジメント基礎",
        desc: "セルフケアの考え方とリラクゼーション技法で、心身のコンディションを整える習慣を。",
        price: 9900, period: 1, url: "#", isNew: false,
        image: null, org: "メンタルヘルス研究センター", applicants: 201,
        tags: [{ text: "メンタル", type: "genre" }, { text: "セルフケア", type: "genre" }, { text: "全社員", type: "target" }]
    },
    {
        id: "135", title: "クリティカルシンキング応用",
        desc: "前提を疑い、論点を見極める思考の技術。会議や提案の質を一段引き上げる応用編。",
        price: 17600, period: 3, url: "#", isNew: false,
        image: null, org: "日本ビジネス教育協会", applicants: 167,
        tags: [{ text: "思考法", type: "genre" }, { text: "専門", type: "level" }]
    },
    {
        id: "136", title: "はじめてのSNSマーケティング",
        desc: "Instagram・X・LINEを使った集客の基本。投稿設計から効果測定までを一気通貫で学ぶ。",
        price: 16500, period: 2, url: "#", isNew: true,
        image: null, org: "デジタルマーケ学院", applicants: 312,
        tags: [{ text: "マーケティング", type: "genre" }, { text: "入門", type: "level" }]
    },
    {
        id: "137", title: "財務分析で見抜く企業の実力",
        desc: "決算書を組み合わせて収益性・安全性・成長性を読み解く、一歩進んだ財務スキル。",
        price: 22000, period: 3, url: "#", isNew: false,
        image: null, org: "ファイナンス総研", applicants: 124,
        tags: [{ text: "経理", type: "genre" }, { text: "専門", type: "level" }, { text: "管理職", type: "target" }]
    },
    {
        id: "138", title: "ビジネス英会話 中級",
        desc: "会議・電話・出張で使える実践フレーズ。ロールプレイで使える英語を体に染み込ませる。",
        price: 24200, period: 4, url: "#", isNew: false,
        image: null, org: "グローバル人材研究所", applicants: 233,
        tags: [{ text: "語学", type: "genre" }, { text: "グローバル", type: "genre" }, { text: "実践", type: "level" }]
    },
    {
        id: "139", title: "DX推進リーダー養成講座",
        desc: "データとデジタルで業務を変える推進役へ。事例とフレームでDXの進め方を体系的に学ぶ。",
        price: 29700, period: 6, url: "#", isNew: true,
        image: null, org: "テックアカデミア", applicants: 158,
        tags: [{ text: "IT", type: "genre" }, { text: "マネジメント", type: "genre" }, { text: "専門", type: "level" }, { text: "管理職", type: "target" }]
    },
    {
        id: "140", title: "傾聴力・コーチング入門",
        desc: "相手の本音を引き出す聴き方と問いかけ。部下・後輩の主体性を引き出す対話の基礎。",
        price: 13200, period: 2, url: "#", isNew: false,
        image: null, org: "メンタルヘルス研究センター", applicants: 219,
        tags: [{ text: "コミュニケーション", type: "genre" }, { text: "マネジメント", type: "genre" }, { text: "基礎", type: "level" }]
    }
];

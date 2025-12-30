const courseList = [
    // --- 既存データ (ID: 101 - 110) ---
    {
        id: "101",
        title: "Excel マクロ＆VBA入門",
        desc: "業務効率化の決定版。定型業務を自動化するスキルをゼロから習得します。",
        price: 19910,
        period: 3,
        url: "course.html",
        tags: [
            { text: "資格", type: "level" },
            { text: "業務効率", type: "genre" },
            { text: "推奨", type: "other" }
        ],
        thumbnail: {
            type: "image",
            src: "../img/course_c.webp",
            alt: "Excel",
            isNew: true
        }
    },
    {
        id: "102",
        title: "生成AIで学ぶプログラミング基礎",
        desc: "ChatGPTやCopilotを活用して、コードが書けない人でもアプリ開発を体験。",
        price: 19980,
        period: 3,
        url: "#",
        tags: [
            { text: "AI", type: "genre" },
            { text: "全社員", type: "target" },
            { text: "50%補助", type: "other" }
        ],
        thumbnail: {
            type: "icon",
            bgClass: "bg-gradient-to-br from-blue-50 via-indigo-50 to-white group-hover:bg-indigo-50",
            iconName: "code",
            iconColor: "text-indigo-500"
        }
    },
    {
        id: "103",
        title: "心理的安全性100の実践",
        desc: "チームの生産性を最大化するための心理的安全性の作り方を学ぶ実践講座。",
        price: 14630,
        period: 3,
        url: "#",
        tags: [
            { text: "マネジメント", type: "genre" },
            { text: "管理職", type: "target" },
            { text: "全額補助", type: "other" }
        ],
        thumbnail: {
            type: "image",
            src: "../img/course_a.webp",
            alt: "Psychological Safety"
        }
    },
    {
        id: "104",
        title: "ITパスポート試験合格講座",
        desc: "ITの基礎知識を網羅的に学習。非エンジニア職の方にも推奨される国家資格です。",
        price: 19910,
        period: 3,
        url: "#",
        tags: [
            { text: "資格", type: "level" },
            { text: "IT", type: "genre" },
            { text: "若手", type: "target" }
        ],
        thumbnail: {
            type: "image",
            src: "../img/course_b.webp",
            alt: "IT Passport"
        }
    },
    {
        id: "105",
        title: "Z世代・新人のためのマネジメント",
        desc: "価値観の多様化に対応し、若手社員のエンゲージメントを高める手法を学びます。",
        price: 19980,
        period: 3,
        url: "#",
        tags: [
            { text: "マネジメント", type: "genre" },
            { text: "管理職", type: "target" }
        ],
        thumbnail: {
            type: "text-overlay",
            bgClass: "bg-gradient-to-tr from-rose-100 via-orange-50 to-amber-50",
            overlayText: "Z世代向け<br>マネジメント"
        }
    },
    {
        id: "106",
        title: "ビジネス・ベーシック",
        desc: "メール作成、名刺交換、会議の進め方など、社会人としての基礎を短期間で確認。",
        price: 9800,
        period: 1,
        url: "#",
        tags: [
            { text: "基礎", type: "level" },
            { text: "若手", type: "target" },
            { text: "社内推薦", type: "other" }
        ],
        thumbnail: {
            type: "text-overlay",
            bgClass: "bg-gradient-to-tr from-sky-100 via-indigo-50 to-purple-100",
            overlayText: "ビジネス<br>基礎スキル"
        }
    },
    {
        id: "107",
        title: "財務諸表の読み方・活かし方",
        desc: "貸借対照表、損益計算書の基礎を理解し、会社の数字を読み解く力を養います。",
        price: 15400,
        period: 2,
        url: "#",
        tags: [
            { text: "経理", type: "genre" },
            { text: "基礎", type: "level" }
        ],
        thumbnail: {
            type: "icon",
            bgClass: "bg-gradient-to-br from-emerald-50 via-teal-50 to-white group-hover:bg-teal-50",
            iconName: "account_balance",
            iconColor: "text-emerald-600"
        }
    },
    {
        id: "108",
        title: "Webマーケティング入門",
        desc: "SEO、SNS、広告運用の基礎知識を習得。デジタル時代に必須の集客スキルです。",
        price: 22000,
        period: 3,
        url: "#",
        tags: [
            { text: "マーケティング", type: "genre" },
            { text: "人気", type: "other" }
        ],
        thumbnail: {
            type: "icon",
            bgClass: "bg-gradient-to-br from-orange-50 via-amber-50 to-white group-hover:bg-orange-50",
            iconName: "trending_up",
            iconColor: "text-orange-500",
            isNew: true
        }
    },
    {
        id: "109",
        title: "英語メールライティング",
        desc: "依頼、お詫び、交渉など、シチュエーション別の定型表現とマナーを短時間で学習。",
        price: 8800,
        period: 1,
        url: "#",
        tags: [
            { text: "語学", type: "genre" },
            { text: "実践", type: "level" },
            { text: "グローバル", type: "genre" }
        ],
        thumbnail: {
            type: "text-overlay",
            bgClass: "bg-gradient-to-bl from-blue-100 via-cyan-50 to-slate-100",
            overlayText: "English<br>Writing"
        }
    },
    {
        id: "110",
        title: "アンガーマネジメント講座",
        desc: "怒りの感情と上手に付き合い、職場の人間関係を円滑にするテクニックを学びます。",
        price: 12100,
        period: 2,
        url: "#",
        tags: [
            { text: "コミュニケーション", type: "genre" },
            { text: "メンタル", type: "genre" },
            { text: "全社員", type: "target" }
        ],
        thumbnail: {
            type: "icon",
            bgClass: "bg-gradient-to-br from-pink-50 via-rose-50 to-white group-hover:bg-pink-50",
            iconName: "self_improvement",
            iconColor: "text-rose-400"
        }
    },

    // --- 追加データ (ID: 111 - 120) ---
    {
        id: "111",
        title: "人を動かすプレゼンテーション",
        desc: "構成力、資料作成、デリバリースキルを向上させ、相手の行動を促すプレゼン力を習得。",
        price: 16500,
        period: 2,
        url: "#",
        tags: [
            { text: "コミュニケーション", type: "genre" },
            { text: "実践", type: "level" }
        ],
        thumbnail: {
            type: "icon",
            bgClass: "bg-gradient-to-br from-amber-50 via-yellow-50 to-white group-hover:bg-yellow-50",
            iconName: "co_present",
            iconColor: "text-amber-500"
        }
    },
    {
        id: "112",
        title: "実践 Pythonデータ分析",
        desc: "ライブラリ（Pandas/Matplotlib）を使ったデータ加工・可視化の基礎をハンズオンで学習。",
        price: 24800,
        period: 4,
        url: "#",
        tags: [
            { text: "IT", type: "genre" },
            { text: "データ", type: "genre" },
            { text: "実践", type: "level" }
        ],
        thumbnail: {
            type: "icon",
            bgClass: "bg-gradient-to-br from-sky-50 via-blue-50 to-white group-hover:bg-blue-50",
            iconName: "query_stats",
            iconColor: "text-sky-600"
        }
    },
    {
        id: "113",
        title: "日商簿記3級 短期集中コース",
        desc: "商業簿記の基礎を短期間でマスター。試験合格に向けたポイント解説付き。",
        price: 13200,
        period: 2,
        url: "#",
        tags: [
            { text: "資格", type: "level" },
            { text: "経理", type: "genre" },
            { text: "入門", type: "level" }
        ],
        thumbnail: {
            type: "text-overlay",
            bgClass: "bg-gradient-to-tr from-slate-100 via-gray-100 to-zinc-200",
            overlayText: "簿記3級<br>短期合格"
        }
    },
    {
        id: "114",
        title: "情報セキュリティ・リテラシー",
        desc: "標的型攻撃メールやランサムウェアなど、最新の脅威と対策を全社員向けに解説。",
        price: 5500,
        period: 1,
        url: "#",
        tags: [
            { text: "全社員", type: "target" },
            { text: "必須", type: "other" }, 
            { text: "IT", type: "genre" }
        ],
        thumbnail: {
            type: "icon",
            bgClass: "bg-gradient-to-br from-red-50 via-rose-50 to-white group-hover:bg-rose-50",
            iconName: "lock_person",
            iconColor: "text-rose-600"
        }
    },
    {
        id: "115",
        title: "チームビルディング・ワークショップ",
        desc: "信頼関係を構築し、チームのパフォーマンスを最大化するための手法とゲームを学びます。",
        price: 18700,
        period: 3,
        url: "#",
        tags: [
            { text: "マネジメント", type: "genre" },
            { text: "組織", type: "genre" },
            { text: "管理職", type: "target" }
        ],
        thumbnail: {
            type: "icon",
            bgClass: "bg-gradient-to-br from-teal-50 via-cyan-50 to-white group-hover:bg-cyan-50",
            iconName: "diversity_3",
            iconColor: "text-teal-500",
            isNew: true
        }
    },
    {
        id: "116",
        title: "はじめての中国語会話",
        desc: "発音（ピンイン）の基礎から日常会話まで。ビジネスで使える簡単なフレーズも収録。",
        price: 11000,
        period: 3,
        url: "#",
        tags: [
            { text: "語学", type: "genre" },
            { text: "入門", type: "level" }
        ],
        thumbnail: {
            type: "text-overlay",
            bgClass: "bg-gradient-to-bl from-red-100 via-orange-50 to-yellow-50",
            overlayText: "中国語<br>入門"
        }
    },
    {
        id: "117",
        title: "ロジカルシンキング入門",
        desc: "MECE、ロジックツリーなどの思考フレームワークを使いこなし、説得力のある提案を作る。",
        price: 14300,
        period: 2,
        url: "#",
        tags: [
            { text: "思考法", type: "genre" },
            { text: "基礎", type: "level" },
            { text: "定番", type: "other" }
        ],
        thumbnail: {
            type: "icon",
            bgClass: "bg-gradient-to-br from-indigo-50 via-violet-50 to-white group-hover:bg-violet-50",
            iconName: "psychology_alt",
            iconColor: "text-indigo-600"
        }
    },
    {
        id: "118",
        title: "企業法務・コンプライアンス基礎",
        desc: "契約書のチェックポイントや下請法、個人情報保護法など、実務で必要な法律知識。",
        price: 21000,
        period: 3,
        url: "#",
        tags: [
            { text: "法務", type: "genre" },
            { text: "リスク管理", type: "genre" },
            { text: "管理職", type: "target" }
        ],
        thumbnail: {
            type: "icon",
            bgClass: "bg-gradient-to-br from-slate-50 via-gray-100 to-white group-hover:bg-gray-100",
            iconName: "gavel",
            iconColor: "text-gray-600"
        }
    },
    {
        id: "119",
        title: "レジリエンス・トレーニング",
        desc: "困難やストレスに直面しても折れない心（回復力）を育てるメンタルヘルスの新常識。",
        price: 12800,
        period: 2,
        url: "#",
        tags: [
            { text: "メンタル", type: "genre" },
            { text: "セルフケア", type: "genre" }
        ],
        thumbnail: {
            type: "icon",
            bgClass: "bg-gradient-to-br from-lime-50 via-green-50 to-white group-hover:bg-green-50",
            iconName: "spa",
            iconColor: "text-lime-600"
        }
    },
    {
        id: "120",
        title: "プロジェクトマネジメント基礎(PMBOK)",
        desc: "PMBOKガイドに基づくプロジェクト管理の標準知識。スケジュール、コスト、品質管理の要点。",
        price: 27500,
        period: 4,
        url: "#",
        tags: [
            { text: "マネジメント", type: "genre" },
            { text: "専門", type: "level" },
            { text: "資格", type: "level" }
        ],
        thumbnail: {
            type: "text-overlay",
            bgClass: "bg-gradient-to-tr from-cyan-100 via-sky-50 to-blue-100",
            overlayText: "PMBOK<br>基礎講座"
        }
    }
];
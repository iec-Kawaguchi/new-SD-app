/**
 * 募集一覧のモックデータ
 */
export const planData = [
    {
        id: 1,
        title: "FY26 SD募集",
        company: "●●食品株式会社",
        period: "2026/04/01 - 2027/03/31",
        statusLabel: "基本情報入力",
        theme: "blue", // blue, gray, lime, fuchsia
        visibleFor: ["iec", "supplier", "customer"],
        isActive: true
    },
    {
        id: 2,
        title: "FY25 SD募集",
        company: "●●食品株式会社",
        period: "2025/04/01 - 2026/03/31",
        statusLabel: "募集終了",
        theme: "gray",
        visibleFor: ["iec", "supplier", "customer"],
        isActive: false
    },
    {
        id: 3,
        title: "FY26 SD募集",
        company: "▲▲工業株式会社",
        period: "2026/04/01 - 2026/05/15",
        statusLabel: "コース提案",
        theme: "lime",
        visibleFor: ["iec", "supplier"],
        isActive: false
    },
    {
        id: 4,
        title: "FY26 SD募集",
        company: "株式会社■■サービス",
        period: "2026/04/01 - 2026/05/15",
        statusLabel: "サイト作成",
        theme: "fuchsia",
        visibleFor: ["iec"],
        isActive: false
    },
    {
        id: 5,
        title: "FY26 SD募集",
        company: "セカンドリテーリング株式会社",
        period: "2026/04/01 - 2026/05/15",
        statusLabel: "募集中",
        theme: "blueSolid",
        visibleFor: ["iec"],
        isActive: false
    },
    {
        id: 6,
        title: "FY26 SD募集",
        company: "東京都新宿区",
        period: "2026/04/01 - 2026/05/15",
        statusLabel: "募集終了",
        theme: "gray",
        visibleFor: ["iec"],
        isActive: false
    }
];
/**
 * 募集一覧のモックデータ
 * statusLabelを「公開」「非公開」の2種に統一
 */
export const planData = [
    {
        id: 1,
        title: "FY26 SD募集",
        company: "●●食品株式会社",
        period: "2026/04/01 - 2027/03/31",
        statusLabel: "公開", // 処理中なので公開扱い
        theme: "blue",
        visibleFor: ["iec", "supplier", "customer"],
        isActive: true,
        progress: {
            basic: "処理中",
            course: "未着手",
            site: "未着手"
        }
    },
    {
        id: 2,
        title: "FY25 SD募集",
        company: "●●食品株式会社",
        period: "2025/04/01 - 2026/03/31",
        statusLabel: "非公開", // 終了済み
        theme: "gray",
        visibleFor: ["iec", "supplier", "customer"],
        isActive: false,
        progress: {
            basic: "完了",
            course: "完了",
            site: "完了"
        }
    },
    {
        id: 3,
        title: "FY26 SD募集",
        company: "▲▲工業株式会社",
        period: "2026/04/01 - 2026/05/15",
        statusLabel: "公開", // 提案中なので公開
        theme: "blue",
        visibleFor: ["iec", "supplier"],
        isActive: true,
        progress: {
            basic: "完了",
            course: "提案中",
            site: "未着手"
        }
    },
    {
        id: 4,
        title: "FY26 SD募集",
        company: "株式会社■■サービス",
        period: "2026/04/01 - 2026/05/15",
        statusLabel: "公開", // サイト作成中なので公開
        theme: "blue",
        visibleFor: ["iec"],
        isActive: true,
        progress: {
            basic: "完了",
            course: "完了",
            site: "顧客承認中"
        }
    },
    {
        id: 5,
        title: "FY26 SD募集",
        company: "セカンドリテーリング株式会社",
        period: "2026/04/01 - 2026/05/15",
        statusLabel: "公開", // 募集中
        theme: "blue",
        visibleFor: ["iec"],
        isActive: true,
        progress: {
            basic: "完了",
            course: "料金確認中",
            site: "完了"
        }
    },
    {
        id: 6,
        title: "FY26 SD募集",
        company: "東京都新宿区",
        period: "2026/04/01 - 2026/05/15",
        statusLabel: "非公開", // 終了済み
        theme: "gray",
        visibleFor: ["iec"],
        isActive: false,
        progress: {
            basic: "完了",
            course: "完了",
            site: "完了"
        }
    }
];
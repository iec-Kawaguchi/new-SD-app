// js/header.js

document.addEventListener("DOMContentLoaded", () => {
    const target = document.getElementById("global-header");
    if (!target) return;

    // 現在のパスを取得（ナビゲーションのactive表示用など将来的な拡張のため）
    const path = window.location.pathname;

    // 1. ヘッダーとモーダルのHTML定義
    // ※画像のパス階層などを考慮し、ルート相対パス(/img/...)か、現在地からの相対を調整してください。
    // ここではHTMLファイルと同じ階層にimgフォルダがある前提(../img/)か、構成に合わせて調整が必要です。
    // 今回は全HTMLが同じ階層にある前提で記述します。

    const html = `
    <header class="sticky top-0 z-40 border-b border-gray-200/70 bg-white/85 backdrop-blur">
        <div class="max-w-6xl mx-auto h-14 flex items-center px-4 sm:px-6">
            <a href="top.html" class="font-bold text-lg tracking-tight text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-sky-600 text-[22px]">school</span>
                Course Catalog
            </a>
            <nav class="ml-auto flex items-center gap-1.5 sm:gap-2">
                <button id="btn-notice" class="relative p-2 rounded-full hover:bg-gray-100 active:scale-95 transition" aria-label="Notifications">
                    <span class="material-symbols-outlined align-middle text-[22px]">notifications</span>
                    <span class="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                </button>

                <a href="cart.html" class="relative p-2 rounded-full hover:bg-gray-100 active:scale-95 transition" aria-label="Cart">
                    <span class="material-symbols-outlined align-middle text-[22px]">shopping_cart</span>
                    <span id="header-cart-badge" class="absolute -top-1 -right-1 text-[10px] h-4 w-4 grid place-items-center rounded-full bg-rose-500 text-white">1</span>
                </a>

                <button class="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition" aria-label="Profile">
                    <span class="material-symbols-outlined align-middle text-[22px]">account_circle</span>
                </button>
            </nav>
        </div>
    </header>

    <div id="notice-dialog" class="fixed inset-0 z-50 hidden" role="dialog" aria-modal="true" aria-labelledby="notice-title">
        <div id="notice-backdrop" class="absolute inset-0 bg-black/30 backdrop-blur-sm opacity-0 transition-opacity duration-200"></div>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center md:items-start md:justify-end md:p-4 md:mt-14">
            <div id="notice-panel" class="pointer-events-auto relative w-full max-w-sm rounded-2xl bg-white shadow-2xl opacity-0 translate-y-4 transition-all duration-200 mx-4 md:mx-0">
                <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-sky-600">notifications_active</span>
                        <h2 id="notice-title" class="font-bold text-gray-800 text-base">お知らせ</h2>
                    </div>
                    <button id="notice-close" class="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <div class="max-h-[60vh] overflow-y-auto p-0">
                    <div class="p-5 hover:bg-slate-50 transition border-b border-gray-100 last:border-0">
                        <div class="flex justify-between items-start gap-3 mb-1">
                            <h3 class="text-sm font-bold text-slate-800 leading-snug">募集要項を更新しました</h3>
                            <span class="shrink-0 inline-flex items-center rounded-full bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 font-bold">重要</span>
                        </div>
                        <time class="block text-[10px] text-slate-400 font-medium mb-2">2025/12/01</time>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            お申し込み前に必ずご確認ください。申込条件・補助率・対象コースが変更されています。
                        </p>
                    </div>
                     <div class="p-5 hover:bg-slate-50 transition border-b border-gray-100 last:border-0">
                        <div class="flex justify-between items-start gap-3 mb-1">
                            <h3 class="text-sm font-bold text-slate-800 leading-snug">システムメンテナンスのお知らせ</h3>
                        </div>
                        <time class="block text-[10px] text-slate-400 font-medium mb-2">2025/11/20</time>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            12月15日 AM2:00〜AM5:00の間、サーバーメンテナンスのためサービスが一時的に利用できなくなります。
                        </p>
                    </div>
                </div>
                <div class="p-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl text-center">
                    <a href="#" class="text-xs font-semibold text-sky-600 hover:underline">すべてのお知らせを見る</a>
                </div>
            </div>
        </div>
    </div>
    `;

    // 2. HTMLの注入
    target.innerHTML = html;

    // 3. お知らせモーダルのロジック適用
    initNoticeModal();
});

function initNoticeModal() {
    const dialog = document.getElementById('notice-dialog');
    const backdrop = document.getElementById('notice-backdrop');
    const panel = document.getElementById('notice-panel');
    const btnOpen = document.getElementById('btn-notice');
    const btnClose = document.getElementById('notice-close');

    if (!btnOpen || !dialog) return;

    function openNotice() {
        dialog.classList.remove('hidden');
        requestAnimationFrame(() => {
            backdrop.style.opacity = '1';
            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        });
    }
    function closeNotice() {
        backdrop.style.opacity = '0';
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(1rem)';
        setTimeout(() => dialog.classList.add('hidden'), 200);
    }

    btnOpen.addEventListener('click', openNotice);
    btnClose.addEventListener('click', closeNotice);
    backdrop.addEventListener('click', closeNotice);
}
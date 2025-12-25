// js/header.js

document.addEventListener("DOMContentLoaded", () => {
    const target = document.getElementById("global-header");
    if (!target) return;

    // --- 1. Header HTML Definition ---
    const html = `
    <header class="sticky top-0 z-40 border-b border-gray-200/70 bg-white/85 backdrop-blur">
        <div class="max-w-6xl mx-auto h-14 flex items-center px-4 sm:px-6">
            <a href="top.html" class="font-bold text-lg tracking-tight text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-sky-600 text-[22px]">school</span>
                Course Catalog
            </a>
            <nav class="ml-auto flex items-center gap-1.5 sm:gap-2">
                
                <button id="btn-fav-list" class="relative p-2 rounded-full hover:bg-gray-100 active:scale-95 transition" aria-label="Favorites">
                    <span class="material-symbols-outlined align-middle text-[22px] text-gray-600">favorite_border</span>
                    <span id="header-fav-badge" class="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white hidden"></span>
                </button>

                <button id="btn-notice" class="relative p-2 rounded-full hover:bg-gray-100 active:scale-95 transition" aria-label="Notifications">
                    <span class="material-symbols-outlined align-middle text-[22px] text-gray-600">notifications</span>
                    <span class="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                </button>

                <a href="cart.html" class="relative p-2 rounded-full hover:bg-gray-100 active:scale-95 transition" aria-label="Cart">
                    <span class="material-symbols-outlined align-middle text-[22px] text-gray-600">shopping_cart</span>
                    <span class="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>

                </a>
                <button class="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition" aria-label="Profile">
                    <span class="material-symbols-outlined align-middle text-[22px] text-gray-600">account_circle</span>
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
                </div>
                <div class="p-3 bg-gray-50/50 rounded-b-2xl text-center">
                </div>
            </div>
        </div>
    </div>

    <div id="fav-dialog" class="fixed inset-0 z-50 hidden" role="dialog" aria-modal="true" aria-labelledby="fav-title">
        <div id="fav-backdrop" class="absolute inset-0 bg-black/30 backdrop-blur-sm opacity-0 transition-opacity duration-200"></div>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center md:items-start md:justify-end md:p-4 md:mt-14">
            <div id="fav-panel" class="pointer-events-auto relative w-full max-w-sm rounded-2xl bg-white shadow-2xl opacity-0 translate-y-4 transition-all duration-200 mx-4 md:mx-0">
                <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-rose-500">favorite</span>
                        <h2 id="fav-title" class="font-bold text-gray-800 text-base">保存したコース</h2>
                    </div>
                    <button id="fav-close" class="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                
                <div id="fav-empty" class="hidden flex-col items-center justify-center py-10 text-gray-400 text-sm">
                    <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">bookmark_border</span>
                    <p>保存したコースはありません</p>
                </div>

                <div id="fav-list-container" class="max-h-[60vh] overflow-y-auto p-0">
                    </div>

                <div class="p-3 bg-gray-50/50 rounded-b-2xl text-center">
                </div>
            </div>
        </div>
    </div>
    `;

    target.innerHTML = html;

    // --- Initialize Logics ---
    initNoticeModal();
    initFavoritesLogic();
});

// --- Notice Modal Logic ---
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

// --- Favorites Logic (Main) ---
function initFavoritesLogic() {
    // 1. Elements
    const dialog = document.getElementById('fav-dialog');
    const backdrop = document.getElementById('fav-backdrop');
    const panel = document.getElementById('fav-panel');
    const btnOpen = document.getElementById('btn-fav-list');
    const btnClose = document.getElementById('fav-close');
    const listContainer = document.getElementById('fav-list-container');
    const emptyState = document.getElementById('fav-empty');
    const badge = document.getElementById('header-fav-badge');

    // 2. Data Persistence
    const getFavs = () => JSON.parse(localStorage.getItem('my_favorites') || '[]');
    const saveFavs = (arr) => localStorage.setItem('my_favorites', JSON.stringify(arr));

    // 3. Update Badge in Header
    const updateBadge = () => {
        const favs = getFavs();
        if (favs.length > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    };
    updateBadge();

    // 4. Render List in Modal
    function renderFavList() {
        const favs = getFavs();
        listContainer.innerHTML = '';
        
        if (favs.length === 0) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
            return;
        }
        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');

        favs.forEach(item => {
            const div = document.createElement('div');
            div.className = "flex items-center gap-3 p-4 border-b border-gray-100 last:border-0 hover:bg-slate-50 transition relative group";
            div.innerHTML = `
                <div class="h-12 w-12 shrink-0 rounded-lg bg-gray-200 overflow-hidden">
                    ${item.img ? `<img src="${item.img}" class="h-full w-full object-cover" />` : ''}
                </div>
                <div class="flex-1 min-w-0 pr-8">
                    <a href="${item.link}" class="block text-sm font-bold text-gray-800 truncate hover:text-sky-600 transition">${item.title}</a>
                    <p class="text-xs text-gray-500 mt-0.5">保存日: ${new Date(item.date).toLocaleDateString()}</p>
                </div>
                <button class="btn-remove-fav absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-rose-500 rounded-full" data-id="${item.id}" title="削除">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                </button>
            `;
            listContainer.appendChild(div);
        });

        // Bind remove buttons inside modal
        listContainer.querySelectorAll('.btn-remove-fav').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                let current = getFavs();
                current = current.filter(i => i.id !== id);
                saveFavs(current);
                renderFavList();
                updateBadge();
                updateCardButtons(); // Sync visual state on page
            });
        });
    }

    // Modal UI Control
    function openFav() {
        renderFavList();
        dialog.classList.remove('hidden');
        requestAnimationFrame(() => {
            backdrop.style.opacity = '1';
            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        });
    }
    function closeFav() {
        backdrop.style.opacity = '0';
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(1rem)';
        setTimeout(() => dialog.classList.add('hidden'), 200);
    }
    btnOpen?.addEventListener('click', openFav);
    btnClose?.addEventListener('click', closeFav);
    backdrop?.addEventListener('click', closeFav);

    // 5. Global Click Listener for Favorite Buttons (Fix for Link Transition)
    document.addEventListener('click', (e) => {
        // カード上のハートボタン（クラス: btn-fav）をクリックしたか判定
        const btn = e.target.closest('.btn-fav');
        
        // ボタン以外なら無視
        if (!btn) return;

        // ★★★ ここが重要：リンク遷移(aタグ)をキャンセル ★★★
        e.preventDefault();
        e.stopPropagation();

        // データを取得
        const id = btn.dataset.id;
        const title = btn.dataset.title;
        const img = btn.dataset.img;
        const link = btn.dataset.link || '#';

        // 現在の保存状況を確認
        let current = getFavs();
        const exists = current.find(i => i.id === id);

        if (exists) {
            // 削除
            current = current.filter(i => i.id !== id);
            toggleBtnVisual(btn, false);
        } else {
            // 追加
            current.unshift({ id, title, img, link, date: Date.now() });
            toggleBtnVisual(btn, true);
        }

        saveFavs(current);
        updateBadge();
    }, true); // Use capture phase to ensure we catch it before anchor tag

    // Helper: Visual Toggle (Animation & Color)
    function toggleBtnVisual(btn, active) {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (active) {
            // クラスをつけると top.html の CSSアニメーションが発火
            btn.classList.add('heart-active');
        } else {
            btn.classList.remove('heart-active');
        }
    }

    // Helper: Sync all buttons on page load
    function updateCardButtons() {
        const btns = document.querySelectorAll('.btn-fav');
        const favs = getFavs();
        
        btns.forEach(btn => {
            const id = btn.dataset.id;
            const isFav = favs.some(i => i.id === id);
            toggleBtnVisual(btn, isFav);
        });
    }

    // Init check
    updateCardButtons();
}
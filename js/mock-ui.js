// mock-ui.js — reusable Header & Sidebar (Fixed & Robust Version)
// 依存: TailwindCSS, role-visibility.js (RoleMock)

(function (global) {
    const STYLES = {
        base: "flex items-center w-full py-2 px-3 rounded-md transition-all duration-200 group cursor-pointer",
        active: "bg-blue-50 text-blue-700 font-semibold shadow-sm",
        inactive: "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
        icon: "material-symbols-outlined nav-icon text-[1.25rem] mr-3 transition-colors",
    };

    const headerTpl = (opts = {}) => {
        const userName = opts.userName || "Test User";
        const brand = opts.brand || "New SD App";
        return `
        <header class="bg-white w-full h-16 border-b border-gray-200 sticky top-0 z-50">
            <div class="flex items-center h-full justify-between px-3">
                <div class="flex items-center gap-3">
                    <button id="sidebar-toggle" class="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors hidden lg:flex items-center" title="メニューを折りたたむ">
                        <span class="material-symbols-outlined" style="font-size:1.375rem">menu_open</span>
                    </button>
                    <div class="text-xl text-blue-800 font-bold tracking-tight">${brand}</div>
                </div>
                <div class="ml-auto flex items-center gap-4">
                    <div class="relative">
                        <select id="role-select" class="appearance-none pl-3 pr-8 py-1.5 rounded-md border border-gray-300 bg-gray-50 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer">
                            <option value="iec">IEC (管理者)</option>
                            <option value="supplier">他団体</option>
                            <option value="customer">顧客</option>
                        </select>
                        <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">expand_more</span>
                    </div>
                    <div class="h-6 w-px bg-gray-200 mx-1"></div>
                    <div class="flex items-center gap-3">
                        <div class="text-sm font-medium text-gray-700">${userName}</div>
                        <button class="flex p-1.5 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"><span class="material-symbols-outlined">settings</span></button>
                        <button class="flex p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors"><span class="material-symbols-outlined">logout</span></button>
                    </div>
                </div>
            </div>
        </header>`;
    };

    const sidebarTpl = () => `
        <aside id="app-sidebar-el" class="w-56 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-4rem)] overflow-hidden sticky top-16 hidden lg:flex transition-[width] duration-200">
            <nav class="flex-1 px-3 py-6 space-y-6 overflow-y-auto">

                <div>
                    <h2 id="menu-1" class="sidebar-section-head px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer flex items-center justify-between hover:text-gray-600 transition-colors group/head">
                        募集メニュー
                        <span id="menu-1-arrow" class="material-symbols-outlined text-[1rem] group-hover/head:text-gray-600 transition-transform">keyboard_arrow_up</span>
                    </h2>
                    <div id="menu-items-1" class="space-y-1">
                        <a href="media-plan-list.html" data-visible-for="iec, supplier, customer" class="js-nav-item" title="募集一覧">
                            <span class="${STYLES.icon}">dashboard</span>
                            <span class="text-sm sidebar-text">募集一覧</span>
                        </a>
                        <a href="applications-download.html" data-visible-for="iec, supplier, customer" class="js-nav-item" title="申込データDL">
                            <span class="${STYLES.icon}">download</span>
                            <span class="text-sm sidebar-text">申込データDL</span>
                        </a>
                    </div>
                </div>

                <div>
                    <h2 id="menu-2" class="sidebar-section-head px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer flex items-center justify-between hover:text-gray-600 transition-colors group/head">
                        システム設定
                        <span id="menu-2-arrow" class="material-symbols-outlined text-[1rem] group-hover/head:text-gray-600 transition-transform">keyboard_arrow_up</span>
                    </h2>
                    <div id="menu-items-2" class="space-y-1">
                        <a href="company-master.html" data-visible-for="iec, customer" class="js-nav-item" title="企業管理">
                            <span class="${STYLES.icon}">apartment</span>
                            <span class="text-sm sidebar-text">企業管理</span>
                        </a>
                        <a href="user-master.html" data-visible-for="iec, supplier, customer" class="js-nav-item" title="ユーザー管理">
                            <span class="${STYLES.icon}">person</span>
                            <span class="text-sm sidebar-text">ユーザー管理</span>
                        </a>
                        <a href="course-master.html" data-visible-for="iec, supplier" class="js-nav-item" title="コース管理">
                            <span class="${STYLES.icon}">book_2</span>
                            <span class="text-sm sidebar-text">コース管理</span>
                        </a>
                        <a href="topics-master.html" data-visible-for="iec, customer" class="js-nav-item" title="特集ページ管理">
                            <span class="${STYLES.icon}">view_agenda</span>
                            <span class="text-sm sidebar-text">特集ページ管理</span>
                        </a>
                        <a href="org-master.html" data-visible-for="iec, customer" class="js-nav-item" title="組織階層管理">
                            <span class="${STYLES.icon}">account_tree</span>
                            <span class="text-sm sidebar-text">組織階層管理</span>
                        </a>
                        <a href="application-instructions-master.html" data-visible-for="iec, customer" class="js-nav-item" title="申込指示管理">
                            <span class="${STYLES.icon}">order_approve</span>
                            <span class="text-sm sidebar-text">申込指示管理</span>
                        </a>
                        <a href="standard-tag-master.html" data-visible-for="iec, supplier, customer" class="js-nav-item" title="標準タグ管理">
                            <span class="${STYLES.icon}">sell</span>
                            <span class="text-sm sidebar-text">標準タグ管理</span>
                        </a>
                        <a href="tag-master.html" data-visible-for="iec, customer" class="js-nav-item" title="カスタムタグ管理">
                            <span class="${STYLES.icon}">tag</span>
                            <span class="text-sm sidebar-text">カスタムタグ管理</span>
                        </a>
                    </div>
                </div>

            </nav>
            <div class="p-4 border-t border-gray-100 sidebar-section-head shrink-0">
                <div class="text-xs text-gray-400 text-center">v1.0.1 Fixed</div>
            </div>
        </aside>`;

    function highlightActiveByHref(sidebarRoot) {
        const currentPath = new URL(location.href).pathname;
        const links = sidebarRoot.querySelectorAll('a.js-nav-item');
        links.forEach(a => {
            const rawHref = a.getAttribute('href');
            if (!rawHref || rawHref === '#') return;
            const targetPath = new URL(rawHref, location.href).pathname;
            const isActive = (targetPath === currentPath);
            a.className = `js-nav-item ${STYLES.base} ${isActive ? STYLES.active : STYLES.inactive}`;
        });
    }

    function wireSideMenuToggles(root) {
        const toggleMenu = (triggerId, itemsId, arrowId) => {
            const trigger = root.querySelector(triggerId);
            const items = root.querySelector(itemsId);
            const arrow = root.querySelector(arrowId);
            if (trigger && items && arrow) {
                trigger.addEventListener('click', () => {
                    const isHidden = items.classList.toggle('hidden');
                    arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                });
            }
        };
        toggleMenu('#menu-1', '#menu-items-1', '#menu-1-arrow');
        toggleMenu('#menu-2', '#menu-items-2', '#menu-2-arrow');
    }

    function wireSidebarToggle(sidebarRoot) {
        const sidebar = sidebarRoot.querySelector('#app-sidebar-el');
        // トグルボタンはヘッダー内にあるためdocument全体から取得
        const toggleBtn = document.querySelector('#sidebar-toggle');
        if (!sidebar || !toggleBtn) return;

        const toggleIcon = toggleBtn.querySelector('.material-symbols-outlined');
        const nav = sidebarRoot.querySelector('nav');

        function collapse() {
            sidebar.dataset.collapsed = 'true';
            sidebar.classList.replace('w-56', 'w-14');
            if (toggleIcon) toggleIcon.textContent = 'menu';
            toggleBtn.title = 'メニューを展開する';
            // navのpaddingを除去してアイコンをサイドバー幅に対して正確に中央揃え
            if (nav) { nav.classList.remove('px-3'); nav.classList.add('px-2'); }
            sidebarRoot.querySelectorAll('.sidebar-text').forEach(el => el.classList.add('hidden'));
            sidebarRoot.querySelectorAll('.sidebar-section-head').forEach(el => el.classList.add('hidden'));
            sidebarRoot.querySelectorAll('.js-nav-item').forEach(el => {
                el.classList.add('justify-center');
                el.classList.remove('px-3');
            });
            sidebarRoot.querySelectorAll('.nav-icon').forEach(el => el.classList.remove('mr-3'));
        }

        function expand() {
            sidebar.dataset.collapsed = 'false';
            sidebar.classList.replace('w-14', 'w-56');
            if (toggleIcon) toggleIcon.textContent = 'menu_open';
            toggleBtn.title = 'メニューを折りたたむ';
            if (nav) { nav.classList.remove('px-0'); nav.classList.add('px-3'); }
            sidebarRoot.querySelectorAll('.sidebar-text').forEach(el => el.classList.remove('hidden'));
            sidebarRoot.querySelectorAll('.sidebar-section-head').forEach(el => el.classList.remove('hidden'));
            sidebarRoot.querySelectorAll('.js-nav-item').forEach(el => {
                el.classList.remove('justify-center');
                el.classList.add('px-3');
            });
            sidebarRoot.querySelectorAll('.nav-icon').forEach(el => el.classList.add('mr-3'));
        }

        toggleBtn.addEventListener('click', () => {
            if (sidebar.dataset.collapsed === 'true') expand(); else collapse();
        });
    }

    function injectHeader(targetSelector, opts = {}) {
        const mount = document.querySelector(targetSelector);
        if (!mount) return;
        mount.innerHTML = headerTpl(opts);
        if (global.RoleMock) {
            if (!new URLSearchParams(location.search).get('role')) RoleMock.setRoleInUrl(opts.initialRole || 'iec');
            RoleMock.init({ roleSelect: '#role-select' });
            const sel = mount.querySelector('#role-select');
            if (sel) sel.value = RoleMock.getRole();
        }
    }

    function injectSidebar(targetSelector) {
        const mount = document.querySelector(targetSelector);
        if (!mount) return;
        mount.innerHTML = sidebarTpl();
        wireSideMenuToggles(mount);
        wireSidebarToggle(mount);
        if (global.RoleMock) RoleMock.applyRoleVisibility();
        highlightActiveByHref(mount);
    }

    global.MockUI = { injectHeader, injectSidebar };
})(window);

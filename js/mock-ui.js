// mock-ui.js — reusable Header & Sidebar (no framework)
// 依存: TailwindCSS（任意）, role-visibility.js（RoleMock）
// 目的: モック用途でヘッダー/メニューを複数ページに簡単再利用


(function (global) {
    const headerTpl = (opts = {}) => {
        const userName = opts.userName || "Test User";
        const brand = opts.brand || "New SD App";
        return `
        <header class="bg-blue-800 w-full h-[3rem]">
        <div class="flex items-center h-full justify-between px-6">
            <div class="text-xl text-gray-50 font-bold">${brand}</div>
            <div class="ml-auto flex items-center gap-2 mr-2">
            <select id="role-select" class="px-2 py-1 rounded border-gray-300 bg-blue-800 hover:bg-blue-600 text-white border-white">
                <option value="iec">IEC</option>
                <option value="supplier">他団体</option>
                <option value="customer">顧客</option>
            </select>
            </div>
            <div class="text-white flex gap-4 items-center">
            <div class="mr-4">${userName}</div>
            <span class="material-symbols-outlined text-white">settings</span>
            <span class="material-symbols-outlined text-white">logout</span>
            </div>
        </div>
        </header>`;
    };

    const sidebarTpl = () => `
        <aside class="min-w-60 bg-gray-100">
        <h2 id="menu-1" class="p-3 pt-4 font-bold text-gray-700 cursor-pointer flex items-center justify-between">
            募集
            <span id="menu-1-arrow" class="material-symbols-outlined text-[1.2rem]">keyboard_arrow_up</span>
        </h2>
        <ul id="menu-items-1" class="cursor-pointer">
            <a href="media-plan-list.html" data-visible-for="iec, supplier, customer">
            <li class="flex items-center ml-3 py-2 px-4 text-gray-700 border-l-2 border-gray-300 hover:border-gray-500 hover:font-bold">   
                <span class="material-symbols-outlined text-[1.2rem] mr-1">dashboard</span>
                募集一覧
            </li>
            </a>
           
        </ul>
        <h2 id="menu-2" class="p-3 pt-4 font-bold text-gray-700 cursor-pointer flex items-center justify-between">
            マスタ管理
            <span id="menu-2-arrow" class="material-symbols-outlined text-[1.2rem]">keyboard_arrow_up</span>
        </h2>
        <ul id="menu-items-2" class="cursor-pointer">
            <a href="user-master.html" data-visible-for="iec, supplier, customer">
            <li class="flex items-center ml-3 py-2 px-4 text-gray-700 border-l-2 border-gray-300 hover:border-gray-500 hover:font-bold">   
                <span class="material-symbols-outlined text-[1.2rem] mr-1">person</span>
                ユーザー
            </li>
            </a>
            <a href="org-master.html" data-visible-for="iec, customer">
            <li class="flex items-center ml-3 py-2 px-4 text-gray-700 border-l-2 border-gray-300 hover:border-gray-500 hover:font-bold">   
                <span class="material-symbols-outlined text-[1.2rem] mr-1">apartment</span>
                組織
            </li>
            </a>
            <a href="topics-master-list.html" data-visible-for="iec">
            <li class="flex items-center ml-3 py-2 px-4 text-gray-700 border-l-2 border-gray-300 hover:border-gray-500 hover:font-bold">
                <span class="material-symbols-outlined text-[1.2rem] mr-1">view_agenda</span>
                特集ページ
            </li>
            </a>
            <a href="tag-master.html" data-visible-for="iec, customer">
            <li class="flex items-center ml-3 py-2 px-4 text-gray-700 border-l-2 border-gray-300 hover:border-gray-500 hover:font-bold">   
                <span class="material-symbols-outlined text-[1.2rem] mr-1">tag</span>
                タグ
            </li>
            </a>
            <a href="course-master-list.html" data-visible-for="iec, supplier">
            <li class="flex items-center ml-3 py-2 px-4 text-gray-700 border-l-2 border-gray-300 hover:border-gray-500 hover:font-bold">   
                <span class="material-symbols-outlined text-[1.2rem] mr-1">book_2</span>
                コース
            </li>
            </a>
        </ul>
        </aside>`;

    function highlightActiveByHref(sidebarRoot = document) {
    const here = new URL(location.href);

    sidebarRoot.querySelectorAll('a[href] li').forEach(li => {
        const a = li.closest('a');
        if (!a) return;

        const u = new URL(a.getAttribute('href'), location.href);
        const isActive =
        u.pathname === here.pathname &&
        (u.hash === '' || u.hash === here.hash);

        // 強調スタイル付与
        li.classList.toggle('font-bold', isActive);
        li.classList.toggle('border-gray-500', isActive);

        // 非アクティブ時リセット（意図的に落ち着いた色に）
        if (!isActive) {
            li.classList.remove(
                'font-bold',
                'border-gray-500'
            );
        li.classList.add('border-gray-300');
        }
    });
    }


    function wireSideMenuToggles(root) {
        const m1 = root.querySelector('#menu-1');
        const m2 = root.querySelector('#menu-2');
        const items1 = root.querySelector('#menu-items-1');
        const items2 = root.querySelector('#menu-items-2');
        const arrow1 = root.querySelector('#menu-1-arrow');
        const arrow2 = root.querySelector('#menu-2-arrow');
    
        if (m1 && items1 && arrow1) {
            m1.addEventListener('click', () => {
                items1.classList.toggle('hidden');
                arrow1.textContent = items1.classList.contains('hidden') ? 'keyboard_arrow_down' : 'keyboard_arrow_up';
            });
        }
    
        if (m2 && items2 && arrow2) {
            m2.addEventListener('click', () => {
                items2.classList.toggle('hidden');
                arrow2.textContent = items2.classList.contains('hidden') ? 'keyboard_arrow_down' : 'keyboard_arrow_up';
            });
        }
    }

    function ensureInitialRole(role) {
        if (!global.RoleMock) return;
        const qs = new URLSearchParams(location.search);
        if (!qs.get('role')) RoleMock.setRoleInUrl(role || 'iec');
    }

    function injectHeader(targetSelector, opts = {}) {
        const mount = document.querySelector(targetSelector);
        if (!mount) return console.warn('[mock-ui] header mount not found:', targetSelector);
        mount.innerHTML = headerTpl(opts);
        // Role select sync & visibility apply
        
        if (global.RoleMock) {
            ensureInitialRole(opts.initialRole || 'iec');
            RoleMock.init({ roleSelect: '#role-select' });
            const sel = mount.querySelector('#role-select');
            if (sel) sel.value = RoleMock.getRole();
        }
    }

    function injectSidebar(targetSelector) {
        const mount = document.querySelector(targetSelector);
        if (!mount) return console.warn('[mock-ui] sidebar mount not found:', targetSelector);
        mount.innerHTML = sidebarTpl();
        wireSideMenuToggles(mount);
        // apply role-based visibility after insertion
        if (global.RoleMock) RoleMock.applyRoleVisibility();
        highlightActiveByHref(mount); 
    }

    global.MockUI = { injectHeader, injectSidebar };
})(window);

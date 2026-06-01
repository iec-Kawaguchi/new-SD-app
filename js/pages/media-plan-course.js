// media-plan-course.js

import { selectedCourseData } from '../data/selected-course-data.js';
import { courseMasterData } from '../data/course-master-data.js';
import { tagData } from '../data/tag-data.js';

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    const initialRole = params.get('role') || 'iec';

    if (window.MockUI) {
        MockUI.injectHeader('#app-header', { userName: 'Test User', brand: 'New SD App', initialRole });
        MockUI.injectSidebar('#app-sidebar');
    }
    if (window.RoleMock) RoleMock.applyRoleVisibility();

    // =========================================================
    // グリッド定義
    // =========================================================
    const isSupplier = initialRole === 'supplier';
    const isCustomer = initialRole === 'customer';

    function applyGridClass(el) {
        el.classList.remove('list-grid', 'no-std-tag', 'supplier-grid');
        el.classList.add('list-grid');
        if (isSupplier) el.classList.add('supplier-grid');
        if (noStdTag) el.classList.add('no-std-tag');
    }

    // =========================================================
    // DOM参照
    // =========================================================
    const rowsEl = document.getElementById('rows');
    const skeletonEl = document.getElementById('skeleton');
    const listEl = document.getElementById('list');
    const selectAllCheckbox = document.getElementById('selectAll');
    const listHeader = document.getElementById('list-header');

    // =========================================================
    // 状態管理
    // =========================================================
    let allData = [];
    const CHUNK = 20;
    let loaded = 0;
    const commentMap = new Map();

    // フィルター状態
    const filterState = {
        status: new Set(),      // 'new' | 'deleteRequested'
        stdTags: new Set(),
        customTags: new Set(),
        orgs: new Set(),
    };
    let keyword = '';
    let noStdTag = false;

    // 現在スライドパネルで開いているrow ID
    let openPanelRowId = null;

    // =========================================================
    // 未保存状態管理（完全遅延保存モデル）
    // =========================================================
    let isDirty = false;

    function markDirty() {
        if (isDirty) return;
        isDirty = true;
        // 「変更を保存する」ボタンを強調（塗りつぶしスタイルへ変化）
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.classList.remove('bg-white', 'border-blue-300', 'text-blue-600', 'hover:bg-blue-50');
            saveBtn.classList.add('bg-blue-600', 'border-blue-600', 'text-white', 'hover:bg-blue-700', 'shadow-sm');
        }
        // 未保存インジケーター表示（<span>のためinline-flex）
        const indicator = document.getElementById('unsaved-indicator');
        indicator?.classList.remove('hidden');
        indicator?.classList.add('inline-flex');
    }

    function clearDirty() {
        isDirty = false;
        // ボタンを通常スタイルに戻す
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.classList.add('bg-white', 'border-blue-300', 'text-blue-600', 'hover:bg-blue-50');
            saveBtn.classList.remove('bg-blue-600', 'border-blue-600', 'text-white', 'hover:bg-blue-700', 'shadow-sm');
        }
        // インジケーター非表示
        const indicator = document.getElementById('unsaved-indicator');
        indicator?.classList.add('hidden');
        indicator?.classList.remove('inline-flex');
    }

    // ページ離脱時の保護（beforeunload）
    window.addEventListener('beforeunload', e => {
        if (isDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // =========================================================
    // ユーティリティ
    // =========================================================
    function findCourseByRowId(id) {
        return allData.find(c => String(c.id) === String(id)) || null;
    }

    function buildOptionsHtml(course) {
        if (!course?.options?.length) {
            return `<div class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-500 text-center">オプション情報はありません</div>`;
        }
        const nf = new Intl.NumberFormat('ja-JP');
        return `
            <div class="mt-4">
                <h4 class="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1">
                    <span class="material-symbols-outlined icon-sm text-gray-400">layers</span>
                    オプション
                </h4>
                <div class="flex flex-col gap-2">
                    ${course.options.map(o => `
                        <div class="p-3 bg-gray-50 rounded-md border border-gray-100 hover:border-blue-200 transition-colors">
                            <div class="text-sm font-bold text-gray-800">${o.name || `オプション${o.id}`}</div>
                            <div class="mt-2 flex items-center gap-4 text-xs text-gray-600">
                                <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px] text-gray-400">schedule</span>${o.length || '-'}</div>
                                <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px] text-gray-400">payments</span>¥${typeof o.price === 'number' ? nf.format(o.price) : (o.price || '-')}</div>
                            </div>
                        </div>`).join('')}
                </div>
            </div>`;
    }

    function updateOrderLabels() {
        Array.from(rowsEl.querySelectorAll('.row')).forEach((row, i) => {
            const label = row.querySelector('.order-value');
            if (label) label.textContent = i + 1;
        });
    }

    function reorderAllDataByDom() {
        const domIds = Array.from(rowsEl.querySelectorAll('.row')).map(r => String(r.dataset.id));
        const map = new Map(allData.map(item => [String(item.id), item]));
        allData = domIds.map(id => map.get(id)).filter(Boolean);
    }

    // =========================================================
    // 行テンプレート生成
    // =========================================================
    function rowTemplate(d) {
        const customTags = Array.isArray(d.custom) ? d.custom : String(d.custom || '').split(',').filter(x => x);
        const isNewEntry = d.isNewEntry === true;  // 登録元: true=今年度追加, false=コピー起源
        const showNewBadge = d.isNew === true;      // NEWバッジ表示（トグル可能）
        const isDeleteRequested = d.deleteRequested == 1;

        const showOrderCol = !isSupplier;
        const showCustomCol = !isSupplier;

        // 行背景
        const rowBgClass = isDeleteRequested
            ? 'bg-red-50/50 hover:bg-red-50'
            : 'hover:bg-blue-50/30';

        // アクションボタン（isNewEntry で決定、バッジのON/OFFに影響されない）
        // Customer: 今年度追加フライヤー（isNewEntry=1）の×ボタンは表示しない（提案取消不可）
        let actionBtnHtml;
        if (isNewEntry && !isCustomer) {
            // IEC・Vendor: 今年度追加フライヤーは×（提案取消）ボタン
            actionBtnHtml = `<button class="delete-row-btn flex p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="提案を取り消す">
                   <span class="material-symbols-outlined icon-md">close</span>
               </button>`;
        } else if (!isNewEntry) {
            // IEC・Vendor・Customer: 前年度コピーフライヤーは削除希望アイコン
            actionBtnHtml = `<button class="request-delete-btn flex p-1.5 rounded border border-transparent transition-colors ${isDeleteRequested ? 'text-red-600 bg-red-100 border-red-200' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}"
                   title="${isDeleteRequested ? '削除希望を取り下げる' : '削除希望を出す'}"
                   data-requested="${isDeleteRequested ? '1' : '0'}">
                   <span class="material-symbols-outlined icon-md">delete_sweep</span>
               </button>`;
        } else {
            // Customer + isNewEntry=true: ボタン非表示（空セル）
            actionBtnHtml = '';
        }

        // 状態バッジ（isNew で決定、クリックでトグル）
        const statusBadgeHtml = showNewBadge
            ? `<button class="new-badge-toggle inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer" title="クリックしてNEWを解除">NEW</button>`
            : `<div class="relative flex items-center justify-center">
                   <span class="no-badge group-hover:hidden inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100">-</span>
                   <button class="new-badge-toggle add-new-badge hidden group-hover:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-amber-600 bg-amber-50/50 border border-dashed border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer" title="NEWを付与">＋NEW</button>
               </div>`;

        const deleteBadge = isDeleteRequested
            ? `<span class="delete-badge ml-1.5 inline-flex items-center text-[0.6rem] px-1.5 rounded-full bg-red-100 text-red-600 border border-red-200">削除希望</span>`
            : '';

        return `
        <div class="row group list-grid items-center py-3 px-4 border-b border-gray-100 transition-colors ${rowBgClass} ${noStdTag ? 'no-std-tag' : ''} ${isSupplier ? 'supplier-grid' : ''}"
            data-id="${d.id}"
            data-title="${d.title}" data-code="${d.code}" data-org="${d.org}"
            data-std="${d.stdTag || ''}" data-custom="${customTags.join(',')}"
            data-is-new="${showNewBadge}"
            data-is-new-entry="${isNewEntry}"
            data-delete-requested="${isDeleteRequested ? '1' : '0'}">

            <div class="flex items-center justify-center">
                <input type="checkbox" class="sel rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer">
            </div>
            <div class="flex items-center justify-center">
                ${actionBtnHtml}
            </div>

            ${showOrderCol ? `
            <div class="flex items-center gap-1 text-xs font-mono text-gray-500" data-col="order">
                <span class="order-value w-5 text-right">${d.order ?? ''}</span>
                <div class="flex flex-col -space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" class="order-up text-gray-400 hover:text-blue-600" title="一つ上へ"><span class="material-symbols-outlined text-[14px]">arrow_drop_up</span></button>
                    <button type="button" class="order-down text-gray-400 hover:text-blue-600" title="一つ下へ"><span class="material-symbols-outlined text-[14px]">arrow_drop_down</span></button>
                </div>
            </div>` : ''}

            <div class="flex flex-col min-w-0 pr-4">
                <button class="text-left text-sm font-bold text-gray-800 hover:text-blue-600 hover:underline truncate transition-colors open-preview flex items-center">
                    <span class="truncate">${d.title}</span>
                    ${deleteBadge}
                </button>
                <div class="text-xs text-gray-400 font-mono mt-0.5">${d.code}</div>
            </div>

            <div class="text-xs text-gray-600 truncate" data-col="org">${d.org}</div>

            <div class="flex justify-center">
                ${statusBadgeHtml}
            </div>

            <div class="flex items-center gap-1 flex-wrap std-tag-col" data-col="stdTag">
                ${d.stdTag ? `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 border border-blue-100 truncate max-w-full">${d.stdTag}</span>` : ''}
            </div>

            ${showCustomCol ? `
            <div class="flex items-center gap-1 flex-wrap" data-col="customTag">
                ${customTags.map(t => `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-white text-gray-600 border border-gray-200">${t}</span>`).join('')}
                <button class="add-tag-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-colors inline-flex items-center p-0.5 rounded hover:bg-blue-50" title="タグ追加">
                    <span class="material-symbols-outlined text-[16px]">add</span>
                </button>
            </div>` : ''}
        </div>`;
    }

    // =========================================================
    // フィルターロジック
    // =========================================================
    function totalFilterCount() {
        return filterState.status.size + filterState.stdTags.size + filterState.customTags.size + filterState.orgs.size;
    }

    function matchFilter(row) {
        const hay = [row.dataset.title, row.dataset.code, row.dataset.org, row.dataset.std, row.dataset.custom]
            .join(' ').toLowerCase();
        if (keyword && !hay.includes(keyword)) return false;

        if (filterState.status.has('new') && row.dataset.isNew !== 'true') return false;
        if (filterState.status.has('deleteRequested') && row.dataset.deleteRequested !== '1') return false;

        if (filterState.stdTags.size > 0) {
            const tags = (row.dataset.std || '').split(',').map(t => t.trim()).filter(Boolean);
            if (!tags.some(t => filterState.stdTags.has(t))) return false;
        }
        if (filterState.customTags.size > 0) {
            const tags = (row.dataset.custom || '').split(',').map(t => t.trim()).filter(Boolean);
            if (!tags.some(t => filterState.customTags.has(t))) return false;
        }
        if (filterState.orgs.size > 0 && !filterState.orgs.has(row.dataset.org)) return false;

        return true;
    }

    function applyFilter() {
        document.querySelectorAll('#rows .row').forEach(row => {
            row.style.display = matchFilter(row) ? '' : 'none';
        });
        updateSelectAllState();
        refreshBulkbar();
        renderFilterChips();
    }

    // =========================================================
    // フィルターパネル
    // =========================================================
    function populateFilterPanel() {
        // 標準タグ
        const stdSet = new Set(allData.map(d => d.stdTag).filter(Boolean));
        const stdContainer = document.getElementById('filter-std-tags');
        if (stdContainer) {
            stdContainer.innerHTML = [...stdSet].map(tag => `
                <label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                    <input type="checkbox" class="filter-chk rounded border-gray-300 text-blue-600 h-4 w-4" data-filter-type="stdTags" value="${tag}">
                    <span class="text-sm text-gray-700">${tag}</span>
                </label>`).join('') || '<p class="text-xs text-gray-400">なし</p>';
        }

        // カスタムタグ
        const customSet = new Set(allData.flatMap(d =>
            Array.isArray(d.custom) ? d.custom : String(d.custom || '').split(',').filter(Boolean)));
        const customContainer = document.getElementById('filter-custom-tags');
        if (customContainer) {
            customContainer.innerHTML = [...customSet].map(tag => `
                <label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                    <input type="checkbox" class="filter-chk rounded border-gray-300 text-blue-600 h-4 w-4" data-filter-type="customTags" value="${tag}">
                    <span class="text-sm text-gray-700">${tag}</span>
                </label>`).join('') || '<p class="text-xs text-gray-400">なし</p>';
        }

        // 団体
        const orgSet = new Set(allData.map(d => d.org).filter(Boolean));
        const orgContainer = document.getElementById('filter-orgs');
        if (orgContainer) {
            orgContainer.innerHTML = [...orgSet].map(org => `
                <label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                    <input type="checkbox" class="filter-chk rounded border-gray-300 text-blue-600 h-4 w-4" data-filter-type="orgs" value="${org}">
                    <span class="text-sm text-gray-700">${org}</span>
                </label>`).join('') || '<p class="text-xs text-gray-400">なし</p>';
        }
    }

    // フィルターチェックボックス変更
    document.addEventListener('change', e => {
        const chk = e.target.closest('.filter-chk');
        if (!chk) return;
        const type = chk.dataset.filterType;
        const val = chk.value;
        if (chk.checked) filterState[type].add(val);
        else filterState[type].delete(val);
        applyFilter();
    });

    // フィルターパネル開閉
    const filterBtn = document.getElementById('filter-btn');
    const filterPanel = document.getElementById('filter-panel');
    filterBtn?.addEventListener('click', e => {
        e.stopPropagation();
        filterPanel.classList.toggle('hidden');
    });
    document.addEventListener('click', e => {
        if (!document.getElementById('filter-container')?.contains(e.target)) {
            filterPanel?.classList.add('hidden');
        }
    });

    // フィルターリセット
    document.getElementById('filter-reset')?.addEventListener('click', () => {
        filterState.status.clear();
        filterState.stdTags.clear();
        filterState.customTags.clear();
        filterState.orgs.clear();
        document.querySelectorAll('.filter-chk').forEach(c => c.checked = false);
        applyFilter();
    });

    // フィルターチップ描画
    function renderFilterChips() {
        const chips = [];
        filterState.status.forEach(v => chips.push({ label: v === 'new' ? 'NEW' : '削除希望あり', type: 'status', value: v }));
        filterState.stdTags.forEach(v => chips.push({ label: `標準: ${v}`, type: 'stdTags', value: v }));
        filterState.customTags.forEach(v => chips.push({ label: `カスタム: ${v}`, type: 'customTags', value: v }));
        filterState.orgs.forEach(v => chips.push({ label: `団体: ${v}`, type: 'orgs', value: v }));

        const chipsEl = document.getElementById('filter-chips');
        const chipsRow = document.getElementById('filter-chips-row');
        const badge = document.getElementById('filter-badge');

        chipsRow?.classList.toggle('hidden', chips.length === 0);
        if (chips.length > 0) {
            badge?.classList.remove('hidden'); badge?.classList.add('inline-flex');
            if (badge) badge.textContent = chips.length;
        } else {
            badge?.classList.add('hidden'); badge?.classList.remove('inline-flex');
        }

        if (!chipsEl) return;
        chipsEl.innerHTML = chips.map(c => `
            <span class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                ${c.label}
                <button class="chip-remove hover:text-blue-900 p-0.5 rounded-full hover:bg-blue-100 transition-colors" data-type="${c.type}" data-value="${c.value}">
                    <span class="material-symbols-outlined" style="font-size:12px">close</span>
                </button>
            </span>`).join('');
    }

    // チップ個別解除
    document.getElementById('filter-chips')?.addEventListener('click', e => {
        const btn = e.target.closest('.chip-remove');
        if (!btn) return;
        const { type, value } = btn.dataset;
        filterState[type]?.delete(value);
        const chk = document.querySelector(`.filter-chk[data-filter-type="${type}"][value="${value}"]`);
        if (chk) chk.checked = false;
        applyFilter();
    });

    // すべて解除
    document.getElementById('clear-all-filters')?.addEventListener('click', () => {
        filterState.status.clear(); filterState.stdTags.clear();
        filterState.customTags.clear(); filterState.orgs.clear();
        document.querySelectorAll('.filter-chk').forEach(c => c.checked = false);
        applyFilter();
    });

    // キーワード検索
    document.getElementById('q')?.addEventListener('input', e => {
        keyword = e.target.value.toLowerCase();
        applyFilter();
    });

    // =========================================================
    // 標準タグ列の表示切替
    // =========================================================
    function applyStdTagVisibility() {
        document.querySelectorAll('.std-tag-col').forEach(el => {
            el.classList.toggle('hidden', noStdTag);
        });
        document.querySelectorAll('.list-grid').forEach(el => {
            el.classList.toggle('no-std-tag', noStdTag);
        });
    }

    document.getElementById('no-std-tag')?.addEventListener('change', e => {
        noStdTag = e.target.checked;
        markDirty();
        applyStdTagVisibility();
    });

    // =========================================================
    // データ描画
    // =========================================================
    function appendChunk() {
        if (!allData.length || loaded >= allData.length) return;
        skeletonEl.classList.remove('hidden');
        setTimeout(() => {
            const frag = document.createDocumentFragment();
            for (let i = 0; i < CHUNK && loaded < allData.length; i++, loaded++) {
                const wrap = document.createElement('div');
                wrap.innerHTML = rowTemplate(allData[loaded]);
                frag.appendChild(wrap.firstElementChild);
            }
            rowsEl.appendChild(frag);
            skeletonEl.classList.add('hidden');
            if (window.RoleMock) RoleMock.applyRoleVisibility();
            applyFilter();
            applyStdTagVisibility();
            updateOrderLabels();
            updateSelectAllState();
        }, 50);
    }

    let io = null;
    function initInfiniteScroll() {
        const sentinel = document.getElementById('sentinel');
        if (!sentinel) return;
        io = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting && loaded < allData.length) appendChunk(); });
        }, { root: listEl, rootMargin: '400px 0px' });
        io.observe(sentinel);
    }

    // =========================================================
    // 一括操作バー & 選択制御
    // =========================================================
    const bulkbar = document.getElementById('bulkbar');
    const defbar = document.getElementById('def-bar');
    const btnBulkPhysical = document.getElementById('bulk-delete-physical');
    const btnBulkRequest = document.getElementById('markDeleteRequest');

    function refreshBulkbar() {
        const checked = document.querySelectorAll('#rows .sel:checked');
        const n = checked.length;
        const selCount = document.getElementById('selCount');
        if (selCount) selCount.textContent = n;
        bulkbar?.classList.toggle('hidden', n === 0);
        defbar?.classList.toggle('hidden', n > 0);
        if (!n) return;

        // isNewEntry でボタン活性を制御
        let hasNewEntry = false, hasExisting = false;
        checked.forEach(chk => {
            const row = chk.closest('.row');
            if (!row) return;
            if (row.dataset.isNewEntry === 'true') hasNewEntry = true;
            else hasExisting = true;
        });

        if (btnBulkPhysical) {
            btnBulkPhysical.disabled = hasExisting;
            btnBulkPhysical.title = hasExisting ? '既存コースが含まれているため取り消しできません' : '選択した提案コースを取り消します';
        }
        if (btnBulkRequest) {
            btnBulkRequest.disabled = hasNewEntry;
            btnBulkRequest.title = hasNewEntry ? '今年度追加コースが含まれています' : '選択したコースに削除希望を立てます';
        }
    }

    function getVisibleCheckboxes() {
        return Array.from(document.querySelectorAll('#rows .sel')).filter(c => {
            const row = c.closest('.row');
            return row && row.style.display !== 'none';
        });
    }

    function updateSelectAllState() {
        if (!selectAllCheckbox) return;
        const visible = getVisibleCheckboxes();
        if (!visible.length) { selectAllCheckbox.indeterminate = false; selectAllCheckbox.checked = false; return; }
        const checkedCount = visible.filter(c => c.checked).length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < visible.length;
        selectAllCheckbox.checked = checkedCount === visible.length && checkedCount > 0;
    }

    listEl?.addEventListener('change', e => {
        if (e.target.classList.contains('sel')) { refreshBulkbar(); updateSelectAllState(); }
    });
    selectAllCheckbox?.addEventListener('change', () => {
        getVisibleCheckboxes().forEach(c => c.checked = selectAllCheckbox.checked);
        refreshBulkbar(); updateSelectAllState();
    });
    document.getElementById('clearSelection')?.addEventListener('click', () => {
        document.querySelectorAll('#rows .sel:checked').forEach(c => c.checked = false);
        refreshBulkbar(); updateSelectAllState();
    });

    // =========================================================
    // アクション: 物理削除（提案取消・isNewEntry=true の行のみ）
    // =========================================================
    listEl?.addEventListener('click', e => {
        const btn = e.target.closest('.delete-row-btn');
        if (!btn) return;
        const row = btn.closest('.row');
        if (!row) return;
        const id = row.dataset.id;
        const idx = allData.findIndex(d => String(d.id) === String(id));
        if (idx > -1) { allData.splice(idx, 1); loaded--; }
        if (openPanelRowId === id) closeSlidePanel();
        row.remove();
        markDirty();
        updateOrderLabels(); refreshBulkbar();
    });

    btnBulkPhysical?.addEventListener('click', () => {
        if (btnBulkPhysical.disabled) return;
        const checked = document.querySelectorAll('#rows .sel:checked');
        const ids = [];
        checked.forEach(c => {
            const row = c.closest('.row');
            if (row) { ids.push(String(row.dataset.id)); row.remove(); }
        });
        allData = allData.filter(d => !ids.includes(String(d.id)));
        loaded -= ids.length;
        if (ids.includes(String(openPanelRowId))) closeSlidePanel();
        markDirty();
        updateOrderLabels(); refreshBulkbar(); updateSelectAllState();
    });

    // =========================================================
    // アクション: 削除希望トグル（isNewEntry=false の行のみ）
    // =========================================================
    function toggleDeleteRequest(row, forceState = null) {
        const current = row.dataset.deleteRequested === '1';
        const nextState = forceState !== null ? forceState : !current;
        if (current === nextState && forceState !== null) return;

        const d = findCourseByRowId(row.dataset.id);
        if (d) d.deleteRequested = nextState ? 1 : 0;
        row.dataset.deleteRequested = nextState ? '1' : '0';

        if (nextState) {
            row.classList.add('bg-red-50/50', 'hover:bg-red-50');
            row.classList.remove('hover:bg-blue-50/30');
        } else {
            row.classList.remove('bg-red-50/50', 'hover:bg-red-50');
            row.classList.add('hover:bg-blue-50/30');
        }

        const btn = row.querySelector('.request-delete-btn');
        if (btn) {
            btn.classList.toggle('text-red-600', nextState);
            btn.classList.toggle('bg-red-100', nextState);
            btn.classList.toggle('border-red-200', nextState);
            btn.classList.toggle('text-gray-400', !nextState);
            btn.dataset.requested = nextState ? '1' : '0';
            btn.title = nextState ? '削除希望を取り下げる' : '削除希望を出す';
        }

        const titleBtn = row.querySelector('.open-preview');
        if (titleBtn) {
            let badge = titleBtn.querySelector('.delete-badge');
            if (nextState && !badge) {
                badge = document.createElement('span');
                badge.className = 'delete-badge ml-1.5 inline-flex items-center text-[0.6rem] px-1.5 rounded-full bg-red-100 text-red-600 border border-red-200';
                badge.textContent = '削除希望';
                titleBtn.appendChild(badge);
            } else if (!nextState && badge) {
                badge.remove();
            }
        }

        // スライドパネルが開いていれば警告バナーも更新
        if (openPanelRowId === row.dataset.id) updatePanelDeleteBanner(nextState);
    }

    listEl?.addEventListener('click', e => {
        const btn = e.target.closest('.request-delete-btn');
        if (!btn) return;
        const row = btn.closest('.row');
        if (row) { toggleDeleteRequest(row); markDirty(); }
    });

    btnBulkRequest?.addEventListener('click', () => {
        if (btnBulkRequest.disabled) return;
        const checked = document.querySelectorAll('#rows .sel:checked');
        checked.forEach(c => {
            const row = c.closest('.row');
            if (row) toggleDeleteRequest(row, true);
        });
        checked.forEach(c => c.checked = false);
        markDirty();
        refreshBulkbar(); updateSelectAllState();
    });

    // =========================================================
    // アクション: NEWバッジトグル（isNew のみ変更、isNewEntry は変えない）
    // Customer は mef_new_flg を変更不可（トグル操作無効）
    // =========================================================
    listEl?.addEventListener('click', e => {
        const btn = e.target.closest('.new-badge-toggle');
        if (!btn) return;
        if (isCustomer) return; // Customerはトグル不可
        const row = btn.closest('.row');
        if (!row) return;
        const id = row.dataset.id;
        const d = findCourseByRowId(id);
        const newState = row.dataset.isNew !== 'true'; // 現在の逆
        if (d) d.isNew = newState;
        row.dataset.isNew = newState ? 'true' : 'false';

        markDirty();
        // バッジHTML差し替え
        const badgeCell = btn.closest('[class*="flex justify-center"]') || btn.parentElement;
        if (newState) {
            badgeCell.innerHTML = `<button class="new-badge-toggle inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer" title="クリックしてNEWを解除">NEW</button>`;
        } else {
            badgeCell.innerHTML = `<div class="relative flex items-center justify-center">
                <span class="no-badge group-hover:hidden inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100">-</span>
                <button class="new-badge-toggle add-new-badge hidden group-hover:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-amber-600 bg-amber-50/50 border border-dashed border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer" title="NEWを付与">＋NEW</button>
            </div>`;
        }
    });

    // =========================================================
    // 並び替え
    // =========================================================
    listEl?.addEventListener('click', e => {
        const upBtn = e.target.closest('.order-up');
        const downBtn = e.target.closest('.order-down');
        if (!upBtn && !downBtn) return;
        const row = (upBtn || downBtn).closest('.row');
        if (!row) return;
        if (upBtn && row.previousElementSibling?.classList.contains('row')) {
            row.parentElement.insertBefore(row, row.previousElementSibling);
            markDirty();
        } else if (downBtn && row.nextElementSibling?.classList.contains('row')) {
            row.parentElement.insertBefore(row.nextElementSibling, row);
            markDirty();
        }
        reorderAllDataByDom(); updateOrderLabels();
    });

    ['moveTop', 'moveBottom'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            const allRows = Array.from(rowsEl.querySelectorAll('.row'));
            const selected = allRows.filter(r => r.querySelector('.sel:checked'));
            if (!selected.length) return;
            const others = allRows.filter(r => !selected.includes(r));
            const newOrder = id === 'moveTop' ? [...selected, ...others] : [...others, ...selected];
            rowsEl.innerHTML = '';
            newOrder.forEach(r => { r.querySelector('.sel').checked = false; rowsEl.appendChild(r); });
            markDirty();
            reorderAllDataByDom(); updateOrderLabels(); refreshBulkbar(); updateSelectAllState();
        });
    });

    // =========================================================
    // G: スライドパネル
    // =========================================================
    const slidePanel = document.getElementById('slide-panel');
    const slideBackdrop = document.getElementById('slide-backdrop');
    const panelContent = document.getElementById('panel-content');

    function openSlidePanel(rowId) {
        openPanelRowId = rowId;
        slideBackdrop?.classList.remove('hidden');
        slidePanel?.classList.add('is-open');
    }

    function closeSlidePanel() {
        openPanelRowId = null;
        slidePanel?.classList.remove('is-open');
        slideBackdrop?.classList.add('hidden');
        // 選択色を解除
        document.querySelectorAll('.row.bg-blue-50').forEach(r => r.classList.remove('bg-blue-50'));
    }

    document.getElementById('close-slide-panel')?.addEventListener('click', closeSlidePanel);
    slideBackdrop?.addEventListener('click', closeSlidePanel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSlidePanel(); });

    function updatePanelDeleteBanner(isDeleteRequested) {
        const banner = panelContent?.querySelector('.delete-warning-banner');
        if (!banner) return;
        if (isDeleteRequested) {
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }
    }

    listEl?.addEventListener('click', e => {
        const btn = e.target.closest('.open-preview');
        if (!btn) return;
        const row = btn.closest('.row');
        if (!row) return;

        // 選択行の強調
        document.querySelectorAll('.row.bg-blue-50').forEach(r => r.classList.remove('bg-blue-50'));
        if (row.dataset.deleteRequested !== '1') row.classList.add('bg-blue-50');

        const { id, title, code, org, std, custom } = row.dataset;
        const course = findCourseByRowId(id);
        const isDeleteRequested = row.dataset.deleteRequested === '1';
        const savedComment = commentMap.get(id) || '';

        const randomColor = ['bg-blue-100', 'bg-green-100', 'bg-indigo-100', 'bg-purple-100'][Math.floor(Math.random() * 4)];
        const randomIcon = ['school', 'menu_book', 'cast_for_education', 'lightbulb'][Math.floor(Math.random() * 4)];
        const optionsHtml = buildOptionsHtml(course);

        panelContent.innerHTML = `
            <div class="relative">
                <div class="flex flex-col h-36 w-full ${randomColor} items-center justify-center text-blue-900/20">
                    <span class="material-symbols-outlined text-5xl">${randomIcon}</span>
                    <span class="text-xs text-gray-400 mt-2">サムネイルダミー</span>
                </div>
            </div>

            <div class="p-5">
                <!-- 削除希望警告バナー -->
                <div class="delete-warning-banner ${isDeleteRequested ? '' : 'hidden'} mb-4 p-3 bg-red-50 border border-red-100 rounded-md text-red-700 text-sm font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined icon-md">warning</span>
                    このコースは削除希望が出されています
                </div>

                <div class="mb-4">
                    ${std ? `<div class="mb-2"><span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 border border-blue-100">${std}</span></div>` : ''}
                    <h2 class="text-lg font-bold text-gray-800 leading-snug">${title}</h2>
                    <div class="mt-1 text-xs text-gray-500 font-mono">コード: ${code}</div>
                </div>

                <div class="flex items-center gap-2 mb-5 text-sm text-gray-600">
                    <span class="material-symbols-outlined icon-sm text-gray-400">business</span>
                    <span>提供団体: <span class="font-medium text-gray-800">${org}</span></span>
                </div>

                ${String(custom).split(',').filter(x => x).length ? `
                <div class="mb-5">
                    <h4 class="text-xs font-bold text-gray-700 mb-2">カスタムタグ</h4>
                    <div class="flex flex-wrap gap-1.5">
                        ${String(custom).split(',').filter(x => x).map(t =>
                            `<span class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-white text-gray-600 border border-gray-200 shadow-sm">${t}</span>`
                        ).join('')}
                    </div>
                </div>` : ''}

                ${optionsHtml}

                <div class="mt-5">
                    <h4 class="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px] text-gray-400">event_busy</span>
                        非公開日設定
                    </h4>
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-500 w-8 shrink-0">From</span>
                            <input type="date" ${isCustomer || isSupplier ? 'readonly tabindex="-1"' : ''} class="rounded-md border ${isCustomer || isSupplier ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'} px-3 py-1.5 text-sm flex-1">
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-500 w-8 shrink-0">To</span>
                            <input type="date" ${isCustomer || isSupplier ? 'readonly tabindex="-1"' : ''} class="rounded-md border ${isCustomer || isSupplier ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'} px-3 py-1.5 text-sm flex-1">
                        </div>
                    </div>
                    ${isCustomer || isSupplier ? '<p class="mt-1 text-xs text-gray-400">非公開日の設定はIECが行います</p>' : ''}
                </div>

                <div class="mt-5 pt-5 border-t border-gray-100 bg-gray-50 -mx-5 -mb-5 px-5 pb-5" data-visible-for="iec, supplier">
                    <h4 class="text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px] text-gray-400">sticky_note_2</span>
                        掲載判断コメント
                    </h4>
                    <p class="text-xs text-gray-400 mb-2">変更は「変更を保存する」で確定されます</p>
                    <textarea id="course-comment" class="w-full min-h-[90px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white" placeholder="削除希望の理由やメモを記入...">${savedComment}</textarea>
                </div>
            </div>`;

        if (window.RoleMock) RoleMock.applyRoleVisibility();

        // コメント入力 → メモリに保持 + 未保存マーク
        const textarea = panelContent.querySelector('#course-comment');
        if (textarea) {
            textarea.addEventListener('input', () => {
                commentMap.set(id, textarea.value);
                markDirty();
            });
        }

        // 非公開日変更 → 未保存マーク
        panelContent.querySelectorAll('input[type="date"]').forEach(dateInput => {
            dateInput.addEventListener('change', () => markDirty());
        });

        openSlidePanel(id);
    });

    // =========================================================
    // H: コース追加モーダル
    // =========================================================
    let modalData = [];

    function normalizeCourseMaster(d) {
        return {
            id: d.id,
            title: d.name || '',
            code: d.tkfCode || d.hanCode || '',
            org: d.org || '',
            stdTag: '',
            options: Array.isArray(d.courses) ? d.courses.map(c => ({
                id: c.sortNo, name: c.name || '', price: c.price ?? 0,
                length: c.period ? `${c.period}か月` : '-'
            })) : [],
        };
    }

    function populateModalFilters() {
        const orgs = [...new Set(modalData.map(d => d.org).filter(Boolean))];
        const orgSel = document.getElementById('modal-org-filter');
        if (orgSel) {
            orgSel.innerHTML = `<option value="">団体: 全て</option>` +
                orgs.map(o => `<option value="${o}">${o}</option>`).join('');
        }

        // 標準タグ（モックデータは空のため代替ダミー）
        const stdSel = document.getElementById('modal-std-filter');
        if (stdSel) {
            stdSel.innerHTML = `<option value="">標準タグ: 指定なし</option>`;
        }

        // カスタムタグ（追加済みデータから収集）
        const customSet = new Set(allData.flatMap(d =>
            Array.isArray(d.custom) ? d.custom : String(d.custom || '').split(',').filter(Boolean)));
        const customSel = document.getElementById('modal-custom-filter');
        if (customSel) {
            customSel.innerHTML = `<option value="">カスタムタグ: 指定なし</option>` +
                [...customSet].map(t => `<option value="${t}">${t}</option>`).join('');
        }
    }

    function renderModalList() {
        const q = (document.getElementById('modal-q')?.value || '').toLowerCase();
        const org = document.getElementById('modal-org-filter')?.value || '';
        const std = document.getElementById('modal-std-filter')?.value || '';
        const custom = document.getElementById('modal-custom-filter')?.value || '';
        const addedIds = new Set(allData.map(d => String(d.id)));

        const filtered = modalData.filter(d => {
            const hay = `${d.title} ${d.code} ${d.org}`.toLowerCase();
            if (q && !hay.includes(q)) return false;
            if (org && d.org !== org) return false;
            if (std && d.stdTag !== std) return false;
            return true;
        });

        const modalRows = document.getElementById('modal-rows');
        if (!modalRows) return;
        modalRows.innerHTML = filtered.map(d => {
            const isAdded = addedIds.has(String(d.id));
            return `
                <label class="grid grid-cols-[3rem_1fr_12rem_8rem] items-center px-6 py-3 border-b border-gray-50 ${isAdded ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'hover:bg-blue-50 cursor-pointer'} transition-colors">
                    <div class="flex justify-center">
                        <input type="checkbox" class="modal-sel rounded border-gray-300 text-blue-600 h-4 w-4" data-id="${d.id}" ${isAdded ? 'disabled' : ''}>
                    </div>
                    <span class="truncate text-sm font-medium text-gray-800">${d.title}</span>
                    <span class="text-xs text-gray-500 font-mono">${d.code}</span>
                    <span class="text-xs text-gray-500">${d.org}</span>
                </label>`;
        }).join('');

        updateModalCount();
    }

    function updateModalCount() {
        const count = document.querySelectorAll('.modal-sel:checked').length;
        const el = document.getElementById('modal-selected-count');
        if (el) el.textContent = count;
    }

    function openCourseModal() {
        populateModalFilters();
        renderModalList();
        const modal = document.getElementById('course-modal');
        modal?.classList.remove('hidden'); modal?.classList.add('flex');
    }
    function closeCourseModal() {
        const modal = document.getElementById('course-modal');
        modal?.classList.add('hidden'); modal?.classList.remove('flex');
    }

    document.getElementById('open-course-modal')?.addEventListener('click', openCourseModal);
    document.getElementById('close-course-modal')?.addEventListener('click', closeCourseModal);
    document.getElementById('cancel-course-modal')?.addEventListener('click', closeCourseModal);
    document.getElementById('course-modal')?.addEventListener('click', e => { if (e.target === document.getElementById('course-modal')) closeCourseModal(); });

    ['modal-q', 'modal-org-filter', 'modal-std-filter', 'modal-custom-filter'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', renderModalList);
        document.getElementById(id)?.addEventListener('change', renderModalList);
    });
    document.getElementById('modal-rows')?.addEventListener('change', e => {
        if (e.target.classList.contains('modal-sel')) updateModalCount();
    });

    document.getElementById('add-selected-courses')?.addEventListener('click', () => {
        const ids = Array.from(document.querySelectorAll('.modal-sel:checked')).map(c => Number(c.dataset.id));
        if (!ids.length) { closeCourseModal(); return; }
        const frag = document.createDocumentFragment();
        let count = 0;
        ids.map(id => modalData.find(d => Number(d.id) === id)).forEach(md => {
            if (!md) return;
            const d = {
                id: `A-${md.id}-${Date.now()}-${count}`,
                title: md.title, code: md.code, org: md.org || '',
                stdTag: md.stdTag || '', options: md.options || [],
                isNew: true,         // バッジ: 最初はNEW表示
                isNewEntry: true,    // 登録元: 今年度追加
                deleteRequested: 0, custom: []
            };
            allData.unshift(d); count++;
            const wrap = document.createElement('div');
            wrap.innerHTML = rowTemplate(d);
            frag.appendChild(wrap.firstElementChild);
        });
        if (frag.childNodes.length > 0) {
            rowsEl.prepend(frag);
            if (window.RoleMock) RoleMock.applyRoleVisibility();
            loaded += count;
            markDirty();
            applyFilter(); applyStdTagVisibility(); updateOrderLabels(); updateSelectAllState();
        }
        closeCourseModal();
    });

    // =========================================================
    // I: カスタムタグ編集モーダル
    // =========================================================
    const tagModal = document.getElementById('tag-modal');
    let currentEditingRowId = null;
    const tagGroups = {
        target: document.getElementById('tag-group-target'),
        genre: document.getElementById('tag-group-genre'),
        level: document.getElementById('tag-group-level'),
        other: document.getElementById('tag-group-other'),
    };

    function openTagModal(rowId, currentTags) {
        currentEditingRowId = rowId;
        Object.values(tagGroups).forEach(el => { if (el) el.innerHTML = ''; });
        tagData.forEach(tag => {
            const container = tagGroups[tag.type];
            if (!container) return;
            container.insertAdjacentHTML('beforeend', `
                <label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded -ml-1">
                    <input type="checkbox" value="${tag.name}" class="tag-chk rounded border-gray-300 text-blue-600 h-4 w-4" ${currentTags.includes(tag.name) ? 'checked' : ''}>
                    <span class="text-sm text-gray-700">${tag.name}</span>
                </label>`);
        });
        tagModal?.classList.remove('hidden'); tagModal?.classList.add('flex');
    }
    function closeTagModal() {
        tagModal?.classList.add('hidden'); tagModal?.classList.remove('flex');
        currentEditingRowId = null;
    }

    rowsEl?.addEventListener('click', e => {
        const btn = e.target.closest('.add-tag-btn');
        if (!btn) return;
        const row = btn.closest('.row');
        if (!row) return;
        openTagModal(row.dataset.id, (row.dataset.custom || '').split(',').filter(Boolean));
    });

    document.getElementById('close-tag-modal')?.addEventListener('click', closeTagModal);
    document.getElementById('cancel-tag-modal')?.addEventListener('click', closeTagModal);
    tagModal?.addEventListener('click', e => { if (e.target === tagModal) closeTagModal(); });

    document.getElementById('save-tag-modal')?.addEventListener('click', () => {
        if (!currentEditingRowId) return;
        const selectedTags = Array.from(document.querySelectorAll('.tag-chk:checked')).map(i => i.value);
        const d = allData.find(d => String(d.id) === String(currentEditingRowId));
        if (d) d.custom = selectedTags;
        markDirty();
        const row = rowsEl.querySelector(`.row[data-id="${currentEditingRowId}"]`);
        if (row) {
            row.dataset.custom = selectedTags.join(',');
            const col = row.querySelector('[data-col="customTag"]');
            if (col) {
                col.innerHTML = selectedTags.map(t =>
                    `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-white text-gray-600 border border-gray-200">${t}</span>`
                ).join('') +
                `<button class="add-tag-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-colors inline-flex items-center p-0.5 rounded hover:bg-blue-50" title="タグ追加"><span class="material-symbols-outlined text-[16px]">add</span></button>`;
            }
        }
        closeTagModal();
    });

    // =========================================================
    // 通知バナー閉じる
    // =========================================================
    document.getElementById('notificationCloseButton')?.addEventListener('click', () => {
        document.getElementById('notifications')?.classList.add('hidden');
    });

    // =========================================================
    // 「変更を保存する」ボタン
    // =========================================================
    document.getElementById('save-btn')?.addEventListener('click', () => {
        if (!isDirty) return;
        // モック: 保存処理をシミュレート（実際はAPIコール）
        // commentMap の内容も含めて全件保存されるイメージ
        clearDirty();
        // トースト通知（簡易実装）
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-5 py-3 bg-gray-800 text-white text-sm rounded-lg shadow-xl opacity-0 transition-opacity duration-200';
        toast.innerHTML = '<span class="material-symbols-outlined text-green-400 text-[18px]">check_circle</span> 保存しました';
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.replace('opacity-0', 'opacity-100'));
        setTimeout(() => {
            toast.classList.replace('opacity-100', 'opacity-0');
            setTimeout(() => toast.remove(), 200);
        }, 2000);
    });

    // =========================================================
    // J: 差し戻し確認モーダル（Customer専用）
    // =========================================================
    function openRejectModal() {
        const modal = document.getElementById('reject-modal');
        modal?.classList.remove('hidden'); modal?.classList.add('flex');
        document.getElementById('reject-comment-count').textContent = '0';
        document.getElementById('reject-comment').value = '';
    }
    function closeRejectModal() {
        const modal = document.getElementById('reject-modal');
        modal?.classList.add('hidden'); modal?.classList.remove('flex');
    }

    document.getElementById('open-reject-modal')?.addEventListener('click', openRejectModal);
    document.getElementById('close-reject-modal')?.addEventListener('click', closeRejectModal);
    document.getElementById('cancel-reject-modal')?.addEventListener('click', closeRejectModal);
    document.getElementById('reject-modal')?.addEventListener('click', e => {
        if (e.target === document.getElementById('reject-modal')) closeRejectModal();
    });

    // 文字数カウンター
    document.getElementById('reject-comment')?.addEventListener('input', e => {
        const count = document.getElementById('reject-comment-count');
        if (count) count.textContent = e.target.value.length;
    });

    // 差し戻し実行（モック: アラートで完了を示す）
    document.getElementById('confirm-reject')?.addEventListener('click', () => {
        const comment = document.getElementById('reject-comment')?.value || '';
        alert(`差し戻しが完了しました。\n${comment ? `コメント: ${comment}` : '（コメントなし）'}\n\n※モック: 実際にはIECへ通知し、募集一覧へ遷移します。`);
        closeRejectModal();
    });

    // =========================================================
    // 初期化
    // =========================================================
    // ヘッダーグリッド初期適用
    if (listHeader) {
        applyGridClass(listHeader);
        if (isSupplier) {
            // Supplier: No.列・カスタムタグ列ヘッダーを非表示
            const cols = listHeader.children;
            if (cols[2]) cols[2].classList.add('hidden'); // No.
            if (cols[7]) cols[7].classList.add('hidden'); // カスタムタグ
        }
    }

    function loadModalData() {
        const raw = courseMasterData || [];
        const filtered = isSupplier ? raw.filter(d => d.eduCode !== 'IEC') : raw;
        modalData = filtered.map(normalizeCourseMaster);
    }

    function initMainList() {
        const data = selectedCourseData || [];
        allData = isSupplier ? data.filter(d => d.org === '他団体B') : data;

        // 既存データには isNewEntry=false、isNew はデータの isNew を引き継ぐ
        allData.forEach(d => {
            if (d.isNewEntry === undefined) d.isNewEntry = false;
            if (d.isNew === undefined) d.isNew = false;
        });

        loaded = 0;
        rowsEl.innerHTML = '';
        if (!allData.length) {
            skeletonEl.classList.add('hidden');
            rowsEl.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-gray-500">
                <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">inbox</span>
                <p class="text-sm">データがありません</p>
            </div>`;
            return;
        }
        appendChunk();
        initInfiniteScroll();
        populateFilterPanel();
    }

    loadModalData();
    initMainList();

    // Shift + Click 範囲選択
    let anchorIndex = null, focusIndex = null;
    rowsEl?.addEventListener('click', e => {
        const row = e.target.closest('.row');
        if (!row) return;
        const rows = Array.from(rowsEl.querySelectorAll('.row'));
        const idx = rows.indexOf(row);
        if (idx !== -1) { anchorIndex = idx; focusIndex = idx; }
    });

    window.addEventListener('keydown', e => {
        if (['input', 'textarea', 'select'].includes((e.target.tagName || '').toLowerCase())) return;
        if (!e.shiftKey) return;
        const rows = Array.from(rowsEl.querySelectorAll('.row'));
        if (!rows.length) return;
        if (anchorIndex === null) anchorIndex = 0;
        if (focusIndex === null) focusIndex = anchorIndex;
        let newFocus = focusIndex;
        if (e.key === 'ArrowDown') newFocus = Math.min(newFocus + 1, rows.length - 1);
        else if (e.key === 'ArrowUp') newFocus = Math.max(newFocus - 1, 0);
        else return;
        e.preventDefault();
        focusIndex = newFocus;
        const start = Math.min(anchorIndex, focusIndex);
        const end = Math.max(anchorIndex, focusIndex);
        rows.forEach((row, idx) => {
            const sel = row.querySelector('.sel');
            if (sel) sel.checked = (idx >= start && idx <= end);
        });
        refreshBulkbar(); updateSelectAllState();
    });
});

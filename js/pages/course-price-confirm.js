import { selectedCourseData } from '../data/selected-course-data.js';
import { courseMasterData } from '../data/course-master-data.js';

// 初期判定状態（PriceConfirmDetail の初期値ダミー）
// judge: 'ok' | 'ng' | null、replace: { id, title, code, org } | null、iecJudge: 'accept' | 'reject' | null
const INITIAL_JUDGE = new Map([
    [1004, { judge: 'ok',  replace: null,
             iecJudge: null }],
    [1007, { judge: 'ng',
             replace: { id: 201, title: '新ビジネス文章入門', code: 'MA201-10001', org: '他団体B' },
             iecJudge: 'accept' }],
    [1010, { judge: 'ng',  replace: null, iecJudge: null }],
    [1006, { judge: 'ng',
             replace: { id: 301, title: '実践タイムマネジメント2025', code: 'MA301-20001', org: '他団体C' },
             iecJudge: 'reject' }],
    [1011, { judge: 'ok',  replace: null, iecJudge: null }],
]);

window.addEventListener('DOMContentLoaded', () => {

    // ---- 共通UI ----
    const params = new URLSearchParams(location.search);
    const initialRole = params.get('role') || 'supplier';

    if (window.MockUI) {
        MockUI.injectHeader('#app-header', { userName: 'Test User', brand: 'New SD App', initialRole });
        MockUI.injectSidebar('#app-sidebar');
    }
    if (window.RoleMock) RoleMock.applyRoleVisibility();

    // ---- DOM参照 ----
    const rowsEl       = document.getElementById('rows');
    const skeletonEl   = document.getElementById('skeleton');
    const listEl       = document.getElementById('list');
    const panelContent = document.getElementById('panel-content');
    const slidePanel   = document.getElementById('slide-panel');
    const slideBackdrop = document.getElementById('slide-backdrop');
    const closeSlidePanelBtn = document.getElementById('close-slide-panel');

    // 検索・フィルター
    const qInput          = document.getElementById('q');
    const filterBtn       = document.getElementById('filter-btn');
    const filterPanel     = document.getElementById('filter-panel');
    const filterBadge     = document.getElementById('filter-badge');
    const filterChipsRow  = document.getElementById('filter-chips-row');
    const filterChipsEl   = document.getElementById('filter-chips');
    const filterReset     = document.getElementById('filter-reset');
    const clearAllFilters = document.getElementById('clear-all-filters');
    const filterOrgsEl    = document.getElementById('filter-orgs');

    // 全選択・一括操作バー
    const selectAllCheckbox = document.getElementById('selectAll');
    const bulkbar           = document.getElementById('bulkbar');
    const bulkPlaceholder   = document.getElementById('bulk-placeholder');
    const selCountSpan      = document.getElementById('selCount');
    const clearSelectionBtn = document.getElementById('clearSelection');
    const markOKBtn         = document.getElementById('markOK');
    const markNGBtn         = document.getElementById('markNG');
    const markAcceptBtn     = document.getElementById('markAccept');
    const markRejectBtn     = document.getElementById('markReject');

    // フッター
    const completeBtn          = document.getElementById('complete-btn');
    const confirmDecisionBtn   = document.getElementById('confirm-decision-btn');

    // 差戻理由モーダル
    const rejectModal          = document.getElementById('reject-modal');
    const closeRejectModalBtn  = document.getElementById('close-reject-modal');
    const cancelRejectModalBtn = document.getElementById('cancel-reject-modal');
    const confirmRejectBtn     = document.getElementById('confirm-reject-btn');
    const rejectComment        = document.getElementById('reject-comment');
    const rejectCommentCount   = document.getElementById('reject-comment-count');
    const rejectTargetCount    = document.getElementById('reject-target-count');
    const rejectCommentError   = document.getElementById('reject-comment-error');

    // 判定確定 確認モーダル
    const decisionModal          = document.getElementById('decision-modal');
    const closeDecisionModalBtn  = document.getElementById('close-decision-modal');
    const cancelDecisionModalBtn = document.getElementById('cancel-decision-modal');
    const executeDecisionBtn     = document.getElementById('execute-decision-btn');
    const decisionTitleText      = document.getElementById('decision-modal-title-text');
    const decisionIcon           = document.getElementById('decision-modal-icon');
    const decisionSummary        = document.getElementById('decision-summary');
    const decisionBullets        = document.getElementById('decision-bullets');

    // 差し替えモーダル
    const courseModal          = document.getElementById('course-modal');
    const closeCourseModalBtn  = document.getElementById('close-course-modal');
    const cancelCourseModalBtn = document.getElementById('cancel-course-modal');
    const addSelectedBtn       = document.getElementById('add-selected-courses');
    const modalRows            = document.getElementById('modal-rows');
    const modalQ               = document.getElementById('modal-q');

    // ---- 状態 ----
    let allData  = [];
    let modalData = [];
    const commentMap = new Map();           // id → コメント文字列
    let currentReplaceTargetRow = null;
    let activePanelRowId = null;
    let activeFilters = { statuses: new Set(), orgs: new Set() };
    let lastChecked = null;

    // ---- ヘルパ：選択行 ----
    function getSelectedRows() {
        return Array.from(document.querySelectorAll('#rows .sel:checked'))
            .map(c => c.closest('.row'))
            .filter(Boolean);
    }

    function getVisibleCheckboxes() {
        return Array.from(document.querySelectorAll('#rows .sel'))
            .filter(c => c.closest('.row')?.style.display !== 'none');
    }

    function updateSelectAllState() {
        if (!selectAllCheckbox) return;
        const visible = getVisibleCheckboxes();
        if (!visible.length) { selectAllCheckbox.indeterminate = false; selectAllCheckbox.checked = false; return; }
        const checkedCount = visible.filter(c => c.checked).length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < visible.length;
        selectAllCheckbox.checked = checkedCount > 0 && checkedCount === visible.length;
    }

    function refreshBulkbar() {
        const count = getSelectedRows().length;
        if (selCountSpan) selCountSpan.textContent = count;
        if (count > 0) {
            bulkbar?.classList.remove('hidden');
            bulkPlaceholder?.classList.add('hidden');
        } else {
            bulkbar?.classList.add('hidden');
            bulkPlaceholder?.classList.remove('hidden');
        }
        if (window.RoleMock) RoleMock.applyRoleVisibility();
    }

    // ---- IEC 判定確定ボタン活性制御 ----
    function getIecJudgementCounts() {
        const rows = Array.from(rowsEl.querySelectorAll('.row'));
        let accept = 0, reject = 0, unjudged = 0;
        rows.forEach(row => {
            const v = row.dataset.iecJudge || '';
            if (v === 'accept') accept++;
            else if (v === 'reject') reject++;
            else unjudged++;
        });
        return { accept, reject, unjudged, total: rows.length };
    }

    function updateConfirmDecisionBtn() {
        if (!confirmDecisionBtn) return;
        const { unjudged } = getIecJudgementCounts();
        confirmDecisionBtn.disabled = unjudged > 0;
        confirmDecisionBtn.title = unjudged > 0
            ? `未判定の行があります（残 ${unjudged} 件）`
            : '判定を確定する';
    }

    // ---- 判定バッジ（Vendor判定列） ----
    function setJudge(row, value) {
        row.dataset.judge = value || '';
        const cell = row.querySelector('.judge-mark');
        if (!cell) return;
        cell.innerHTML = '';
        if (value === 'ok') {
            cell.innerHTML = `<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-bold">OK</span>`;
        } else if (value === 'ng') {
            cell.innerHTML = `<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold">NG</span>`;
        }
    }

    // ---- IEC 受入判定ボタン ----
    function renderIecJudgeButtons(row) {
        const container = row.querySelector('.iec-judge-area');
        if (!container) return;
        const state = row.dataset.iecJudge || '';  // '' | 'accept' | 'reject'

        const acceptActive = state === 'accept';
        const rejectActive = state === 'reject';

        container.innerHTML = `
            <button type="button" class="iec-accept-btn p-1 rounded-full transition-colors ${acceptActive ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-green-500 hover:bg-green-50'}" title="受入">
                <span class="material-symbols-outlined" style="font-size:20px">${acceptActive ? 'check_circle' : 'check_circle'}</span>
            </button>
            <button type="button" class="iec-reject-btn p-1 rounded-full transition-colors ${rejectActive ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}" title="不受入">
                <span class="material-symbols-outlined" style="font-size:20px">cancel</span>
            </button>
        `;
    }

    function setIecJudge(row, value) {
        // value: 'accept' | 'reject' | ''（未判定）
        const current = row.dataset.iecJudge || '';
        const next = (current === value) ? '' : value;  // 同じ値なら未判定に戻す
        row.dataset.iecJudge = next;
        renderIecJudgeButtons(row);
        updateConfirmDecisionBtn();
    }

    // ---- 差し替えコース UI ----
    function createReplaceButton(row) {
        const container = row.querySelector('.replace-course');
        if (!container) return;
        container.innerHTML = `
            <button type="button" class="replace-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors" data-visible-for="supplier">
                <span class="material-symbols-outlined icon-sm">swap_horiz</span>差し替え登録
            </button>
            <span class="text-xs text-gray-400 italic" data-visible-for="iec">差し替えなし</span>
        `;
        if (window.RoleMock) RoleMock.applyRoleVisibility();
    }

    function clearReplace(row) {
        delete row.dataset.replaceCourseId;
        delete row.dataset.replaceCourseTitle;
        delete row.dataset.replaceCourseCode;
        delete row.dataset.replaceCourseOrg;
        const container = row.querySelector('.replace-course');
        if (!container) return;
        container.innerHTML = '';
        if (row.dataset.judge === 'ng') createReplaceButton(row);
    }

    function applyReplaceCourse(row, course) {
        row.dataset.replaceCourseId    = String(course.id ?? '');
        row.dataset.replaceCourseTitle = course.title || '';
        row.dataset.replaceCourseCode  = course.code || '';
        row.dataset.replaceCourseOrg   = course.org || '';

        const container = row.querySelector('.replace-course');
        if (!container) return;

        container.innerHTML = `
            <div class="flex items-center gap-2 w-full p-2 bg-yellow-50 rounded border border-yellow-200">
                <span class="material-symbols-outlined text-yellow-600 icon-sm shrink-0">arrow_forward</span>
                <div class="min-w-0 flex-1">
                    <button type="button" class="open-preview-replace text-xs font-bold text-gray-900 truncate hover:text-blue-600 hover:underline text-left block w-full">
                        ${course.title || ''}
                    </button>
                    <div class="text-[10px] text-gray-500 truncate">${course.code || ''}</div>
                </div>
                <div class="flex flex-col gap-1 shrink-0" data-visible-for="supplier">
                    <button type="button" class="change-replace text-[10px] text-blue-600 hover:underline">変更</button>
                    <button type="button" class="clear-replace text-[10px] text-gray-400 hover:text-red-500 hover:underline">削除</button>
                </div>
            </div>
        `;

        // IEC受入判定ボタンを更新
        renderIecJudgeButtons(row);
        if (window.RoleMock) RoleMock.applyRoleVisibility();
    }

    // ---- 行テンプレート ----
    function rowTemplate(d, initial) {
        const judge     = initial?.judge || '';
        const iecJudge  = initial?.iecJudge || '';
        const replace   = initial?.replace || null;
        const isNew     = d.isNew ? 'data-new="true"' : '';

        return `
        <div class="row pc-grid items-center gap-4 py-3 px-4 hover:bg-blue-50/30 transition-colors"
            data-id="${d.id}"
            data-title="${d.title || ''}"
            data-code="${d.code || ''}"
            data-org="${d.org || ''}"
            data-std="${d.stdTag || ''}"
            data-custom="${Array.isArray(d.custom) ? d.custom.join(',') : (d.custom || '')}"
            data-judge="${judge}"
            data-iec-judge="${iecJudge}"
            data-replace-course-id="${replace ? replace.id : ''}"
            data-replace-course-title="${replace ? replace.title : ''}"
            data-replace-course-code="${replace ? replace.code : ''}"
            data-replace-course-org="${replace ? replace.org : ''}"
            ${isNew}
        >
            <div class="flex items-center justify-center">
                <input type="checkbox" class="sel rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer">
            </div>

            <div class="flex flex-col min-w-0 pr-2">
                <div class="flex items-center gap-1.5">
                    ${d.isNew ? '<span class="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">NEW</span>' : ''}
                    <button type="button" class="open-preview text-left text-sm font-bold text-gray-800 hover:text-blue-600 hover:underline truncate transition-colors">
                        ${d.title || ''}
                    </button>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-xs text-gray-400 font-mono">${d.code || ''}</span>
                    <span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded">${d.org || ''}</span>
                </div>
            </div>

            <div class="judge-mark flex justify-center"></div>

            <div class="flex items-center gap-2 pr-2">
                <div class="replace-course flex-1 min-w-0"></div>
            </div>

            <div class="iec-judge-area flex justify-center gap-0.5" data-visible-for="iec"></div>
        </div>
        `;
    }

    function renderRows() {
        if (!Array.isArray(allData)) return;
        rowsEl.innerHTML = '';
        const frag = document.createDocumentFragment();
        allData.forEach(d => {
            const wrap = document.createElement('div');
            wrap.innerHTML = rowTemplate(d, INITIAL_JUDGE.get(d.id));
            const rowEl = wrap.firstElementChild;
            frag.appendChild(rowEl);
        });
        rowsEl.appendChild(frag);

        // 初期状態を適用
        Array.from(rowsEl.querySelectorAll('.row')).forEach(row => {
            const id   = Number(row.dataset.id);
            const init = INITIAL_JUDGE.get(id);

            if (init) {
                // Vendor判定バッジ
                if (init.judge) setJudge(row, init.judge);

                // 差し替えコース
                if (init.replace) {
                    applyReplaceCourse(row, init.replace);
                } else if (init.judge === 'ng') {
                    createReplaceButton(row);
                }

                // IEC受入判定初期値
                if (init.iecJudge) row.dataset.iecJudge = init.iecJudge;
            }

            // IEC受入判定ボタンを全行レンダリング（判定なし行も含む）
            renderIecJudgeButtons(row);
        });

        if (window.RoleMock) RoleMock.applyRoleVisibility();
        applyFilter();
    }

    // ---- 検索・フィルター ----
    function matchFilter(row) {
        const text = (qInput?.value || '').toLowerCase();
        const hay = [
            row.dataset.title, row.dataset.code, row.dataset.org,
            row.dataset.std, row.dataset.custom
        ].join(' ').toLowerCase();

        if (text && !hay.includes(text)) return false;

        // ステータスフィルター（OR条件 within group）
        if (activeFilters.statuses.size > 0) {
            const judge = row.dataset.judge;
            const isNew = row.dataset.new === 'true';
            let statusMatch = false;
            if (activeFilters.statuses.has('new')      && isNew)              statusMatch = true;
            if (activeFilters.statuses.has('unjudged') && !judge)             statusMatch = true;
            if (activeFilters.statuses.has('ng')       && judge === 'ng')     statusMatch = true;
            if (!statusMatch) return false;
        }

        // 団体フィルター（IEC専用・OR条件）
        if (activeFilters.orgs.size > 0) {
            if (!activeFilters.orgs.has(row.dataset.org)) return false;
        }

        return true;
    }

    function applyFilter() {
        Array.from(rowsEl.querySelectorAll('.row')).forEach(row => {
            row.style.display = matchFilter(row) ? '' : 'none';
        });
        updateSelectAllState();
    }

    // ---- フィルターパネル ----
    function buildOrgFilters() {
        if (!filterOrgsEl) return;
        const orgs = [...new Set(allData.map(d => d.org))].sort();
        filterOrgsEl.innerHTML = orgs.map(org => `
            <label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                <input type="checkbox" class="filter-chk rounded border-gray-300 text-blue-600 h-4 w-4" data-filter-type="org" value="${org}">
                <span class="text-sm text-gray-700">${org}</span>
            </label>
        `).join('');
    }

    function countActiveFilters() {
        return activeFilters.statuses.size + activeFilters.orgs.size;
    }

    function updateFilterBadge() {
        const count = countActiveFilters();
        if (!filterBadge) return;
        if (count > 0) {
            filterBadge.textContent = count;
            filterBadge.classList.remove('hidden');
            filterBadge.classList.add('inline-flex');
        } else {
            filterBadge.classList.add('hidden');
            filterBadge.classList.remove('inline-flex');
        }
    }

    const FILTER_LABELS = {
        new: 'NEWのみ', unjudged: '未判定のみ', ng: '判定NGのみ'
    };

    function updateFilterChips() {
        if (!filterChipsEl) return;
        const chips = [];

        activeFilters.statuses.forEach(v => {
            chips.push({ label: FILTER_LABELS[v] || v, type: 'status', value: v });
        });
        activeFilters.orgs.forEach(v => {
            chips.push({ label: v, type: 'org', value: v });
        });

        filterChipsEl.innerHTML = chips.map(c => `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                ${c.label}
                <button type="button" class="chip-remove ml-0.5 text-blue-500 hover:text-blue-800 leading-none" data-type="${c.type}" data-value="${c.value}">
                    <span class="material-symbols-outlined" style="font-size:14px">close</span>
                </button>
            </span>
        `).join('');

        filterChipsRow?.classList.toggle('hidden', chips.length === 0);
        filterChipsRow?.classList.toggle('flex', chips.length > 0);
    }

    function resetFilters() {
        activeFilters.statuses.clear();
        activeFilters.orgs.clear();
        document.querySelectorAll('.filter-chk').forEach(c => c.checked = false);
        updateFilterBadge();
        updateFilterChips();
        applyFilter();
    }

    // フィルターパネル開閉
    filterBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        filterPanel?.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!filterBtn?.contains(e.target) && !filterPanel?.contains(e.target)) {
            filterPanel?.classList.add('hidden');
        }
    });

    // フィルターチェックボックス変更
    filterPanel?.addEventListener('change', (e) => {
        const chk = e.target;
        if (!chk.classList.contains('filter-chk')) return;
        const type = chk.dataset.filterType;
        const val  = chk.value;
        const set  = type === 'org' ? activeFilters.orgs : activeFilters.statuses;
        chk.checked ? set.add(val) : set.delete(val);
        updateFilterBadge();
        updateFilterChips();
        applyFilter();
    });

    filterReset?.addEventListener('click', resetFilters);
    clearAllFilters?.addEventListener('click', resetFilters);

    // チップ個別削除
    filterChipsEl?.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-remove');
        if (!btn) return;
        const { type, value } = btn.dataset;
        const set = type === 'org' ? activeFilters.orgs : activeFilters.statuses;
        set.delete(value);
        const chk = filterPanel?.querySelector(`.filter-chk[data-filter-type="${type}"][value="${value}"]`);
        if (chk) chk.checked = false;
        updateFilterBadge();
        updateFilterChips();
        applyFilter();
    });

    qInput?.addEventListener('input', applyFilter);

    // ---- スライドパネル ----
    function openSlidePanel() {
        slideBackdrop?.classList.remove('hidden');
        slidePanel?.classList.add('is-open');
    }

    function closeSlidePanel() {
        slideBackdrop?.classList.add('hidden');
        slidePanel?.classList.remove('is-open');
        activePanelRowId = null;
    }

    closeSlidePanelBtn?.addEventListener('click', closeSlidePanel);
    slideBackdrop?.addEventListener('click', closeSlidePanel);

    function buildOptionsHtml(course) {
        if (!course || !Array.isArray(course.options) || course.options.length === 0) {
            return `<div class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-500 text-center">オプション情報はありません</div>`;
        }
        const nf = new Intl.NumberFormat('ja-JP');
        return `
            <div class="mt-4">
                <h4 class="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1">
                    <span class="material-symbols-outlined icon-sm text-gray-400">layers</span>オプション
                </h4>
                <div class="flex flex-col gap-2">
                    ${course.options.map(o => `
                        <div class="p-3 bg-gray-50 rounded-md border border-gray-100">
                            <div class="text-sm font-bold text-gray-800">${o.name || `オプション${o.id}`}</div>
                            <div class="mt-1 flex items-center gap-4 text-xs text-gray-600">
                                <div class="flex items-center gap-1">
                                    <span class="material-symbols-outlined text-[14px] text-gray-400">schedule</span>${o.length || '-'}
                                </div>
                                <div class="flex items-center gap-1">
                                    <span class="material-symbols-outlined text-[14px] text-gray-400">payments</span>¥${typeof o.price === 'number' ? nf.format(o.price) : (o.price || '-')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderSlidePanel(rowId, title, code, org, course, isReplace) {
        activePanelRowId = rowId;
        const savedComment = commentMap.get(String(rowId)) || '';
        const bgClass = ['bg-blue-100', 'bg-green-100', 'bg-orange-100'][Math.floor(Math.random() * 3)];
        const isVendor = initialRole === 'supplier';
        const isDone   = false; // モックでは常に未完了

        panelContent.innerHTML = `
            <div class="relative">
                <div class="flex flex-col h-36 w-full ${bgClass} items-center justify-center text-gray-400">
                    <span class="material-symbols-outlined text-5xl opacity-20">${isReplace ? 'swap_horiz' : 'school'}</span>
                </div>
                ${isReplace ? '<div class="absolute top-2 left-2 bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded shadow">差し替え候補</div>' : ''}
            </div>
            <div class="p-5">
                <h2 class="text-lg font-bold text-gray-800 leading-snug">${title}</h2>
                <div class="mt-1 text-xs text-gray-500 font-mono">コード: ${code || ''}</div>
                <div class="flex items-center gap-2 mt-3 text-sm text-gray-600">
                    <span class="material-symbols-outlined icon-sm text-gray-400">business</span>
                    <span>提供団体: <span class="font-medium text-gray-800">${org || ''}</span></span>
                </div>

                ${buildOptionsHtml(course)}

                <div class="mt-6 pt-5 border-t border-gray-100">
                    <label class="block text-sm font-bold text-gray-700 mb-2">コースに関するコメント</label>
                    ${isVendor && !isDone ? `
                        <textarea id="panel-comment" rows="4" maxlength="200"
                            class="w-full rounded-md border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white"
                            placeholder="修了判定条件などがお客様希望に沿えない場合、その理由などを記載してください。"
                        ></textarea>
                        <div class="text-xs text-gray-400 mt-1 text-right"><span id="panel-comment-count">${savedComment.length}</span> / 200</div>
                        <div class="mt-3 flex justify-end gap-2">
                            <button id="panel-reset-btn" class="px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 transition-colors shadow-sm">
                                リセット
                            </button>
                            <button id="panel-save-btn" class="px-4 py-1.5 rounded-md bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition-all">
                                保存する
                            </button>
                        </div>
                    ` : `
                        <div class="p-3 rounded-md bg-gray-50 border border-gray-100 text-sm text-gray-600 min-h-[64px] whitespace-pre-wrap">${savedComment || '<span class="text-gray-400 italic">コメントなし</span>'}</div>
                    `}
                </div>
            </div>
        `;

        // コメントテキストエリア初期値・イベント
        const textarea     = panelContent.querySelector('#panel-comment');
        const countEl      = panelContent.querySelector('#panel-comment-count');
        const resetBtn     = panelContent.querySelector('#panel-reset-btn');
        const saveBtn      = panelContent.querySelector('#panel-save-btn');

        if (textarea) {
            textarea.value = savedComment;
            textarea.addEventListener('input', () => {
                commentMap.set(String(rowId), textarea.value);
                if (countEl) countEl.textContent = textarea.value.length;
            });
        }
        resetBtn?.addEventListener('click', () => {
            if (textarea) textarea.value = savedComment;
            commentMap.set(String(rowId), savedComment);
            if (countEl) countEl.textContent = savedComment.length;
        });
        saveBtn?.addEventListener('click', () => {
            const val = textarea?.value || '';
            commentMap.set(String(rowId), val);
            // トースト代わりの仮表示
            saveBtn.textContent = '保存しました ✓';
            saveBtn.disabled = true;
            setTimeout(() => { saveBtn.textContent = '保存する'; saveBtn.disabled = false; }, 1500);
        });

        if (window.RoleMock) RoleMock.applyRoleVisibility();
        openSlidePanel();
    }

    // ---- 行クリックイベント ----
    listEl.addEventListener('click', (e) => {
        const row = e.target.closest('.row');
        if (!row) return;

        // 差し替え登録 / 変更
        if (e.target.closest('.replace-btn') || e.target.closest('.change-replace')) {
            openCourseModal(row);
            return;
        }
        // 差し替え削除
        if (e.target.closest('.clear-replace')) {
            clearReplace(row);
            return;
        }
        // 差し替えコースプレビュー
        if (e.target.closest('.open-preview-replace')) {
            const replaceId = row.dataset.replaceCourseId;
            if (!replaceId) return;
            const mc = modalData.find(d => String(d.id) === String(replaceId));
            const title = row.dataset.replaceCourseTitle;
            const code  = row.dataset.replaceCourseCode;
            const org   = row.dataset.replaceCourseOrg;
            renderSlidePanel(row.dataset.id, title, code, org, mc || null, true);
            return;
        }
        // 元コースプレビュー
        if (e.target.closest('.open-preview')) {
            const { id, title, code, org } = row.dataset;
            const originalCourse = allData.find(d => String(d.id) === id);
            renderSlidePanel(id, title, code, org, originalCourse || null, false);
            return;
        }
        // IEC 受入ボタン
        if (e.target.closest('.iec-accept-btn')) {
            setIecJudge(row, 'accept');
            return;
        }
        // IEC 差戻ボタン
        if (e.target.closest('.iec-reject-btn')) {
            openRejectModal(row);
            return;
        }
    });

    // ---- チェックボックス（Shift+Click・範囲選択） ----
    listEl.addEventListener('click', (e) => {
        if (!e.target.classList.contains('sel')) return;
        const checkboxes = getVisibleCheckboxes();
        const current    = e.target;
        if (e.shiftKey && lastChecked) {
            const start = checkboxes.indexOf(lastChecked);
            const end   = checkboxes.indexOf(current);
            if (start !== -1 && end !== -1) {
                const lo = Math.min(start, end), hi = Math.max(start, end);
                for (let i = lo; i <= hi; i++) checkboxes[i].checked = current.checked;
            }
        }
        lastChecked = current;
        refreshBulkbar();
        updateSelectAllState();
    });

    // Shift + 矢印キー
    let anchorIdx = null, focusIdx = null;
    rowsEl.addEventListener('click', (e) => {
        const row = e.target.closest('.row');
        if (!row) return;
        const rows = Array.from(rowsEl.querySelectorAll('.row')).filter(r => r.style.display !== 'none');
        const idx  = rows.indexOf(row);
        if (idx !== -1) { anchorIdx = idx; focusIdx = idx; }
    });
    window.addEventListener('keydown', (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag)) return;
        if (!e.shiftKey) return;
        const rows = Array.from(rowsEl.querySelectorAll('.row')).filter(r => r.style.display !== 'none');
        if (!rows.length) return;
        if (anchorIdx === null) { const fi = rows.findIndex(r => r.querySelector('.sel:checked')); anchorIdx = fi !== -1 ? fi : 0; }
        if (focusIdx === null)  focusIdx = anchorIdx;
        let nf = focusIdx;
        if (e.key === 'ArrowDown' && nf < rows.length - 1) nf++;
        else if (e.key === 'ArrowUp' && nf > 0) nf--;
        else return;
        e.preventDefault();
        focusIdx = nf;
        const lo = Math.min(anchorIdx, focusIdx), hi = Math.max(anchorIdx, focusIdx);
        rows.forEach((r, i) => { const s = r.querySelector('.sel'); if (s) s.checked = (i >= lo && i <= hi); });
        refreshBulkbar();
        updateSelectAllState();
        rows[focusIdx].scrollIntoView({ block: 'nearest' });
    });

    // ---- 全選択 ----
    selectAllCheckbox?.addEventListener('change', () => {
        getVisibleCheckboxes().forEach(c => c.checked = selectAllCheckbox.checked);
        refreshBulkbar();
        updateSelectAllState();
    });

    clearSelectionBtn?.addEventListener('click', () => {
        document.querySelectorAll('#rows .sel:checked').forEach(c => c.checked = false);
        refreshBulkbar();
        updateSelectAllState();
    });

    // ---- 一括操作：Vendor ----
    function bulkSetJudge(value) {
        getSelectedRows().forEach(row => {
            const current = row.dataset.judge;
            if (current === value) {
                setJudge(row, null);
                clearReplace(row);
            } else {
                setJudge(row, value);
                if (value === 'ok') {
                    clearReplace(row);
                } else if (value === 'ng' && !row.dataset.replaceCourseId) {
                    createReplaceButton(row);
                }
            }
        });
        document.querySelectorAll('#rows .sel:checked').forEach(c => c.checked = false);
        refreshBulkbar();
        updateSelectAllState();
    }

    markOKBtn?.addEventListener('click', () => bulkSetJudge('ok'));
    markNGBtn?.addEventListener('click', () => bulkSetJudge('ng'));

    // ---- 一括操作：IEC ----
    function bulkSetIecJudge(value) {
        getSelectedRows().forEach(row => {
            row.dataset.iecJudge = value;
            renderIecJudgeButtons(row);
        });
        updateConfirmDecisionBtn();
        document.querySelectorAll('#rows .sel:checked').forEach(c => c.checked = false);
        refreshBulkbar();
        updateSelectAllState();
    }

    markAcceptBtn?.addEventListener('click', () => bulkSetIecJudge('accept'));
    markRejectBtn?.addEventListener('click', () => {
        const rows = getSelectedRows();
        if (rows.length > 0) openRejectModal(null, rows);
    });

    // ---- 差戻理由モーダル ----
    let rejectTargetRow  = null;
    let rejectTargetRows = null;

    function openRejectModal(row, rows) {
        rejectTargetRow  = row  || null;
        rejectTargetRows = rows || null;
        const count = row ? 1 : (rows?.length ?? 0);
        if (rejectTargetCount) rejectTargetCount.textContent = `${count} 件を差戻します`;
        if (rejectComment) {
            rejectComment.value = row?.dataset.iecRejectComment || '';
            if (rejectCommentCount) rejectCommentCount.textContent = rejectComment.value.length;
        }
        rejectCommentError?.classList.add('hidden');
        rejectModal?.classList.remove('hidden');
        rejectModal?.classList.add('flex');
        rejectComment?.focus();
    }

    function closeRejectModal() {
        rejectModal?.classList.add('hidden');
        rejectModal?.classList.remove('flex');
        rejectTargetRow  = null;
        rejectTargetRows = null;
    }

    rejectComment?.addEventListener('input', () => {
        if (rejectCommentCount) rejectCommentCount.textContent = (rejectComment.value || '').length;
        rejectCommentError?.classList.add('hidden');
    });

    closeRejectModalBtn?.addEventListener('click', closeRejectModal);
    cancelRejectModalBtn?.addEventListener('click', closeRejectModal);
    rejectModal?.addEventListener('click', (e) => { if (e.target === rejectModal) closeRejectModal(); });

    confirmRejectBtn?.addEventListener('click', () => {
        const comment = rejectComment?.value || '';
        if (!comment.trim()) {
            rejectCommentError?.classList.remove('hidden');
            rejectComment?.focus();
            return;
        }
        if (rejectTargetRow) {
            rejectTargetRow.dataset.iecRejectComment = comment;
            setIecJudge(rejectTargetRow, 'reject');
        } else if (rejectTargetRows) {
            rejectTargetRows.forEach(row => {
                row.dataset.iecRejectComment = comment;
                row.dataset.iecJudge = 'reject';
                renderIecJudgeButtons(row);
            });
            updateConfirmDecisionBtn();
            document.querySelectorAll('#rows .sel:checked').forEach(c => c.checked = false);
            refreshBulkbar();
            updateSelectAllState();
        }
        closeRejectModal();
    });

    // ---- 判定を確定する（確認モーダル → 分岐実行）----
    function openDecisionModal() {
        const { accept, reject, unjudged, total } = getIecJudgementCounts();
        if (unjudged > 0) return; // 念のため

        const isAllAccept = reject === 0;

        if (isAllAccept) {
            // パターン1：全件受入
            decisionTitleText.textContent = '全件受入で確定します';
            decisionIcon.textContent = 'verified';
            decisionIcon.className = 'material-symbols-outlined icon-md text-blue-600';
            decisionSummary.textContent = `全 ${total} 件を受入で確定します。`;
            decisionBullets.innerHTML = `
                <li>コースリスト（f_media_plan_flyer）に判定結果が自動反映されます。</li>
                <li>NG 判定行は差し替え or 削除に置き換わります。</li>
                <li>StatusCourse が Done に遷移し、料金確認が完了します。</li>
                <li>この操作は取り消せません。</li>
            `;
            executeDecisionBtn.textContent = '全件受入で確定する';
            executeDecisionBtn.className = 'px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm transition-all';
            executeDecisionBtn.dataset.mode = 'accept';
        } else {
            // パターン2：差戻混在
            // 差戻Vendor（団体）を抽出
            const rejectOrgs = [...new Set(
                Array.from(rowsEl.querySelectorAll('.row'))
                    .filter(r => r.dataset.iecJudge === 'reject')
                    .map(r => r.dataset.org)
                    .filter(Boolean)
            )];
            decisionTitleText.textContent = '差戻を確定し再依頼します';
            decisionIcon.textContent = 'reply';
            decisionIcon.className = 'material-symbols-outlined icon-md text-red-500';
            decisionSummary.textContent = `受入 ${accept} 件 / 差戻 ${reject} 件で確定します。`;
            const orgList = rejectOrgs.length ? rejectOrgs.join('、') : '（団体名取得中）';
            decisionBullets.innerHTML = `
                <li>差戻対象の ${rejectOrgs.length} 社（${orgList}）の料金確認をリセットし、再依頼を発出します。</li>
                <li>StatusCourse が PriceConfirming に戻ります。</li>
                <li>対象 Vendor の営業担当者に再依頼メールが送信されます。</li>
                <li>コースリストへの反映は再度全件受入を確定するまで実行されません。</li>
            `;
            executeDecisionBtn.textContent = '差戻を確定し再依頼する';
            executeDecisionBtn.className = 'px-5 py-2 rounded-md bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-sm transition-all';
            executeDecisionBtn.dataset.mode = 'reject';
        }

        decisionModal?.classList.remove('hidden');
        decisionModal?.classList.add('flex');
    }

    function closeDecisionModal() {
        decisionModal?.classList.add('hidden');
        decisionModal?.classList.remove('flex');
    }

    confirmDecisionBtn?.addEventListener('click', openDecisionModal);
    closeDecisionModalBtn?.addEventListener('click', closeDecisionModal);
    cancelDecisionModalBtn?.addEventListener('click', closeDecisionModal);
    decisionModal?.addEventListener('click', (e) => { if (e.target === decisionModal) closeDecisionModal(); });

    executeDecisionBtn?.addEventListener('click', () => {
        const mode = executeDecisionBtn.dataset.mode;
        closeDecisionModal();
        if (mode === 'accept') {
            alert('全件受入で確定しました。募集一覧に戻ります。');
            // location.href = './media-plan-list.html';
        } else if (mode === 'reject') {
            alert('差戻を確定しました。対象 Vendor に再依頼メールが送信されます。');
            // location.href = './media-plan-list.html';
        }
    });

    // ---- 料金確認を完了する ----
    completeBtn?.addEventListener('click', () => {
        if (confirm('料金確認を完了します。完了後は編集できません。よろしいですか？')) {
            alert('料金確認を完了しました。募集一覧に戻ります。');
            // location.href = './media-plan-list.html';
        }
    });

    // ---- 差し替えモーダル ----
    function renderModalList() {
        const v = (modalQ?.value || '').toLowerCase();
        if (!modalRows) return;
        const filtered = modalData.filter(d =>
            ((d.title || '') + ' ' + (d.code || '') + ' ' + (d.org || '')).toLowerCase().includes(v)
        );
        modalRows.innerHTML = filtered.length === 0
            ? '<div class="p-6 text-sm text-gray-500 text-center">該当するコースがありません</div>'
            : filtered.map(d => `
                <label class="grid grid-cols-[3rem_1fr_10rem] items-center px-6 py-3 hover:bg-blue-50 cursor-pointer transition-colors">
                    <div class="flex justify-center">
                        <input type="radio" name="modalCourse" class="modal-sel accent-blue-600" data-id="${d.id}">
                    </div>
                    <div class="min-w-0">
                        <div class="text-sm font-medium text-gray-900 truncate">${d.title || ''}</div>
                        <div class="text-xs text-gray-500 font-mono truncate">${d.code || ''}</div>
                    </div>
                    <div class="text-xs text-gray-500 truncate">${d.org || ''}</div>
                </label>
            `).join('');
    }

    function openCourseModal(targetRow) {
        currentReplaceTargetRow = targetRow || null;
        if (!courseModal) return;
        courseModal.classList.remove('hidden');
        courseModal.classList.add('flex');
        if (modalQ) modalQ.value = '';
        renderModalList();
    }

    function closeCourseModal() {
        courseModal?.classList.add('hidden');
        courseModal?.classList.remove('flex');
        currentReplaceTargetRow = null;
        document.querySelectorAll('.modal-sel:checked').forEach(c => c.checked = false);
    }

    closeCourseModalBtn?.addEventListener('click', closeCourseModal);
    cancelCourseModalBtn?.addEventListener('click', closeCourseModal);
    courseModal?.addEventListener('click', (e) => { if (e.target === courseModal) closeCourseModal(); });
    modalQ?.addEventListener('input', renderModalList);

    addSelectedBtn?.addEventListener('click', () => {
        if (!currentReplaceTargetRow) { closeCourseModal(); return; }
        const selected = document.querySelector('.modal-sel:checked');
        if (!selected) { closeCourseModal(); return; }
        const id     = Number(selected.dataset.id);
        const course = modalData.find(d => Number(d.id) === id);
        if (course) applyReplaceCourse(currentReplaceTargetRow, course);
        closeCourseModal();
    });

    // ---- データ初期化 ----
    const normalizeCourseMaster = d => ({
        id:      d.id,
        title:   d.name || '',
        code:    d.tkfCode || d.hanCode || '',
        org:     d.org || '',
        options: Array.isArray(d.courses)
            ? d.courses.map(c => ({ id: c.sortNo, name: c.name || '', price: c.price ?? 0, length: c.period ? `${c.period}か月` : '-' }))
            : [],
    });

    const initModalData = () => {
        const raw      = courseMasterData || [];
        const filtered = initialRole === 'supplier' ? raw.filter(d => d.eduCode !== 'IEC') : raw;
        modalData = filtered.map(normalizeCourseMaster);
    };

    const initMainList = () => {
        const data = selectedCourseData || [];
        allData = initialRole === 'supplier' ? data.filter(d => d.org === '他団体B') : data;
        skeletonEl?.classList.add('hidden');
        if (allData.length === 0) {
            rowsEl.innerHTML = '<div class="p-8 text-sm text-gray-500 text-center">表示するデータがありません</div>';
        } else {
            buildOrgFilters();
            renderRows();
        }
    };

    initModalData();
    initMainList();

    // 初期状態（IEC: 確定ボタンの活性判定）
    updateConfirmDecisionBtn();
});

import { selectedCourseData } from '../data/selected-course-data.js';
import { courseMasterData, STANDARD_TAGS } from '../data/course-master-data.js';

// 差し替えモーダルで表示対象とする複合ステータス（IEC承認済バージョンを持つもの）
const APPROVED_COMPOSITE = ['承認済', '修正中', '修正申請中', '否認（修正）'];

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

// 初期コメント（PriceConfirmDetail.Comment の初期値ダミー。NG行のみ）
const INITIAL_COMMENTS = new Map([
    [1007, '章立てを刷新したため、新ビジネス文章入門へ差し替えをお願いします。'],
    [1010, '今年度は提供を見送るため掲載を取り下げます。'],
    [1006, '実践タイムマネジメント2025へ差し替え希望です。'],
]);

window.addEventListener('DOMContentLoaded', () => {

    // ---- 共通UI ----
    const params = new URLSearchParams(location.search);
    const initialRole = params.get('role') || 'supplier';
    const isSupplier = initialRole === 'supplier';

    if (window.MockUI) {
        MockUI.injectHeader('#app-header', { userName: 'Test User', brand: 'New SD App', initialRole });
        MockUI.injectSidebar('#app-sidebar');
    }
    if (window.RoleMock) RoleMock.applyRoleVisibility();

    // Vendor: 列ヘッダーも IEC判定列を持たない supplier-grid に揃える
    if (isSupplier) document.getElementById('pc-list-header')?.classList.add('supplier-grid');

    // =========================================================
    // 未保存状態管理（遅延保存モデル：コース提案リストと共通）
    // 一覧上の編集（判定・差し替え・コメント・IEC判定・ファイル判定・
    // キャンセルポリシー確認）は即時保存せず、「変更を保存する」押下で
    // まとめて確定する。保存しない離脱は破棄（離脱ガードで保護）。
    // =========================================================
    let isDirty = false;

    function markDirty() {
        if (isDirty) return;
        isDirty = true;
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.classList.remove('bg-white', 'border-blue-300', 'text-blue-600', 'hover:bg-blue-50');
            saveBtn.classList.add('bg-blue-600', 'border-blue-600', 'text-white', 'hover:bg-blue-700', 'shadow-sm');
        }
        const indicator = document.getElementById('unsaved-indicator');
        indicator?.classList.remove('hidden');
        indicator?.classList.add('inline-flex');
    }

    function clearDirty() {
        isDirty = false;
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.classList.add('bg-white', 'border-blue-300', 'text-blue-600', 'hover:bg-blue-50');
            saveBtn.classList.remove('bg-blue-600', 'border-blue-600', 'text-white', 'hover:bg-blue-700', 'shadow-sm');
        }
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
    const defBar            = document.getElementById('def-bar');
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
            defBar?.classList.add('hidden');
        } else {
            bulkbar?.classList.add('hidden');
            defBar?.classList.remove('hidden');
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
        const courseUnjudged = getIecJudgementCounts().unjudged;
        const fileUnjudged = (typeof getFileJudgeCounts === 'function') ? getFileJudgeCounts().unjudged : 0;
        const total = courseUnjudged + fileUnjudged;
        confirmDecisionBtn.disabled = total > 0;
        confirmDecisionBtn.title = total > 0
            ? `未判定があります（コース 残 ${courseUnjudged} 件 / ファイル 残 ${fileUnjudged} 件）`
            : '判定を確定する';
        updateFileJudgeSummary();
    }

    // ---- NG行コメント必須インジケーター（一覧上でひと目でわかるように） ----
    function updateNgCommentFlag(row) {
        const flag = row.querySelector('.ng-comment-flag');
        if (!flag) return;
        const isNg = row.dataset.judge === 'ng';
        const hasComment = !!(commentMap.get(String(row.dataset.id)) || '').trim();
        flag.classList.toggle('hidden', !(isNg && !hasComment));
    }

    // ---- NG行コメント欄（行内インライン・コメントの唯一の入力箇所） ----
    // 1行＝1コメント（PriceConfirmDetail.Comment）を物理的に1箇所に固定する。
    // 差し替えの有無でラベル／プレースホルダーを出し分け、「差し替え先にも別コメントがある」という誤解を防ぐ。
    function renderRowComment(row) {
        const container = row.querySelector('.row-comment');
        if (!container) return;

        // NG判定行のみ展開。OK・未判定は欄ごと非表示にする（=入力箇所が存在しない）。
        const isNg = row.dataset.judge === 'ng';
        if (!isNg) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }
        container.classList.remove('hidden');

        const id     = String(row.dataset.id);
        const saved  = commentMap.get(id) || '';

        const isVendor    = initialRole === 'supplier';
        const isDone      = false;                    // モックでは常に未完了
        const hasReplace  = !!row.dataset.replaceCourseId;
        const label = hasReplace ? '差し替え理由' : '掲載見送り（削除）の理由';
        const guide = hasReplace
            ? '差し替えの理由・差し替え先コースに関する補足を記載してください。'
            : '掲載見送り（削除）の理由を記載してください。';
        const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        if (isVendor && !isDone) {
            // Vendor（編集可）: ラベル・入力・カウンターを1行に収める（高さ節約）。
            // 入力は「変更を保存する」で他の判定とまとめて確定する（行内の保存/リセットボタンは持たない）。
            container.innerHTML = `
                <div class="ml-12 mr-4 mb-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50/40 px-3 py-1.5">
                    <span class="material-symbols-outlined text-red-500 shrink-0" style="font-size:15px" title="判定NGのコースはコメントが必須です">priority_high</span>
                    <span class="text-[11px] font-bold text-red-700 shrink-0 whitespace-nowrap">${label} <span class="text-red-500">*</span></span>
                    <input type="text" class="row-comment-input flex-1 min-w-0 rounded border border-gray-300 text-sm px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" maxlength="200" placeholder="${guide}" value="${esc(saved)}">
                    <span class="text-[10px] text-gray-400 shrink-0 tabular-nums"><span class="row-comment-count">${saved.length}</span>/200</span>
                </div>`;
        } else {
            // IEC・Vendor完了後: 読み取り専用表示（1行・はみ出しは省略＋ツールチップ）
            container.innerHTML = `
                <div class="ml-12 mr-4 mb-2 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5">
                    <span class="text-[10px] font-bold text-gray-400 shrink-0 whitespace-nowrap">${label}（Vendorコメント）</span>
                    <span class="text-xs text-gray-700 truncate" title="${esc(saved)}">${saved ? esc(saved) : '<span class="text-gray-400 italic">コメントなし</span>'}</span>
                </div>`;
        }
    }

    // インラインコメントの入力・保存・リセット（イベント委譲）
    rowsEl.addEventListener('input', (e) => {
        const ta = e.target.closest('.row-comment-input');
        if (!ta) return;
        const row = ta.closest('.row');
        if (!row) return;
        commentMap.set(String(row.dataset.id), ta.value);
        markDirty();
        const cnt = row.querySelector('.row-comment-count');
        if (cnt) cnt.textContent = ta.value.length;
        updateNgCommentFlag(row);
    });

    // ---- 判定バッジ（Vendor判定列） ----
    function setJudge(row, value) {
        row.dataset.judge = value || '';
        const cell = row.querySelector('.judge-mark');
        if (cell) {
            cell.innerHTML = '';
            if (value === 'ok') {
                cell.innerHTML = `<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-bold">OK</span>`;
            } else if (value === 'ng') {
                cell.innerHTML = `<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold">NG</span>`;
            }
        }
        updateNgCommentFlag(row);
        renderRowComment(row);
    }

    // ---- IEC 受入判定ボタン ----
    function renderIecJudgeButtons(row) {
        const container = row.querySelector('.iec-judge-area');
        if (!container) return;
        const state = row.dataset.iecJudge || '';  // '' | 'accept' | 'reject'

        const acceptActive = state === 'accept';
        const rejectActive = state === 'reject';

        container.innerHTML = `
            <button type="button" class="iec-accept-btn inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${acceptActive ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-green-500 hover:bg-green-50'}" title="受入">
                <span class="material-symbols-outlined leading-none" style="font-size:20px">check_circle</span>
            </button>
            <button type="button" class="iec-reject-btn inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${rejectActive ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}" title="不受入">
                <span class="material-symbols-outlined leading-none" style="font-size:20px">cancel</span>
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
            <div class="flex items-center gap-2" data-visible-for="supplier">
                <button type="button" class="replace-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors">
                    <span class="material-symbols-outlined icon-sm">swap_horiz</span>差し替え登録
                </button>
                <span class="text-[10px] text-gray-400">任意（未設定で削除）</span>
            </div>
            <span class="text-xs text-gray-400 italic" data-visible-for="iec">差し替えなし（削除予定）</span>
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
        renderRowComment(row);
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

        // IEC受入判定ボタン・インラインコメント欄（文言が差し替えあり用に変わる）を更新
        renderIecJudgeButtons(row);
        renderRowComment(row);
        if (window.RoleMock) RoleMock.applyRoleVisibility();
    }

    // ---- 行テンプレート ----
    function rowTemplate(d, initial) {
        const judge     = initial?.judge || '';
        const iecJudge  = initial?.iecJudge || '';
        const replace   = initial?.replace || null;
        const isNew     = d.isNew ? 'data-new="true"' : '';

        return `
        <div class="row transition-colors"
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
            <div class="row-main pc-grid ${isSupplier ? 'supplier-grid' : ''} items-center gap-4 py-3 px-4 hover:bg-blue-50/30 transition-colors">
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
                        <span class="ng-comment-flag hidden inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 rounded-full" title="判定NGのコースはコメントが必須です">
                            <span class="material-symbols-outlined" style="font-size:11px">priority_high</span>コメント必須
                        </span>
                    </div>
                </div>

                <div class="judge-mark flex justify-center"></div>

                <div class="flex items-center gap-2 pr-2">
                    <div class="replace-course flex-1 min-w-0"></div>
                </div>

                <div class="iec-judge-area flex items-center justify-center gap-0.5" data-visible-for="iec"></div>
            </div>

            <!-- NG行のコメント欄（唯一の入力箇所・行内インライン・判定NG時のみ展開） -->
            <div class="row-comment hidden"></div>
        </div>
        `;
    }

    function renderRows() {
        if (!Array.isArray(allData)) return;
        // 初期コメントを commentMap に投入（中断・復帰時の復元相当）
        INITIAL_COMMENTS.forEach((v, k) => { if (!commentMap.has(String(k))) commentMap.set(String(k), v); });
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
            // インラインコメント欄を反映（NG行のみ展開、他は非表示）
            renderRowComment(row);
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
        let visible = 0;
        Array.from(rowsEl.querySelectorAll('.row')).forEach(row => {
            const show = matchFilter(row);
            row.style.display = show ? '' : 'none';
            if (show) visible++;
        });
        // 空状態（データはあるが絞り込み結果が0件）
        const emptyEl = document.getElementById('empty-state');
        if (emptyEl) emptyEl.classList.toggle('hidden', !(allData.length > 0 && visible === 0));
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

    // スライドパネルはプレビュー閲覧専用。コース提案リスト（media-plan-course.js）と同一構造（読み取り専用）。
    // コメントの入力・保存は行わない（=行内インライン欄に一本化）。
    function renderSlidePanel(rowId, title, code, org, course, isReplace, std, custom) {
        activePanelRowId = rowId;
        const randomColor = ['bg-blue-100', 'bg-green-100', 'bg-indigo-100', 'bg-purple-100'][Math.floor(Math.random() * 4)];
        const randomIcon  = ['school', 'menu_book', 'cast_for_education', 'lightbulb'][Math.floor(Math.random() * 4)];
        const customTags  = String(custom || '').split(',').filter(x => x);

        panelContent.innerHTML = `
            <div class="relative">
                <div class="flex flex-col h-36 w-full ${randomColor} items-center justify-center text-blue-900/20">
                    <span class="material-symbols-outlined text-5xl">${randomIcon}</span>
                    <span class="text-xs text-gray-400 mt-2">サムネイルダミー</span>
                </div>
                ${isReplace ? '<div class="absolute top-2 left-2 bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded shadow">差し替え候補</div>' : ''}
            </div>

            <div class="p-5">
                <div class="mb-4">
                    ${std ? `<div class="mb-2"><span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 border border-blue-100">${std}</span></div>` : ''}
                    <h2 class="text-lg font-bold text-gray-800 leading-snug">${title}</h2>
                    <div class="mt-1 text-xs text-gray-500 font-mono">コード: ${code || ''}</div>
                </div>

                <div class="flex items-center gap-2 mb-5 text-sm text-gray-600">
                    <span class="material-symbols-outlined icon-sm text-gray-400">business</span>
                    <span>提供団体: <span class="font-medium text-gray-800">${org || ''}</span></span>
                </div>

                ${customTags.length ? `
                <div class="mb-5">
                    <h4 class="text-xs font-bold text-gray-700 mb-2">カスタムタグ</h4>
                    <div class="flex flex-wrap gap-1.5">
                        ${customTags.map(t =>
                            `<span class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-white text-gray-600 border border-gray-200 shadow-sm">${t}</span>`
                        ).join('')}
                    </div>
                </div>` : ''}

                ${buildOptionsHtml(course)}
            </div>
        `;

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
            markDirty();
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
            // 差し替え候補は当該フライヤーマスタの標準タグを表示。カスタムタグは募集枠側の属性のため表示しない。
            renderSlidePanel(row.dataset.id, title, code, org, mc || null, true, mc?.stdTag || '', '');
            return;
        }
        // 元コースプレビュー
        if (e.target.closest('.open-preview')) {
            const { id, title, code, org, std, custom } = row.dataset;
            const originalCourse = allData.find(d => String(d.id) === id);
            renderSlidePanel(id, title, code, org, originalCourse || null, false, std, custom);
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
        markDirty();
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
        markDirty();
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
        markDirty();
        closeRejectModal();
    });

    // ---- 判定を確定する（確認モーダル → 分岐実行）----
    function openDecisionModal() {
        const { accept, reject, unjudged, total } = getIecJudgementCounts();
        const fileCounts = getFileJudgeCounts();
        if (unjudged > 0 || fileCounts.unjudged > 0) return; // 念のため

        const isAllAccept = reject === 0 && fileCounts.reject === 0;

        if (isAllAccept) {
            // パターン1：全件受入
            decisionTitleText.textContent = '全件受入で確定します';
            decisionIcon.textContent = 'verified';
            decisionIcon.className = 'material-symbols-outlined icon-md text-blue-600';
            decisionSummary.textContent = `全 ${total} 件を受入で確定します（返送ファイルも全団体受入済み）。`;
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
            // パターン2：差戻混在（コース差戻 or ファイル差戻）
            const courseRejectOrgs = Array.from(rowsEl.querySelectorAll('.row'))
                .filter(r => r.dataset.iecJudge === 'reject')
                .map(r => r.dataset.org)
                .filter(Boolean);
            const fileRejectOrgs = Array.from(document.querySelectorAll('.file-vendor-row'))
                .filter(r => r.dataset.fileJudge === 'reject')
                .map(r => r.dataset.vendor)
                .filter(Boolean);
            const rejectOrgs = [...new Set([...courseRejectOrgs, ...fileRejectOrgs])];
            decisionTitleText.textContent = '差戻を確定し再依頼します';
            decisionIcon.textContent = 'reply';
            decisionIcon.className = 'material-symbols-outlined icon-md text-red-500';
            decisionSummary.textContent = `コース差戻 ${reject} 件 / ファイル差戻 ${fileCounts.reject} 社 で確定します。`;
            const orgList = rejectOrgs.length ? rejectOrgs.join('、') : '（団体名取得中）';
            decisionBullets.innerHTML = `
                <li>差戻対象の ${rejectOrgs.length} 社（${orgList}）の料金確認をリセットし、再依頼を発出します。</li>
                <li>ファイル差戻の団体はコース判定はそのまま、返送ファイルの再提出のみを依頼します。</li>
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
        clearDirty();
        if (mode === 'accept') {
            alert('全件受入で確定しました。募集一覧に戻ります。');
            // location.href = './media-plan-list.html';
        } else if (mode === 'reject') {
            alert('差戻を確定しました。対象 Vendor に再依頼メールが送信されます。');
            // location.href = './media-plan-list.html';
        }
    });

    // ---- 担当者・掲載情報設定モーダル ----
    const assignBtn          = document.getElementById('assign-btn');
    const assignModal        = document.getElementById('assign-modal');
    const closeAssignModalBtn  = document.getElementById('close-assign-modal');
    const cancelAssignModalBtn = document.getElementById('cancel-assign-modal');
    const saveAssignModalBtn   = document.getElementById('save-assign-modal');
    const assignBadgeUnset   = document.getElementById('assign-badge-unset');
    const assignBadgeDone    = document.getElementById('assign-badge-done');

    // モックユーザーリスト（実装時はサーバーから取得）
    const MOCK_USERS = [
        { value: '1', label: '山田 太郎' },
        { value: '2', label: '鈴木 花子' },
        { value: '3', label: '佐藤 次郎' },
    ];

    const appComboEl = document.getElementById('application-contact-combo');
    const payComboEl = document.getElementById('payment-contact-combo');

    const appCombo = appComboEl ? initCombobox(appComboEl, { items: MOCK_USERS }) : null;
    const payCombo = payComboEl ? initCombobox(payComboEl, { items: MOCK_USERS }) : null;

    function openAssignModal() {
        assignModal?.classList.remove('hidden');
        assignModal?.classList.add('flex');
    }

    function closeAssignModal() {
        assignModal?.classList.add('hidden');
        assignModal?.classList.remove('flex');
    }

    assignBtn?.addEventListener('click', openAssignModal);
    closeAssignModalBtn?.addEventListener('click', closeAssignModal);
    cancelAssignModalBtn?.addEventListener('click', closeAssignModal);
    assignModal?.addEventListener('click', (e) => { if (e.target === assignModal) closeAssignModal(); });

    saveAssignModalBtn?.addEventListener('click', () => {
        const appContact     = appCombo?.getValue();
        const payContact     = payCombo?.getValue();
        const contactName    = document.getElementById('contact-name')?.value.trim();
        const contactEmail   = document.getElementById('contact-email')?.value.trim();
        const contactPhone   = document.getElementById('contact-phone')?.value.trim();
        const contactAddress = document.getElementById('contact-address')?.value.trim();

        if (!appContact || !payContact || !contactName || !contactEmail || !contactPhone || !contactAddress) {
            alert('申込担当・請求担当・担当者名・メールアドレス・電話番号・住所は必須です。');
            return;
        }

        closeAssignModal();
        // バッジを「設定済み」に更新
        assignBadgeUnset?.classList.add('hidden');
        assignBadgeDone?.classList.remove('hidden');
        assignBadgeDone?.classList.add('inline-flex');
    });

    // ---- キャンセルポリシー確認 → 完了ボタン活性制御 ----
    // キャンセルポリシー同意は完了確認モーダル（M）内で取得する。
    // 同意は完了時点で確定するため遅延保存（markDirty）の対象外。
    const cancelPolicyChk    = document.getElementById('cancel-policy-confirm');
    const confirmCompleteBtn = document.getElementById('confirm-complete-btn');
    function updateCompleteModalBtn() {
        if (!confirmCompleteBtn) return;
        const ok = !!cancelPolicyChk?.checked;
        confirmCompleteBtn.disabled = !ok;
        confirmCompleteBtn.title = ok ? '' : 'キャンセルポリシーの確認にチェックしてください';
    }
    cancelPolicyChk?.addEventListener('change', updateCompleteModalBtn);
    updateCompleteModalBtn();

    // ---- 返送ファイルの IEC 判定（団体単位・受入/差戻）----
    function renderFileJudgeButtons(row) {
        const area = row.querySelector('.file-judge-area');
        if (!area) return;
        const state = row.dataset.fileJudge || '';
        const acceptActive = state === 'accept';
        const rejectActive = state === 'reject';
        area.innerHTML = `
            <button type="button" class="file-accept-btn p-1 rounded-full transition-colors ${acceptActive ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-green-500 hover:bg-green-50'}" title="受入">
                <span class="material-symbols-outlined" style="font-size:20px">check_circle</span>
            </button>
            <button type="button" class="file-reject-btn p-1 rounded-full transition-colors ${rejectActive ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}" title="差戻">
                <span class="material-symbols-outlined" style="font-size:20px">cancel</span>
            </button>
        `;
    }

    function getFileJudgeCounts() {
        const rows = Array.from(document.querySelectorAll('.file-vendor-row'));
        let unjudged = 0, reject = 0;
        rows.forEach(r => {
            const v = r.dataset.fileJudge || '';
            if (v === 'reject') reject++;
            else if (v !== 'accept') unjudged++;
        });
        return { unjudged, reject, total: rows.length };
    }

    // 折りたたみバーのサマリーバッジを判定状況に応じて更新
    function updateFileJudgeSummary() {
        const el = document.getElementById('file-judge-summary');
        if (!el) return;
        const { unjudged, reject } = getFileJudgeCounts();
        el.className = 'ml-auto shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border';
        if (unjudged > 0) {
            el.classList.add('bg-amber-50', 'text-amber-700', 'border-amber-200');
            el.textContent = `未判定 ${unjudged}件`;
        } else if (reject > 0) {
            el.classList.add('bg-red-50', 'text-red-700', 'border-red-200');
            el.textContent = `差戻 ${reject}件`;
        } else {
            el.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
            el.textContent = '判定済み';
        }
    }

    document.getElementById('file-judge-list')?.addEventListener('click', (e) => {
        const row = e.target.closest('.file-vendor-row');
        if (!row) return;
        if (e.target.closest('.file-accept-btn')) {
            row.dataset.fileJudge = (row.dataset.fileJudge === 'accept') ? '' : 'accept';
            delete row.dataset.fileRejectComment;
            renderFileJudgeButtons(row);
            updateConfirmDecisionBtn();
            markDirty();
            return;
        }
        if (e.target.closest('.file-reject-btn')) {
            if (row.dataset.fileJudge === 'reject') {
                row.dataset.fileJudge = '';
                renderFileJudgeButtons(row);
                updateConfirmDecisionBtn();
                markDirty();
                return;
            }
            const reason = prompt(`${row.dataset.vendor} の返送ファイルを差戻します。理由を入力してください（添付漏れ・不備など）`, '');
            if (reason === null) return; // キャンセル
            if (!reason.trim()) { alert('差戻理由は必須です。'); return; }
            row.dataset.fileJudge = 'reject';
            row.dataset.fileRejectComment = reason;
            renderFileJudgeButtons(row);
            updateConfirmDecisionBtn();
            markDirty();
        }
    });

    // 初期描画
    document.querySelectorAll('.file-vendor-row').forEach(renderFileJudgeButtons);
    updateFileJudgeSummary();

    // ---- 変更を保存する（遅延保存：一覧上の編集をまとめて確定）----
    document.getElementById('save-btn')?.addEventListener('click', () => {
        if (!isDirty) return;
        // モック: 保存処理をシミュレート（実際はAPIで判定・差し替え・コメント等を一括UPSERT）
        clearDirty();
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

    // ---- 料金確認を完了する ----
    // 完了確認モーダル（M）: ポリシー同意を取り、完了を確定する
    const completeModal = document.getElementById('complete-modal');
    function openCompleteModal() {
        completeModal?.classList.remove('hidden');
        completeModal?.classList.add('flex');
        updateCompleteModalBtn();
    }
    function closeCompleteModal() {
        completeModal?.classList.add('hidden');
        completeModal?.classList.remove('flex');
    }
    completeBtn?.addEventListener('click', openCompleteModal);
    document.getElementById('close-complete-modal')?.addEventListener('click', closeCompleteModal);
    document.getElementById('cancel-complete-modal')?.addEventListener('click', closeCompleteModal);
    completeModal?.addEventListener('click', (e) => { if (e.target === completeModal) closeCompleteModal(); });
    confirmCompleteBtn?.addEventListener('click', () => {
        if (!cancelPolicyChk?.checked) return;
        // 実装では担当者・掲載情報設定・全件判定・NGコメント等のバリデーションを実施する
        clearDirty();
        closeCompleteModal();
        alert('料金確認を完了しました。募集一覧に戻ります。');
        // location.href = './media-plan-list.html';
    });

    // ---- 差し替えモーダル ----
    const modalStdFilter   = document.getElementById('modal-std-filter');
    const modalShowExclusive = document.getElementById('modal-show-exclusive');
    const modalTotalCount  = document.getElementById('modal-total-count');
    const modalFilteredCount = document.getElementById('modal-filtered-count');

    function buildOptionPopover(options) {
        if (!options || !options.length) return '';
        const nf = new Intl.NumberFormat('ja-JP');
        // 「選択肢なし」（1件のみでオプション名が空）の場合は「オプション」列を表示しない
        const isNoOption = options.length === 1 && !options[0].name;
        const rows = options.map(o => `
            <tr class="border-b border-gray-100 last:border-0">
                ${isNoOption ? '' : `<td class="py-1 pr-3 text-gray-700 whitespace-nowrap">${o.name || '-'}</td>`}
                <td class="py-1 pr-3 text-gray-500 whitespace-nowrap">${o.length || '-'}</td>
                <td class="py-1 text-gray-700 whitespace-nowrap text-right">¥${typeof o.price === 'number' ? nf.format(o.price) : (o.price || '-')}</td>
            </tr>`).join('');
        return `
            <div class="hidden group-hover/opt:block absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-72 pointer-events-none text-left">
                <div class="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wide">オプション</div>
                <table class="w-full text-xs">
                    <thead>
                        <tr class="text-gray-400 border-b border-gray-100">
                            ${isNoOption ? '' : `<th class="pb-1 pr-3 text-left font-normal">オプション</th>`}
                            <th class="pb-1 pr-3 text-left font-normal">期間</th>
                            <th class="pb-1 text-right font-normal">受講料</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    function populateModalStdFilter() {
        if (!modalStdFilter) return;
        const stdSet = new Set(modalData.flatMap(d => (d.stdTag ? d.stdTag.split(',') : [])).filter(Boolean));
        modalStdFilter.innerHTML = `<option value="">標準タグ: 指定なし</option>` +
            [...stdSet].map(t => `<option value="${t}">${t}</option>`).join('');
    }

    function renderModalList() {
        if (!modalRows) return;
        const v = (modalQ?.value || '').toLowerCase();
        const std = modalStdFilter?.value || '';
        const showExclusive = modalShowExclusive?.checked || false;

        const population = modalData.filter(d => showExclusive || !d.exclusive);
        const filtered = population.filter(d => {
            const hay = ((d.title || '') + ' ' + (d.code || '') + ' ' + (d.org || '')).toLowerCase();
            if (v && !hay.includes(v)) return false;
            if (std && !(d.stdTag || '').split(',').includes(std)) return false;
            return true;
        });

        if (modalTotalCount) modalTotalCount.textContent = population.length;
        if (modalFilteredCount) modalFilteredCount.textContent = filtered.length;

        modalRows.innerHTML = filtered.length === 0
            ? '<div class="p-6 text-sm text-gray-500 text-center">該当するコースがありません</div>'
            : filtered.map(d => {
                const optCount = d.options?.length ?? 0;
                const optBadge = optCount > 0
                    ? `<div class="relative group/opt flex justify-center">
                           <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 cursor-default">${optCount}件</span>
                           ${buildOptionPopover(d.options)}
                       </div>`
                    : `<span class="text-xs text-gray-400 flex justify-center">−</span>`;
                const stdList = d.stdTag ? d.stdTag.split(',').filter(Boolean) : [];
                const stdBadge = stdList.length
                    ? stdList.slice(0, 2).map(t => `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-100 truncate">${t}</span>`).join('') + (stdList.length > 2 ? `<span class="text-[10px] text-gray-400 shrink-0">+${stdList.length - 2}</span>` : '')
                    : '';
                const exclusiveBadge = d.exclusive
                    ? `<span class="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200" title="企業専用コース">企業専用</span>`
                    : '';
                // 本モーダルは承認済バージョンを持つフライヤーのみのためプレビューは常にアクティブ
                const previewCell = `<a href="./course-master.html?preview=${encodeURIComponent(d.code || '')}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="flex justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded p-1 transition-colors" title="プレビューを別タブで開く"><span class="material-symbols-outlined icon-md">open_in_new</span></a>`;
                return `
                    <label class="grid grid-cols-[3rem_1fr_9rem_7rem_7rem_5rem_5rem] items-center px-6 py-3 hover:bg-blue-50 cursor-pointer transition-colors">
                        <div class="flex justify-center">
                            <input type="radio" name="modalCourse" class="modal-sel accent-blue-600" data-id="${d.id}">
                        </div>
                        <div class="flex items-center gap-1.5 min-w-0">
                            <span class="text-sm font-medium text-gray-900 truncate">${d.title || ''}</span>
                            ${exclusiveBadge}
                        </div>
                        <span class="text-xs text-gray-500 font-mono truncate">${d.code || ''}</span>
                        <span class="text-xs text-gray-500 truncate">${d.org || ''}</span>
                        <div class="flex flex-wrap gap-1 items-start">${stdBadge}</div>
                        ${optBadge}
                        ${previewCell}
                    </label>
                `;
            }).join('');
    }

    function openCourseModal(targetRow) {
        currentReplaceTargetRow = targetRow || null;
        if (!courseModal) return;
        courseModal.classList.remove('hidden');
        courseModal.classList.add('flex');
        if (modalQ) modalQ.value = '';
        if (modalStdFilter) modalStdFilter.value = '';
        if (modalShowExclusive) modalShowExclusive.checked = false;
        populateModalStdFilter();
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
    modalStdFilter?.addEventListener('change', renderModalList);
    modalShowExclusive?.addEventListener('change', renderModalList);

    addSelectedBtn?.addEventListener('click', () => {
        if (!currentReplaceTargetRow) { closeCourseModal(); return; }
        const selected = document.querySelector('.modal-sel:checked');
        if (!selected) { closeCourseModal(); return; }
        const id     = Number(selected.dataset.id);
        const course = modalData.find(d => Number(d.id) === id);
        if (course) { applyReplaceCourse(currentReplaceTargetRow, course); markDirty(); }
        closeCourseModal();
    });

    // ---- データ初期化 ----
    const normalizeCourseMaster = d => {
        const stdTagNames = (d.standardTagIds || [])
            .map(id => STANDARD_TAGS.find(t => t.id === id)?.name)
            .filter(Boolean);
        return {
            id:      d.id,
            title:   d.name || '',
            code:    d.tkfCode || d.hanCode || '',
            org:     d.org || '',
            stdTag:  stdTagNames.join(','),
            exclusive: d.exclusiveFlg === true,   // 企業専用コース
            options: Array.isArray(d.courses)
                ? d.courses.map(c => ({ id: c.sortNo, name: c.name || '', price: c.price ?? 0, length: c.period ? `${c.period}か月` : '-' }))
                : [],
        };
    };

    const initModalData = () => {
        const raw = courseMasterData || [];
        // 自社かつ IEC 承認済バージョンを持つフライヤーのみ（IEC未承認コースは表示しない）
        const filtered = raw.filter(d =>
            d.eduCode !== 'IEC' && APPROVED_COMPOSITE.includes(d.compositeStatus)
        );
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

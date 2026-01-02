// =========================================================
// モックデータ読み込み (fetch廃止 -> importに変更)
// =========================================================
import { selectedCourseData } from '../data/selected-course-data.js';
import { courseMasterData } from '../data/course-master-data.js';

window.addEventListener('DOMContentLoaded', () => {
    // --- 共通UI（ヘッダー / サイドバー） ---
    const params = new URLSearchParams(location.search);
    const initialRole = params.get('role') || 'supplier';

    if (window.MockUI) {
        MockUI.injectHeader('#app-header', {
            userName: 'Test User',
            brand: 'New SD App',
            initialRole
        });
        MockUI.injectSidebar('#app-sidebar');
    }
    if (window.RoleMock) RoleMock.applyRoleVisibility();

    // --- DOM参照 ---
    const rowsEl     = document.getElementById('rows');
    const skeletonEl = document.getElementById('skeleton');
    const listEl     = document.getElementById('list');
    const preview    = document.getElementById('preview');

    const bulkbar       = document.getElementById('bulkbar');
    const bulkPlaceholder = document.getElementById('bulk-placeholder');
    const selCountSpan  = document.getElementById('selCount');
    const clearSelectionBtn = document.getElementById('clearSelection');
    const markOKBtn     = document.getElementById('markOK');
    const markNGBtn     = document.getElementById('markNG');
    const qInput        = document.getElementById('q');
    const selectAllCheckbox = document.getElementById('selectAll');

    // モーダル関連
    const courseModal          = document.getElementById('course-modal');
    const closeCourseModalBtn  = document.getElementById('close-course-modal');
    const cancelCourseModalBtn = document.getElementById('cancel-course-modal');
    const addSelectedBtn       = document.getElementById('add-selected-courses');
    const modalSelectedCount   = document.getElementById('modal-selected-count');
    const modalRows            = document.getElementById('modal-rows');
    const modalQ               = document.getElementById('modal-q');

    // --- データ保持 ---
    let allData = [];            
    let modalData = [];          
    const commentMap = new Map(); // id → コメント文字列

    // 「いま差し替えを設定中の行」
    let currentReplaceTargetRow = null;

    // ---- グリッド（ヘッダー／行） ----
    const GRID_COLS = 'grid-cols-[3rem_1fr_6rem_1fr]'; // チェック / コース / 判定 / 差し替え

    // ヘッダーのグリッドを書き換え
    const headerEl = document.querySelector('#list')?.previousElementSibling;
    if (headerEl) {
        const toRemove = [];
        headerEl.classList.forEach(c => {
            if (c.startsWith('grid-cols-[')) toRemove.push(c);
        });
        toRemove.forEach(c => headerEl.classList.remove(c));
        headerEl.classList.add('grid', GRID_COLS);
    }

    // ---- 共通ヘルパ ----

    function getSelectedRows() {
        return Array.from(document.querySelectorAll('#rows .sel:checked'))
            .map(c => c.closest('.row'))
            .filter(Boolean);
    }

    function refreshBulkbar() {
        const selected = getSelectedRows();
        const count = selected.length;
        if(selCountSpan) selCountSpan.textContent = count;
        
        // デザインに合わせた表示切り替え
        if (count > 0) {
            if(bulkbar) bulkbar.classList.remove('hidden');
            if(bulkPlaceholder) bulkPlaceholder.classList.add('hidden');
        } else {
            if(bulkbar) bulkbar.classList.add('hidden');
            if(bulkPlaceholder) bulkPlaceholder.classList.remove('hidden');
        }
    }

    function getVisibleCheckboxes() {
        return Array.from(document.querySelectorAll('#rows .sel'))
            .filter(c => {
                const row = c.closest('.row');
                return row && row.style.display !== 'none';
            });
    }

    function updateSelectAllState() {
        if (!selectAllCheckbox) return;
        const visibleCheckboxes = getVisibleCheckboxes();
        if (!visibleCheckboxes.length) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
            return;
        }

        const checkedCount = visibleCheckboxes.filter(c => c.checked).length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < visibleCheckboxes.length;
        selectAllCheckbox.checked = checkedCount > 0 && checkedCount === visibleCheckboxes.length;
    }

    function findCourseByRowId(rowId) {
        if (!allData || !allData.length) return null;
        return allData.find(c => String(c.id) === String(rowId)) || null;
    }

    function buildOptionsHtml(course) {
        if (!course || !Array.isArray(course.options) || course.options.length === 0) {
            return `
                <div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-500 text-center">
                    オプション情報はありません
                </div>
            `;
        }

        const nf = new Intl.NumberFormat('ja-JP');

        return `
            <div class="mt-6">
                <h4 class="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1">
                    <span class="material-symbols-outlined icon-sm text-gray-400">layers</span>
                    オプション講座
                </h4>
                <div class="flex flex-col gap-2">
                    ${course.options.map(o => {
                        const name = (o.name && o.name.trim()) ? o.name : `オプション${o.id}`;
                        const length = o.length || "-";
                        const priceText = (typeof o.price === "number")
                            ? nf.format(o.price)
                            : (o.price || "-");

                        return `
                            <div class="p-3 bg-gray-50 rounded-md border border-gray-100 hover:border-blue-200 transition-colors">
                                <div class="text-sm font-bold text-gray-800">${name}</div>
                                <div class="mt-2 flex items-center gap-4 text-xs text-gray-600">
                                    <div class="flex items-center gap-1">
                                        <span class="material-symbols-outlined text-[14px] text-gray-400">schedule</span>
                                        ${length}
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <span class="material-symbols-outlined text-[14px] text-gray-400">payments</span>
                                        ¥${priceText}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }

    // --- 判定UI ----
    function setJudge(row, value) {
        // value: 'ok' | 'ng' | null
        const cell = row.querySelector('.judge-mark');
        if (!cell) return;
        row.dataset.judge = value || '';

        cell.innerHTML = '';
        if (value === 'ok') {
            const span = document.createElement('span');
            span.className = 'judge-badge inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-bold';
            span.textContent = 'OK';
            cell.appendChild(span);
        } else if (value === 'ng') {
            const span = document.createElement('span');
            span.className = 'judge-badge inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold';
            span.textContent = 'NG';
            cell.appendChild(span);
        }
    }

    // --- 差し替えUI ----
    function createReplaceButton(row) {
        const container = row.querySelector('.replace-course');
        if (!container) return;
        container.innerHTML = '';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'replace-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors';
        btn.innerHTML = `
            <span class="material-symbols-outlined icon-sm">swap_horiz</span>
            <span>差し替え登録</span>
        `;
        container.appendChild(btn);
    }

    function clearReplace(row) {
        // datasetクリア
        delete row.dataset.replaceCourseId;
        delete row.dataset.replaceCourseTitle;
        delete row.dataset.replaceCourseCode;
        delete row.dataset.replaceCourseOrg;

        const container = row.querySelector('.replace-course');
        if (!container) return;
        container.innerHTML = '';

        // まだNG判定なら＋ボタンだけ復活
        if (row.dataset.judge === 'ng') {
            createReplaceButton(row);
        }
    }

    function applyReplaceCourse(row, course) {
        if (!row || !course) return;

        row.dataset.replaceCourseId = String(course.id ?? '');
        row.dataset.replaceCourseTitle = course.title || '';
        row.dataset.replaceCourseCode = course.code || '';
        row.dataset.replaceCourseOrg = course.org || '';

        const container = row.querySelector('.replace-course');
        if (!container) return;

        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center gap-2 w-full p-2 bg-yellow-50 rounded border border-yellow-200';
        wrapper.innerHTML = `
            <span class="material-symbols-outlined text-yellow-600 icon-sm shrink-0">arrow_forward</span>
            <div class="min-w-0 flex-1">
                <button type="button" class="open-preview-replace text-xs font-bold text-gray-900 truncate hover:text-blue-600 hover:underline text-left block w-full">
                    ${course.title || ''}
                </button>
                <div class="text-[10px] text-gray-500 truncate">${course.code || ''}</div>
            </div>
            <div class="flex flex-col gap-1 shrink-0">
                <button type="button" class="change-replace text-[10px] text-blue-600 hover:underline">変更</button>
                <button type="button" class="clear-replace text-[10px] text-gray-400 hover:text-red-500 hover:underline">削除</button>
            </div>
        `;
        container.appendChild(wrapper);
    }

    // ---- 行テンプレート ----
    function rowTemplate(d) {
        const customTags = Array.isArray(d.custom)
            ? d.custom
            : String(d.custom || '').split(',').filter(x => x);

        return `
        <div class="row grid ${GRID_COLS} items-center gap-4 py-3 px-4 border-b border-gray-50 hover:bg-blue-50/30 transition-colors group"
            data-id="${d.id}"
            data-title="${d.title || ''}"
            data-code="${d.code || ''}"
            data-org="${d.org || ''}"
            data-std="${d.stdTag || ''}"
            data-custom="${customTags.join(',')}"
            data-judge=""
            data-visible-for="iec,customer,supplier"
        >
            <div class="flex items-center justify-center">
                <input type="checkbox" class="sel rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer">
            </div>

            <div class="flex flex-col min-w-0 pr-2">
                <button type="button" class="text-left text-sm font-bold text-gray-800 hover:text-blue-600 hover:underline truncate transition-colors open-preview">
                    ${d.title || ''}
                </button>
                <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-xs text-gray-400 font-mono" data-col="code">${d.code || ''}</span>
                    <span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded">${d.org || ''}</span>
                </div>
            </div>

            <div class="judge-mark flex justify-center"></div>

            <div class="replace-course pr-2"></div>
        </div>
        `;
    }

    function renderRows() {
        if (!Array.isArray(allData)) return;
        rowsEl.innerHTML = '';
        const frag = document.createDocumentFragment();
        allData.forEach(d => {
            const wrap = document.createElement('div');
            wrap.innerHTML = rowTemplate(d);
            frag.appendChild(wrap.firstElementChild);
        });
        rowsEl.appendChild(frag);
        if (window.RoleMock) RoleMock.applyRoleVisibility();
        applyFilter();
    }

    // ---- 検索フィルタ ----
    function matchFilter(row, text) {
        const hay = (
            (row.dataset.title || '') + ' ' +
            (row.dataset.code || '') + ' ' +
            (row.dataset.org || '') + ' ' +
            (row.dataset.std || '') + ' ' +
            (row.dataset.custom || '')
        ).toLowerCase();

        return hay.includes(text);
    }

    function applyFilter() {
        const text = (qInput?.value || '').toLowerCase();
        Array.from(document.querySelectorAll('#rows .row')).forEach(row => {
            row.style.display = matchFilter(row, text) ? '' : 'none';
        });
        updateSelectAllState();
    }

    // ---- 詳細ビュー＋コメント ----
    listEl.addEventListener('click', (e) => {
        // 1. 差し替えボタン系
        const row = e.target.closest('.row');

        if (row) {
            if (e.target.closest('.replace-btn') || e.target.closest('.change-replace')) {
                openCourseModal(row);
                return;
            }
            if (e.target.closest('.clear-replace')) {
                clearReplace(row);
                return;
            }
        }

        // 2) 差し替え後コースのプレビュー
        const replacePreviewBtn = e.target.closest('.open-preview-replace');
        if (replacePreviewBtn && row) {
            const rowId = row.dataset.id;
            const replaceId = row.dataset.replaceCourseId;
            if (!replaceId) return;

            const course = modalData.find(d => String(d.id) === String(replaceId));
            if (!course) return;

            const title  = course.title || '';
            const code   = course.code || '';
            const org    = course.org  || '';
            const std    = course.stdTag || '';
            const custom = row.dataset.custom || '';

            renderPreviewPanel(rowId, title, code, org, std, custom, course, true);
            return;
        }

        // 3) 元コースのプレビュー
        const originalPreviewBtn = e.target.closest('.open-preview');
        if (originalPreviewBtn && row) {
             // 差し替え済みなら無視
            if (row.dataset.replaceCourseId) return;

            const { id, title, code, org, std, custom } = row.dataset;
            const originalCourse = findCourseByRowId(id);

            renderPreviewPanel(id, title, code, org, std, custom, originalCourse, false);
        }
    });

    // ---- ★ 復元：チェックボックス変更（Shift+Click対応） ----
    let lastChecked = null; // 最後に操作したチェックボックス

    listEl.addEventListener('click', (e) => {
        // .sel クラスのクリックのみ対象
        if (!e.target.classList.contains('sel')) return;

        const checkboxes = getVisibleCheckboxes();
        const current = e.target;
        
        // Shiftキーが押されていて、かつ前回チェックしたものがある場合
        if (e.shiftKey && lastChecked) {
            const start = checkboxes.indexOf(lastChecked);
            const end = checkboxes.indexOf(current);

            if (start !== -1 && end !== -1) {
                const low = Math.min(start, end);
                const high = Math.max(start, end);

                for (let i = low; i <= high; i++) {
                    checkboxes[i].checked = current.checked; // 最後の操作（ON/OFF）に合わせる
                }
            }
        }

        lastChecked = current;
        refreshBulkbar();
        updateSelectAllState();
    });

    // ---- ★ 復元：Shift+矢印キーでの範囲選択 ----
    let anchorIndex = null;
    let focusIndex = null;
    
    function getRowElements() { 
        // 表示されている行のみ取得
        return Array.from(rowsEl.querySelectorAll('.row')).filter(r => r.style.display !== 'none');
    }

    // 行クリックで起点をセット
    rowsEl.addEventListener('click', (e) => {
        const row = e.target.closest('.row');
        if (!row) return;
        const rows = getRowElements();
        const idx = rows.indexOf(row);
        if (idx !== -1) {
            anchorIndex = idx;
            focusIndex = idx;
        }
    });

    // キーボード操作
    window.addEventListener('keydown', (e) => {
        // 入力フォーム等では無効化
        const tag = (e.target.tagName || '').toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag)) return;
        
        if (!e.shiftKey) return;

        const rows = getRowElements();
        if (!rows.length) return;

        // 起点がなければ現在のチェック状態から推測、または先頭
        if (anchorIndex === null) {
             const firstChecked = rows.findIndex(r => r.querySelector('.sel:checked'));
             anchorIndex = firstChecked !== -1 ? firstChecked : 0;
        }
        if (focusIndex === null) focusIndex = anchorIndex;

        let newFocus = focusIndex;
        if (e.key === 'ArrowDown') {
            if (newFocus < rows.length - 1) newFocus++; else return;
        } else if (e.key === 'ArrowUp') {
            if (newFocus > 0) newFocus--; else return;
        } else {
            return;
        }

        e.preventDefault();
        focusIndex = newFocus;

        const start = Math.min(anchorIndex, focusIndex);
        const end   = Math.max(anchorIndex, focusIndex);

        rows.forEach((row, idx) => {
            const sel = row.querySelector('.sel');
            if (sel) sel.checked = (idx >= start && idx <= end);
        });

        refreshBulkbar();
        updateSelectAllState();
        
        // フォーカス位置へスクロール（簡易）
        rows[focusIndex].scrollIntoView({ block: 'nearest' });
    });

    // ---- 既存イベントハンドラ ----

    selectAllCheckbox?.addEventListener('change', () => {
        const targets = getVisibleCheckboxes();
        targets.forEach(c => c.checked = selectAllCheckbox.checked);
        refreshBulkbar();
        updateSelectAllState();
    });

    clearSelectionBtn?.addEventListener('click', () => {
        document.querySelectorAll('#rows .sel:checked').forEach(c => c.checked = false);
        refreshBulkbar();
        updateSelectAllState();
    });

    // ---- 判定OKボタン ----
    markOKBtn?.addEventListener('click', () => {
        const rows = getSelectedRows();
        if (!rows.length) return;

        rows.forEach(row => {
            const current = row.dataset.judge;
            if (current === 'ok') {
                setJudge(row, null);
            } else {
                setJudge(row, 'ok');
            }
            if (row.dataset.judge === 'ok' || !row.dataset.judge) {
                clearReplace(row);
            }
        });

        document.querySelectorAll('#rows .sel:checked').forEach(c => c.checked = false);
        refreshBulkbar();
        updateSelectAllState();
    });

    // ---- 判定NGボタン ----
    markNGBtn?.addEventListener('click', () => {
        const rows = getSelectedRows();
        if (!rows.length) return;

        rows.forEach(row => {
            const current = row.dataset.judge;
            if (current === 'ng') {
                setJudge(row, null);
                clearReplace(row);
            } else {
                setJudge(row, 'ng');
                if (!row.dataset.replaceCourseId) {
                    createReplaceButton(row);
                }
            }
        });

        document.querySelectorAll('#rows .sel:checked').forEach(c => c.checked = false);
        refreshBulkbar();
        updateSelectAllState();
    });

    // ---- 全コースモーダル ----

    function renderModalList() {
        const v = (modalQ?.value || '').toLowerCase();
        modalRows.innerHTML = modalData
            .filter(d => (
                (d.title || '') + ' ' +
                (d.code || '') + ' ' +
                (d.org || '') + ' ' +
                (d.stdTag || '')
            ).toLowerCase().includes(v))
            .map(d => `
                <label class="grid grid-cols-[3rem_1fr_10rem] items-center px-6 py-3 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors">
                    <div class="flex justify-center">
                        <input type="radio"
                            name="modalCourse"
                            class="modal-sel accent-blue-600"
                            data-id="${d.id}">
                    </div>
                    <div class="min-w-0">
                        <div class="text-sm font-medium text-gray-900 truncate">${d.title || ''}</div>
                        <div class="text-xs text-gray-500 font-mono truncate">${d.code || ''}</div>
                    </div>
                    <div class="text-xs text-gray-500 truncate">${d.org || ''}</div>
                </label>
            `).join('');
            
         // モーダル内のラジオボタン変更検知
        if(modalSelectedCount) modalSelectedCount.textContent = document.querySelectorAll('.modal-sel:checked').length;
    }

    function openCourseModal(targetRow) {
        currentReplaceTargetRow = targetRow || null;
        if (!courseModal) return;
        courseModal.classList.remove('hidden');
        courseModal.classList.add('flex');

        // 検索リセット
        if (modalQ) modalQ.value = '';
        renderModalList();
    }

    function closeCourseModal() {
        if (!courseModal) return;
        courseModal.classList.add('hidden');
        courseModal.classList.remove('flex');
        currentReplaceTargetRow = null;
        // 選択状態もリセット
        document.querySelectorAll('.modal-sel:checked').forEach(c => c.checked = false);
        if(modalSelectedCount) modalSelectedCount.textContent = '0';
    }

    function renderPreviewPanel(rowId, title, code, org, std, custom, course, isReplace) {
        // options は「course.json 側のデータ」を使う
        const optionsHtml = buildOptionsHtml(course);
        const savedComment = commentMap.get(rowId) || '';

        // プレースホルダー画像
        const randomColor = ['bg-blue-100', 'bg-green-100', 'bg-orange-100'][Math.floor(Math.random()*3)];
        const randomIcon = isReplace ? 'swap_horiz' : 'school';

        preview.innerHTML = `
            <div class="relative">
                <div class="flex flex-col h-40 w-full ${randomColor} flex items-center justify-center text-blue-900/20">
                    <span class="material-symbols-outlined text-6xl">${randomIcon}</span>
                    <span class="text-xs text-gray-400 mt-2">コースサムネイルを表示予定<br>無い場合はこのようにランダムダミー</span>
                </div>
                ${isReplace ? '<div class="absolute top-2 left-2 bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded shadow">差し替え候補</div>' : ''}
            </div>
            <div class="p-6">
                <div class="flex items-start gap-3 mb-4">
                    <div class="flex-1">
                        
                        <h2 class="text-xl font-bold text-gray-800 leading-snug">${title}</h2>
                        <div class="mt-1 text-xs text-gray-500 font-mono">コード: ${code || ''}</div>
                    </div>
                </div>

                <div class="flex items-center gap-2 mb-6 text-sm text-gray-600">
                    <span class="material-symbols-outlined icon-sm text-gray-400">business</span>
                    <span>提供団体: <span class="font-medium text-gray-800">${org || ''}</span></span>
                </div>

                <div class="prose prose-sm text-gray-600 mb-6">
                    <p>選択コースに関する50文字、100文字コメントをここに表示</p>
                </div>
                
                ${optionsHtml}

                <div class="mt-8 pt-6 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 px-6 pb-6">
                    <div class="flex justify-between items-center mb-4">
                        <label class="block text-sm font-bold text-gray-700">コースに関するコメント</label>
                         <a href="#" class="inline-flex text-xs items-center gap-0.5 text-blue-600 hover:underline">
                            プレビュー <span class="material-symbols-outlined text-[12px]">open_in_new</span>
                        </a>
                    </div>
                    <textarea
                        id="course-comment"
                        class="w-full min-h-[80px] rounded-md border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y bg-white"
                        placeholder="修了判定条件などがお客様希望に沿えない場合、その理由などを記載してください。"
                    ></textarea>
                    
                    <div class="mt-4 flex justify-end gap-2">
                         <button class="px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors shadow-sm">
                            リセット
                        </button>
                        <button class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm hover:shadow transition-all">
                            保存する
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (window.RoleMock) RoleMock.applyRoleVisibility();

        const textarea = preview.querySelector('#course-comment');
        if (textarea) {
            textarea.value = savedComment;
            textarea.addEventListener('input', () => {
                commentMap.set(rowId, textarea.value);
            });
        }
    }


    closeCourseModalBtn?.addEventListener('click', closeCourseModal);
    cancelCourseModalBtn?.addEventListener('click', closeCourseModal);
    courseModal?.addEventListener('click', (e) => {
        if (e.target === courseModal) closeCourseModal();
    });
    modalQ?.addEventListener('input', renderModalList);
    modalRows?.addEventListener('change', (e) => {
        if (e.target.classList.contains('modal-sel')) {
            if(modalSelectedCount) modalSelectedCount.textContent = document.querySelectorAll('.modal-sel:checked').length;
        }
    });

    // 「追加」ボタン：差し替えコース設定専用（通常のコース追加はしない）
    addSelectedBtn?.addEventListener('click', () => {
        if (!currentReplaceTargetRow) {
            closeCourseModal();
            return;
        }

        const selected = document.querySelector('.modal-sel:checked');
        if (!selected) {
            closeCourseModal();
            return;
        }

        const id = Number(selected.dataset.id);
        const course = modalData.find(d => Number(d.id) === id);
        if (course) {
            applyReplaceCourse(currentReplaceTargetRow, course);
        }

        closeCourseModal();
    });

    // =========================================================
    // ▼ データ初期化 (fetch廃止)
    // =========================================================

    // モーダルデータのロード
    const initModalData = () => {
        const data = courseMasterData || []; // importしたデータを使用
        if (initialRole === 'supplier') {
            modalData = data.filter(d => d.org === '他団体B');
        } else {
            modalData = data;
        }
    };

    // メインリストデータのロード
    const initMainList = () => {
        const data = selectedCourseData || []; // importしたデータを使用

        if (initialRole === 'supplier') {
            allData = data.filter(d => d.org === '他団体B');
        } else {
            allData = data;
        }

        // 初期描画
        skeletonEl.classList.add('hidden');
        if (allData.length === 0) {
            rowsEl.innerHTML = '<div class="p-4 text-sm text-gray-500">表示するデータがありません</div>';
        } else {
            renderRows();
        }
    };

    // 実行
    initModalData();
    initMainList();

    // 検索イベント
    qInput?.addEventListener('input', applyFilter);
});
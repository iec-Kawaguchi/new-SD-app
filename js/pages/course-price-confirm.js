// ./js/pages/course-price-confirm.js

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
    let allData = [];            // selected-list-sample.json から読み込み
    let modalData = [];          // course-master-sample.json から読み込み
    const commentMap = new Map(); // id → コメント文字列

    // 「いま差し替えを設定中の行」
    let currentReplaceTargetRow = null;

    // ---- グリッド（ヘッダー／行） ----
    const GRID_COLS = 'grid-cols-[2rem_1fr_6rem_1fr]'; // チェック / コース / 判定 / 差し替え

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
        selCountSpan.textContent = count;
        if (count > 0) {
            bulkbar.classList.remove('hidden');
        } else {
            bulkbar.classList.add('hidden');
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
                <div class="mt-4 text-sm text-gray-500">
                    オプション情報が未登録です。
                </div>
            `;
        }

        const nf = new Intl.NumberFormat('ja-JP');

        return `
            <div class="mt-4 flex flex-col gap-2">
                ${course.options.map(o => {
                    const name = (o.name && o.name.trim()) ? o.name : `オプション${o.id}`;
                    const length = o.length || "";
                    const priceText = (typeof o.price === "number")
                        ? nf.format(o.price)
                        : (o.price || "");

                    return `
                        <div>
                            <div>${name}</div>
                            <div class="m-2 text-gray-700 text-sm flex gap-4">
                                <div>受講期間：${length}</div>
                                <div>受講料：${priceText}</div>
                            </div>
                        </div>
                    `;
                }).join("")}
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
            span.className = 'judge-badge inline-flex items-center px-2 py-0.5 rounded-full bg-green-200 text-green-700 border border-green-300 text-xs';
            span.textContent = '判定OK';
            cell.appendChild(span);
        } else if (value === 'ng') {
            const span = document.createElement('span');
            span.className = 'judge-badge inline-flex items-center px-2 py-0.5 rounded-full bg-red-200 text-red-700 border border-red-300 text-xs';
            span.textContent = '判定NG';
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
        btn.className = 'replace-btn inline-flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 ';
        btn.innerHTML = `
            <span class="material-symbols-outlined text-sm">swap_horiz</span>
            <span>差し替えコースを登録する</span>
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
        wrapper.className = 'replace-slot flex items-center gap-3 text-xs text-gray-700';
        wrapper.innerHTML = `
        <div class="flex-1 min-w-0">
            <!-- ★ 差し替えコースのタイトルをクリック可能にする -->
            <button
                type="button"
                class="open-preview-replace text-sm font-medium truncate text-left hover:underline text-gray-900"
            >
                ${course.title || ''}
            </button>
            <div class="text-xs text-gray-400 truncate">
                ${(course.code || '')}
              
            </div>
        </div>
        <button type="button" class="change-replace text-blue-600 hover:underline">変更</button>
        <button type="button" class="clear-replace text-gray-400 hover:underline">クリア</button>
        `;
        container.appendChild(wrapper);
    }

    // ---- 行テンプレート ----
    function rowTemplate(d) {
        const customTags = Array.isArray(d.custom)
            ? d.custom
            : String(d.custom || '').split(',').filter(x => x);

        return `
        <div class="row grid ${GRID_COLS} items-center text-sm gap-4 py-3 px-4 border-b border-gray-100 hover:bg-gray-50 transition"
            data-id="${d.id}"
            data-title="${d.title || ''}"
            data-code="${d.code || ''}"
            data-org="${d.org || ''}"
            data-std="${d.stdTag || ''}"
            data-custom="${customTags.join(',')}"
            data-judge=""
            data-visible-for="iec,customer,supplier"
        >
            <!-- チェックボックス -->
            <label class="inline-flex items-center justify-center">
                <input type="checkbox" class="sel accent-blue-600">
            </label>

            <!-- コース名+コード -->
            <div class="flex flex-col min-w-0">
                <button type="button" class="flex text-left truncate hover:underline text-gray-900 font-medium open-preview">
                    ${d.title || ''}
                </button>
                <div class="text-gray-400 text-xs" data-col="code">${d.code || ''}</div>
            </div>

            <!-- 判定 -->
            <div class="judge-mark"></div>

            <!-- 差し替えコース -->
            <div class="replace-course"></div>
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
                // 差し替えモーダルを開く
                openCourseModal(row);
                return;
            }
            if (e.target.closest('.clear-replace')) {
                clearReplace(row);
                return;
            }
        }

        // 2) 差し替え後コースのプレビュー（★ 新規追加）
    const replacePreviewBtn = e.target.closest('.open-preview-replace');
    if (replacePreviewBtn && row) {
        const rowId = row.dataset.id;
        const replaceId = row.dataset.replaceCourseId;
        if (!replaceId) return;

        // 差し替えコースは modalData 側から取得
        const course = modalData.find(d => String(d.id) === String(replaceId));
        if (!course) return;

        const title  = course.title || '';
        const code   = course.code || '';
        const org    = course.org  || '';
        const std    = course.stdTag || '';
        const custom = row.dataset.custom || '';

        renderPreviewPanel(rowId, title, code, org, std, custom, course);
        return;
    }

    // 3) 元コースのプレビュー
    const originalPreviewBtn = e.target.closest('.open-preview');
    if (!originalPreviewBtn || !row) return;

    // ★ 差し替え済みなら「元コースのプレビューは出さない」
    if (row.dataset.replaceCourseId) {
        return;
    }

    const { id, title, code, org, std, custom } = row.dataset;

    // 元コースのデータは selected-list-sample.json 側から取得
    const originalCourse = findCourseByRowId(id);

    renderPreviewPanel(id, title, code, org, std, custom, originalCourse);
    });

    // ---- チェックボックス変更で一括バー更新 ----
    listEl.addEventListener('change', (e) => {
        if (e.target.classList.contains('sel')) {
            refreshBulkbar();
            updateSelectAllState();
        }
    });

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
                // トグル解除
                setJudge(row, null);
            } else {
                setJudge(row, 'ok');
            }
            // OKになったら差し替え情報はクリア
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
                // NG解除
                setJudge(row, null);
                clearReplace(row);
            } else {
                setJudge(row, 'ng');
                // まだ差し替えコースが無ければ＋ボタンを出す
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
                <label class="grid grid-cols-[1.5rem_1fr_10rem] items-center px-4 py-2 border-b hover:bg-gray-50 cursor-pointer">
                    <input type="radio"
                        name="modalCourse"
                        class="modal-sel accent-blue-600"
                        data-id="${d.id}">
                    <div class="min-w-0">
                        <div class="text-sm font-medium text-gray-900 truncate">${d.title || ''}</div>
                        <div class="text-xs text-gray-500 truncate">${d.code || ''}</div>
                    </div>
                    <div class="text-xs text-gray-500 truncate">${d.org || ''}</div>
                </label>
            `).join('');

        modalSelectedCount.textContent = document.querySelectorAll('.modal-sel:checked').length;
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
        modalSelectedCount.textContent = '0';
    }

    function renderPreviewPanel(rowId, title, code, org, std, custom, course) {
        // options は「course.json 側のデータ」を使う
        const optionsHtml = buildOptionsHtml(course);
        const savedComment = commentMap.get(rowId) || '';

        preview.innerHTML = `
            <div class="text-xs text-gray-500 mb-1">コース詳細</div>
            <h2 class="text-lg font-semibold text-gray-900 mb-1">${title}</h2>
            <div class="text-sm text-gray-600 mb-4">${code || ''} / ${org || ''}</div>

            <div class="flex flex-wrap gap-1 text-[11px] mb-4">
                ${(std || '').split(',').filter(t => t).map(t =>
                    `<span class="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-100">${t}</span>`
                ).join('')}

                ${(custom || '').split(',').filter(t => t).map(t =>
                    `<span class="rounded-full bg-gray-800 text-white px-2 py-0.5" data-visible-for="iec,customer">${t}</span>`
                ).join('')}
            </div>

            ${optionsHtml}

            <div class="mt-4">
                <a href="#" class="inline-flex text-sm items-center gap-1 text-blue-600 hover:underline">
                    HTMLを開く <span class="material-symbols-outlined text-sm">open_in_new</span>
                </a>
            </div>

            <div class="mt-6 border-t pt-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    コースに関するコメント
                </label>
                <textarea
                    id="course-comment"
                    class="w-full min-h-[80px] rounded-md border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                    placeholder="修了判定条件などがお客様希望に沿えない場合、その理由などを記載してください。"
                ></textarea>
            </div>

            <div class="mt-6 flex justify-end">
                <button class="py-1 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white">更新する</button>
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
            modalSelectedCount.textContent = document.querySelectorAll('.modal-sel:checked').length;
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

    // ---- JSON読込 ----

    // モーダル用 course-master-sample.json
    function loadModalData() {
        return fetch('course-master-sample.json')
            .then(res => {
                if (!res.ok) throw new Error('Modal JSON load failed');
                return res.json();
            })
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                if (initialRole === 'supplier') {
                    // supplier のときだけ 他団体B に絞り込み
                    modalData = arr.filter(d => d.org === '他団体B');
                } else {
                    modalData = arr;
                }
            })
            .catch(err => {
                console.error('Failed to load modal data:', err);
                modalData = [];
            });
    }

    loadModalData();

    // メインリスト用 selected-list-sample.json
    fetch('selected-list-sample.json')
        .then(res => {
            if (!res.ok) throw new Error('JSON load failed');
            return res.json();
        })
        .then(data => {
            if (initialRole === 'supplier') {
                // supplier のときだけ 他団体B に絞り込み
                allData = Array.isArray(data)
                    ? data.filter(d => d.org === '他団体B')
                    : [];
            } else {
                allData = Array.isArray(data) ? data : [];
            }

            skeletonEl.classList.add('hidden');
            renderRows();
        })
        .catch(err => {
            console.error(err);
            skeletonEl.classList.add('hidden');
            rowsEl.innerHTML = '<div class="p-4 text-sm text-red-600">サンプルデータ（JSON）の読み込みに失敗しました。</div>';
        });

    // 検索
    qInput?.addEventListener('input', applyFilter);
});

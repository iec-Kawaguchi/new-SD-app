// media-plan-course.js

// =========================================================
// モックデータ読み込み
// =========================================================
import { selectedCourseData } from '../data/selected-course-data.js';
import { courseMasterData } from '../data/course-master-data.js';
import { tagData } from '../data/tag-data.js';

window.addEventListener('DOMContentLoaded', () => {
    // --- URLパラメータから role を取得 ---
    const params = new URLSearchParams(location.search);
    const initialRole = params.get('role') || 'iec';

    // --- MockUI / RoleMock 初期化 ---
    if (window.MockUI) {
        MockUI.injectHeader('#app-header', { userName: 'Test User', brand: 'New SD App', initialRole: initialRole });
        MockUI.injectSidebar('#app-sidebar');
    }
    if (window.RoleMock) RoleMock.applyRoleVisibility();

    // --- DOM要素取得 ---
    const rowsEl = document.getElementById('rows');
    const skeletonEl = document.getElementById('skeleton');
    const listEl = document.getElementById('list');
    const preview = document.getElementById('preview');
    const selectAllCheckbox = document.getElementById('selectAll');

    // コース別コメント保存用（モック：メモリ上だけ）
    const commentMap = new Map();

    // ========= リストデータ管理 =========
    let allData = [];
    const CHUNK = 20;
    let loaded = 0;
    let dense = false; // trueなら行間を狭くする

    // --- グリッド定義 ---
    const GRID_COLS_FULL     = 'grid-cols-[3rem_4rem_4rem_1fr_6rem_4rem_8rem_15rem]';
    const GRID_COLS_SUPPLIER = 'grid-cols-[3rem_4rem_1fr_6rem_4rem_15rem]'; 

    function getGridColsClass() {
        return initialRole === 'supplier' ? GRID_COLS_SUPPLIER : GRID_COLS_FULL;
    }

    // --- ヘッダー側のグリッド調整 ---
    const headerEl = document.getElementById('list')?.previousElementSibling;
    if (headerEl && headerEl.classList.contains('grid')) {
        const toRemove = [];
        headerEl.classList.forEach(c => {
            if (c.startsWith('grid-cols-[')) toRemove.push(c);
        });
        toRemove.forEach(c => headerEl.classList.remove(c));
        headerEl.classList.add(getGridColsClass());

        if (initialRole === 'supplier') {
            const cols = headerEl.children;
            if(cols[2]) cols[2].classList.add('hidden'); // No
            if(cols[7]) cols[7].classList.add('hidden'); // CustomTag
        }
    }

    // --- 行順序の表示更新 ---
    function updateOrderLabels() {
        const rows = Array.from(rowsEl.querySelectorAll('.row'));
        rows.forEach((row, index) => {
            const label = row.querySelector('.order-value');
            if (label) {
                label.textContent = index + 1; 
            }
        });
    }

    // --- DOMの並び順をもとに allData を再構成 ---
    function reorderAllDataByDom() {
        const domRows = Array.from(rowsEl.querySelectorAll('.row'));
        const domIds = domRows.map(r => String(r.dataset.id));
        
        const loadedPart = allData.slice(0, loaded);
        const restPart   = allData.slice(loaded);
        
        const loadedMap = new Map(loadedPart.map(item => [String(item.id), item]));
        const reorderedLoaded = [];

        domIds.forEach(id => {
            const item = loadedMap.get(id);
            if (item) {
                reorderedLoaded.push(item);
                loadedMap.delete(id);
            }
        });
        
        loadedMap.forEach(item => reorderedLoaded.push(item));
        allData = reorderedLoaded.concat(restPart);
    }

    function findCourseByRowId(rowId) {
        if (!allData || !allData.length) return null;
        return allData.find(c => String(c.id) === String(rowId)) || null;
    }

    // --- オプション情報のHTML生成 ---
    function buildOptionsHtml(course) {
        if (!course || !Array.isArray(course.options) || course.options.length === 0) {
            return `<div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-500 text-center">オプション情報はありません</div>`;
        }
        const nf = new Intl.NumberFormat('ja-JP');
        return `
            <div class="mt-6">
                <h4 class="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1">
                    <span class="material-symbols-outlined icon-sm text-gray-400">layers</span>
                    オプション
                </h4>
                <div class="flex flex-col gap-2">
                    ${course.options.map(o => {
                        const name = (o.name && o.name.trim()) ? o.name : `オプション${o.id}`;
                        const length = o.length || "-";
                        const priceText = (typeof o.price === "number") ? nf.format(o.price) : (o.price || "-");
                        return `
                            <div class="p-3 bg-gray-50 rounded-md border border-gray-100 hover:border-blue-200 transition-colors">
                                <div class="text-sm font-bold text-gray-800">${name}</div>
                                <div class="mt-2 flex items-center gap-4 text-xs text-gray-600">
                                    <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px] text-gray-400">schedule</span>${length}</div>
                                    <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px] text-gray-400">payments</span>¥${priceText}</div>
                                </div>
                            </div>`;
                    }).join("")}
                </div>
            </div>`;
    }

    // ===== 行テンプレート生成 =====
    function rowTemplate(dense, d){
        const py = dense ? "py-2" : "py-3";
        const customTags = Array.isArray(d.custom) ? d.custom : String(d.custom || "").split(",").filter(x => x);

        const gridColsClass = getGridColsClass();
        const showOrderCol  = initialRole !== 'supplier';
        const showCustomCol = initialRole !== 'supplier';
        const isNew = d.isNew === true;
        const isDeleteRequested = (d.deleteRequested === '1' || d.deleteRequested === 1);

        // 背景色・スタイルの決定
        let rowBgClass = "";
        if (isDeleteRequested) rowBgClass = "bg-red-50/50 hover:bg-red-50";
        else rowBgClass = "hover:bg-blue-50/30";

        // アクションボタンの出し分け
        let actionBtnHtml = '';
        if (isNew) {
            // 【新規】物理削除（取り消し）
            actionBtnHtml = `
                <button class="delete-row-btn flex p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="提案を取り消す（リストから削除）">
                    <span class="material-symbols-outlined icon-md">close</span>
                </button>`;
        } else {
            // 【既存】削除希望フラグ
            const btnColor = isDeleteRequested ? "text-red-600 bg-red-100 border-red-200" : "text-gray-400 hover:text-red-600 hover:bg-red-50";
            actionBtnHtml = `
                <button class="request-delete-btn flex p-1.5 rounded border border-transparent transition-colors ${btnColor}" 
                    title="${isDeleteRequested ? '削除希望を取り下げる' : '削除希望を出す'}"
                    data-requested="${isDeleteRequested ? '1' : '0'}">
                    <span class="material-symbols-outlined icon-md">delete_sweep</span>
                </button>`;
        }

        // バッジ
        let statusBadge = "";
        if (isNew) {
            statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">NEW</span>`;
        } else {
            statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100">-</span>`;
        }

        // 削除希望バッジ（タイトル横）
        const deleteBadge = isDeleteRequested 
            ? `<span class="delete-badge ml-2 inline-flex items-center text-[0.6rem] px-2 rounded-full bg-red-100 text-red-600 border border-red-200">削除希望</span>`
            : '';

        return `
        <div class="row group grid ${gridColsClass} items-center ${py} px-4 border-b border-gray-100 transition-colors ${rowBgClass}"
            data-id="${d.id}"
            data-title="${d.title}" data-code="${d.code}" data-org="${d.org}"
            data-std="${d.stdTag}" data-custom="${customTags.join(",")}"
            data-is-new="${isNew}"
            data-delete-requested="${isDeleteRequested ? '1' : '0'}"
            data-visible-for="iec,customer,supplier">

            <div class="flex items-center justify-center">
                <input type="checkbox" class="sel rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer">
            </div>
            <div class="flex items-center justify-center">
                ${actionBtnHtml}
            </div>

            ${showOrderCol ? `
            <div class="flex items-center gap-1 text-xs font-mono text-gray-500" data-col="order">
                <span class="order-value w-5 text-right">${d.order ?? ""}</span>
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
                <div class="text-xs text-gray-400 font-mono mt-0.5" data-col="code">${d.code}</div>
            </div>
            
            <div class="text-xs text-gray-600 truncate" data-col="org">${d.org}</div>
            
            <div class="flex justify-center">${statusBadge}</div>
            
            <div class="flex items-center gap-1 flex-wrap" data-col="stdTag">
                ${d.stdTag ? `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 border border-blue-100 truncate max-w-full">${d.stdTag}</span>` : ''}
            </div>

            ${showCustomCol ? `
            <div class="flex items-center gap-1 flex-wrap" data-col="customTag">
                ${customTags.map(t=>`<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-white text-gray-600 border border-gray-200">${t}</span>`).join("")}
                <button class="add-tag-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-colors inline-flex items-center p-0.5 rounded hover:bg-blue-50" title="タグ追加">
                    <span class="material-symbols-outlined text-[16px]">add</span>
                </button>
            </div>` : ''}
        </div>`;
    }

    // ===== 検索＆フィルタロジック =====
    const q = document.getElementById('q');
    let activeFilter = null;

    function matchFilter(row){
        if(activeFilter === 'new') return row.dataset.isNew === 'true';
        return true;
    }

    function updateFilter(){
        const text = (q.value || '').toLowerCase();
        document.querySelectorAll('#rows .row').forEach(row=>{
            const hay = (row.dataset.title + ' ' + row.dataset.code + ' ' + row.dataset.org + ' ' + row.dataset.std + ' ' + row.dataset.custom).toLowerCase();
            const visible = hay.includes(text) && matchFilter(row);
            row.style.display = visible ? '' : 'none';
        });
        updateSelectAllState();
        refreshBulkbar(); // フィルタ変更時もバーの状態更新
    }

    q.addEventListener('input', updateFilter);
    document.querySelectorAll('[data-filter]').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
            document.querySelectorAll('[data-filter]').forEach(b => {
                b.classList.remove('bg-blue-50', 'text-blue-700', 'border-blue-200');
                b.classList.add('bg-white', 'text-gray-700', 'border-gray-200');
            });
            const v = btn.getAttribute('data-filter');
            if (activeFilter === v) {
                activeFilter = null;
            } else {
                if(v !== 'clear') {
                    activeFilter = v;
                    btn.classList.remove('bg-white', 'text-gray-700', 'border-gray-200');
                    btn.classList.add('bg-blue-50', 'text-blue-700', 'border-blue-200');
                } else {
                    activeFilter = null;
                }
            }
            updateFilter();
        });
    });

    // ===== データ描画 (チャンク追加) =====
    function appendChunk(){
        if (!allData.length || loaded >= allData.length) return;
        skeletonEl.classList.remove('hidden');
        setTimeout(()=>{
            const frag = document.createDocumentFragment();
            for(let i = 0; i < CHUNK && loaded < allData.length; i++, loaded++){
                const d = allData[loaded];
                const wrap = document.createElement('div');
                wrap.innerHTML = rowTemplate(dense, d);
                frag.appendChild(wrap.firstElementChild);
            }
            rowsEl.appendChild(frag);
            skeletonEl.classList.add('hidden');
            if (window.RoleMock) RoleMock.applyRoleVisibility(); 
            updateFilter();
            updateOrderLabels();
            updateSelectAllState();
        }, 50);
    }

    // ===== 無限スクロール =====
    let io = null;
    function initInfiniteScroll(){
        const sentinel = document.getElementById('sentinel');
        if (!sentinel) return;
        io = new IntersectionObserver((entries)=>{
            entries.forEach(e=>{ if(e.isIntersecting && loaded < allData.length) appendChunk(); });
        }, {root: listEl, rootMargin: '400px 0px'});
        io.observe(sentinel);
    }

    // ===== 一括操作バー & 選択制御 =====
    const bulkbar = document.getElementById('bulkbar'), selCount = document.getElementById('selCount');
    const defbar = document.getElementById('def-bar');
    
    // 一括操作ボタン
    const btnBulkPhysical = document.getElementById('bulk-delete-physical'); // HTMLに追加が必要なID
    const btnBulkRequest = document.getElementById('markDeleteRequest');

    function refreshBulkbar(){
        const checkedBoxes = document.querySelectorAll('#rows .sel:checked');
        const n = checkedBoxes.length;
        
        if(selCount) selCount.textContent = n;
        if(bulkbar) bulkbar.classList.toggle('hidden', n === 0);
        if(defbar) defbar.classList.toggle('hidden', n > 0);

        if (n === 0) return;

        // 選択内容の分析
        let hasNew = false;
        let hasExisting = false;

        checkedBoxes.forEach(chk => {
            const row = chk.closest('.row');
            if (!row) return;
            if (row.dataset.isNew === 'true') hasNew = true;
            else hasExisting = true;
        });

        // ボタン制御: 物理削除 (新規のみ可)
        if (btnBulkPhysical) {
            if (hasExisting) {
                btnBulkPhysical.disabled = true;
                btnBulkPhysical.classList.add('opacity-50', 'cursor-not-allowed');
                btnBulkPhysical.title = "既存コースが含まれているため、取り消しできません。既存コースには「削除希望」を使用してください。";
            } else {
                btnBulkPhysical.disabled = false;
                btnBulkPhysical.classList.remove('opacity-50', 'cursor-not-allowed');
                btnBulkPhysical.title = "選択した提案コースを取り消します";
            }
        }

        // ボタン制御: 削除希望 (既存のみ可)
        if (btnBulkRequest) {
            if (hasNew) {
                btnBulkRequest.disabled = true;
                btnBulkRequest.classList.add('opacity-50', 'cursor-not-allowed');
                btnBulkRequest.title = "新規コースが含まれています。新規コースは「提案取消」を使用してください。";
            } else {
                btnBulkRequest.disabled = false;
                btnBulkRequest.classList.remove('opacity-50', 'cursor-not-allowed');
                btnBulkRequest.title = "選択したコースに削除希望フラグを立てます";
            }
        }
    }

    function getVisibleCheckboxes(){
        return Array.from(document.querySelectorAll('#rows .sel')).filter(c => {
            const row = c.closest('.row');
            return row && row.style.display !== 'none';
        });
    }

    function updateSelectAllState(){
        if(!selectAllCheckbox) return;
        const visible = getVisibleCheckboxes();
        if(!visible.length){
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
            return;
        }
        const checkedCount = visible.filter(c => c.checked).length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < visible.length;
        selectAllCheckbox.checked = checkedCount > 0 && checkedCount === visible.length;
    }

    listEl.addEventListener('change', e=>{
        if(e.target.classList.contains('sel')){
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

    document.getElementById('clearSelection')?.addEventListener('click', ()=>{
        document.querySelectorAll('#rows .sel:checked').forEach(c=> c.checked=false);
        refreshBulkbar();
        updateSelectAllState();
    });

    // ===== アクション処理: 物理削除 (新規) =====
    // 1. 行ボタンでの削除
    listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.delete-row-btn');
        if (!btn) return;
        const row = btn.closest('.row');
        if (!row) return;

        // データ削除
        const id = row.dataset.id;
        const idx = allData.findIndex(d => String(d.id) === String(id));
        if (idx > -1) {
            allData.splice(idx, 1);
            loaded--; // 読み込み済みカウントを減らす
        }
        
        // DOM削除
        row.remove();
        updateOrderLabels();
        refreshBulkbar();
    });

    // 2. 一括削除ボタン
    btnBulkPhysical?.addEventListener('click', () => {
        const checked = document.querySelectorAll('#rows .sel:checked');
        if (!checked.length) return;
        if (btnBulkPhysical.disabled) return;

        const idsToRemove = [];
        checked.forEach(c => {
            const row = c.closest('.row');
            if(row) {
                idsToRemove.push(String(row.dataset.id));
                row.remove();
            }
        });

        // データから一括削除
        allData = allData.filter(d => !idsToRemove.includes(String(d.id)));
        loaded -= idsToRemove.length;

        updateOrderLabels();
        refreshBulkbar();
        updateSelectAllState();
    });

    // ===== アクション処理: 削除希望 (既存) =====
    // 1. 行ボタンでの削除希望トグル
    listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.request-delete-btn');
        if (!btn) return;
        const row = btn.closest('.row');
        if (!row) return;

        toggleDeleteRequest(row);
    });

    // 2. 一括削除希望ボタン
    btnBulkRequest?.addEventListener('click', () => {
        const checked = document.querySelectorAll('#rows .sel:checked');
        if (!checked.length) return;
        if (btnBulkRequest.disabled) return;

        checked.forEach(c => {
            const row = c.closest('.row');
            if (row) toggleDeleteRequest(row, true); // true = 強制ON（あるいはトグルさせる仕様なら第2引数なし）
        });
        
        // 一括操作後は選択解除
        checked.forEach(c => c.checked = false);
        refreshBulkbar();
        updateSelectAllState();
    });

    // 共通関数: 削除希望トグル
    function toggleDeleteRequest(row, forceState = null) {
        const current = row.dataset.deleteRequested === '1';
        // forceStateが指定されていればそれに従う、なければ反転
        const nextState = forceState !== null ? forceState : !current;

        // 状態が変わらないなら何もしない（一括操作などで既にONのものをONにする場合など）
        if (current === nextState && forceState !== null) return;

        // データ更新 (allData)
        const d = findCourseByRowId(row.dataset.id);
        if(d) d.deleteRequested = nextState ? 1 : 0;

        // DOM更新
        row.dataset.deleteRequested = nextState ? '1' : '0';
        
        // スタイル更新
        if (nextState) {
            row.classList.add('bg-red-50/50', 'hover:bg-red-50');
            row.classList.remove('hover:bg-blue-50/30');
        } else {
            row.classList.remove('bg-red-50/50', 'hover:bg-red-50');
            row.classList.add('hover:bg-blue-50/30');
        }

        // ボタンの見た目更新
        const btn = row.querySelector('.request-delete-btn');
        if(btn){
            if(nextState){
                btn.classList.add('text-red-600', 'bg-red-100', 'border-red-200');
                btn.classList.remove('text-gray-400', 'hover:text-red-600', 'hover:bg-red-50');
                btn.title = '削除希望を取り下げる';
            } else {
                btn.classList.remove('text-red-600', 'bg-red-100', 'border-red-200');
                btn.classList.add('text-gray-400', 'hover:text-red-600', 'hover:bg-red-50');
                btn.title = '削除希望を出す';
            }
        }

        // バッジ更新
        const titleBtn = row.querySelector('.open-preview');
        let badge = titleBtn.querySelector('.delete-badge');
        if (nextState && !badge) {
            badge = document.createElement('span');
            badge.className = 'delete-badge ml-2 inline-flex items-center text-[0.6rem] px-2 rounded-full bg-red-100 text-red-600 border border-red-200';
            badge.textContent = '削除希望';
            titleBtn.appendChild(badge);
        } else if (!nextState && badge) {
            badge.remove();
        }
    }


    // ===== 行移動 (先頭へ/末尾へ) =====
    ['moveTop', 'moveBottom'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            const allRows = Array.from(rowsEl.querySelectorAll('.row'));
            const selected = allRows.filter(r => r.querySelector('.sel:checked'));
            if (!selected.length) return;

            const others = allRows.filter(r => !selected.includes(r));
            const newOrder = id === 'moveTop' 
                ? [...selected, ...others] 
                : [...others, ...selected];

            rowsEl.innerHTML = '';
            newOrder.forEach(r => {
                const chk = r.querySelector('.sel');
                if (chk) chk.checked = false;
                rowsEl.appendChild(r);
            });

            reorderAllDataByDom();
            updateOrderLabels();
            refreshBulkbar();
            updateSelectAllState();
        });
    });

    // ===== 詳細プレビュー表示 =====
    listEl.addEventListener('click', (e)=>{
        const btn = e.target.closest('.open-preview');
        if(!btn) return;
        
        document.querySelectorAll('.row').forEach(r => r.classList.remove('bg-blue-50'));
        const row = btn.closest('.row');
        // 削除希望行の場合は赤背景優先、そうでなければ青選択色
        if(row.dataset.deleteRequested !== '1') {
            row.classList.add('bg-blue-50');
        }

        const { id, title, code, org, std, custom } = row.dataset;
        const course = findCourseByRowId(id);
        const optionsHtml = buildOptionsHtml(course);
        const savedComment = commentMap.get(id) || "";
        const isDeleteRequested = row.dataset.deleteRequested === '1';

        const randomColor = ['bg-blue-100', 'bg-green-100', 'bg-indigo-100', 'bg-purple-100'][Math.floor(Math.random()*4)];
        const randomIcon = ['school', 'menu_book', 'cast_for_education', 'lightbulb'][Math.floor(Math.random()*4)];

        // 削除希望状態に応じたメッセージ
        const deleteMsg = isDeleteRequested 
            ? `<div class="mb-4 p-3 bg-red-50 border border-red-100 rounded-md text-red-700 text-sm font-bold flex items-center gap-2">
                <span class="material-symbols-outlined icon-md">warning</span>
                このコースは削除希望が出されています
               </div>` 
            : '';

        preview.innerHTML = `
            <div class="relative">
                <div class="flex flex-col h-40 w-full ${randomColor} flex items-center justify-center text-blue-900/20">
                    <span class="material-symbols-outlined text-6xl">${randomIcon}</span>
                    <span class="text-xs text-gray-400 mt-2">サムネイルダミー</span>
                </div>
            </div>

            <div class="p-6">
                ${deleteMsg}
                <div class="flex items-start gap-3 mb-4">
                    <div class="flex-1">
                        <div class="flex gap-2 mb-2">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                ${std || '標準'}
                            </span>
                        </div>
                        <h2 class="text-xl font-bold text-gray-800 leading-snug">${title}</h2>
                        <div class="mt-1 text-xs text-gray-500 font-mono">コード: ${code}</div>
                    </div>
                </div>

                <div class="flex items-center gap-2 mb-6 text-sm text-gray-600">
                    <span class="material-symbols-outlined icon-sm text-gray-400">business</span>
                    <span>提供団体: <span class="font-medium text-gray-800">${org}</span></span>
                </div>

                <div class="prose prose-sm text-gray-600 mb-6">
                    <p>コース詳細に関する説明文がここに入ります。</p>
                </div>

                <div class="border-t border-gray-100 pt-4 mb-4">
                    <h4 class="text-xs font-bold text-gray-700 mb-2">追加タグ</h4>
                    <div class="flex flex-wrap gap-1.5">
                        ${String(custom).split(',').filter(x=>x).map(t => 
                            `<span class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-white text-gray-600 border border-gray-200 shadow-sm">${t}</span>`
                        ).join("")}
                        ${!custom ? '<span class="text-xs text-gray-400">タグ設定なし</span>' : ''}
                    </div>
                </div>

                ${optionsHtml}

                <div class="flex flex-col justify-between mt-6">
                    <h4 class="text-xs font-bold text-gray-700 mb-2">公開日設定</h4>
                    <div class="flex items-center gap-4">
                     
                        <input type="date" class="rounded-md border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <span class="flex text-sm text-gray-400">〜</span>                        
                        <input type="date" class="rounded-md border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">

                    
                    </div>
                </div>
                <div class="mt-8 pt-6 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 px-6 pb-6">
                    <h4 class="text-sm font-bold text-gray-800 mb-2">掲載判断コメント</h4>
                    <textarea id="course-comment" class="w-full min-h-[100px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white" placeholder="削除希望の理由やメモを記入..."></textarea>
                    <div class="mt-4 flex justify-end gap-2">
                         <button class="px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 shadow-sm">リセット</button>
                        <button class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm">保存する</button>
                    </div>
                </div>
            </div>`;

        if (window.RoleMock) RoleMock.applyRoleVisibility();
        const textarea = preview.querySelector('#course-comment');
        if (textarea) {
            textarea.value = savedComment;
            textarea.addEventListener('input', () => { commentMap.set(id, textarea.value); });
        }
    });

    // ========= 追加モーダル関連 =========
    const openCourseModalBtn = document.getElementById('open-course-modal');
    const courseModal = document.getElementById('course-modal');
    const closeCourseModalBtn = document.getElementById('close-course-modal');
    const cancelCourseModalBtn = document.getElementById('cancel-course-modal');
    const addSelectedBtn = document.getElementById('add-selected-courses');
    const modalSelectedCount = document.getElementById('modal-selected-count');
    const modalRows = document.getElementById('modal-rows');
    const modalQ = document.getElementById('modal-q');

    let modalData = [];

    function loadModalData() {
        const data = courseMasterData || [];
        modalData = (initialRole === 'supplier') ? data.filter(d => d.org === "他団体B") : data;
    }

    function renderModalList(){
        const v = (modalQ.value || '').toLowerCase();
        modalRows.innerHTML = modalData
            .filter(d => ((d.title || '') + ' ' + (d.code || '') + ' ' + (d.org || '')).toLowerCase().includes(v))
            .map(d => `
                <label class="grid grid-cols-[3rem_1fr_12rem_8rem] items-center px-6 py-3 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors">
                    <div class="flex justify-center">
                        <input type="checkbox" class="modal-sel rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer" data-id="${d.id}">
                    </div>
                    <span class="truncate text-sm font-medium text-gray-800">${d.title}</span>
                    <span class="text-xs text-gray-500 font-mono">${d.code}</span>
                    <span class="text-xs text-gray-500">${d.org}</span>
                </label>`).join('');
        modalSelectedCount.textContent = document.querySelectorAll('.modal-sel:checked').length;
    }

    function openCourseModal(){ courseModal.classList.remove('hidden'); courseModal.classList.add('flex'); renderModalList(); }
    function closeCourseModal(){ courseModal.classList.add('hidden'); courseModal.classList.remove('flex'); }

    openCourseModalBtn?.addEventListener('click', openCourseModal);
    closeCourseModalBtn?.addEventListener('click', closeCourseModal);
    cancelCourseModalBtn?.addEventListener('click', closeCourseModal);
    courseModal?.addEventListener('click', (e)=>{ if(e.target === courseModal) closeCourseModal(); });
    modalQ?.addEventListener('input', renderModalList);
    modalRows?.addEventListener('change', (e)=>{ if(e.target.classList.contains('modal-sel')) modalSelectedCount.textContent = document.querySelectorAll('.modal-sel:checked').length; });

    addSelectedBtn?.addEventListener('click', () => {
        const ids = Array.from(document.querySelectorAll('.modal-sel:checked')).map(c => Number(c.dataset.id));
        if (!ids.length) { closeCourseModal(); return; }

        const frag = document.createDocumentFragment();
        let addedCount = 0;
        ids.map(id => modalData.find(d => Number(d.id) === id)).forEach(md => {
            if (!md) return;
            const d = {
                id: `A-${md.id}-${Date.now()}`, // ユニークID生成
                title: md.title,
                code: md.code,
                org: md.org || "",
                stdTag: md.stdTag || "",
                options: Array.isArray(md.options) ? md.options : [],
                isNew: true, // 新規フラグ
                deleteRequested: 0,
                custom: []
            };
            allData.unshift(d);
            addedCount++;
            const wrap = document.createElement('div');
            wrap.innerHTML = rowTemplate(dense, d);
            frag.appendChild(wrap.firstElementChild);
        });

        if (frag.childNodes.length > 0) {
            rowsEl.prepend(frag);
            if (window.RoleMock) RoleMock.applyRoleVisibility();
            loaded += addedCount;
            updateFilter();
            updateOrderLabels();
            updateSelectAllState();
        }
        closeCourseModal();
    });

    // ========= 初期化処理 =========
    loadModalData();
    const initMainList = () => {
        const data = selectedCourseData || [];
        allData = (initialRole === 'supplier') ? data.filter(d => d.org === "他団体B") : data;
        
        // モックデータの初期化時に既存データはisNew=falseとする
        allData.forEach(d => {
            if(d.isNew === undefined) d.isNew = false;
        });

        loaded = 0;
        rowsEl.innerHTML = '';
        if (allData.length === 0) {
            skeletonEl.classList.add('hidden');
            rowsEl.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-gray-500"><span class="material-symbols-outlined text-4xl mb-2 text-gray-300">inbox</span><p class="text-sm">データがありません</p></div>`;
            return;
        }
        appendChunk();
        initInfiniteScroll();
    };
    initMainList();

    // ===== Shift + Click 範囲選択 =====
    let anchorIndex = null;
    let focusIndex = null;
    function getRowElements() { return Array.from(rowsEl.querySelectorAll('.row')); }

    rowsEl.addEventListener('click', (e) => {
        const row = e.target.closest('.row');
        if (!row) return;
        const rows = getRowElements();
        const idx = rows.indexOf(row);
        if (idx !== -1) { anchorIndex = idx; focusIndex = idx; }
    });

    window.addEventListener('keydown', (e) => {
        if (['input', 'textarea', 'select'].includes((e.target.tagName || '').toLowerCase())) return;
        if (!e.shiftKey) return;
        const rows = getRowElements();
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
        const end   = Math.max(anchorIndex, focusIndex);
        rows.forEach((row, idx) => {
            const sel = row.querySelector('.sel');
            if (sel) sel.checked = (idx >= start && idx <= end);
        });
        refreshBulkbar();
        updateSelectAllState();
    });

    // =========================================================
    // タグ設定モーダル ロジック
    // =========================================================
    const tagModal = document.getElementById('tag-modal');
    const closeTagModalBtn = document.getElementById('close-tag-modal');
    const cancelTagModalBtn = document.getElementById('cancel-tag-modal');
    const saveTagModalBtn = document.getElementById('save-tag-modal');
    const tagGroups = {
        target: document.getElementById('tag-group-target'),
        genre:  document.getElementById('tag-group-genre'),
        level:  document.getElementById('tag-group-level'),
        other:  document.getElementById('tag-group-other')
    };
    let currentEditingRowId = null;

    function renderTagModalContent(currentTags) {
        Object.values(tagGroups).forEach(el => { if(el) el.innerHTML = ''; });
        tagData.forEach(tag => {
            const container = tagGroups[tag.type];
            if (!container) return;
            const isChecked = currentTags.includes(tag.name);
            container.insertAdjacentHTML('beforeend', `
                <label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded -ml-1">
                    <input type="checkbox" value="${tag.name}" class="tag-chk rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4" ${isChecked ? 'checked' : ''}>
                    <span class="text-sm text-gray-700">${tag.name}</span>
                </label>`);
        });
    }

    function openTagModal(rowId, currentTags) {
        currentEditingRowId = rowId;
        renderTagModalContent(currentTags);
        tagModal.classList.remove('hidden'); tagModal.classList.add('flex');
    }
    function closeTagModal() {
        tagModal.classList.add('hidden'); tagModal.classList.remove('flex');
        currentEditingRowId = null;
    }

    rowsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-tag-btn');
        if (!btn) return;
        const row = btn.closest('.row');
        if (!row) return;
        const currentTags = (row.dataset.custom || "").split(",").filter(t => t);
        openTagModal(row.dataset.id, currentTags);
    });

    closeTagModalBtn?.addEventListener('click', closeTagModal);
    cancelTagModalBtn?.addEventListener('click', closeTagModal);
    tagModal?.addEventListener('click', (e) => { if (e.target === tagModal) closeTagModal(); });

    saveTagModalBtn?.addEventListener('click', () => {
        if (!currentEditingRowId) return;
        const selectedTags = Array.from(document.querySelectorAll('.tag-chk:checked')).map(input => input.value);
        
        const targetData = allData.find(d => String(d.id) === String(currentEditingRowId));
        if (targetData) targetData.custom = selectedTags;

        const row = rowsEl.querySelector(`.row[data-id="${currentEditingRowId}"]`);
        if (row) {
            row.dataset.custom = selectedTags.join(",");
            const colContainer = row.querySelector('[data-col="customTag"]');
            if (colContainer) {
                const tagsHtml = selectedTags.map(t => `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-white text-gray-600 border border-gray-200">${t}</span>`).join("");
                colContainer.innerHTML = tagsHtml + `<button class="add-tag-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-colors inline-flex items-center p-0.5 rounded hover:bg-blue-50" title="タグ追加"><span class="material-symbols-outlined text-[16px]">add</span></button>`;
            }
        }
        closeTagModal();
    });
});
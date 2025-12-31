// ./js/pages/media-plan-course.js

window.addEventListener('DOMContentLoaded', () => {
    // ★ URLパラメータから role を取得
    const params = new URLSearchParams(location.search);
    const initialRole = params.get('role') || 'iec';

    if (window.MockUI) {
        MockUI.injectHeader('#app-header', { userName: 'Test User', brand: 'New SD App', initialRole: initialRole });
        MockUI.injectSidebar('#app-sidebar');
    }
    if (window.RoleMock) RoleMock.applyRoleVisibility();

    const rowsEl = document.getElementById('rows');
    const skeletonEl = document.getElementById('skeleton');
    const listEl = document.getElementById('list');
    const preview = document.getElementById('preview');
    const selectAllCheckbox = document.getElementById('selectAll');

    // コース別コメント保存用（モック：メモリ上だけ）
    const commentMap = new Map();

    // ========= リストデータ（JSONから読み込み） =========
    let allData = [];
    const CHUNK = 20;
    let loaded = 0;
    let dense = false; // デフォルトは少しゆったりめに

    // ★ グリッド定義（HTMLのヘッダー定義と一致させる）
    // HTML: grid-cols-[3rem_4rem_1fr_6rem_4rem_8rem_10rem]
    const GRID_COLS_FULL     = 'grid-cols-[3rem_4rem_1fr_6rem_4rem_8rem_10rem]';
    // Supplier用: Order(No)とCustomTagを隠す -> grid-cols-[3rem_1fr_6rem_4rem_8rem] などを想定
    const GRID_COLS_SUPPLIER = 'grid-cols-[3rem_1fr_6rem_4rem_8rem]'; 

    function getGridColsClass() {
        return initialRole === 'supplier' ? GRID_COLS_SUPPLIER : GRID_COLS_FULL;
    }

    // ★ ヘッダー側のグリッドも role に合わせて変更
    const headerEl = document.getElementById('list')?.previousElementSibling;
    if (headerEl && headerEl.classList.contains('grid')) {
        // 既存の grid-cols-[...] を一旦全部削除
        const toRemove = [];
        headerEl.classList.forEach(c => {
            if (c.startsWith('grid-cols-[')) toRemove.push(c);
        });
        toRemove.forEach(c => headerEl.classList.remove(c));

        // role に応じたグリッドを付与
        headerEl.classList.add(getGridColsClass());

        // Supplierの場合はヘッダーの該当カラムも隠す処理が必要
        if (initialRole === 'supplier') {
            // No列とカスタムタグ列を非表示にする簡易対応
            const cols = headerEl.children;
            if(cols[1]) cols[1].classList.add('hidden'); // No
            if(cols[6]) cols[6].classList.add('hidden'); // CustomTag
        }
    }

    // 行順に基づいて並び順ラベルを更新
    function updateOrderLabels() {
        const rows = Array.from(rowsEl.querySelectorAll('.row'));
        rows.forEach((row, index) => {
            const label = row.querySelector('.order-value');
            if (label) {
                label.textContent = index + 1; 
            }
        });
    }

    // DOM の並び順をもとに allData を再構成
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

    // コースオブジェクトの options から詳細HTMLを組み立て
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
                        const priceText = (typeof o.price === "number") ? nf.format(o.price) : (o.price || "-");

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

    // ===== 行テンプレート =====
    function rowTemplate(dense, d){
        const py = dense ? "py-2" : "py-3";
        const customTags = Array.isArray(d.custom)
            ? d.custom
            : String(d.custom || "").split(",").filter(x => x);

        const gridColsClass = getGridColsClass();
        const showOrderCol  = initialRole !== 'supplier';
        const showCustomCol = initialRole !== 'supplier';

        return `
        <div class="row group grid ${gridColsClass} items-center ${py} px-4 border-b border-gray-100 hover:bg-blue-50/30 transition-colors"
            data-id="${d.id}"
            data-title="${d.title}" data-code="${d.code}" data-org="${d.org}"
            data-std="${d.stdTag}" data-custom="${customTags.join(",")}"
            data-delete-requested="0"
            data-visible-for="iec,customer,supplier">

            <div class="flex items-center justify-center">
                <input type="checkbox" class="sel rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer">
            </div>

            ${showOrderCol ? `
            <div class="flex items-center gap-1 text-xs font-mono text-gray-500" data-col="order">
                <span class="order-value w-5 text-right">${d.order ?? ""}</span>
                <div class="flex flex-col -space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" class="order-up text-gray-400 hover:text-blue-600" title="一つ上へ">
                        <span class="material-symbols-outlined text-[14px]">arrow_drop_up</span>
                    </button>
                    <button type="button" class="order-down text-gray-400 hover:text-blue-600" title="一つ下へ">
                        <span class="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                    </button>
                </div>
            </div>
            ` : ''}

            <div class="flex flex-col min-w-0 pr-4">
                <button class="text-left text-sm font-bold text-gray-800 hover:text-blue-600 hover:underline truncate transition-colors open-preview">
                    ${d.title}
                </button>
                <div class="text-xs text-gray-400 font-mono mt-0.5" data-col="code">${d.code}</div>
            </div>
            
            <div class="text-xs text-gray-600 truncate" data-col="org">${d.org}</div>
            
            <div class="flex justify-center">
                ${d.isNew 
                    ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">NEW</span>` 
                    : `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100">-</span>`}
            </div>
            
            <div class="flex items-center gap-1 flex-wrap" data-col="stdTag">
                ${d.stdTag ? `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 border border-blue-100 truncate max-w-full">${d.stdTag}</span>` : ''}
            </div>

            ${showCustomCol ? `
            <div class="flex items-center gap-1 flex-wrap" data-col="customTag">
                ${customTags.map(t=>`<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-white text-gray-600 border border-gray-200">${t}</span>`).join("")}
                <button class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-colors inline-flex items-center p-0.5 rounded hover:bg-blue-50" title="タグ追加">
                    <span class="material-symbols-outlined text-[16px]">add</span>
                </button>
            </div>
            ` : ''}
        </div>`;
    }

    // ===== 検索＆フィルタ =====
    const q = document.getElementById('q');
    let activeFilter = null;

    function matchFilter(row){
        if(activeFilter === 'new') return row.querySelector('.bg-amber-50') !== null;
        return true;
    }

    function updateFilter(){
        const text = (q.value || '').toLowerCase();
        document.querySelectorAll('#rows .row').forEach(row=>{
            const hay = (row.dataset.title + ' ' +
                        row.dataset.code + ' ' +
                        row.dataset.org + ' ' +
                        row.dataset.std + ' ' +
                        row.dataset.custom).toLowerCase();
            row.style.display = (hay.includes(text) && matchFilter(row)) ? '' : 'none';
        });
        updateSelectAllState();
    }

    q.addEventListener('input', updateFilter);
    document.querySelectorAll('[data-filter]').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
            // ボタンスタイルのトグル処理
            document.querySelectorAll('[data-filter]').forEach(b => {
                b.classList.remove('bg-blue-50', 'text-blue-700', 'border-blue-200');
                b.classList.add('bg-white', 'text-gray-700', 'border-gray-200');
            });
            
            const v = btn.getAttribute('data-filter');
            if (activeFilter === v) {
                // 解除
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

    // ===== チャンク追加 =====
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
        }, 100);
    }

    // ===== 無限スクロール =====
    let io = null;
    function initInfiniteScroll(){
        const sentinel = document.getElementById('sentinel');
        if (!sentinel) return;
        io = new IntersectionObserver((entries)=>{
            entries.forEach(e=>{
                if(e.isIntersecting && loaded < allData.length) appendChunk();
            });
        }, {root: listEl, rootMargin: '400px 0px'});
        io.observe(sentinel);
    }

    // ===== 一括バー =====
    const bulkbar = document.getElementById('bulkbar'), selCount = document.getElementById('selCount');
    const defbar = document.getElementById('def-bar');
    
    function refreshBulkbar(){
        const n = document.querySelectorAll('#rows .sel:checked').length;
        if(selCount) selCount.textContent = n;
        if(bulkbar) bulkbar.classList.toggle('hidden', n === 0);
        if(defbar) defbar.classList.toggle('hidden', n > 0);
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

    // 行移動処理 (Top/Bottom)
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

    // 上下ボタンによる行入れ替え
    listEl.addEventListener('click', (e) => {
        const upBtn = e.target.closest('.order-up');
        const downBtn = e.target.closest('.order-down');
        if (!upBtn && !downBtn) return;
        if (initialRole === 'supplier') return;

        const row = e.target.closest('.row');
        if (!row) return;

        const rows = Array.from(rowsEl.querySelectorAll('.row'));
        const currentIndex = rows.indexOf(row);
        if (currentIndex === -1) return;

        const isUp = !!upBtn;
        const targetIndex = isUp ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex < 0 || targetIndex >= rows.length) return;

        const targetRow = rows[targetIndex];
        
        // データ配列入れ替え
        const currentId = row.dataset.id;
        const targetId  = targetRow.dataset.id;
        const currentDataIndex = allData.findIndex(d => String(d.id) === String(currentId));
        const targetDataIndex  = allData.findIndex(d => String(d.id) === String(targetId));

        if (currentDataIndex !== -1 && targetDataIndex !== -1) {
            [allData[currentDataIndex], allData[targetDataIndex]] = [allData[targetDataIndex], allData[currentDataIndex]];
        }

        if (isUp) {
            rowsEl.insertBefore(row, targetRow);
        } else {
            rowsEl.insertBefore(targetRow, row);
        }
        updateOrderLabels();
    });

    // 「削除希望」ボタン
    document.getElementById('markDeleteRequest')?.addEventListener('click', () => {
        const checked = document.querySelectorAll('#rows .sel:checked');
        if (!checked.length) return;

        checked.forEach(c => {
            const row = c.closest('.row');
            if (!row) return;

            const current = row.dataset.deleteRequested === '1';
            row.dataset.deleteRequested = current ? '0' : '1';

            // 背景色変更
            row.classList.toggle('bg-red-50', !current);
            row.classList.toggle('hover:bg-red-100', !current);
            
            // バッジの処理
            const titleBtn = row.querySelector('.open-preview');
            if (titleBtn) {
                let badge = titleBtn.querySelector('.delete-badge');
                if (!current) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'delete-badge ml-2 inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 font-bold';
                        badge.textContent = '削除希望';
                        titleBtn.appendChild(badge);
                    }
                } else {
                    if (badge) badge.remove();
                }
            }
        });

        checked.forEach(c => (c.checked = false));
        refreshBulkbar();
        updateSelectAllState();
    });

    // ===== 詳細プレビュー表示 =====
    listEl.addEventListener('click', (e)=>{
        const btn = e.target.closest('.open-preview');
        if(!btn) return;
        
        // 選択状態のUI反映（簡易的）
        document.querySelectorAll('.row').forEach(r => r.classList.remove('bg-blue-50'));
        const row = btn.closest('.row');
        row.classList.add('bg-blue-50');

        const { id, title, code, org, std, custom } = row.dataset;
        const course = findCourseByRowId(id);
        const optionsHtml = buildOptionsHtml(course);
        const savedComment = commentMap.get(id) || "";

        // プレースホルダー画像をダミーで生成
        const randomColor = ['bg-blue-100', 'bg-green-100', 'bg-indigo-100', 'bg-purple-100'][Math.floor(Math.random()*4)];
        const randomIcon = ['school', 'menu_book', 'cast_for_education', 'lightbulb'][Math.floor(Math.random()*4)];

        preview.innerHTML = `
            <div class="relative">
                <div class="h-40 w-full ${randomColor} flex items-center justify-center text-blue-900/20">
                    <span class="material-symbols-outlined text-6xl">${randomIcon}</span>
                </div>
                <button class="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white text-gray-500 hover:text-gray-800 transition-colors" onclick="document.getElementById('preview').innerHTML='...'">
                     <span class="material-symbols-outlined icon-md">close</span>
                </button>
            </div>

            <div class="p-6">
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
                    <p>このコースでは、${title}に関する基礎から応用までを体系的に学びます。実務ですぐに使えるスキルを習得することを目標としています。</p>
                </div>

                <div class="border-t border-gray-100 pt-4 mb-4">
                    <h4 class="text-xs font-bold text-gray-700 mb-2">設定タグ</h4>
                    <div class="flex flex-wrap gap-1.5">
                        ${String(custom).split(',').filter(x=>x).map(t => 
                            `<span class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-white text-gray-600 border border-gray-200 shadow-sm">${t}</span>`
                        ).join("")}
                        ${!custom ? '<span class="text-xs text-gray-400">タグは設定されていません</span>' : ''}
                    </div>
                </div>

                ${optionsHtml}

                <div class="mt-8 pt-6 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 px-6 pb-6">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-sm font-bold text-gray-800">掲載判断コメント</h4>
                        <a href="#" class="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                            プレビュー <span class="material-symbols-outlined text-[12px]">open_in_new</span>
                        </a>
                    </div>
                    
                    <textarea
                        id="course-comment"
                        class="w-full min-h-[100px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y bg-white"
                        placeholder="このコースに関するメモや削除希望の理由を記入..."
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
                commentMap.set(id, textarea.value);
            });
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

    // モーダルデータ読み込み
    function loadModalData() {
        return fetch('course-master-sample.json')
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                if (initialRole === 'supplier') {
                    modalData = arr.filter(d => d.org === "他団体B");
                } else {
                    modalData = arr;
                }
            })
            .catch(err => {
                console.error('Failed to load modal data:', err);
                modalData = [];
            });
    }

    function renderModalList(){
        const v = (modalQ.value || '').toLowerCase();
        modalRows.innerHTML = modalData
            .filter(d => (
                (d.title || '') + ' ' + (d.code || '') + ' ' + (d.org || '')
            ).toLowerCase().includes(v))
            .map(d => `
                <label class="grid grid-cols-[3rem_1fr_12rem_8rem] items-center px-6 py-3 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors">
                    <div class="flex justify-center">
                        <input type="checkbox"
                            class="modal-sel rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                            data-id="${d.id}">
                    </div>
                    <span class="truncate text-sm font-medium text-gray-800">${d.title}</span>
                    <span class="text-xs text-gray-500 font-mono">${d.code}</span>
                    <span class="text-xs text-gray-500">${d.org}</span>
                </label>
            `).join('');
        modalSelectedCount.textContent = document.querySelectorAll('.modal-sel:checked').length;
    }

    function openCourseModal(){ 
        courseModal.classList.remove('hidden'); 
        courseModal.classList.add('flex'); 
        renderModalList(); 
    }
    function closeCourseModal(){ 
        courseModal.classList.add('hidden'); 
        courseModal.classList.remove('flex'); 
    }

    openCourseModalBtn?.addEventListener('click', openCourseModal);
    closeCourseModalBtn?.addEventListener('click', closeCourseModal);
    cancelCourseModalBtn?.addEventListener('click', closeCourseModal);
    courseModal?.addEventListener('click', (e)=>{ if(e.target === courseModal) closeCourseModal(); });
    modalQ?.addEventListener('input', renderModalList);
    
    modalRows?.addEventListener('change', (e)=>{
        if(e.target.classList.contains('modal-sel')){
            modalSelectedCount.textContent = document.querySelectorAll('.modal-sel:checked').length;
        }
    });

    // モーダル追加処理
    addSelectedBtn?.addEventListener('click', () => {
        const ids = Array.from(document.querySelectorAll('.modal-sel:checked')).map(c => Number(c.dataset.id));

        if (!ids.length) {
            closeCourseModal();
            return;
        }

        const frag = document.createDocumentFragment();
        let addedCount = 0;

        ids.map(id => modalData.find(d => Number(d.id) === id))
            .forEach(md => {
                if (!md) return;
                const d = {
                    id: `A-${md.id}`,
                    title: md.title,
                    code: md.code,
                    org: md.org || "",
                    stdTag: md.stdTag || "",
                    options: Array.isArray(md.options) ? md.options : [],
                    isNew: true,
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

    // ========= 初期ロード =========
    loadModalData();

    fetch('selected-list-sample.json')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
            if (initialRole === 'supplier') {
                allData = Array.isArray(data) ? data.filter(d => d.org === "他団体B") : [];
            } else {
                allData = Array.isArray(data) ? data : [];
            }
            loaded = 0;
            rowsEl.innerHTML = '';
            appendChunk();
            initInfiniteScroll();
        })
        .catch(err => {
            console.error(err);
            skeletonEl.classList.add('hidden');
            rowsEl.innerHTML = '<div class="p-8 text-center text-sm text-red-600 bg-red-50 rounded-lg">データの読み込みに失敗しました</div>';
        });

    // ===== Shift + Click 範囲選択 =====
    let anchorIndex = null;
    let focusIndex = null;
    
    function getRowElements() { return Array.from(rowsEl.querySelectorAll('.row')); }

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

    window.addEventListener('keydown', (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag)) return;
        if (!e.shiftKey) return;

        const rows = getRowElements();
        if (!rows.length) return;

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
    });
});
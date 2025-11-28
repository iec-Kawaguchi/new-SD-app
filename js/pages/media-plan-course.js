// ./js/pages/media-plan-course.js

window.addEventListener('DOMContentLoaded', () => {
    // ★ URLパラメータから role を取得
    const params = new URLSearchParams(location.search);
    const initialRole = params.get('role') || 'iec'; // デフォルトはお好みで

    if (window.MockUI) {
        MockUI.injectHeader('#app-header', { userName: 'Test User', brand: 'New SD App', initialRole: initialRole });
        MockUI.injectSidebar('#app-sidebar');
    }
    if (window.RoleMock) RoleMock.applyRoleVisibility();

    const rowsEl = document.getElementById('rows');
    const skeletonEl = document.getElementById('skeleton');
    const listEl = document.getElementById('list');
    const preview = document.getElementById('preview');

    // コース別コメント保存用（モック：メモリ上だけ）
    const commentMap = new Map(); // key: course id, value: comment string

    // ========= リストデータ（JSONから読み込み） =========
    let allData = [];       // selected-list-sample.json の配列
    const CHUNK = 20;       // 一度に描画する件数
    let loaded = 0;         // 何件描画済みか
    let dense = true;

    const TAGS_STD = ["マナー","PCスキル","マーケティング","IT基礎","DX"]; // モーダル追加用に利用
    function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

    // ★ グリッド定義（ヘッダー／行で共通）
    const GRID_COLS_FULL     = 'grid-cols-[2rem_5rem_1fr_10rem_8rem_6rem_9rem_11rem]'; // 並び順＋カスタムあり（8列）
    const GRID_COLS_SUPPLIER = 'grid-cols-[2rem_1fr_12rem_8rem_6rem_12rem]';           // supplier 用（6列）

    function getGridColsClass() {
        return initialRole === 'supplier' ? GRID_COLS_SUPPLIER : GRID_COLS_FULL;
    }

    // ★ ヘッダー側のグリッドも role に合わせて変更
    const headerEl = document.querySelector('#list')?.previousElementSibling;
    if (headerEl) {
        // 既存の grid-cols-[...] を一旦全部削除
        const toRemove = [];
        headerEl.classList.forEach(c => {
            if (c.startsWith('grid-cols-[')) toRemove.push(c);
        });
        toRemove.forEach(c => headerEl.classList.remove(c));

        // role に応じたグリッドを付与
        headerEl.classList.add(getGridColsClass());
    }

    // 行順に基づいて並び順ラベルを更新
    function updateOrderLabels() {
        const rows = Array.from(rowsEl.querySelectorAll('.row'));
        rows.forEach((row, index) => {
            const label = row.querySelector('.order-value');
            if (label) {
                label.textContent = index + 1; // 1,2,3,...
            }
        });
    }

    // ★ DOM の並び順をもとに allData を再構成（loaded 範囲だけを並べ替え）
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

        // 念のため、DOM上にない loaded 部分があれば後ろに足しておく
        loadedMap.forEach(item => reorderedLoaded.push(item));

        allData = reorderedLoaded.concat(restPart);
    }

    // 行の data-id からコースオブジェクトを取得
    function findCourseByRowId(rowId) {
        if (!allData || !allData.length) return null;
        return allData.find(c => String(c.id) === String(rowId)) || null;
    }

    // コースオブジェクトの options から詳細HTMLを組み立て
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
        <div class="row group grid ${gridColsClass} items-center ${py} px-4 border-b border-gray-100 hover:bg-gray-50 transition"
            data-id="${d.id}"
            data-title="${d.title}" data-code="${d.code}" data-org="${d.org}"
            data-std="${d.stdTag}" data-custom="${customTags.join(",")}"
            data-delete-requested="0"
            data-visible-for="iec,customer,supplier">

            <!-- チェックボックス -->
            <label class="inline-flex items-center justify-center">
                <input type="checkbox" class="sel accent-blue-600">
            </label>

            ${showOrderCol ? `
            <!-- 並び順コード＋上下ボタン -->
            <div class="flex items-center justify-center gap-1 text-xs text-gray-600" data-col="order">
                <span class="order-value tabular-nums">${d.order ?? ""}</span>
                <div class="flex space-x-1">
                    <button type="button" class="order-up leading-none hover:text-blue-600" title="一つ上へ">
                        <span class="material-symbols-outlined text-[16px]">expand_less</span>
                    </button>
                    <button type="button" class="order-down leading-none hover:text-blue-600" title="一つ下へ">
                        <span class="material-symbols-outlined text-[16px]">expand_more</span>
                    </button>
                </div>
            </div>
            ` : ''}

            <!-- コース名 -->
            <button class="flex text-left truncate hover:underline text-gray-900 font-medium open-preview">
                ${d.title}
            </button>

            <div class="text-gray-500 text-sm" data-col="code">${d.code}</div>
            <div class="text-gray-600" data-col="org">${d.org}</div>
            <div class="flex justify-center">
                ${d.isNew ? `<span class="text-[10px] text-white rounded-full bg-amber-500 px-2 py-0.5">NEW</span>` : ``}
            </div>
            <div class="flex items-center gap-1 flex-wrap" data-col="stdTag">
                <span class="text-[11px] rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">${d.stdTag}</span>
            </div>

            ${showCustomCol ? `
            <div class="flex items-center gap-1 flex-wrap" data-col="customTag">
                ${customTags.map(t=>`<span class="text-[11px] rounded-full bg-gray-800 text-white px-2 py-0.5">${t}</span>`).join("")}
                <button class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition inline-flex items-center" title="タグ追加（モック）">
                    <span class="material-symbols-outlined text-base">add_circle</span>
                </button>
            </div>
            ` : ''}
        </div>`;
    }

    // ===== 検索＆フィルタ =====
    const q = document.getElementById('q');
    let activeFilter = null;

    function matchFilter(row){
        if(activeFilter === 'new') return row.querySelector('.bg-amber-500') !== null;
        if(activeFilter?.startsWith('tag:')){
            const tag = activeFilter.slice(4);
            return (row.dataset.std?.includes(tag) || row.dataset.custom?.includes(tag));
        }
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
    }

    q.addEventListener('input', updateFilter);
    document.querySelectorAll('[data-filter]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            const v = btn.getAttribute('data-filter');
            activeFilter = (v === 'clear') ? null : v;
            updateFilter();
        });
    });

    // ★ supplier の場合、ヘッダー側の order/customTag セルを隠す
    if (initialRole === 'supplier') {
        document.querySelectorAll('[data-col="order"], [data-col="customTag"]').forEach(el => {
            el.classList.add('hidden');
        });
    }

    // ===== チャンク追加（allData から描画） =====
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
            if (window.RoleMock) RoleMock.applyRoleVisibility(); // 新規行にも適用
            updateFilter();
            updateOrderLabels(); // ★ 行追加後に並び順ラベルを更新
        }, 120);
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
    function refreshBulkbar(){
        const n = document.querySelectorAll('#rows .sel:checked').length;
        selCount.textContent = n;
        bulkbar.classList.toggle('hidden', n === 0);
    }
    listEl.addEventListener('change', e=>{
        if(e.target.classList.contains('sel')) refreshBulkbar();
    });
    document.getElementById('clearSelection').addEventListener('click', ()=>{
        document.querySelectorAll('#rows .sel:checked').forEach(c=> c.checked=false);
        refreshBulkbar();
    });

    // ★ 一括：選択行を先頭へ移動
    document.getElementById('moveTop')?.addEventListener('click', () => {
        const allRows = Array.from(rowsEl.querySelectorAll('.row'));
        const selected = allRows.filter(r => r.querySelector('.sel:checked'));
        if (!selected.length) return;

        const others = allRows.filter(r => !selected.includes(r));

        rowsEl.innerHTML = '';
        [...selected, ...others].forEach(r => {
            const chk = r.querySelector('.sel');
            if (chk) chk.checked = false;
            rowsEl.appendChild(r);
        });

        reorderAllDataByDom();
        updateOrderLabels();
        refreshBulkbar();
    });

    // ★ 一括：選択行を末尾へ移動
    document.getElementById('moveBottom')?.addEventListener('click', () => {
        const allRows = Array.from(rowsEl.querySelectorAll('.row'));
        const selected = allRows.filter(r => r.querySelector('.sel:checked'));
        if (!selected.length) return;

        const others = allRows.filter(r => !selected.includes(r));

        rowsEl.innerHTML = '';
        [...others, ...selected].forEach(r => {
            const chk = r.querySelector('.sel');
            if (chk) chk.checked = false;
            rowsEl.appendChild(r);
        });

        reorderAllDataByDom();
        updateOrderLabels();
        refreshBulkbar();
    });

    // ===== 並び順の上下ボタンによる行入れ替え =====
    listEl.addEventListener('click', (e) => {
        const upBtn = e.target.closest('.order-up');
        const downBtn = e.target.closest('.order-down');
        if (!upBtn && !downBtn) return;

        // supplier のときは（列自体を出していないので）動作させない
        if (initialRole === 'supplier') return;

        const row = e.target.closest('.row');
        if (!row) return;

        const rows = Array.from(rowsEl.querySelectorAll('.row'));
        const currentIndex = rows.indexOf(row);
        if (currentIndex === -1) return;

        const isUp = !!upBtn;
        const targetIndex = isUp ? currentIndex - 1 : currentIndex + 1;

        // 先頭より上／末尾より下には動かさない
        if (targetIndex < 0 || targetIndex >= rows.length) return;

        const targetRow = rows[targetIndex];

        // allData 側の順番も入れ替え（画面内整合用）
        const currentId = row.dataset.id;
        const targetId  = targetRow.dataset.id;

        const currentDataIndex = allData.findIndex(d => String(d.id) === String(currentId));
        const targetDataIndex  = allData.findIndex(d => String(d.id) === String(targetId));

        if (currentDataIndex !== -1 && targetDataIndex !== -1) {
            const tmp = allData[currentDataIndex];
            allData[currentDataIndex] = allData[targetDataIndex];
            allData[targetDataIndex] = tmp;
        }

        // DOM の並び替え
        if (isUp) {
            rowsEl.insertBefore(row, targetRow);          // 上に動かす
        } else {
            rowsEl.insertBefore(targetRow, row);          // 下に動かす
        }

        // 並び順ラベルを振り直す
        updateOrderLabels();
    });

    // ===== 「削除希望にする」ボタン：フラグ ON/OFF & バッジ表示 =====
    const markDeleteRequestBtn = document.getElementById('markDeleteRequest');

    if (markDeleteRequestBtn) {
        markDeleteRequestBtn.addEventListener('click', () => {
            const checked = document.querySelectorAll('#rows .sel:checked');
            if (!checked.length) return;

            checked.forEach(c => {
                const row = c.closest('.row');
                if (!row) return;

                const current = row.dataset.deleteRequested === '1';
                row.dataset.deleteRequested = current ? '0' : '1';

                row.classList.toggle('bg-red-100', !current);
                row.classList.toggle('hover:bg-red-200', !current);
                row.classList.toggle('opacity-100', !current);

                const titleBtn = row.querySelector('.open-preview');
                if (titleBtn) {
                    let badge = titleBtn.querySelector('.delete-badge');
                    if (!current) {
                        if (!badge) {
                            badge = document.createElement('span');
                            badge.className =
                                'delete-badge ml-2 inline-flex items-center text-xs px-1.5 py-0.5 rounded-full bg-red-200 text-red-700 border border-red-300';
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
        });
    }

    // ===== 詳細ビュー＋コメント =====
    listEl.addEventListener('click', (e)=>{
        const btn = e.target.closest('.open-preview');
        if(!btn) return;
        const row = btn.closest('.row');
        const { id, title, code, org, std, custom } = row.dataset;

        // JSONのコースデータを取得
        const course = findCourseByRowId(id);
        const optionsHtml = buildOptionsHtml(course);

        const savedComment = commentMap.get(id) || "";

        preview.innerHTML = `
            <p class="text-lg font-semibold text-gray-900">${title}</p>
            <div class="mt-2 text-sm text-gray-600">コード：${code} / 団体：${org}</div>
            <div class="mt-3 flex flex-wrap gap-1">
                <span class="text-[11px] rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">${std}</span>
                ${String(custom).split(',').map(t=> t
                    ? `<span class="text-[11px] rounded-full bg-gray-800 text白 px-2 py-0.5"
                        data-visible-for="iec, customer">${t}</span>`
                    : ""
                ).join("")}
            </div>

            ${optionsHtml}

            <div class="mt-4">
                <a href="#" class="inline-flex text-sm items-center gap-1 text-blue-600 hover:underline">
                    HTMLを開く <span class="material-symbols-outlined text-sm">open_in_new</span>
                </a>
            </div>
            <div class="mt-6 border-t pt-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    掲載判断用コメント
                </label>
                <textarea
                    id="course-comment"
                    class="w-full min-h-[80px] rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                    placeholder="このコースに関するメモや削除希望の理由を自由に記入してください。"
                ></textarea>
            </div>
            <div class="mt-6 border-t pt-4" data-visible-for="iec">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    公開範囲
                </label>
                <div class="flex gap-4 items-center">
                    <label class="block">
                        <input type="date" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                    </label>
                    ～
                    <label class="block">
                        <input type="date" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                    </label>
                </div>
            </div>
            <div class="mt-6 flex justify-end">
                <button class="py-1 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white">更新する</button>
            </div>
        `;

        // プレビューに対してもロール適用
        if (window.RoleMock) RoleMock.applyRoleVisibility();

        const textarea = preview.querySelector('#course-comment');
        if (textarea) {
            textarea.value = savedComment;
            textarea.addEventListener('input', () => {
                commentMap.set(id, textarea.value);
            });
        }
    });


    // ========= 追加モーダル =========
    const openCourseModalBtn = document.getElementById('open-course-modal');
    const courseModal = document.getElementById('course-modal');
    const closeCourseModalBtn = document.getElementById('close-course-modal');
    const cancelCourseModalBtn = document.getElementById('cancel-course-modal');
    const addSelectedBtn = document.getElementById('add-selected-courses');
    const modalSelectedCount = document.getElementById('modal-selected-count');
    const modalRows = document.getElementById('modal-rows');
    const modalQ = document.getElementById('modal-q');

    // モーダル用データ（外部JSONから読み込み）
    let modalData = [];

    // モーダル用JSONの読み込み（コース名 / コード / 団体 / 標準タグ）
    function loadModalData() {
        return fetch('course-master-sample.json') // ← ファイル名は環境に合わせて
            .then(res => {
                if (!res.ok) throw new Error('Modal JSON load failed');
                return res.json();
            })
            .then(data => {
                const arr = Array.isArray(data) ? data : [];

                // supplier のときだけ 団体＝「他団体B」に絞り込み
                if (initialRole === 'supplier') {
                    modalData = arr.filter(d => d.org === "他団体B");
                } else {
                    modalData = arr;  // それ以外のロールなら全件
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
                (d.title || '') +
                ' ' +
                (d.code || '') +
                ' ' +
                (d.org || '') +
                ' ' +
                (d.stdTag || '')
            ).toLowerCase().includes(v))
            .map(d => `
                <label class="grid grid-cols-[1.5rem_1fr_15rem_10rem] items-center px-4 py-2 border-b hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox"
                        class="modal-sel accent-blue-600"
                        data-id="${d.id}">
                    <span class="truncate">${d.title}</span>
                    <span class="text-gray-600">${d.code}</span>
                    <span class="text-gray-600">${d.org}</span>
                </label>
            `).join('');
        modalSelectedCount.textContent = document.querySelectorAll('.modal-sel:checked').length;
    }

    function openCourseModal(){ courseModal.classList.remove('hidden'); courseModal.classList.add('flex'); renderModalList(); }
    function closeCourseModal(){ courseModal.classList.add('hidden'); courseModal.classList.remove('flex'); }

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

    // 追加：モーダルで選択したコースを先頭に挿入（モック）
    addSelectedBtn?.addEventListener('click', () => {
        // チェックされたID（course-master-sample.json側の id）を取得
        const ids = Array.from(document.querySelectorAll('.modal-sel:checked'))
            .map(c => Number(c.dataset.id));

        if (!ids.length) {
            closeCourseModal();
            return;
        }

        const frag = document.createDocumentFragment();
        let addedCount = 0;

        ids
            .map(id => modalData.find(d => Number(d.id) === id))
            .forEach(md => {
                if (!md) return;

                // JSONから使うフィールド：title / code / org / stdTag / options
                // 強制で上書きするフィールド：id / isNew / custom
                const d = {
                    id: `A-${md.id}`,                              // 既存と被らないようプレフィックス
                    title: md.title,                               // タイトルはJSONのまま採用
                    code: md.code,
                    org: md.org || "",
                    stdTag: md.stdTag || "",
                    options: Array.isArray(md.options) ? md.options : [],

                    isNew: true,                                   // 新規追加は必ず NEW
                    custom: []                                     // 追加時はカスタムタグなし
                };

                // 詳細ビュー用に allData にも入れる
                allData.unshift(d);
                addedCount++;

                // 画面の行DOMを作成して先頭に挿入
                const wrap = document.createElement('div');
                wrap.innerHTML = rowTemplate(dense, d);
                frag.appendChild(wrap.firstElementChild);
            });

        if (frag.childNodes.length > 0) {
            rowsEl.prepend(frag);
            if (window.RoleMock) RoleMock.applyRoleVisibility();

            // infinite scroll 用の loaded を調整
            loaded += addedCount;

            // フィルタ＆並び順を更新
            updateFilter();
            updateOrderLabels();
        }

        closeCourseModal();
    });



    // ========= JSON 読み込み開始（モーダル用） =========
    loadModalData();

    // ========= JSON 読み込み開始 =========
    fetch('selected-list-sample.json')
        .then(res => {
            if (!res.ok) throw new Error('JSON load failed');
            return res.json();
        })
        .then(data => {
            // supplier のときだけ絞り込む
            if (initialRole === 'supplier') {
                allData = Array.isArray(data)
                    ? data.filter(d => d.org === "他団体B")
                    : [];
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
            rowsEl.innerHTML = '<div class="p-4 text-sm text-red-600">サンプルデータ（JSON）の読み込みに失敗しました。</div>';
        });


});

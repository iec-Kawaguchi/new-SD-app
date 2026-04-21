/**
 * コンボボックスコンポーネント
 *
 * @param {HTMLElement} container - コンボボックスを描画するコンテナ要素（relative位置を自動付与）
 * @param {Object}  options
 * @param {Array<{value:string, label:string}>} [options.items=[]]  選択肢リスト
 * @param {string}  [options.placeholder='選択してください']         未選択時プレースホルダー
 * @param {string}  [options.searchPlaceholder='検索...']           検索欄プレースホルダー
 * @param {string}  [options.emptyMessage='該当する項目がありません'] 検索0件時メッセージ
 * @param {boolean} [options.disabled=false]                        初期非活性状態
 * @param {string}  [options.initialValue='']                       初期選択値
 * @param {function(value:string, label:string):void} [options.onSelect]  選択時コールバック
 *
 * @returns {{
 *   getValue(): string,
 *   setValue(value: string): void,
 *   setItems(items: Array<{value:string, label:string}>): void,
 *   setDisabled(disabled: boolean): void,
 *   reset(): void,
 * }}
 */
function initCombobox(container, options = {}) {
    const {
        items           = [],
        placeholder     = '選択してください',
        searchPlaceholder = '検索...',
        emptyMessage    = '該当する項目がありません',
        disabled        = false,
        initialValue    = '',
        onSelect        = null,
    } = options;

    let selectedValue = initialValue;
    let currentItems  = [...items];

    // ドロップダウンの絶対配置基準にするため relative を付与
    container.classList.add('relative');

    container.innerHTML = `
        <button type="button" class="combo-btn h-10 w-full flex items-center justify-between gap-2
            bg-white border border-gray-300 text-gray-700 text-sm rounded-md px-3
            hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50">
            <span class="combo-label truncate text-left"></span>
            <span class="material-symbols-outlined icon-sm text-gray-400 shrink-0">expand_more</span>
        </button>
        <div class="combo-dropdown hidden absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <div class="p-2 border-b border-gray-100">
                <div class="relative">
                    <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 icon-sm">search</span>
                    <input type="text" class="combo-search h-8 w-full bg-gray-50 border border-gray-200 rounded text-sm pl-8 pr-3
                        focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                        placeholder="${searchPlaceholder}">
                </div>
            </div>
            <ul class="combo-list max-h-48 overflow-y-auto py-1 text-sm text-gray-700"></ul>
            <p class="combo-empty hidden px-3 py-3 text-sm text-gray-400 text-center">${emptyMessage}</p>
        </div>
    `;

    const btn      = container.querySelector('.combo-btn');
    const label    = container.querySelector('.combo-label');
    const dropdown = container.querySelector('.combo-dropdown');
    const search   = container.querySelector('.combo-search');
    const list     = container.querySelector('.combo-list');
    const empty    = container.querySelector('.combo-empty');

    btn.disabled = disabled;
    renderItems();
    updateLabel();

    // ===== イベント =====

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = !dropdown.classList.contains('hidden');
        // 他のすべてのコンボボックスドロップダウンを閉じる
        document.querySelectorAll('.combo-dropdown').forEach(d => d.classList.add('hidden'));
        if (!wasOpen) {
            dropdown.classList.remove('hidden');
            search.value = '';
            applyFilter('');
            search.focus();
        }
    });

    // ドロップダウン内クリックを document に伝播させない（外側クリックで閉じる対策）
    dropdown.addEventListener('click', (e) => e.stopPropagation());

    // 外側クリックで閉じる
    document.addEventListener('click', () => dropdown.classList.add('hidden'));

    search.addEventListener('input', () => applyFilter(search.value));

    // ===== 内部関数 =====

    function renderItems() {
        list.innerHTML = currentItems.map(item => `
            <li data-value="${escapeAttr(item.value)}"
                class="combo-item px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2">
                <span class="material-symbols-outlined icon-sm ${item.value === selectedValue ? 'text-blue-500' : 'text-transparent'}">check</span>
                <span class="combo-item-text">${escapeHtml(item.label)}</span>
            </li>
        `).join('');

        list.querySelectorAll('.combo-item').forEach(itemEl => {
            itemEl.addEventListener('click', () => {
                const value = itemEl.dataset.value;
                const itemLabel = itemEl.querySelector('.combo-item-text').textContent;
                selectedValue = value;
                updateCheckmarks();
                updateLabel();
                dropdown.classList.add('hidden');
                if (onSelect) onSelect(selectedValue, itemLabel);
            });
        });
    }

    function updateCheckmarks() {
        list.querySelectorAll('.combo-item').forEach(itemEl => {
            const icon = itemEl.querySelector('.material-symbols-outlined');
            const match = itemEl.dataset.value === selectedValue;
            icon.classList.toggle('text-blue-500', match);
            icon.classList.toggle('text-transparent', !match);
        });
    }

    function updateLabel() {
        const found = currentItems.find(i => i.value === selectedValue);
        if (found) {
            label.textContent = found.label;
            label.classList.remove('text-gray-400');
            label.classList.add('text-gray-700');
        } else {
            label.textContent = placeholder;
            label.classList.remove('text-gray-700');
            label.classList.add('text-gray-400');
        }
    }

    function applyFilter(query) {
        const q = query.trim().toLowerCase();
        let visible = 0;
        list.querySelectorAll('.combo-item').forEach(itemEl => {
            const text = itemEl.querySelector('.combo-item-text').textContent.toLowerCase();
            const show = text.includes(q);
            itemEl.classList.toggle('hidden', !show);
            if (show) visible++;
        });
        empty.classList.toggle('hidden', visible > 0);
    }

    function escapeAttr(str) {
        return String(str).replace(/"/g, '&quot;');
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // ===== 公開API =====
    return {
        /** 現在の選択値を返す */
        getValue() {
            return selectedValue;
        },
        /** 選択値をプログラムからセットする（onSelect は発火しない） */
        setValue(value) {
            selectedValue = value;
            updateCheckmarks();
            updateLabel();
        },
        /** 選択肢リストを差し替える。選択値はリセットされる */
        setItems(newItems) {
            currentItems  = [...newItems];
            selectedValue = '';
            renderItems();
            updateLabel();
        },
        /** 非活性状態を切り替える */
        setDisabled(val) {
            btn.disabled = !!val;
            if (val) dropdown.classList.add('hidden');
        },
        /** 選択をリセットして未選択状態に戻す */
        reset() {
            selectedValue = '';
            search.value  = '';
            renderItems();
            updateLabel();
            dropdown.classList.add('hidden');
            empty.classList.add('hidden');
        },
    };
}

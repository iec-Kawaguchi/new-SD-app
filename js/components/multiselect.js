/**
 * マルチセレクトコンポーネント
 *
 * @param {HTMLElement} container - コンポーネントを描画するコンテナ要素（relative位置を自動付与）
 * @param {Object}  options
 * @param {Array<{value:string, label:string}>} [options.items=[]]  選択肢リスト
 * @param {string}  [options.placeholder='指定なし']                未選択時プレースホルダー
 * @param {Array<string>} [options.initialValues=[]]                初期選択値リスト
 * @param {function(selected: Array<{value:string, label:string}>):void} [options.onChange]  変更時コールバック
 *
 * @returns {{
 *   getValues(): Array<{value:string, label:string}>,
 *   setValues(values: Array<string>): void,
 *   setItems(items: Array<{value:string, label:string}>): void,
 *   reset(): void,
 * }}
 */
function initMultiSelect(container, options = {}) {
    const {
        items         = [],
        placeholder   = '指定なし',
        initialValues = [],
        onChange      = null,
    } = options;

    let currentItems   = [...items];
    let selectedValues = [...initialValues];

    container.classList.add('relative');

    container.innerHTML = `
        <button type="button" class="multi-btn w-full flex items-center gap-1 p-2
            bg-gray-50/50 border border-gray-300 text-sm rounded-md
            hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-shadow text-left min-h-10">
            <span class="multi-label flex-1 flex flex-wrap gap-1"></span>
            <span class="multi-icon material-symbols-outlined shrink-0 text-gray-400 text-[18px] leading-none">expand_more</span>
        </button>
        <div class="multi-dropdown hidden absolute z-30 top-full mt-1 w-full bg-white rounded-md border border-gray-200 shadow-lg overflow-hidden"></div>
    `;

    const btn      = container.querySelector('.multi-btn');
    const label    = container.querySelector('.multi-label');
    const dropdown = container.querySelector('.multi-dropdown');
    const icon     = container.querySelector('.multi-icon');

    renderItems();
    updateLabel();

    // ===== イベント =====

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = !dropdown.classList.contains('hidden');
        // 他のすべてのドロップダウンを閉じる
        document.querySelectorAll('.combo-dropdown, .multi-dropdown').forEach(d => d.classList.add('hidden'));
        document.querySelectorAll('.multi-icon').forEach(ic => ic.textContent = 'expand_more');
        if (!wasOpen) {
            dropdown.classList.remove('hidden');
            icon.textContent = 'expand_less';
        }
    });

    // ドロップダウン内クリックを document に伝播させない（外側クリックで閉じる対策）
    dropdown.addEventListener('click', (e) => e.stopPropagation());

    // 外側クリックで閉じる
    document.addEventListener('click', () => {
        dropdown.classList.add('hidden');
        icon.textContent = 'expand_more';
    });

    // ===== 内部関数 =====

    function renderItems() {
        dropdown.innerHTML = currentItems.map(item => `
            <label class="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50 transition-colors">
                <input type="checkbox" class="size-4 rounded border-gray-300 accent-blue-600"
                    value="${escapeAttr(item.value)}" data-label="${escapeAttr(item.label)}"
                    ${selectedValues.includes(item.value) ? 'checked' : ''} />
                <span>${escapeHtml(item.label)}</span>
            </label>
        `).join('');

        dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                selectedValues = [...dropdown.querySelectorAll('input:checked')].map(c => c.value);
                updateLabel();
                if (onChange) onChange(getValues());
            });
        });
    }

    function updateLabel() {
        const selected = getValues();
        label.innerHTML = selected.length
            ? selected.map(s =>
                `<span class="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-medium">${escapeHtml(s.label)}</span>`
              ).join('')
            : `<span class="text-gray-400">${escapeHtml(placeholder)}</span>`;
    }

    function getValues() {
        return currentItems.filter(i => selectedValues.includes(i.value));
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
        /** 現在の選択値を [{value, label}] で返す */
        getValues() {
            return getValues();
        },
        /** 選択値をプログラムからセットする（onChange は発火しない） */
        setValues(values) {
            selectedValues = [...values];
            dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = selectedValues.includes(cb.value);
            });
            updateLabel();
        },
        /** 選択肢リストを差し替える。選択値はリセットされる */
        setItems(newItems) {
            currentItems   = [...newItems];
            selectedValues = [];
            renderItems();
            updateLabel();
        },
        /** 選択をリセットして未選択状態に戻す */
        reset() {
            selectedValues = [];
            dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            updateLabel();
            dropdown.classList.add('hidden');
            icon.textContent = 'expand_more';
        },
    };
}

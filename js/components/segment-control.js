class SegmentControl extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    // 属性の取得
    const name = this.getAttribute('name') || 'segment-' + Math.random().toString(36).substr(2, 9);
    const initialValue = this.getAttribute('value') || 'none';
    
    // オプション定義 (形式: "value:label, value:label")
    // 指定がなければデフォルトの3点セットを使用
    const optionsRaw = this.getAttribute('options') || 'none:なし, optional:任意, required:必須';
    
    this.options = optionsRaw.split(',').map(opt => {
      const [val, lab] = opt.split(':');
      return { value: val.trim(), label: lab.trim() };
    });

    this.currentValue = initialValue;

    // HTML構造の生成
    this.innerHTML = `
      <div class="inline-flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner select-none">
        ${this.options.map(opt => `
          <label class="cursor-pointer relative">
            <input type="radio" name="${name}" value="${opt.value}" class="sr-only" ${opt.value === this.currentValue ? 'checked' : ''}>
            <span class="segment-label block px-4 py-1.5 rounded-md text-xs transition-all duration-200 ease-out text-center min-w-[3rem]">
              ${opt.label}
            </span>
          </label>
        `).join('')}
      </div>
    `;

    // イベントリスナー登録
    this.querySelectorAll('input').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.currentValue = e.target.value;
        this.updateView();
        // 親側で検知できるようカスタムイベントを発火
        this.dispatchEvent(new CustomEvent('change', { 
          detail: { 
            name: name,
            value: this.currentValue 
          } 
        }));
      });
    });

    this.updateView();
  }

  updateView() {
    const inputs = this.querySelectorAll('input');
    
    // スタイル定義
    // Active: 白背景、青文字、太字、影あり
    const activeClasses = ['bg-white', 'text-blue-600', 'font-bold', 'shadow-sm'];
    // Inactive: 透明背景、グレー文字、中太字
    const inactiveClasses = ['text-gray-500', 'font-medium', 'hover:text-gray-700'];

    inputs.forEach(input => {
      const labelSpan = input.nextElementSibling;
      
      // クラスをリセット
      labelSpan.classList.remove(...activeClasses, ...inactiveClasses);

      if (input.checked) {
        labelSpan.classList.add(...activeClasses);
      } else {
        labelSpan.classList.add(...inactiveClasses);
      }
    });
  }
}

if (!customElements.get('segment-control')) {
  customElements.define('segment-control', SegmentControl);
}
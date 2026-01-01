class ToggleSwitch extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const isOn = this.getAttribute('checked') === 'true';
    const labelOn = this.getAttribute('label-on') || 'ON';
    const labelOff = this.getAttribute('label-off') || 'OFF';

    this.state = isOn;

    // デザイン定義
    // w-16 (64px) で統一して左右対称にするアプローチ
    this.innerHTML = `
      <div class="cursor-pointer relative h-10 inline-flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner select-none">
        
        <span class="knob absolute top-1 bottom-1 left-1 w-16 bg-white rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.1)] transition-transform duration-200 ease-out"></span>

        <span class="label-off relative z-10 w-16 text-center text-xs font-bold leading-none py-1.5 flex items-center justify-center h-full transition-colors duration-200">
          ${labelOff}
        </span>

        <span class="label-on relative z-10 w-16 text-center text-xs font-bold leading-none py-1.5 flex items-center justify-center h-full transition-colors duration-200">
          ${labelOn}
        </span>
      </div>
    `;

    this.addEventListener('click', this.toggle.bind(this));
    this.updateView();
  }

  toggle() {
    this.state = !this.state;
    this.updateView();
    this.dispatchEvent(new CustomEvent('change', { detail: { checked: this.state } }));
  }

  updateView() {
    const knob = this.querySelector('.knob');
    const labelOn = this.querySelector('.label-on');
    const labelOff = this.querySelector('.label-off');

    // スタイル定義
    const activeClass = ['text-blue-600'];     // アクティブ時の文字色
    const inactiveClass = ['text-gray-400', 'font-medium']; // 非アクティブ時の文字色（少し薄く）

    if (this.state) {
      // ONの状態：ノブを右へ移動 (幅の分だけきれいに100%移動)
      knob.style.transform = 'translateX(100%)';
      
      labelOn.classList.add(...activeClass);
      labelOn.classList.remove(...inactiveClass);
      
      labelOff.classList.add(...inactiveClass);
      labelOff.classList.remove(...activeClass);
    } else {
      // OFFの状態：ノブを左へ戻す
      knob.style.transform = 'translateX(0)';
      
      labelOn.classList.add(...inactiveClass);
      labelOn.classList.remove(...activeClass);
      
      labelOff.classList.add(...activeClass);
      labelOff.classList.remove(...inactiveClass);
    }
  }
}

if (!customElements.get('custom-toggle')) {
  customElements.define('custom-toggle', ToggleSwitch);
}
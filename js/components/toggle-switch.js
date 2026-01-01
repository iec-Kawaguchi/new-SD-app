class ToggleSwitch extends HTMLElement {
  constructor() {
    super();
  }

  // HTMLに配置されたときに呼ばれる
  connectedCallback() {
    // 属性から初期値を取得
    const isOn = this.getAttribute('checked') === 'true';
    const labelOn = this.getAttribute('label-on') || 'ON';
    const labelOff = this.getAttribute('label-off') || 'OFF';

    // 現在の状態を保持
    this.state = isOn;

    // レンダリング（Tailwindのクラスをそのまま使用）
    this.innerHTML = `
      <div class="cursor-pointer relative inline-flex items-center h-8 rounded-full w-[4.5rem] transition-colors duration-200 ${isOn ? 'bg-blue-600' : 'bg-gray-200'}">
        <span class="label-on absolute left-2 text-[10px] font-bold text-white pointer-events-none ${isOn ? '' : 'hidden'}">${labelOn}</span>
        <span class="label-off absolute right-2 text-[10px] font-bold text-gray-500 pointer-events-none ${isOn ? 'hidden' : ''}">${labelOff}</span>
        <span class="knob inline-block size-6 bg-white rounded-full shadow transform transition-transform duration-200 mx-1 ${isOn ? 'translate-x-10' : 'translate-x-0'}"></span>
      </div>
    `;

    // クリックイベントの登録
    this.addEventListener('click', this.toggle.bind(this));
  }

  toggle() {
    this.state = !this.state;
    this.updateView();
    
    // 親要素に「変更されたよ」と伝えるイベントを発火
    this.dispatchEvent(new CustomEvent('change', { 
      detail: { checked: this.state } 
    }));
  }

  updateView() {
    const container = this.querySelector('div');
    const knob = this.querySelector('.knob');
    const labelOn = this.querySelector('.label-on');
    const labelOff = this.querySelector('.label-off');

    if (this.state) {
      container.classList.remove('bg-gray-200');
      container.classList.add('bg-blue-600');
      knob.classList.remove('translate-x-0');
      knob.classList.add('translate-x-10');
      labelOn.classList.remove('hidden');
      labelOff.classList.add('hidden');
    } else {
      container.classList.remove('bg-blue-600');
      container.classList.add('bg-gray-200');
      knob.classList.remove('translate-x-10');
      knob.classList.add('translate-x-0');
      labelOn.classList.add('hidden');
      labelOff.classList.remove('hidden');
    }
  }
}

// ブラウザにタグを登録 (<custom-toggle>として使えるようになる)
customElements.define('custom-toggle', ToggleSwitch);
// ./js/modal-iframe.js
// file:// で動く「iframeモーダル」マネージャ（複数同時OK）

(function (global) {
    const ModalIframe = {
        _stack: [], // { wrap, iframe, lastFocus, z }
        _baseZ: 50,
        _inited: false,
        _scrollLocks: 0,

    init() {
        if (this._inited) return;
        this._inited = true;

        // デリゲーション：開く
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-modal-src]');
            if (!trigger) return;
            const src = trigger.getAttribute('data-modal-src');
            if (!src) return;
            this.open(src, trigger);
        });

        // Escでトップを閉じる
        document.addEventListener('keydown', (e) => {
            if (!this._stack.length) return;
            if (e.key === 'Escape') {
                const top = this._stack[this._stack.length - 1];
                if (!top.wrap.dataset.backdropStatic) this.closeTop();
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    },

    open(src, openerEl) {
        const z = this._baseZ + this._stack.length; // 50,51,52...

        // ラッパ（背景＋パネル）
        const wrap = document.createElement('section');
        wrap.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-10';
        wrap.style.zIndex = String(z);
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.dataset.modal = 'iframe';

        // パネル（iframeを内包）
        const panel = document.createElement('div');
        panel.className = 'relative bg-white rounded-2xl shadow-lg w-full max-w-5xl h-[90vh]';

        // クローズボタン
        const closeBtn = document.createElement('button');
        closeBtn.className = 'absolute top-2 right-2 text-gray-500 hover:text-gray-700';
        closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
        closeBtn.addEventListener('click', () => this.closeTop());

        // iframe 本体
        const iframe = document.createElement('iframe');
        iframe.src = src;                     // file:// 相対パスOK
        iframe.title = 'modal';
        iframe.className = 'w-full h-full rounded-2xl';
        iframe.setAttribute('loading', 'eager');
        iframe.setAttribute('referrerpolicy', 'no-referrer');

        // 背景クリックで閉じる（staticにしたいときは data-backdrop-static を付ける）
        wrap.addEventListener('click', (e) => {
            if (e.target === wrap && !wrap.dataset.backdropStatic) {
            this.closeTop();
            }
        });

        panel.appendChild(closeBtn);
        panel.appendChild(iframe);
        wrap.appendChild(panel);
        document.body.appendChild(wrap);

        // スクロールロック
        this._lockScroll();

        // フォーカス退避
        const lastFocus = document.activeElement;
        closeBtn.focus({ preventScroll: true });

        this._stack.push({ wrap, iframe, lastFocus, z });
    },

    closeTop() {
      if (!this._stack.length) return;
      const { wrap, lastFocus } = this._stack.pop();
      wrap.remove();
      if (lastFocus && typeof lastFocus.focus === 'function') {
        try { lastFocus.focus({ preventScroll: true }); } catch {}
      }
      this._unlockScroll();
    },

    // 背景クリック無効化API（必要なら呼び出し側で）
    setBackdropStatic(isStatic = true) {
      if (!this._stack.length) return;
      const top = this._stack[this._stack.length - 1];
      if (isStatic) top.wrap.dataset.backdropStatic = '1';
      else delete top.wrap.dataset.backdropStatic;
    },

    // ---- helpers ----
    _lockScroll() {
      this._scrollLocks++;
      if (this._scrollLocks === 1) {
        document.documentElement.classList.add('overflow-hidden');
        document.body.classList.add('overflow-hidden');
      }
    },
    _unlockScroll() {
      this._scrollLocks = Math.max(0, this._scrollLocks - 1);
      if (this._scrollLocks === 0) {
        document.documentElement.classList.remove('overflow-hidden');
        document.body.classList.remove('overflow-hidden');
      }
    }
  };

  global.ModalIframe = ModalIframe;
})(window);

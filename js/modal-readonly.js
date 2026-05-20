// modal-readonly.js
// ?readonly=true が URL に含まれるとき、モーダルを参照モードで表示する汎用スクリプト。
// すでに data-readonly-banner 属性を持つバナーが表示されているモーダルでは
// バナー追加をスキップし、入力無効化・アクションボタン非表示のみ行う。

(function () {
    const isReadOnly = new URLSearchParams(location.search).get('readonly') === 'true';
    if (!isReadOnly) return;

    document.addEventListener('DOMContentLoaded', function () {

        // 1. 既存の参照モードバナーがすでに表示されているか確認
        //    data-readonly-banner 属性を持つ要素が .hidden でなければスキップ
        const existingBanner = document.querySelector('[data-readonly-banner]:not(.hidden)');

        if (!existingBanner) {
            // 既存バナーがない場合のみ、汎用バナーをヘッダー内末尾に追加
            // スタイルは各モーダルの既存バナーと統一（青 bg-blue-50 / info アイコン）
            const header = document.querySelector('header');
            if (header) {
                const banner = document.createElement('div');
                banner.className = 'mt-3 ml-8 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3';
                banner.innerHTML =
                    '<span class="material-symbols-outlined text-blue-500 shrink-0 mt-0.5" style="font-size:18px;">info</span>' +
                    '<p class="text-sm text-blue-700">この画面は閲覧専用です。</p>';
                header.insertAdjacentElement('beforeend', banner);
            }
        }

        // 2. 入力要素をすべて無効化
        document.querySelectorAll('input, textarea, select').forEach(function (el) {
            el.disabled = true;
            el.classList.add('opacity-60', 'cursor-not-allowed');
        });

        // 3. アクションボタンを非表示（送信・登録・保存・追加・依頼 等を含むもの）
        const actionKeywords = ['送信', '登録', '保存', '追加', '依頼', '確定', '更新', '設定する', '登録する', '追加する', '依頼する'];
        document.querySelectorAll('button').forEach(function (btn) {
            const text = btn.textContent.trim();
            if (actionKeywords.some(function (kw) { return text.includes(kw); })) {
                btn.style.display = 'none';
            }
        });

        // 4. フッターの「キャンセル」ラベルを「閉じる」に変換（閉じる手段を残す）
        document.querySelectorAll('.fixed.bottom-0 button').forEach(function (btn) {
            if (btn.textContent.trim() === 'キャンセル') {
                btn.textContent = '閉じる';
            }
        });

        // 5. custom-toggle / その他インタラクティブ要素を非活性化
        document.querySelectorAll('custom-toggle').forEach(function (el) {
            el.setAttribute('disabled', '');
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.6';
        });

        // 6. readonly専用セクションを表示
        document.querySelectorAll('[data-readonly-section]').forEach(function (el) {
            el.classList.remove('hidden');
        });
    });
})();

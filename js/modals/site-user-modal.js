// site-user-modal.js
// サイトユーザー登録モーダルのモック挙動を担当するスクリプト
// (元は partials/site-user-modal.html のインラインスクリプト)

window.addEventListener('DOMContentLoaded', () => {
  // ------- モックデータ定義 -------

  // 1. 前画面で作ったであろう「申込指示パターン」のマスタ
  const instructionMaster = [
    { id: 1, name: '新卒・社内向け（教材送付：会社宛）' },
    { id: 2, name: '管理職研修用（教材送付：会社宛）' },
    { id: 3, name: '関東エリア配属向け' },
  ];

  // 2. 登録済みユーザーの初期データ
  // instructionId で紐付けを表現
  const initialUsers = [
    { name: '共通ユーザー①', id: 'FY2026_1h', pwd: 'study', instructionId: 1 },
    { name: '共通ユーザー②', id: 'FY2026_2h', pwd: 'study', instructionId: 2 },
  ];

  // ------- DOM要素 -------
  const listEl = document.getElementById('list');
  const emptyEl = document.getElementById('empty');
  const tpl = document.getElementById('row-tpl');
  const selectEl = document.getElementById('instruction-select');
  const nameInput = document.getElementById('name');
  const idInput = document.getElementById('uid');
  const pwdInput = document.getElementById('pwd');

  // ------- 初期化処理 -------

  // プルダウンの選択肢生成
  function initSelect() {
    instructionMaster.forEach((inst) => {
      const opt = document.createElement('option');
      opt.value = inst.id;
      opt.textContent = inst.name;
      selectEl.appendChild(opt);
    });
  }

  function setEmptyState() {
    const hasRows = listEl.children.length > 0;
    emptyEl.classList.toggle('hidden', hasRows);
  }

  function avatarLetter(text) {
    return (text || 'U').trim().charAt(0).toUpperCase();
  }

  // 指示IDから名称を引くヘルパ
  function getInstructionName(id) {
    const found = instructionMaster.find((m) => m.id == id);
    return found ? found.name : '未設定';
  }

  // 行生成ロジック
  function makeRow({ name, id, pwd, instructionId }) {
    const node = tpl.content.firstElementChild.cloneNode(true);

    node.querySelector('.avatar').textContent = avatarLetter(name);
    node.querySelector('.name').textContent = name || '';
    node.querySelector('.id').textContent = id || '';
    node.dataset.pwd = pwd || '';

    // 紐付いた指示名を表示
    node.querySelector('.instruction-badge').textContent = getInstructionName(instructionId);

    // IDコピー
    node.querySelector('.copy-id').addEventListener('click', () => {
      navigator.clipboard?.writeText(id || '');
    });

    // パスワード表示切り替え（行単位）
    const dot = node.querySelector('.pwd-dot');
    node.querySelector('.toggle-row-pwd').addEventListener('click', () => {
      if (dot.dataset.revealed === '1') {
        dot.textContent = '••••••';
        dot.dataset.revealed = '0';
      } else {
        dot.textContent = node.dataset.pwd || '';
        dot.dataset.revealed = '1';
      }
    });

    // 削除ボタン
    node.querySelector('.remove').addEventListener('click', () => {
      node.remove();
      setEmptyState();
    });

    return node;
  }

  // 実行：初期描画
  initSelect();
  initialUsers.forEach((d) => listEl.appendChild(makeRow(d)));
  setEmptyState();

  // ------- UIイベント -------

  document.getElementById('toggle-pwd').addEventListener('click', () => {
    pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
  });

  // 簡易ID自動生成
  document.getElementById('gen-id').addEventListener('click', () => {
    const n = Math.floor(Math.random() * 900 + 100);
    idInput.value = `FY2026_${n}h`;
  });

  // 追加ボタンクリック
  document.getElementById('add').addEventListener('click', () => {
    const name = nameInput.value.trim();
    const id = idInput.value.trim();
    const pwd = pwdInput.value.trim();
    const instructionId = selectEl.value; // 選択されたIDを取得

    if (!name || !id || !pwd) {
      [nameInput, idInput, pwdInput].forEach((el) => {
        if (!el.value.trim()) {
          el.classList.add('ring-2', 'ring-red-400');
          setTimeout(() => el.classList.remove('ring-2', 'ring-red-400'), 2000);
        }
      });
      return;
    }

    // 新規行を追加
    listEl.prepend(makeRow({ name, id, pwd, instructionId }));
    setEmptyState();

    // 入力クリア
    nameInput.value = '';
    idInput.value = '';
    pwdInput.value = '';
    pwdInput.type = 'password';
    nameInput.focus();
  });
});

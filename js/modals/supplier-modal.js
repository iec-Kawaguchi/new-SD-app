// supplier-modal2.js
// 参加団体登録モーダル v2：ロール別表示切替・排他的営業担当選択・保存バリデーション対応

window.addEventListener('DOMContentLoaded', () => {
  // --- マスターデータ ---
  const orgMaster = [
    { id: 'org-1', name: '産業能率大学' },
    { id: 'org-2', name: 'JMAM' },
    { id: 'org-3', name: 'JTEX' },
  ];

  const contactMaster = {
    'org-1': [
      { id: 'ichiro', name: '鈴木 一郎', email: 'ichiro.suzuki@sannou.ac.jp' },
      { id: 'hanako', name: '高橋 花子', email: 'hanako.takahashi@sannou.ac.jp' },
    ],
    'org-2': [
      { id: 'taro', name: '田中 太郎', email: 'taro.tanaka@jmam.co.jp' },
    ],
    'org-3': [
      { id: 'keiko', name: '佐藤 恵子', email: 'keiko.sato@jtex.co.jp' },
    ],
  };

  // 初期登録済みデータ（ロール付き）
  const initialEntries = [
    { orgId: 'org-1', contactId: 'ichiro', roles: { sales: true,  apply: false, billing: false } },
    { orgId: 'org-1', contactId: 'hanako', roles: { sales: false, apply: true,  billing: false } },
    { orgId: 'org-2', contactId: 'taro',   roles: { sales: true,  apply: true,  billing: true  } },
    { orgId: 'org-3', contactId: 'keiko',  roles: { sales: true,  apply: true,  billing: true  } },
  ];

  // IECユーザーダミーデータ（Customer参照モード用）
  const iecUsers = [
    { name: '山田 健一', email: 'yamada.kenichi@iec.co.jp' },
    { name: '佐々木 裕子', email: 'sasaki.yuko@iec.co.jp' },
  ];

  // --- DOM参照 ---
  const addBtn         = document.getElementById('add-btn');
  const cardsEl        = document.getElementById('cards');
  const emptyEl        = document.getElementById('empty');
  const saveBtn        = document.getElementById('save-btn');
  const iecCardsEl     = document.getElementById('iec-cards');
  const vendorCardsEl  = document.getElementById('vendor-sales-cards');
  const vendorEmptyEl  = document.getElementById('vendor-sales-empty');
  const cardTpl        = document.getElementById('card-tpl');
  const iecCardTpl     = document.getElementById('iec-card-tpl');
  const vendorCardTpl  = document.getElementById('vendor-card-tpl');

  // --- ユーティリティ ---
  function orgName(orgId) {
    return orgMaster.find(o => o.id === orgId)?.name || '';
  }

  function findContact(orgId, contactId) {
    return (contactMaster[orgId] || []).find(c => c.id === contactId);
  }

  function setEmptyState() {
    emptyEl.classList.toggle('hidden', cardsEl.children.length > 0);
  }

  // --- 保存バリデーション ---
  // 条件：担当者0件は保存可。1件以上の場合は
  //   ① 全担当者が少なくとも1ロール保持
  //   ② 各団体ごとに営業担当がちょうど1名
  function validateSaveBtn() {
    const cards = [...cardsEl.querySelectorAll('[data-contact-id]')];
    if (cards.length === 0) {
      saveBtn.disabled = false;
      return;
    }

    const anyNoRole = cards.some(card => {
      const s = card.querySelector('.role-sales').checked;
      const a = card.querySelector('.role-apply').checked;
      const b = card.querySelector('.role-billing').checked;
      return !s && !a && !b;
    });

    const orgSalesCount = {};
    cards.forEach(card => {
      const orgId = card.dataset.orgId;
      if (!(orgId in orgSalesCount)) orgSalesCount[orgId] = 0;
      if (card.querySelector('.role-sales').checked) orgSalesCount[orgId]++;
    });
    const salesInvalid = Object.values(orgSalesCount).some(count => count !== 1);

    saveBtn.disabled = anyNoRole || salesInvalid;
  }

  // --- コンボボックス初期化 ---
  const orgCombobox = initCombobox(
    document.getElementById('org-combobox'),
    {
      placeholder: '団体を選択してください',
      items: orgMaster.map(o => ({ value: o.id, label: o.name })),
      onSelect(orgId) {
        updateContactCombobox(orgId);
      },
    }
  );

  const contactCombobox = initCombobox(
    document.getElementById('contact-combobox'),
    {
      placeholder: '担当者を選択してください',
      disabled: true,
    }
  );

  function updateContactCombobox(orgId) {
    const contacts = (contactMaster[orgId] || []).map(c => ({ value: c.id, label: c.name }));
    contactCombobox.setItems(contacts);
    contactCombobox.setDisabled(!orgId);
  }

  // --- カード生成（IEC編集モード） ---
  function makeCard({ orgId, contactId, roles = {} }) {
    const contact = findContact(orgId, contactId);
    const orgLabel = orgName(orgId);
    if (!contact || !orgLabel) return null;

    const node = cardTpl.content.firstElementChild.cloneNode(true);
    node.dataset.orgId     = orgId;
    node.dataset.contactId = contactId;

    node.querySelector('.avatar').textContent = contact.name.trim().charAt(0);
    node.querySelector('.name').textContent   = contact.name;
    node.querySelector('.org').textContent    = orgLabel;
    node.querySelector('.email').textContent  = contact.email || '';

    const salesChk   = node.querySelector('.role-sales');
    const applyChk   = node.querySelector('.role-apply');
    const billingChk = node.querySelector('.role-billing');

    salesChk.checked   = !!roles.sales;
    applyChk.checked   = !!roles.apply;
    billingChk.checked = !!roles.billing;

    // 営業担当：同一団体内で排他的選択
    salesChk.addEventListener('change', () => {
      if (salesChk.checked) {
        cardsEl.querySelectorAll('[data-org-id="' + orgId + '"]').forEach(other => {
          if (other !== node) other.querySelector('.role-sales').checked = false;
        });
      }
      validateSaveBtn();
    });

    applyChk.addEventListener('change', validateSaveBtn);
    billingChk.addEventListener('change', validateSaveBtn);

    node.querySelector('.remove').addEventListener('click', () => {
      node.remove();
      setEmptyState();
      validateSaveBtn();
    });

    return node;
  }

  // 重複チェックしてカードを追加
  function addEntry(entry) {
    if (cardsEl.querySelector('[data-contact-id="' + entry.contactId + '"]')) return false;
    const card = makeCard(entry);
    if (!card) return false;
    cardsEl.prepend(card);
    setEmptyState();
    validateSaveBtn();
    return true;
  }

  // --- Customer参照モード用カード生成 ---
  function renderIecCards() {
    iecCardsEl.innerHTML = '';
    iecUsers.forEach(user => {
      const node = iecCardTpl.content.firstElementChild.cloneNode(true);
      node.querySelector('.avatar').textContent      = user.name.trim().charAt(0);
      node.querySelector('.name').textContent        = user.name;
      node.querySelector('.affiliation').textContent = 'IEC';
      node.querySelector('.email').textContent       = user.email;
      iecCardsEl.appendChild(node);
    });
  }

  function renderVendorSalesCards() {
    vendorCardsEl.innerHTML = '';
    const salesEntries = initialEntries.filter(e => e.roles.sales);
    if (salesEntries.length === 0) {
      vendorEmptyEl.classList.remove('hidden');
      return;
    }
    vendorEmptyEl.classList.add('hidden');
    salesEntries.forEach(entry => {
      const contact = findContact(entry.orgId, entry.contactId);
      if (!contact) return;
      const node = vendorCardTpl.content.firstElementChild.cloneNode(true);
      node.querySelector('.avatar').textContent = contact.name.trim().charAt(0);
      node.querySelector('.name').textContent   = contact.name;
      node.querySelector('.org').textContent    = orgName(entry.orgId);
      node.querySelector('.email').textContent  = contact.email;
      vendorCardsEl.appendChild(node);
    });
  }

  // --- 初期化 ---
  initialEntries.forEach(e => addEntry(e));
  setEmptyState();
  validateSaveBtn();
  renderIecCards();
  renderVendorSalesCards();

  // --- イベント ---
  addBtn.addEventListener('click', () => {
    const orgId     = orgCombobox.getValue();
    const contactId = contactCombobox.getValue();

    if (!orgId || !contactId) {
      if (!orgId) {
        const btn = document.querySelector('#org-combobox .combo-btn');
        btn.classList.add('ring-2', 'ring-red-400');
        setTimeout(() => btn.classList.remove('ring-2', 'ring-red-400'), 1500);
      }
      if (!contactId) {
        const btn = document.querySelector('#contact-combobox .combo-btn');
        btn.classList.add('ring-2', 'ring-red-400');
        setTimeout(() => btn.classList.remove('ring-2', 'ring-red-400'), 1500);
      }
      return;
    }

    // 新規追加時はロールを全未選択
    const added = addEntry({ orgId, contactId, roles: {} });
    if (!added) {
      // 重複の場合：既存カードをハイライト
      const existing = cardsEl.querySelector('[data-contact-id="' + contactId + '"]');
      if (existing) {
        existing.classList.add('ring-2', 'ring-yellow-400', 'rounded-xl');
        existing.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => existing.classList.remove('ring-2', 'ring-yellow-400', 'rounded-xl'), 1500);
      }
    }

    contactCombobox.reset();
    updateContactCombobox(orgId);
  });

  // --- RoleMock初期化 ---
  if (!new URLSearchParams(location.search).get('role')) {
    RoleMock.setRoleInUrl('iec');
  }
  RoleMock.init({ roleSelect: '#role-select' });
});

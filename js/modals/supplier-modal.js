// supplier-modal.js
// 参加団体登録モーダルのモック挙動を担当するスクリプト

window.addEventListener('DOMContentLoaded', () => {
  const orgMaster = [
    { id: 'org-1', name: '産業能率大学' },
    { id: 'org-2', name: 'JMAM' },
    { id: 'org-3', name: 'JTEX' },
  ];

  const contactMaster = {
    'org-1': [
      { id: 'ichiro', name: '鈴木 一郎', email: 'ichiro.suzuki@sannou.ac.jp', roles: ['sales'] },
      { id: 'hanako', name: '高橋 花子', email: 'hanako.takahashi@sannou.ac.jp', roles: ['apply'] },
    ],
    'org-2': [
      { id: 'taro', name: '田中 太郎', email: 'taro.tanaka@jmam.co.jp', roles: ['sales', 'apply', 'billing'] },
    ],
    'org-3': [
      { id: 'keiko', name: '佐藤 恵子', email: 'keiko.sato@jtex.co.jp', roles: ['sales', 'apply', 'billing'] },
    ],
  };

  const initialEntries = [
    { orgId: 'org-1', contactId: 'ichiro' },
    { orgId: 'org-1', contactId: 'hanako' },
    { orgId: 'org-2', contactId: 'taro' },
    { orgId: 'org-3', contactId: 'keiko' },
  ];

  const orgSelect = document.getElementById('org-select');
  const contactSelect = document.getElementById('contact-select');
  const addBtn = document.getElementById('add');
  const cardsEl = document.getElementById('cards');
  const emptyEl = document.getElementById('empty');
  const tpl = document.getElementById('card-tpl');

  function orgName(orgId) {
    return orgMaster.find((o) => o.id === orgId)?.name || '';
  }

  function findContact(orgId, contactId) {
    return (contactMaster[orgId] || []).find((c) => c.id === contactId);
  }

  function setEmptyState() {
    const hasCards = cardsEl.children.length > 0;
    emptyEl.classList.toggle('hidden', hasCards);
  }

  function populateOrgSelect() {
    orgMaster.forEach((org) => {
      const opt = document.createElement('option');
      opt.value = org.id;
      opt.textContent = org.name;
      orgSelect.appendChild(opt);
    });
  }

  function populateContactSelect(orgId) {
    contactSelect.innerHTML = '<option value=\"\">担当者を選択してください</option>';
    (contactMaster[orgId] || []).forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      contactSelect.appendChild(opt);
    });
    contactSelect.disabled = !orgId;
  }

  function makeCard({ orgId, contactId }) {
    const contact = findContact(orgId, contactId);
    const orgLabel = orgName(orgId);
    if (!contact || !orgLabel) return null;

    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.orgId = orgId;
    node.dataset.contactId = contactId;

    node.querySelector('.avatar').textContent = contact.name.trim().charAt(0).toUpperCase();
    node.querySelector('.name').textContent = contact.name;
    node.querySelector('.org').textContent = orgLabel;
    node.querySelector('.email').textContent = contact.email || '';

    const roles = new Set(contact.roles || []);
    node.querySelector('.role-sales').checked = roles.has('sales');
    node.querySelector('.role-apply').checked = roles.has('apply');
    node.querySelector('.role-billing').checked = roles.has('billing');

    node.querySelector('.remove').addEventListener('click', () => {
      node.remove();
      setEmptyState();
    });

    return node;
  }

  function addEntry(entry) {
    const card = makeCard(entry);
    if (!card) return;
    cardsEl.prepend(card);
    setEmptyState();
  }

  // 初期化
  populateOrgSelect();
  populateContactSelect('');
  initialEntries.forEach(addEntry);
  setEmptyState();

  orgSelect.addEventListener('change', (e) => {
    populateContactSelect(e.target.value);
  });

  addBtn.addEventListener('click', () => {
    const orgId = orgSelect.value;
    const contactId = contactSelect.value;
    if (!orgId || !contactId) {
      [orgSelect, contactSelect].forEach((el) => {
        if (!el.value) {
          el.classList.add('ring-2', 'ring-red-400');
          setTimeout(() => el.classList.remove('ring-2', 'ring-red-400'), 1500);
        }
      });
      return;
    }

    addEntry({ orgId, contactId });

    contactSelect.value = '';
    populateContactSelect(orgId);
    orgSelect.focus();
  });
});

// tanto-modal.js
// 顧客担当モーダルを supplier と同じ振る舞いで管理する

window.addEventListener('DOMContentLoaded', () => {
  const fixedCustomer = { id: 'customer', name: '顧客企業' };

  const contactMaster = {
    [fixedCustomer.id]: [
      { id: 'takahashi', name: '高橋 昇', email: 'noboru.takahashi@marumarufood.co.jp', roles: ['recruit'] },
      { id: 'mori', name: '森 彩', email: 'aya.mori@marumarufood.co.jp', roles: ['recruit'] },
      { id: 'suzuki', name: '鈴木 大地', email: 'daichi.suzuki@marumarufood.co.jp', roles: ['billing'] },
      { id: 'kondo', name: '近藤 悠', email: 'yu.kondo@marumarufood.co.jp', roles: ['recruit', 'billing'] },
    ],
  };

  const initialEntries = [
    { orgId: fixedCustomer.id, contactId: 'takahashi' },
    { orgId: fixedCustomer.id, contactId: 'kondo' },
  ];

  const contactSelect = document.getElementById('contact-select');
  const addBtn = document.getElementById('add');
  const cardsEl = document.getElementById('cards');
  const emptyEl = document.getElementById('empty');
  const tpl = document.getElementById('card-tpl');

  function orgName(orgId) {
    return orgId === fixedCustomer.id ? fixedCustomer.name : '';
  }

  function findContact(orgId, contactId) {
    return (contactMaster[orgId] || []).find((c) => c.id === contactId);
  }

  function setEmptyState() {
    const hasCards = cardsEl.children.length > 0;
    emptyEl.classList.toggle('hidden', hasCards);
  }

  function populateContactSelect() {
    contactSelect.innerHTML = '<option value="">担当者を選択してください</option>';
    (contactMaster[fixedCustomer.id] || []).forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      contactSelect.appendChild(opt);
    });
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
    node.querySelector('.email').textContent = contact.email || '';

    const roles = new Set(contact.roles || []);
    node.querySelector('.role-recruit').checked = roles.has('recruit');
    node.querySelector('.role-billing').checked = roles.has('billing');

    node.querySelector('.remove').addEventListener('click', () => {
      node.remove();
      setEmptyState();
    });

    return node;
  }

  function addEntry(entry) {
    const exists = cardsEl.querySelector(`[data-org-id="${entry.orgId}"][data-contact-id="${entry.contactId}"]`);
    if (exists) return;

    const card = makeCard(entry);
    if (!card) return;
    cardsEl.prepend(card);
    setEmptyState();
  }

  populateContactSelect();
  initialEntries.forEach(addEntry);
  setEmptyState();

  addBtn.addEventListener('click', () => {
    const contactId = contactSelect.value;
    if (!contactId) {
      contactSelect.classList.add('ring-2', 'ring-red-400');
      setTimeout(() => contactSelect.classList.remove('ring-2', 'ring-red-400'), 1500);
      return;
    }

    addEntry({ orgId: fixedCustomer.id, contactId });

    contactSelect.value = '';
    contactSelect.focus();
  });
});

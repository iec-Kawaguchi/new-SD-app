// role-visibility.js (vanilla JS, minimal)
// - data-visible-for="member,admin" でロール制御
// - [data-route] セクションを show(route) で表示切替
// - #role-select の変更で ?role= をURLに反映（共有・再現性のため）
// - #top-nav の [data-goto] で簡易ナビ（URLにはpageを書かない設計）

(function (global) {
  const qs = new URLSearchParams(location.search);

  function getRole() {
    return qs.get('role') || 'guest';
  }

  function setRoleInUrl(role) {
    qs.set('role', role);
    history.replaceState(null, '', location.pathname + '?' + qs.toString());
  }

  function hasAccess(el, role) {
    const attr = el.getAttribute('data-visible-for');
    if (!attr) return true;
    return attr.split(',').map((s) => s.trim()).includes(role);
  }

  function applyRoleVisibility() {
    const role = getRole();
    document.querySelectorAll('[data-visible-for]').forEach((el) => {
      el.classList.toggle('hidden', !hasAccess(el, role));
    });
  }

  function show(route) {
    document.querySelectorAll('[data-route]').forEach((sec) => {
      sec.classList.toggle('hidden', sec.getAttribute('data-route') !== route);
    });
    // nav current style (Tailwind border accent only)
    const nav = document.querySelector('#top-nav');
    if (nav) {
      nav.querySelectorAll('[data-goto]').forEach((btn) => {
        btn.classList.toggle('border-blue-500', btn.getAttribute('data-goto') === route);
      });
    }
  }

  function bindRoleSelect(selector = '#role-select') {
    const roleSel = document.querySelector(selector);
    if (!roleSel) return;
    roleSel.value = getRole();
    roleSel.addEventListener('change', (e) => {
      setRoleInUrl(e.target.value);
      applyRoleVisibility();
    });
  }

  function bindNav(selector = '#top-nav', initialRoute = 'dashboard') {
    const nav = document.querySelector(selector);
    if (!nav) return;
    // initial highlight / route
    show(initialRoute);
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-goto]');
      if (!btn) return;
      e.preventDefault();
      show(btn.getAttribute('data-goto'));
    });
  }

  function init({ roleSelect = '#role-select', nav = '#top-nav', defaultRoute = 'dashboard' } = {}) {
    // ensure URL has role for shareability
    if (!qs.get('role')) setRoleInUrl('guest');

    applyRoleVisibility();
    bindRoleSelect(roleSelect);
    bindNav(nav, defaultRoute);

    // Update on back/forward (role changes)
    window.addEventListener('popstate', () => {
      const roleSel = document.querySelector(roleSelect);
      if (roleSel) roleSel.value = getRole();
      applyRoleVisibility();
    });
  }

  // expose minimal API
  global.RoleMock = { init, applyRoleVisibility, show, getRole, setRoleInUrl };
})(window);

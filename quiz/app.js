//import { TYPE_META, PAIR_MAP, QUESTIONS } from "./types-data.js";
const TYPE_META = window.TYPE_META;
const PAIR_MAP  = window.PAIR_MAP;
const QUESTIONS = window.QUESTIONS;
const PAIR_IMAGE = window.PAIR_IMAGE;
const TYPE_IMAGE = window.TYPE_IMAGE;
const FALLBACK_IMAGE = window.FALLBACK_IMAGE;

// 順位→点（上から 8,4,2,1）
const RANK_POINTS = [8,4,2,1];

// 合計点
const totals = { A:0, B:0, C:0, D:0 };
let idx = 0;

// UI参照
const start = document.getElementById("start");
const begin = document.getElementById("begin");
const progress = document.getElementById("progress");
const bar = document.getElementById("bar");
const count = document.getElementById("count");
const qwrap = document.getElementById("qwrap");
const result = document.getElementById("result");
const header = document.querySelector("header");

// 共通UI
begin.onclick = () => {
    start.classList.add("hidden");
    header.classList.add("hidden");
    progress.classList.remove("hidden");
    renderQuestion();
    updateProgress();
};

document.addEventListener("click", (e) => {
    if(e.target.id === "copy") copySummary();
    if(e.target.id === "print") window.print();
    if(e.target.id === "shareX") shareX();
    if(e.target.id === "retry") location.reload();
});

function updateProgress() {
    const p = Math.round((idx / QUESTIONS.length) * 100);
    bar.style.width = p + "%";
    count.textContent = `${idx} / ${QUESTIONS.length}`;
}

function renderQuestion() {
    qwrap.innerHTML = "";
    if (idx >= QUESTIONS.length) return showResult();

    const q = QUESTIONS[idx];
    const node = document.createElement("div");
    node.className = "w-full max-w-2xl mx-auto fade-in";

    // 変更点1：質問文エリアの高さを固定（h-24 sm:h-32）し、Flexboxで中央揃えにする
    // これにより、文字数で行数が増減しても下の要素の位置がズレません。
    node.innerHTML = `
        <div class="mb-6 text-center w-full">
            <span class="inline-block text-indigo-500 font-bold tracking-widest text-xs mb-2">QUESTION ${idx+1}</span>
            <div class="h-20 sm:h-28 flex items-center justify-center px-4">
                <h2 class="text-xl sm:text-3xl font-bold text-slate-800 leading-snug w-full">
                    ${q.text}
                </h2>
            </div>
        </div>

        <p class="text-sm text-slate-500 mb-4 text-center flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
            カードをドラッグして優先度順（上＝高）に並べ替えてください
        </p>

        <ol id="rank-list" class="space-y-3 select-none">
            ${q.options.map((opt, i) => `
            <li class="draggable-item group relative bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 flex items-center gap-4"
                draggable="true" data-index="${i}">
                <div class="handle w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    ${i + 1}
                </div>
                <div class="flex-1 font-semibold text-slate-700 group-hover:text-slate-900 text-sm sm:text-base">${opt}</div>
                <div class="text-slate-300">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path></svg>
                </div>
            </li>
            `).join('')}
        </ol>

        <div class="mt-8 text-center">
            <button id="confirm" class="btn-primary w-full sm:w-auto py-3 px-10 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200">
                次へ進む
            </button>
        </div>
    `;
    qwrap.appendChild(node);

    function refreshNumbers() {
        const lis = Array.from(document.querySelectorAll('#rank-list li'));
        lis.forEach((li, pos) => {
            const handle = li.querySelector('.handle');
            handle.textContent = pos + 1;
            if (pos === 0) { handle.className = "handle w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-md"; }
            else if (pos === 1) { handle.className = "handle w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm"; }
            else { handle.className = "handle w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-sm"; }
        });
    }

    // DnD Logic
    const list = document.getElementById('rank-list');
    let dragEl = null;

    list.addEventListener('dragstart', (e) => {
        dragEl = e.target.closest('li');
        if (!dragEl) return;
        dragEl.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    list.addEventListener('dragend', () => {
        if (dragEl) dragEl.classList.remove('dragging');
        dragEl = null;
        refreshNumbers();
    });
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterEl = getDragAfterElement(list, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (!dragging) return;
        if (afterEl == null) list.appendChild(dragging);
        else list.insertBefore(dragging, afterEl);
    });

    function getDragAfterElement(container, y) {
        const els = [...container.querySelectorAll('li:not(.dragging)')];
        return els.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    refreshNumbers();

    const confirmBtn = document.getElementById('confirm');
    let locked = false;
    confirmBtn.onclick = () => {
        if (locked) return;
        locked = true;
        confirmBtn.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 処理中...`;
        
        const order = [...document.querySelectorAll('#rank-list li')].map(li => Number(li.getAttribute('data-index')));
        setTimeout(() => {
             order.forEach((optIndex, pos) => {
                const typeKey = ['A','B','C','D'][optIndex];
                totals[typeKey] += RANK_POINTS[pos];
            });
            idx++;
            updateProgress();
            renderQuestion();
        }, 300);
    };
}

function buildOrderCode(entries) {
    const groups = [];
    let i = 0;
    while (i < entries.length) {
        const tieGroup = [entries[i][0]];
        let j = i + 1;
        while (j < entries.length && entries[j][1] === entries[i][1]) { tieGroup.push(entries[j][0]); j++; }
        groups.push(tieGroup);
        i = j;
    }
    return groups.map(g => g.join("=")).join(" > ");
}

function showResult() {
    qwrap.classList.add("hidden");
    progress.classList.add("hidden");
    result.classList.remove("hidden");
    header.classList.remove("hidden");

    const entries = Object.entries(totals).sort((a,b)=>b[1]-a[1]); 
    const orderCode = buildOrderCode(entries);
    const topCandidates = entries.filter(e => e[1] === entries[0][1]).map(e => e[0]).sort();
    const topKey = topCandidates[0];
    const secondKey = (topCandidates.length === 1) ? entries[1][0]
                    : entries.filter(e => e[1] === entries[0][1]).map(e=>e[0]).sort()[1] || entries[1][0];
    const pairKey = (topKey || "") + (secondKey || "");
    const pair = PAIR_MAP[pairKey];

    const title = pair ? pair.title : TYPE_META[topKey].name;
    const lead  = pair ? pair.lead  : TYPE_META[topKey].desc;

    let imgSrc = "";
    if (PAIR_IMAGE && PAIR_IMAGE[pairKey]) imgSrc = PAIR_IMAGE[pairKey];
    
    // 変更点2：NO IMAGE用のプレースホルダーSVG生成
    // 背景グレー、中央に「NO IMAGE」と表示されるSVGデータURIです。
    const fallbackSvg = "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3e%3crect fill='%23f1f5f9' width='800' height='450'/%3e%3ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2394a3b8' font-weight='bold' letter-spacing='0.1em'%3eNO IMAGE%3c/text%3e%3c/svg%3e";

    result.innerHTML = `
      <div class="text-center mb-10">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-indigo-100 mb-4 animate-bounce">
            <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span class="text-sm font-bold text-slate-600 tracking-wide">DIAGNOSIS COMPLETE</span>
        </div>
        <h2 class="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-500 mb-3">
            ${title}
        </h2>
        <p class="text-lg text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">${lead}</p>
        
        <div class="flex flex-wrap gap-2 justify-center mt-4">
            ${entries.map((e,i) => `
                <span class="px-3 py-1 rounded-lg text-xs font-bold border ${i<2 ? 'bg-indigo-50 text-indigo-700 border-indigo-200':'bg-white text-slate-500 border-slate-200'}">
                    ${i+1}位: ${TYPE_META[e[0]].short} (${e[1]})
                </span>
            `).join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div class="rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white relative group min-h-[300px] flex items-center justify-center bg-slate-50">
               <img src="${imgSrc}" 
                   class="w-full h-full object-cover transform group-hover:scale-105 transition duration-700" 
                   alt="Result Image" 
                   onerror="this.onerror=null; this.src='${fallbackSvg}';">
          </div>

          <div class="flex flex-col gap-6">
              <div class="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/60 shadow-sm">
                  <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                      コンポーネント分析
                  </h3>
                  <div class="space-y-4">
                     ${["A","B","C","D"].map(k => {
                         const max = Math.max(...Object.values(totals));
                         const p = Math.round((totals[k]/max)*100);
                         return `
                         <div>
                            <div class="flex justify-between text-xs font-bold mb-1">
                                <span class="text-slate-600">${TYPE_META[k].name}</span>
                                <span class="text-indigo-600">${totals[k]} pt</span>
                            </div>
                            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div class="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full" style="width:${p}%"></div>
                            </div>
                         </div>
                         `;
                     }).join('')}
                  </div>
              </div>

              <div class="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                  <h3 class="font-bold text-indigo-900 mb-3">⚡️ 基本スタンス</h3>
                  <ul class="space-y-2">
                      ${(pair?.bullets || []).map(b => `<li class="flex items-start gap-2 text-indigo-800 text-sm"><span class="mt-1 text-indigo-400">✔</span>${b}</li>`).join('')}
                  </ul>
              </div>
          </div>
      </div>

      <div class="grid md:grid-cols-3 gap-6 mb-10">
          ${renderCard("🚀 強み", pair?.strengths, "bg-blue-50/50 border-blue-100 text-blue-800", "blue")}
          ${renderCard("⚠️ 注意点", pair?.risks, "bg-amber-50/50 border-amber-100 text-amber-800", "amber")}
          ${renderCard("💡 勝ち筋", pair?.plays, "bg-emerald-50/50 border-emerald-100 text-emerald-800", "emerald")}
      </div>

      <div class="bg-white/70 backdrop-blur border border-white p-6 sm:p-8 rounded-2xl shadow-sm mb-8">
          <h3 class="text-lg font-bold text-slate-800 mb-6 text-center">🤝 チームでの振る舞い方</h3>
          <div class="grid md:grid-cols-2 gap-8">
              <div>
                  <h4 class="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span class="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg></span>
                    コラボレーション術
                  </h4>
                  <ul class="space-y-2 text-sm text-slate-600 list-disc list-inside marker:text-indigo-300">
                     ${(pair?.collab||[]).map(t=>`<li>${t}</li>`).join('')}
                  </ul>
              </div>
              <div>
                  <h4 class="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span class="p-1.5 bg-pink-100 text-pink-600 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg></span>
                    口癖・コミュのコツ
                  </h4>
                  <ul class="space-y-2 text-sm text-slate-600 list-disc list-inside marker:text-pink-300">
                     ${(pair?.comm||[]).map(t=>`<li>${t}</li>`).join('')}
                  </ul>
              </div>
          </div>
          
          <div class="mt-6 pt-6 border-t border-slate-200">
              <div class="flex flex-col sm:flex-row gap-4 justify-between items-center text-sm">
                  <div class="flex items-center gap-2">
                      <span class="font-bold text-slate-500">相性◎</span>
                      <div class="flex gap-1">${(pair?.compatible||[]).map(c=>`<span class="px-2 py-1 bg-teal-100 text-teal-700 rounded-md font-bold text-xs">${c}</span>`).join('')}</div>
                  </div>
                  <div class="flex items-center gap-2">
                      <span class="font-bold text-slate-500">注意△</span>
                      <div class="flex gap-1">${(pair?.caution||[]).map(c=>`<span class="px-2 py-1 bg-rose-100 text-rose-700 rounded-md font-bold text-xs">${c}</span>`).join('')}</div>
                  </div>
              </div>
          </div>
      </div>

      <div class="flex flex-wrap gap-4 justify-center mt-12">
        <button id="shareX" class="btn-primary py-3 px-6 rounded-xl font-bold flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            結果をポスト
        </button>
        <button id="copy" class="btn-ghost py-3 px-6 rounded-xl font-bold">テキストコピー</button>
        <button id="retry" class="btn-ghost py-3 px-6 rounded-xl font-bold">最初からやり直す</button>
      </div>
    `;

    function renderCard(title, items, colorClass, colorName) {
        return `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <h4 class="font-bold mb-3 ${colorClass.split(" ")[2]}">${title}</h4>
            <ul class="space-y-2">
                ${(items||[]).map(t => `
                    <li class="text-sm text-slate-600 flex items-start gap-2">
                        <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-${colorName}-400 flex-shrink-0"></span>
                        <span class="leading-relaxed">${t}</span>
                    </li>
                `).join('')}
            </ul>
        </div>`;
    }

    window.__summary = buildSummary({
        title, lead, orderCode, totals, topKey, secondKey,
        strengths: pair?.strengths || [],
        risks: pair?.risks || [],
        plays: pair?.plays || []
    });
}

function buildSummary({title, lead, orderCode, totals, topKey, secondKey, strengths, risks, plays}){
    return [
        `【意思決定タイプ診断】`,
        `私のタイプは：${TYPE_META[topKey].short}×${TYPE_META[secondKey].short}「${title}」でした。`,
        ``,
        `📊 ${lead}`,
        `🚀 強み: ${strengths.slice(0,2).join(" / ")}`,
        `⚠️ 注意: ${risks.slice(0,1).join("")}`,
        ``,
        `#意思決定タイプ診断`
    ].join("\n");
}

function copySummary(){
    if (!window.__summary) return;
    navigator.clipboard.writeText(window.__summary).then(()=> toast("結果をコピーしました！"));
}
function shareX(){
    if (!window.__summary) return;
    const text = encodeURIComponent(window.__summary);
    const url = "https://twitter.com/intent/tweet?text=" + text;
    window.open(url, "_blank");
}
function toast(msg){
    const t = document.createElement("div");
    t.innerHTML = `
        <div class="bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            ${msg}
        </div>`;
    t.className = "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 fade-in";
    document.body.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),500); }, 2000);
}
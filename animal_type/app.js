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
const mainCard = document.getElementById("main-card"); // メインカード取得

// スマホ用：タップ順序を記録する配列
let tapOrder = [];

// 共通UI
begin.onclick = () => {
    start.classList.add("hidden");
    header.classList.add("hidden");
    progress.classList.remove("hidden");
    renderQuestion();
    updateProgress();
};

document.addEventListener("click", (e) => {
    // 既存のボタンIDと一致するか、あるいはsvg内のパスがクリックされた場合も考慮（closestを使用）
    if(e.target.closest("#copy")) copySummary();
    if(e.target.closest("#print")) window.print();
    if(e.target.closest("#shareX")) shareX();
    if(e.target.closest("#retry")) location.reload();
});

function updateProgress() {
    const p = Math.round((idx / QUESTIONS.length) * 100);
    bar.style.width = p + "%";
    count.textContent = `${idx} / ${QUESTIONS.length}`;
}

// 振動フィードバック（軽量）
function vibrate() {
    if (navigator.vibrate) navigator.vibrate(10); 
}

function renderQuestion() {
    qwrap.innerHTML = "";
    if (idx >= QUESTIONS.length) return showResult();

    // タップ順序を初期化
    tapOrder = [];

    const q = QUESTIONS[idx];
    const node = document.createElement("div");
    node.className = "w-full max-w-2xl mx-auto fade-in pb-20"; // 下部に余白確保

    // UI構築
    node.innerHTML = `
        <div class="mb-4 text-center w-full">
            <span class="inline-block text-indigo-500 font-bold tracking-widest text-xs mb-2">QUESTION ${idx+1}</span>
            <div class="min-h-[5rem] flex items-center justify-center px-2">
                <h2 class="text-xl sm:text-2xl font-bold text-slate-800 leading-snug w-full">
                    ${q.text}
                </h2>
            </div>
        </div>

        <div class="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 mb-4 text-sm text-indigo-800 text-center">
            <p class="font-bold mb-1">💡 回答方法（どちらでもOK）</p>
            <ul class="text-xs text-indigo-600 space-y-1">
                <li>A. 好きな順に<b>タップ</b>（自動で1→2→3...とつきます）</li>
                <li>B. カードを掴んで<b>ドラッグ</b>して並べ替え</li>
            </ul>
        </div>

        <ol id="rank-list" class="space-y-3 select-none relative">
            ${q.options.map((opt, i) => `
            <li class="rank-card group relative bg-white border-2 border-slate-100 p-4 rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98] touch-manipulation"
                draggable="true" data-index="${i}" data-original-index="${i}">
                <div class="flex items-center gap-4 pointer-events-none">
                    <div class="rank-badge w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-lg transition-colors border border-slate-200">
                        <span class="text-xs"></span>
                    </div>
                    <div class="flex-1 font-semibold text-slate-700 leading-relaxed text-sm sm:text-base selection-none">${opt}</div>
                </div>
                <div class="absolute inset-0 border-2 border-indigo-500 rounded-xl opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none selection-ring"></div>
            </li>
            `).join('')}
        </ol>

        <div class="mt-6 flex gap-3 justify-center items-center sticky bottom-6 z-20">
            <button id="reset-rank" class="btn-ghost bg-white/90 backdrop-blur shadow-md text-sm py-3 px-5 rounded-xl border-slate-300 text-slate-500 hidden">
                リセット
            </button>
            <button id="confirm" class="btn-primary flex-1 max-w-xs py-3 px-6 rounded-xl font-bold text-lg shadow-xl shadow-indigo-200 opacity-50 cursor-not-allowed transition-all" disabled>
                決定する
            </button>
        </div>
    `;
    qwrap.appendChild(node);

    const list = document.getElementById('rank-list');
    const items = Array.from(list.querySelectorAll('li'));
    const confirmBtn = document.getElementById('confirm');
    const resetBtn = document.getElementById('reset-rank');

    // === UI更新ロジック ===
    function updateVisuals() {
        if (tapOrder.length > 0) {
            items.forEach(li => {
                const originalIndex = Number(li.dataset.originalIndex);
                const rankIndex = tapOrder.indexOf(originalIndex); 
                const badge = li.querySelector('.rank-badge');
                
                if (rankIndex !== -1) {
                    li.classList.add('border-indigo-500', 'bg-indigo-50');
                    li.classList.remove('border-slate-100', 'bg-white');
                    if(rankIndex === 0) {
                        badge.className = "rank-badge w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-md border-indigo-500 scale-110 transition-transform";
                    } else {
                        badge.className = "rank-badge w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg border-indigo-200";
                    }
                    badge.textContent = rankIndex + 1;
                } else {
                    li.classList.remove('border-indigo-500', 'bg-indigo-50');
                    li.classList.add('border-slate-100', 'bg-white');
                    badge.className = "rank-badge w-10 h-10 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center font-bold text-sm border-slate-200";
                    badge.textContent = "";
                }
            });
            
            if (tapOrder.length === 4) {
                confirmBtn.disabled = false;
                confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                confirmBtn.innerHTML = "次へ進む";
            } else {
                confirmBtn.disabled = true;
                confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
                confirmBtn.innerHTML = `あと ${4 - tapOrder.length}つ 選択`;
            }
            resetBtn.classList.remove('hidden');

        } else {
            const currentItems = Array.from(list.querySelectorAll('li'));
            currentItems.forEach((li, index) => {
                const badge = li.querySelector('.rank-badge');
                if (index === 0) {
                    badge.className = "rank-badge w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-md scale-110";
                } else {
                    badge.className = "rank-badge w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-lg";
                }
                badge.textContent = index + 1;
                li.className = "rank-card group relative bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center gap-4 cursor-grab active:cursor-grabbing";
            });
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            confirmBtn.textContent = "この順序で決定";
            resetBtn.classList.add('hidden');
        }
    }

    items.forEach(li => {
        li.addEventListener('click', () => {
            const index = Number(li.dataset.originalIndex);
            if (tapOrder.includes(index)) return;
            vibrate(); 
            tapOrder.push(index);
            updateVisuals();
        });
    });

    resetBtn.addEventListener('click', () => {
        vibrate();
        tapOrder = [];
        updateVisuals();
    });

    let dragEl = null;

    list.addEventListener('dragstart', (e) => {
        if (tapOrder.length > 0 && tapOrder.length < 4) {
            e.preventDefault();
            return;
        }
        tapOrder = []; 
        dragEl = e.target.closest('li');
        if (!dragEl) return;
        dragEl.classList.add('opacity-50');
        e.dataTransfer.effectAllowed = 'move';
        vibrate();
    });
    
    list.addEventListener('dragend', () => {
        if (dragEl) dragEl.classList.remove('opacity-50');
        dragEl = null;
        tapOrder = []; 
        updateVisuals();
    });
    
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterEl = getDragAfterElement(list, e.clientY);
        const dragging = document.querySelector('.opacity-50');
        if (!dragging) return;
        if (afterEl == null) list.appendChild(dragging);
        else list.insertBefore(dragging, afterEl);
    });

    function getDragAfterElement(container, y) {
        const els = [...container.querySelectorAll('li:not(.opacity-50)')];
        return els.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    let locked = false;
    confirmBtn.onclick = () => {
        if (locked) return;
        locked = true;
        vibrate();

        let finalOrderIndices = [];
        if (tapOrder.length === 4) {
            finalOrderIndices = tapOrder;
        } else {
            finalOrderIndices = [...document.querySelectorAll('#rank-list li')].map(li => Number(li.getAttribute('data-original-index')));
        }

        confirmBtn.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 集計中...`;

        setTimeout(() => {
             finalOrderIndices.forEach((optIndex, pos) => {
                const typeKey = ['A','B','C','D'][optIndex];
                totals[typeKey] += RANK_POINTS[pos];
            });
            idx++;
            updateProgress();
            renderQuestion();
        }, 300);
    };
    
    updateVisuals();
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
    if (header) header.style.display = "none"; 

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
    
    const fallbackSvg = "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3e%3crect fill='%23f1f5f9' width='800' height='450'/%3e%3ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2394a3b8' font-weight='bold' letter-spacing='0.1em'%3eNO IMAGE%3c/text%3e%3c/svg%3e";

    document.body.style.backgroundColor = "transparent"; 
    
    // 背景ボックス（main-card）自体の色を変えるための定義
    // 元の色より少し白を混ぜて、文字が読みやすい背景色（グラデーション）にします
    const bgColors = {
        'A': 'linear-gradient(135deg, rgba(255, 240, 240, 0.95), rgba(255, 220, 220, 0.9))', // 赤系
        'B': 'linear-gradient(135deg, rgba(240, 245, 255, 0.95), rgba(220, 230, 255, 0.9))', // 青系
        'C': 'linear-gradient(135deg, rgba(255, 252, 235, 0.95), rgba(255, 245, 200, 0.9))', // 黄系
        'D': 'linear-gradient(135deg, rgba(240, 255, 245, 0.95), rgba(220, 255, 230, 0.9))'  // 緑系
    };

    // タイプごとのバーの色定義（Tailwindのクラス）
    const barColors = {
        'A': 'from-rose-400 to-rose-600',       // 赤系
        'B': 'from-blue-400 to-blue-600',       // 青系
        'C': 'from-amber-400 to-amber-500',     // 黄・オレンジ系
        'D': 'from-emerald-400 to-emerald-600'  // 緑系
    };

    const selectedBg = bgColors[topKey] || 'rgba(255, 255, 255, 0.9)';
    
    // メインカードの背景を変更
    if(mainCard) {
        mainCard.style.background = selectedBg;
    }

    // HTML構造（統合・シンプル化済）
    result.innerHTML = `
      <div class="relative z-10 text-center animate-fade-in pt-4">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/40 backdrop-blur-sm rounded-full shadow-sm border border-white/50 mb-4 animate-bounce">
            <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span class="text-sm font-bold text-slate-700 tracking-wide">診断完了</span>
        </div>
        <h2 class="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-indigo-900 mb-3 drop-shadow-sm">
            ${pair.title}
        </h2>
        <p class="text-lg text-slate-700 max-w-2xl mx-auto font-medium leading-relaxed">${lead}</p>
        
        <div class="flex flex-wrap gap-2 justify-center my-4">
            ${entries.map((e,i) => `
                <span class="px-3 py-1 rounded-lg text-xs font-bold border ${i<2 ? 'bg-white/60 text-slate-700 border-slate-400 shadow-sm':'bg-white/30 text-slate-500 border-slate-200'}">
                    ${i+1}位: ${TYPE_META[e[0]].short} (${e[1]})
                </span>
            `).join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 mt-8">
          <div class="rounded-2xl overflow-hidden shadow-xl border border-white/50 bg-white relative group min-h-[300px] flex items-center justify-center bg-slate-50">
              <img src="${imgSrc}" 
                   class="w-full h-full object-cover transform group-hover:scale-105 transition duration-700" 
                   alt="Result Image" 
                   onerror="this.onerror=null; this.src='${fallbackSvg}';">
          </div>

          <div class="flex flex-col gap-6">
              <div class="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white shadow-sm">
                  <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                      タイプ分析
                  </h3>
                  <div class="space-y-4">
                     ${["A","B","C","D"].map(k => {
                         const max = Math.max(...Object.values(totals));
                         const p = Math.round((totals[k]/max)*100);
                         
                         // タイプ別カラーの取得
                         const barColorClass = barColors[k] || 'from-indigo-400 to-indigo-600';
                         
                         // 1位の項目強調
                         const isTop = (totals[k] === entries[0][1]);
                         const textClass = isTop ? "text-slate-800 font-black" : "text-slate-600";

                         return `
                         <div>
                            <div class="flex justify-between text-xs font-bold mb-1 ${textClass} transition-transform">
                                <span>${TYPE_META[k].name}</span>
                                <span>${totals[k]} pt</span>
                            </div>
                            <div class="h-3 bg-slate-100/50 rounded-full overflow-hidden shadow-inner">
                                <div class="h-full bg-gradient-to-r ${barColorClass} rounded-full transition-all duration-1000 ease-out" style="width:${p}%"></div>
                            </div>
                         </div>
                         `;
                     }).join('')}
                  </div>
              </div>

              <div class="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white shadow-sm">
                  <h3 class="font-bold text-indigo-900 mb-3">あなたってこんな人</h3>
                  <ul class="space-y-2">
                      ${(pair?.bullets || []).map(b => `<li class="flex items-start gap-2 text-indigo-900 text-sm"><span class="mt-1 text-indigo-500">✔</span>${b}</li>`).join('')}
                  </ul>
              </div>
          </div>
      </div>

      <div class="grid md:grid-cols-3 gap-6 mb-10">
          ${renderCard("あなたの武器", pair?.strengths, "bg-white border-blue-100", "blue")}
          ${renderCard("やりがちな失敗", pair?.risks, "bg-white border-amber-100", "amber")}
          ${renderCard("もっと活躍するには？", pair?.plays, "bg-white border-emerald-100", "emerald")}
      </div>

      <div class="bg-white/70 backdrop-blur border border-white p-6 sm:p-8 rounded-2xl shadow-sm mb-8">
          <h3 class="text-lg font-bold text-slate-800 mb-6 text-center">🤝 チームでの立ち回り</h3>
          <div class="grid md:grid-cols-2 gap-8">
              <div>
                  <h4 class="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span class="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg></span>
                    この人と組むと最強
                  </h4>
                  <ul class="space-y-2 text-sm text-slate-600 list-disc list-inside marker:text-indigo-300">
                     ${(pair?.collab||[]).map(t=>`<li>${t}</li>`).join('')}
                  </ul>
              </div>
              <div>
                  <h4 class="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span class="p-1.5 bg-pink-100 text-pink-600 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg></span>
                    コミュニケーションのコツ
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

      <div class="flex flex-wrap gap-4 justify-center mt-12 pb-8">
        <button id="shareX" class="btn-primary py-3 px-6 rounded-xl font-bold flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            結果をポスト
        </button>
        <button id="copy" class="btn-ghost py-3 px-6 rounded-xl font-bold bg-white/50 backdrop-blur">テキストコピー</button>
        <button id="retry" class="btn-ghost py-3 px-6 rounded-xl font-bold bg-white/50 backdrop-blur">最初からやり直す</button>
      </div>
    `;

    function renderCard(title, items, colorClass, colorName) {
        return `
        <div class="backdrop-blur-sm p-5 rounded-2xl border shadow-sm hover:shadow-md transition ${colorClass}">
            <h4 class="font-bold mb-3 text-${colorName}-800">${title}</h4>
            <ul class="space-y-2">
                ${(items||[]).map(t => `
                    <li class="text-sm text-slate-700 flex items-start gap-2">
                        <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-${colorName}-500 flex-shrink-0"></span>
                        <span class="leading-relaxed opacity-90">${t}</span>
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
        `【ビジネスアニマル診断】`,
        `私のタイプは：${TYPE_META[topKey].short}×${TYPE_META[secondKey].short}「${title}」でした。`,
        ``,
        `📊 ${lead}`,
        `🚀 強み: ${strengths.slice(0,2).join(" / ")}`,
        `⚠️ 注意: ${risks.slice(0,1).join("")}`,
        ``,
        `#ビジネスアニマル診断`
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
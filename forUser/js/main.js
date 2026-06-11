/**
 * ==========================================
 * Course Catalog Application
 * ==========================================
 * 主な機能:
 *  - ジャンル導線: フィルタから genre を分離し、検索バー直下の常時表示ピル列（人気上位 + もっと見るシート）に分割
 *  - 検索: 表記ゆれ正規化（カナ・全半角・大小文字・シノニム）＋サジェスト＋件数表示
 *  - 空状態: 0件時のプレースホルダ表示
 *  - 並び替え: おすすめ順 / 人気順（申込数）/ 受講料 / 受講期間
 *  - サムネ無しカード: タイポグラフィ主体のプレースホルダ（id 由来の淡色トーン＋提供団体名）
 *  - 検索×クリアでフィルタ再適用 / アイコンボタンのラベル化 / 装飾アイコンに aria-hidden
 */

const CourseApp = (() => {
    // ------------------------------------------------
    // 1. Configuration & Constants
    // ------------------------------------------------
    const CONFIG = {
        BATCH_SIZE: 6,
        GENRE_BAR_TOP: 10,   // ジャンルバーに常時出す人気上位の数。超過分は「もっと見る」シートへ
        TAG_COLORS: {
            target: "bg-sky-400",
            genre:  "bg-slate-600",
            level:  "bg-emerald-400",
            other:  "bg-rose-400"
        },
        // サムネ無しプレースホルダの淡色トーン（id から決定的に選択）。
        // ジャンルに依存しないため、標準/カスタムタグや複数ジャンルでも破綻しない。
        PLACEHOLDER_TONES: [
            { bg: "from-slate-50 to-slate-100",   text: "text-slate-700",  accent: "bg-slate-300" },
            { bg: "from-sky-50 to-sky-100",       text: "text-sky-900",    accent: "bg-sky-300" },
            { bg: "from-indigo-50 to-indigo-100", text: "text-indigo-900", accent: "bg-indigo-300" },
            { bg: "from-teal-50 to-teal-100",     text: "text-teal-900",   accent: "bg-teal-300" },
            { bg: "from-stone-50 to-stone-100",   text: "text-stone-700",  accent: "bg-stone-300" },
            { bg: "from-rose-50 to-rose-100",     text: "text-rose-900",   accent: "bg-rose-300" }
        ],
        SORTS: [
            { val: "recommend", label: "おすすめ順" },
            { val: "popular",   label: "人気順（申込数）" },
            { val: "price_asc", label: "受講料が安い順" },
            { val: "price_desc",label: "受講料が高い順" },
            { val: "period_asc",label: "受講期間が短い順" },
            { val: "period_desc",label: "受講期間が長い順" }
        ],
        SELECTORS: {
            container: 'course-panel',
            sentinel: 'loading-sentinel',
            hero: 'hero',
            filterDialog: 'filter-dialog',
            sortDialog: 'sort-dialog',
            viewToggleGrid: 'view-toggle-grid',
            viewToggleList: 'view-toggle-list',
            viewToggleCompact: 'view-toggle-compact'
        }
    };

    // ------------------------------------------------
    // 2. State
    // ------------------------------------------------
    const state = {
        fullList: [],
        filteredList: [],
        currentOffset: 0,
        isLoading: false,
        viewMode: 'grid',   // 'grid' | 'list' | 'compact'（スーパースリム）
        currentSortType: 'recommend',
        criteria: {
            keyword: '',
            genres: [],     // ジャンルバー由来（OR）
            tags: [],       // モーダル由来 target/level/other（OR）
            minPrice: 0, maxPrice: 50000,
            minPeriod: 1, maxPeriod: 12,
            isNewOnly: false
        }
    };

    // ------------------------------------------------
    // 3. 検索正規化 ＆ シノニム（③ 表記ゆれ対策）
    // ------------------------------------------------
    const Search = {
        // 全半角・大小文字を統一し、カタカナをひらがなに畳む
        normalize: (s) => {
            if (s == null) return '';
            return s.toString()
                .normalize('NFKC')
                .toLowerCase()
                .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
                .replace(/\s+/g, '');
        },
        // 同義語グループ（各要素は normalize 済みで突き合わせる）
        SYN_RAW: [
            ["エクセル", "excel"],
            ["ワード", "word"],
            ["パワポ", "パワーポイント", "powerpoint"],
            ["パイソン", "python"],
            ["エーアイ", "生成AI", "ai", "chatgpt"],
            ["ぼき", "簿記"],
            ["えいご", "english", "英語"],
            ["ちゅうごくご", "中国語"],
            ["マーケ", "マーケティング", "marketing"],
            ["セキュリティ", "security"],
            ["プロジェクト管理", "pmbok"]
        ],
        synonymGroups: [],
        init: () => {
            Search.synonymGroups = Search.SYN_RAW.map(g => g.map(Search.normalize));
        },
        // クエリを同義語で展開してトークン配列を返す
        expand: (rawQuery) => {
            const q = Search.normalize(rawQuery);
            if (!q) return [];
            const tokens = new Set([q]);
            Search.synonymGroups.forEach(group => {
                if (group.some(term => term && q.includes(term))) {
                    group.forEach(term => term && tokens.add(term));
                }
            });
            return [...tokens];
        },
        // コースの検索対象テキスト（正規化済み）を生成
        buildIndex: (course) => {
            const raw = [course.title, course.desc, course.org || '', ...course.tags.map(t => t.text)].join(' ');
            course._idx = Search.normalize(raw);
        },
        match: (course, rawQuery) => {
            const tokens = Search.expand(rawQuery);
            if (tokens.length === 0) return true;
            return tokens.some(tok => course._idx.includes(tok));
        }
    };

    // ------------------------------------------------
    // 4. Template Engine
    // ------------------------------------------------
    const Templates = {
        tag: (tag) => {
            const colorClass = CONFIG.TAG_COLORS[tag.type] || CONFIG.TAG_COLORS.other;
            return `<span class="px-2.5 py-0.5 rounded-md ${colorClass} text-white text-[11px] font-bold tracking-wide">${tag.text}</span>`;
        },

        newBadge: (isNew) => isNew
            ? `<div class="absolute top-3 left-3 z-10"><span class="px-2.5 py-1 rounded-lg bg-amber-400/95 backdrop-blur text-white text-[10px] font-bold shadow-sm">NEW</span></div>`
            : '',

        // ② サムネ無しカードのプレースホルダ（タイポグラフィ主体・アイコン無し）
        //    背景トーンは id から決定的に選択。ジャンルに依存しないため任意/複数タグでも破綻しない。
        placeholder: (course) => {
            const idNum = course.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
            const tone = CONFIG.PLACEHOLDER_TONES[idNum % CONFIG.PLACEHOLDER_TONES.length];
            const org = course.org
                ? `<span class="absolute bottom-3 right-4 text-[11px] font-medium ${tone.text} opacity-50">提供: ${course.org}</span>` : '';
            return `
                <div class="course-img-wrapper relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${tone.bg} border-b border-black/5">
                    <div class="relative h-full w-full p-5 flex flex-col justify-center">
                        <span class="block w-8 h-1 rounded-full ${tone.accent} mb-3"></span>
                        <h3 class="font-bold text-base md:text-xl ${tone.text} leading-snug line-clamp-3 pr-6">${course.title}</h3>
                    </div>
                    ${org}
                    ${Templates.newBadge(course.isNew)}
                </div>`;
        },

        thumbnail: (course) => {
            if (course.image) {
                return `
                    <div class="course-img-wrapper relative aspect-[16/10] overflow-hidden bg-gray-100">
                        <img src="${course.image}" alt="" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        ${Templates.newBadge(course.isNew)}
                    </div>`;
            }
            return Templates.placeholder(course);
        },

        card: (course) => {
            const tagsHtml = course.tags.map(Templates.tag).join('');
            const thumbHtml = Templates.thumbnail(course);
            const favImgSrc = course.image || "";

            return `
                <a href="${course.url}" class="course-card group flex flex-col bg-white rounded-3xl overflow-hidden ring-1 ring-slate-200 hover:ring-sky-500/30 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative">
                    ${thumbHtml}
                    <button type="button" class="btn-fav flex absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-rose-500 shadow-sm transition-colors z-10"
                        data-id="${course.id}" data-title="${course.title}" data-img="${favImgSrc}" data-link="${course.url}" aria-label="お気に入りに追加">
                        <span class="material-symbols-outlined text-[22px]" aria-hidden="true">favorite</span>
                    </button>
                    <div class="card-body flex flex-col flex-1">
                        ${course.isNew ? `<span class="card-new-flag hidden items-center px-1.5 py-0.5 rounded bg-amber-400 text-white text-[10px] font-bold shrink-0">NEW</span>` : ''}
                        <div class="card-tags flex gap-2 flex-wrap">${tagsHtml}</div>
                        <h3 class="card-title font-bold text-slate-900 line-clamp-2 group-hover:text-sky-600 transition-colors">${course.title}</h3>
                        <p class="card-desc text-sm text-slate-500 leading-normal">${course.desc}</p>
                        <div class="card-meta flex items-end justify-between">
                            <div>
                                <span class="text-lg font-bold text-slate-900">${course.price.toLocaleString()}<span class="text-xs font-normal text-slate-500 ml-0.5">円</span></span>
                            </div>
                            <div class="flex items-center text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                <span class="material-symbols-outlined text-sm mr-1.5" aria-hidden="true">schedule</span> ${course.period}ヶ月
                            </div>
                        </div>
                    </div>
                </a>`;
        }
    };

    // ------------------------------------------------
    // 5. Core
    // ------------------------------------------------
    const Core = {
        init: () => {
            if (typeof courseList === 'undefined') { console.warn('courseList not found.'); return; }
            Search.init();
            state.fullList = courseList.map(c => { Search.buildIndex(c); return c; });
            state.filteredList = [...state.fullList];

            UI.GenreBar.init();
            UI.ViewMode.init();
            UI.Carousel.init();
            UI.DeadlineBanner.init();
            UI.SearchBox.init();
            UI.ActiveFilters.init();
            UI.EmptyState.init();

            Modals.Sort.init();
            Modals.Filter.init();
            Modals.Genre.init();

            Core.applyAndRender();

            const sentinel = document.getElementById(CONFIG.SELECTORS.sentinel);
            if (sentinel) observer.observe(sentinel);
        },

        // criteria を一覧へ反映（フィルタ→ソート→件数→チップ→再描画）
        applyAndRender: () => {
            const c = state.criteria;
            state.filteredList = state.fullList.filter(course => {
                if (c.isNewOnly && !course.isNew) return false;
                if (c.keyword && !Search.match(course, c.keyword)) return false;
                // ジャンル（OR）
                if (c.genres.length > 0) {
                    const gt = course.tags.filter(t => t.type === 'genre').map(t => t.text);
                    if (!c.genres.some(g => gt.includes(g))) return false;
                }
                // モーダルタグ（OR）
                if (c.tags.length > 0) {
                    const tt = course.tags.map(t => t.text);
                    if (!c.tags.some(t => tt.includes(t))) return false;
                }
                if (course.period < c.minPeriod || course.period > c.maxPeriod) return false;
                if (course.price < c.minPrice || course.price > c.maxPrice) return false;
                return true;
            });

            Core.sortList(state.currentSortType);

            UI.ResultCount.render();
            UI.ActiveFilters.render();
            UI.GenreBar.render();
            Modals.Genre.syncList();
            Modals.Filter.syncBadge();

            // 再描画
            const container = document.getElementById(CONFIG.SELECTORS.container);
            container.innerHTML = '';
            state.currentOffset = 0;

            if (state.filteredList.length === 0) {
                UI.EmptyState.show(true);
                document.getElementById(CONFIG.SELECTORS.sentinel).classList.add('hidden');
            } else {
                UI.EmptyState.show(false);
                document.getElementById(CONFIG.SELECTORS.sentinel).classList.remove('hidden');
                Core.loadMore();
            }
        },

        sortList: (type) => {
            const arr = state.filteredList;
            switch (type) {
                case 'recommend':   /* 配列順（mef_sortno 相当）を維持 */ break;
                case 'popular':     arr.sort((a, b) => (b.applicants || 0) - (a.applicants || 0)); break;
                case 'price_asc':   arr.sort((a, b) => a.price - b.price); break;
                case 'price_desc':  arr.sort((a, b) => b.price - a.price); break;
                case 'period_asc':  arr.sort((a, b) => a.period - b.period); break;
                case 'period_desc': arr.sort((a, b) => b.period - a.period); break;
            }
        },

        setSort: (type) => {
            state.currentSortType = type;
            Modals.Sort.updateUI(type);
            Core.applyAndRender();
        },

        loadMore: () => {
            const container = document.getElementById(CONFIG.SELECTORS.container);
            const sentinel = document.getElementById(CONFIG.SELECTORS.sentinel);
            if (!container || state.isLoading) return;
            if (state.currentOffset >= state.filteredList.length) { sentinel.classList.add('hidden'); return; }

            state.isLoading = true;
            sentinel.classList.remove('opacity-0');

            setTimeout(() => {
                const nextBatch = state.filteredList.slice(state.currentOffset, state.currentOffset + CONFIG.BATCH_SIZE);
                container.insertAdjacentHTML('beforeend', nextBatch.map(Templates.card).join(''));
                state.currentOffset += nextBatch.length;

                UI.ViewMode.apply();
                Core.syncFavorites(container);

                state.isLoading = false;
                if (state.currentOffset >= state.filteredList.length) sentinel.classList.add('hidden');
                else sentinel.classList.add('opacity-0');
            }, 300);
        },

        syncFavorites: (container) => {
            const btns = container.querySelectorAll('.btn-fav:not(.initialized)');
            const favs = JSON.parse(localStorage.getItem('my_favorites') || '[]');
            btns.forEach(btn => {
                btn.classList.add('initialized');
                if (favs.some(i => i.id === btn.dataset.id)) btn.classList.add('heart-active');
            });
        }
    };

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && state.currentOffset < state.filteredList.length) Core.loadMore();
    }, { rootMargin: '100px' });

    // ------------------------------------------------
    // 6. UI Modules
    // ------------------------------------------------
    const UI = {
        // ① ジャンルバー（人気TOP N ＋「もっと見る」→ 検索付きシート）
        GenreBar: {
            genres: [],     // 使用中の全ジャンル（人気降順）。サジェスト等でも参照
            topGenres: [],  // バーに常時出す上位N個
            usage: {},      // ジャンル -> { count, app }（人気＝申込数合計）

            init: () => {
                if (!document.getElementById('genre-bar')) return;
                const usage = {};
                state.fullList.forEach(c => {
                    const app = c.applicants || 0;
                    c.tags.forEach(t => {
                        if (t.type !== 'genre') return;
                        (usage[t.text] = usage[t.text] || { count: 0, app: 0 });
                        usage[t.text].count++;
                        usage[t.text].app += app;
                    });
                });
                UI.GenreBar.usage = usage;
                // 人気（申込数合計）→ コース数 → 名前 の順で降順ソート
                UI.GenreBar.genres = Object.keys(usage).sort((a, b) =>
                    usage[b].app - usage[a].app || usage[b].count - usage[a].count || a.localeCompare(b, 'ja'));
                UI.GenreBar.topGenres = UI.GenreBar.genres.slice(0, CONFIG.GENRE_BAR_TOP);
                UI.GenreBar.render();
                // 横スクロール位置に応じて左右フェードを出し分け（SPのみ表示）
                document.getElementById('genre-bar')?.addEventListener('scroll', UI.GenreBar.updateFades, { passive: true });
                window.addEventListener('resize', UI.GenreBar.updateFades, { passive: true });
            },

            // スクロール余地に応じて左右フェードの表示を切り替える
            updateFades: () => {
                const bar = document.getElementById('genre-bar');
                if (!bar) return;
                const max = bar.scrollWidth - bar.clientWidth;
                const left = document.getElementById('genre-fade-left');
                const right = document.getElementById('genre-fade-right');
                if (left) left.style.opacity = bar.scrollLeft > 4 ? '1' : '0';
                if (right) right.style.opacity = bar.scrollLeft < max - 4 ? '1' : '0';
            },

            // 常時表示 = 「すべて」＋（TOP N ∪ 選択中の長尾ジャンル）＋「もっと見る (+N)」
            render: () => {
                const bar = document.getElementById('genre-bar');
                if (!bar) return;
                const active = state.criteria.genres;
                const top = UI.GenreBar.topGenres;
                const extras = active.filter(g => !top.includes(g)); // TOP外で選択中のもの
                const visible = [...top, ...extras];

                bar.innerHTML = '';
                bar.appendChild(UI.GenreBar.pill('すべて', null, active.length === 0));
                visible.forEach(g => bar.appendChild(UI.GenreBar.pill(g, g, active.includes(g))));

                const remaining = UI.GenreBar.genres.length - visible.length;
                if (UI.GenreBar.genres.length > top.length) {
                    bar.appendChild(UI.GenreBar.moreButton(remaining));
                }
                UI.GenreBar.updateFades();
            },

            pill: (label, value, isOn) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.dataset.genre = value === null ? '' : value;
                btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
                btn.className = "genre-pill shrink-0 inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm font-medium transition whitespace-nowrap " + (isOn
                    ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50");
                btn.innerHTML = `<span>${label}</span>`;
                btn.addEventListener('click', () => {
                    if (value === null) state.criteria.genres = [];
                    else {
                        const i = state.criteria.genres.indexOf(value);
                        if (i >= 0) state.criteria.genres.splice(i, 1);
                        else state.criteria.genres.push(value);
                    }
                    Core.applyAndRender();
                });
                return btn;
            },

            moreButton: (remaining) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = "shrink-0 inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50 transition whitespace-nowrap";
                btn.innerHTML = `<span class="material-symbols-outlined text-[16px]" aria-hidden="true">more_horiz</span><span>もっと見る${remaining > 0 ? ` (+${remaining})` : ''}</span>`;
                btn.addEventListener('click', () => Modals.Genre.open());
                return btn;
            }
        },

        // ③ 件数表示
        ResultCount: {
            render: () => {
                const el = document.getElementById('result-count');
                if (!el) return;
                const total = state.fullList.length;
                const shown = state.filteredList.length;
                if (shown === total) {
                    el.innerHTML = `<span class="font-bold text-gray-900">${total}</span> 件のコース`;
                } else {
                    el.innerHTML = `全${total}件中 <span class="font-bold text-sky-700">${shown}</span> 件を表示`;
                }
            }
        },

        // ④ 空状態
        EmptyState: {
            init: () => {
                document.getElementById('btn-empty-clear')?.addEventListener('click', () => UI.ActiveFilters.clearAll());
            },
            show: (isEmpty) => {
                const el = document.getElementById('empty-state');
                if (!el) return;
                el.classList.toggle('hidden', !isEmpty);
                el.classList.toggle('flex', isEmpty);
            }
        },

        // 検索ボックス（クリア再適用＋サジェスト）
        SearchBox: {
            init: () => {
                const input = document.getElementById('search-input');
                const clearBtn = document.getElementById('btn-clear-main');
                const suggest = document.getElementById('search-suggest');
                if (!input) return;

                const toggleClear = () => {
                    const has = input.value.length > 0;
                    clearBtn?.classList.toggle('hidden', !has);
                    clearBtn?.classList.toggle('flex', has);
                };

                input.addEventListener('input', () => {
                    toggleClear();
                    UI.SearchBox.renderSuggest(input.value);
                });

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        UI.SearchBox.apply(input.value);
                        input.blur();
                        UI.SearchBox.hideSuggest();
                    } else if (e.key === 'Escape') {
                        UI.SearchBox.hideSuggest();
                    }
                });

                // ③ クリアで再適用（バグ修正）
                clearBtn?.addEventListener('click', () => {
                    input.value = '';
                    toggleClear();
                    UI.SearchBox.hideSuggest();
                    UI.SearchBox.apply('');
                    input.focus();
                });

                document.addEventListener('click', (e) => {
                    if (!suggest?.contains(e.target) && e.target !== input) UI.SearchBox.hideSuggest();
                });

                toggleClear();
            },

            apply: (value) => {
                state.criteria.keyword = value.trim();
                Core.applyAndRender();
            },

            renderSuggest: (value) => {
                const suggest = document.getElementById('search-suggest');
                const input = document.getElementById('search-input');
                if (!suggest) return;
                const q = value.trim();
                if (!q) { UI.SearchBox.hideSuggest(); return; }

                const seen = new Set();
                const items = [];
                // コース名候補
                state.fullList.forEach(c => {
                    if (items.length >= 6) return;
                    if (Search.match(c, q) && !seen.has(c.title)) { seen.add(c.title); items.push({ type: 'course', text: c.title }); }
                });
                // ジャンル候補
                const nq = Search.normalize(q);
                UI.GenreBar.genres.forEach(g => {
                    if (items.length >= 8) return;
                    if (Search.normalize(g).includes(nq) && !seen.has(g)) { seen.add(g); items.push({ type: 'genre', text: g }); }
                });

                if (items.length === 0) { UI.SearchBox.hideSuggest(); return; }

                suggest.innerHTML = items.map(it => {
                    const icon = it.type === 'genre' ? 'sell' : 'search';
                    const sub = it.type === 'genre' ? '<span class="ml-auto text-[11px] text-sky-600 font-medium">ジャンル</span>' : '';
                    return `<button type="button" role="option" data-suggest="${it.text}" class="suggest-item w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-sky-50 transition">
                                <span class="material-symbols-outlined text-[18px] text-slate-400" aria-hidden="true">${icon}</span>
                                <span class="truncate">${it.text}</span>${sub}
                            </button>`;
                }).join('');

                suggest.querySelectorAll('.suggest-item').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const v = btn.dataset.suggest;
                        if (input) input.value = v;
                        const clearBtn = document.getElementById('btn-clear-main');
                        clearBtn?.classList.remove('hidden'); clearBtn?.classList.add('flex');
                        UI.SearchBox.apply(v);
                        UI.SearchBox.hideSuggest();
                    });
                });

                suggest.classList.remove('hidden');
                input?.setAttribute('aria-expanded', 'true');
            },

            hideSuggest: () => {
                const suggest = document.getElementById('search-suggest');
                suggest?.classList.add('hidden');
                document.getElementById('search-input')?.setAttribute('aria-expanded', 'false');
            }
        },

        ViewMode: {
            // 各表示モードでカード各部に付与する差分クラス（基本クラスはテンプレ側で付与済み）
            VARIANTS: {
                grid: {
                    card:    ['flex-col', 'rounded-3xl', 'hover:-translate-y-1'],
                    wrap:    [],
                    body:    ['flex-col', 'p-3.5', 'md:p-4'],
                    tags:    ['mb-1', 'md:mb-1.5'],
                    title:   ['text-base', 'md:text-lg', 'mb-0.5', 'line-clamp-2'],
                    desc:    ['line-clamp-2', 'mb-1.5', 'md:mb-2'],
                    meta:    ['items-end', 'justify-between', 'mt-auto', 'pt-2', 'md:pt-2.5', 'border-t', 'border-slate-100'],
                    newFlag: ['hidden'],
                    fav:     []
                },
                list: {
                    card:    ['flex-col', 'md:flex-row', 'md:items-stretch', 'rounded-2xl'],
                    wrap:    ['md:w-48', 'lg:w-60', 'md:self-stretch', 'shrink-0', 'md:aspect-auto'],
                    body:    ['flex-col', 'px-3.5', 'py-2.5'],
                    tags:    ['mb-0.5'],
                    title:   ['text-base', 'mb-0.5', 'line-clamp-2'],
                    desc:    ['line-clamp-1', 'mb-0.5', 'hidden', 'md:block'],
                    meta:    ['items-end', 'justify-between', 'mt-0.5'],
                    newFlag: ['hidden'],
                    fav:     []
                },
                // スーパースリム: サムネ・タグ・説明・お気に入りを省き、コース名／受講料／受講期間のみ1行表示
                compact: {
                    card:    ['flex-row', 'items-center', 'rounded-xl'],
                    wrap:    ['hidden'],
                    body:    ['flex-row', 'items-center', 'gap-3', 'px-4', 'py-2.5'],
                    tags:    ['hidden'],
                    title:   ['text-sm', 'md:text-base', 'truncate', 'flex-1', 'min-w-0'],
                    desc:    ['hidden'],
                    meta:    ['items-center', 'justify-end', 'gap-3', 'shrink-0'],
                    newFlag: ['inline-flex'],
                    fav:     ['hidden']
                }
            },

            // 全モードで使われ得る差分クラスの和集合（適用前に毎回リセットする）
            RESET: {
                card:    ['flex-col', 'md:flex-row', 'md:items-stretch', 'flex-row', 'items-center', 'rounded-3xl', 'rounded-2xl', 'rounded-xl', 'hover:-translate-y-1'],
                wrap:    ['md:w-48', 'lg:w-60', 'md:self-stretch', 'shrink-0', 'md:aspect-auto', 'hidden'],
                body:    ['flex-col', 'p-3.5', 'md:p-4', 'px-3.5', 'px-4', 'py-3', 'py-2.5', 'flex-row', 'items-center', 'gap-3'],
                tags:    ['mb-0.5', 'mb-1', 'mb-1.5', 'md:mb-1.5', 'md:mb-2', 'hidden'],
                title:   ['text-base', 'text-sm', 'md:text-base', 'md:text-lg', 'mb-0.5', 'mb-1', 'line-clamp-2', 'truncate', 'flex-1', 'min-w-0'],
                desc:    ['line-clamp-1', 'line-clamp-2', 'mb-0.5', 'mb-1', 'mb-1.5', 'mb-2', 'md:mb-2', 'md:mb-3', 'hidden', 'md:block'],
                meta:    ['items-end', 'items-center', 'justify-between', 'justify-end', 'mt-0.5', 'mt-1', 'mt-auto', 'pt-2', 'pt-2.5', 'md:pt-2.5', 'md:pt-3', 'border-t', 'border-slate-100', 'gap-3', 'shrink-0'],
                newFlag: ['hidden', 'inline-flex'],
                fav:     ['hidden']
            },

            init: () => {
                const btnGrid = document.getElementById(CONFIG.SELECTORS.viewToggleGrid);
                const btnList = document.getElementById(CONFIG.SELECTORS.viewToggleList);
                const btnCompact = document.getElementById(CONFIG.SELECTORS.viewToggleCompact);
                if (!btnGrid || !btnList) return;
                btnGrid.addEventListener('click', () => UI.ViewMode.setMode('grid'));
                btnList.addEventListener('click', () => UI.ViewMode.setMode('list'));
                btnCompact?.addEventListener('click', () => UI.ViewMode.setMode('compact'));
                UI.ViewMode.updateButtons();
            },
            setMode: (mode) => { state.viewMode = mode; UI.ViewMode.updateButtons(); UI.ViewMode.apply(); },
            updateButtons: () => {
                const map = {
                    grid:    CONFIG.SELECTORS.viewToggleGrid,
                    list:    CONFIG.SELECTORS.viewToggleList,
                    compact: CONFIG.SELECTORS.viewToggleCompact
                };
                const on = "bg-sky-100 text-sky-700 shadow-inner";
                const off = "text-gray-500 hover:bg-gray-100 hover:text-gray-700";
                Object.keys(map).forEach(mode => {
                    const btn = document.getElementById(map[mode]);
                    if (btn) btn.className = `flex p-2 rounded-full transition ${state.viewMode === mode ? on : off}`;
                });
            },
            apply: () => {
                const container = document.getElementById(CONFIG.SELECTORS.container);
                if (!container) return;
                const GRID = ['grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6'];
                const LIST = ['grid-cols-1', 'max-w-6xl', 'mx-auto', 'gap-2'];
                const COMPACT = ['grid-cols-1', 'max-w-4xl', 'mx-auto', 'gap-2'];
                container.classList.remove(...GRID, ...LIST, ...COMPACT);
                if (state.viewMode === 'list') container.classList.add(...LIST);
                else if (state.viewMode === 'compact') container.classList.add(...COMPACT);
                else container.classList.add(...GRID);

                Array.from(container.children).forEach(card => UI.ViewMode.applyToCard(card));
            },

            // 1枚のカードに現在の表示モードの差分クラスを適用
            applyToCard: (card) => {
                const variant = UI.ViewMode.VARIANTS[state.viewMode] || UI.ViewMode.VARIANTS.grid;
                const els = {
                    card,
                    wrap:    card.querySelector('.course-img-wrapper'),
                    body:    card.querySelector('.card-body'),
                    tags:    card.querySelector('.card-tags'),
                    title:   card.querySelector('.card-title'),
                    desc:    card.querySelector('.card-desc'),
                    meta:    card.querySelector('.card-meta'),
                    newFlag: card.querySelector('.card-new-flag'),
                    fav:     card.querySelector('.btn-fav')
                };
                Object.keys(UI.ViewMode.RESET).forEach(key => {
                    const el = els[key];
                    if (!el) return;
                    el.classList.remove(...UI.ViewMode.RESET[key]);
                    if (variant[key] && variant[key].length) el.classList.add(...variant[key]);
                });
            }
        },

        Carousel: {
            init: () => {
                const hero = document.getElementById(CONFIG.SELECTORS.hero);
                if (!hero) return;
                const slides = Array.from(hero.children);
                const prev = document.querySelector('[data-prev]');
                const next = document.querySelector('[data-next]');
                const dotsWrap = document.getElementById('hero-dots');
                const counter = document.getElementById('hero-counter');

                const scrollToIdx = (i) => { if (slides[i]) hero.scrollTo({ left: slides[i].offsetLeft, behavior: 'smooth' }); };
                const activeIdx = () => {
                    const r = hero.getBoundingClientRect();
                    let idx = 0, min = Number.MAX_VALUE;
                    slides.forEach((s, i) => { const d = Math.abs(s.getBoundingClientRect().left - r.left); if (d < min) { min = d; idx = i; } });
                    return idx;
                };

                // ドット生成
                if (dotsWrap) {
                    dotsWrap.innerHTML = '';
                    slides.forEach((_, i) => {
                        const dot = document.createElement('button');
                        dot.type = 'button';
                        dot.dataset.dot = i;
                        dot.className = 'hero-dot h-1.5 rounded-full bg-gray-300 transition-all duration-300';
                        dot.setAttribute('role', 'tab');
                        dot.setAttribute('aria-label', `${i + 1}番目のスライドへ`);
                        dot.addEventListener('click', () => scrollToIdx(i));
                        dotsWrap.appendChild(dot);
                    });
                }

                const update = () => {
                    const idx = activeIdx();
                    if (dotsWrap) {
                        dotsWrap.querySelectorAll('.hero-dot').forEach((dot, i) => {
                            const on = i === idx;
                            dot.classList.toggle('w-5', on);
                            dot.classList.toggle('bg-sky-500', on);
                            dot.classList.toggle('w-1.5', !on);
                            dot.classList.toggle('bg-gray-300', !on);
                            dot.setAttribute('aria-selected', on ? 'true' : 'false');
                        });
                    }
                    if (counter) counter.textContent = `${idx + 1} / ${slides.length}`;
                };

                hero.addEventListener('scroll', update, { passive: true });
                prev?.addEventListener('click', () => scrollToIdx(Math.max(0, activeIdx() - 1)));
                next?.addEventListener('click', () => scrollToIdx(Math.min(slides.length - 1, activeIdx() + 1)));
                update(); // 初期表示
            }
        },

        DeadlineBanner: {
            init: () => {
                const banner = document.getElementById('deadline-banner');
                const closeBtn = document.getElementById('deadline-banner-close');
                closeBtn?.addEventListener('click', () => {
                    banner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    banner.style.opacity = '0';
                    banner.style.transform = 'translateY(1rem)';
                    setTimeout(() => banner.classList.add('hidden'), 300);
                });
            }
        },

        ActiveFilters: {
            init: () => {
                document.getElementById('btn-clear-all-filters')?.addEventListener('click', () => UI.ActiveFilters.clearAll());
            },
            clearAll: () => {
                state.criteria = { keyword: '', genres: [], tags: [], minPrice: 0, maxPrice: 50000, minPeriod: 1, maxPeriod: 12, isNewOnly: false };
                const input = document.getElementById('search-input');
                if (input) { input.value = ''; document.getElementById('btn-clear-main')?.classList.add('hidden'); }
                Modals.Filter.syncFromCriteria();
                Core.applyAndRender();
            },
            render: () => {
                const container = document.getElementById('active-filters-container');
                const section = document.getElementById('active-filters-section');
                if (!container || !section) return;
                container.innerHTML = '';
                const c = state.criteria;
                const chips = [];

                if (c.keyword) chips.push({ label: `"${c.keyword}"`, kind: 'keyword' });
                if (c.isNewOnly) chips.push({ label: 'NEWのみ', kind: 'new' });
                c.genres.forEach(g => chips.push({ label: g, kind: 'genre', value: g }));
                c.tags.forEach(t => chips.push({ label: t, kind: 'tag', value: t }));
                if (c.minPeriod > 1 || c.maxPeriod < 12) chips.push({ label: `${c.minPeriod}〜${c.maxPeriod}ヶ月`, kind: 'period' });
                if (c.minPrice > 0 || c.maxPrice < 50000) chips.push({ label: `¥${c.minPrice.toLocaleString()}〜¥${c.maxPrice.toLocaleString()}`, kind: 'price' });

                if (chips.length === 0) { section.classList.add('hidden'); section.classList.remove('flex'); return; }
                section.classList.remove('hidden'); section.classList.add('flex');

                chips.forEach(chip => {
                    const el = document.createElement('button');
                    el.type = 'button';
                    el.className = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-bold hover:bg-sky-200 transition group";
                    el.innerHTML = `<span>${chip.label}</span><span class="material-symbols-outlined text-[14px] opacity-60 group-hover:opacity-100" aria-hidden="true">close</span>`;
                    el.setAttribute('aria-label', `${chip.label} を解除`);
                    el.addEventListener('click', () => UI.ActiveFilters.remove(chip));
                    container.appendChild(el);
                });
            },
            remove: (chip) => {
                const c = state.criteria;
                switch (chip.kind) {
                    case 'keyword':
                        c.keyword = '';
                        const input = document.getElementById('search-input');
                        if (input) { input.value = ''; document.getElementById('btn-clear-main')?.classList.add('hidden'); }
                        break;
                    case 'new':    c.isNewOnly = false; break;
                    case 'genre':  c.genres = c.genres.filter(g => g !== chip.value); break;
                    case 'tag':    c.tags = c.tags.filter(t => t !== chip.value); break;
                    case 'period': c.minPeriod = 1; c.maxPeriod = 12; break;
                    case 'price':  c.minPrice = 0; c.maxPrice = 50000; break;
                }
                Modals.Filter.syncFromCriteria();
                Core.applyAndRender();
            }
        }
    };

    // ------------------------------------------------
    // 7. Modals (Sort & Filter)
    // ------------------------------------------------
    const Modals = {
        toggle: (id, isOpen, backdropId, panelId) => {
            const el = document.getElementById(id), bd = document.getElementById(backdropId), pn = document.getElementById(panelId);
            if (!el || !bd || !pn) return;
            // filter / genre パネルは opacity も併用してフェード＋スライドさせる
            const useOpacity = (id === 'filter-dialog' || id === 'genre-dialog');
            if (isOpen) {
                el.classList.remove('hidden');
                requestAnimationFrame(() => {
                    bd.style.opacity = '1';
                    if (useOpacity) { pn.style.opacity = '1'; pn.style.transform = 'translateY(0) scale(1)'; }
                    else pn.style.transform = 'translateY(0)';
                });
            } else {
                bd.style.opacity = '0';
                if (useOpacity) { pn.style.opacity = '0'; pn.style.transform = 'translateY(1.5rem) scale(0.97)'; }
                else pn.style.transform = 'translateY(100%)';
                setTimeout(() => el.classList.add('hidden'), 200);
            }
        },

        Sort: {
            init: () => {
                const wrap = document.getElementById('sort-options');
                if (wrap) {
                    wrap.innerHTML = CONFIG.SORTS.map(s => `
                        <button class="sort-option w-full text-left px-4 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-gray-600 hover:text-sky-700 flex items-center justify-between group" data-val="${s.val}">
                            <span>${s.label}</span>
                            <span class="material-symbols-outlined text-sky-600 text-[20px] opacity-0 group-hover:opacity-50" aria-hidden="true">check</span>
                        </button>`).join('');
                }
                document.getElementById('btn-sort')?.addEventListener('click', () => Modals.toggle('sort-dialog', true, 'sort-backdrop', 'sort-panel'));
                document.getElementById('sort-close')?.addEventListener('click', () => Modals.toggle('sort-dialog', false, 'sort-backdrop', 'sort-panel'));
                document.getElementById('sort-backdrop')?.addEventListener('click', () => Modals.toggle('sort-dialog', false, 'sort-backdrop', 'sort-panel'));
                document.querySelectorAll('.sort-option').forEach(btn => {
                    btn.addEventListener('click', () => {
                        Core.setSort(btn.dataset.val);
                        Modals.toggle('sort-dialog', false, 'sort-backdrop', 'sort-panel');
                    });
                });
                Modals.Sort.updateUI(state.currentSortType);
            },
            updateUI: (type) => {
                const label = (CONFIG.SORTS.find(s => s.val === type) || {}).label || '並び替え';
                const btnLabel = document.getElementById('sort-btn-label');
                if (btnLabel) btnLabel.textContent = label;
                document.querySelectorAll('.sort-option').forEach(btn => {
                    const icon = btn.querySelector('.material-symbols-outlined');
                    const sel = btn.dataset.val === type;
                    btn.className = `sort-option w-full text-left px-4 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium flex items-center justify-between group ${sel ? 'text-sky-700' : 'text-gray-600 hover:text-sky-700'}`;
                    icon.className = `material-symbols-outlined text-sky-600 text-[20px] ${sel ? '' : 'opacity-0 group-hover:opacity-50'}`;
                });
            }
        },

        Filter: {
            elements: {},
            init: () => {
                const els = Modals.Filter.elements = {
                    tagContainer: document.getElementById('filter-tag-container'),
                    newOnly: document.getElementById('filter-new-only'),
                    price: { min: document.getElementById('range-min'), max: document.getElementById('range-max'), lblMin: document.getElementById('price-min'), lblMax: document.getElementById('price-max'), fill: document.getElementById('price-fill') },
                    period: { min: document.getElementById('period-range-min'), max: document.getElementById('period-range-max'), lblMin: document.getElementById('period-min-label'), lblMax: document.getElementById('period-max-label'), fill: document.getElementById('period-fill') }
                };

                document.getElementById('btn-filter')?.addEventListener('click', Modals.Filter.open);
                document.getElementById('filter-close')?.addEventListener('click', Modals.Filter.close);
                document.getElementById('filter-cancel')?.addEventListener('click', Modals.Filter.close);
                document.getElementById('filter-backdrop')?.addEventListener('click', (e) => {
                    if (e.target === document.getElementById('filter-backdrop')) Modals.Filter.close();
                });

                Modals.Filter.renderTags(els.tagContainer);

                ['price', 'period'].forEach(key => {
                    const g = els[key];
                    if (g.min && g.max) {
                        g.min.addEventListener('input', () => Modals.Filter.updateRange(key));
                        g.max.addEventListener('input', () => Modals.Filter.updateRange(key));
                        Modals.Filter.updateRange(key);
                    }
                });

                document.getElementById('filter-apply')?.addEventListener('click', Modals.Filter.apply);
                document.getElementById('filter-reset')?.addEventListener('click', Modals.Filter.reset);
            },

            // モーダルには target / level / other のみ（genre はバーへ分割）
            renderTags: (container) => {
                if (!container) return;
                container.innerHTML = '';
                const labels = { target: "対象・階層", level: "難易度", other: "その他" };
                const map = { target: new Set(), level: new Set(), other: new Set() };
                state.fullList.forEach(c => c.tags.forEach(t => {
                    if (t.type === 'genre') return;
                    const type = map[t.type] ? t.type : 'other';
                    map[type].add(t.text);
                }));

                Object.keys(labels).forEach(key => {
                    if (map[key].size === 0) return;
                    const group = document.createElement('div');
                    group.innerHTML = `<h3 class="text-xs font-bold text-gray-500 mb-2 pl-1 border-l-2 border-sky-500 leading-none">${labels[key]}</h3>`;
                    const wrapper = document.createElement('div');
                    wrapper.className = "flex flex-wrap gap-2";
                    [...map[key]].forEach(text => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = "rounded-full px-3 py-1.5 text-xs md:text-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition";
                        btn.textContent = text;
                        btn.dataset.chip = "true";
                        btn.setAttribute('aria-pressed', 'false');
                        btn.addEventListener('click', () => Modals.Filter.setChipState(btn, btn.getAttribute('aria-pressed') !== 'true'));
                        wrapper.appendChild(btn);
                    });
                    group.appendChild(wrapper);
                    container.appendChild(group);
                });
            },

            setChipState: (el, active) => {
                el.setAttribute('aria-pressed', active ? 'true' : 'false');
                el.classList.toggle('bg-white', !active);
                el.classList.toggle('bg-sky-50', active);
                el.classList.toggle('hover:bg-sky-100', active);
                el.classList.toggle('border-sky-300', active);
                el.classList.toggle('text-sky-600', active);
                el.classList.toggle('font-bold', active);
            },

            updateRange: (type) => {
                const els = Modals.Filter.elements[type];
                if (!els.min || !els.max) return;
                const min = Math.min(+els.min.value, +els.max.value);
                const max = Math.max(+els.min.value, +els.max.value);
                const rMin = +els.min.min, rMax = +els.max.max;
                const minPct = ((min - rMin) / (rMax - rMin)) * 100;
                const maxPct = ((max - rMin) / (rMax - rMin)) * 100;
                if (els.fill) { els.fill.style.left = minPct + '%'; els.fill.style.right = (100 - maxPct) + '%'; }
                if (els.lblMin) els.lblMin.textContent = min.toLocaleString();
                if (els.lblMax) els.lblMax.textContent = max.toLocaleString();
            },

            open: () => {
                Modals.Filter.syncFromCriteria();
                Modals.toggle('filter-dialog', true, 'filter-backdrop', 'filter-panel');
            },
            close: () => Modals.toggle('filter-dialog', false, 'filter-backdrop', 'filter-panel'),

            // criteria → モーダルUI へ反映（チップ削除や全クリア時に整合させる）
            syncFromCriteria: () => {
                const els = Modals.Filter.elements;
                const c = state.criteria;
                if (els.newOnly) els.newOnly.checked = c.isNewOnly;
                els.tagContainer?.querySelectorAll('[data-chip]').forEach(btn => {
                    Modals.Filter.setChipState(btn, c.tags.includes(btn.textContent.trim()));
                });
                els.price.min.value = c.minPrice; els.price.max.value = c.maxPrice; Modals.Filter.updateRange('price');
                els.period.min.value = c.minPeriod; els.period.max.value = c.maxPeriod; Modals.Filter.updateRange('period');
            },

            apply: () => {
                const els = Modals.Filter.elements;
                const c = state.criteria;
                c.tags = [...els.tagContainer.querySelectorAll('[data-chip][aria-pressed="true"]')].map(b => b.textContent.trim());
                c.minPrice = Math.min(+els.price.min.value, +els.price.max.value);
                c.maxPrice = Math.max(+els.price.min.value, +els.price.max.value);
                c.minPeriod = Math.min(+els.period.min.value, +els.period.max.value);
                c.maxPeriod = Math.max(+els.period.min.value, +els.period.max.value);
                c.isNewOnly = els.newOnly ? els.newOnly.checked : false;
                Core.applyAndRender();
                Modals.Filter.close();
            },

            reset: () => {
                const els = Modals.Filter.elements;
                els.tagContainer.querySelectorAll('[data-chip]').forEach(b => Modals.Filter.setChipState(b, false));
                els.price.min.value = 0; els.price.max.value = 50000; Modals.Filter.updateRange('price');
                els.period.min.value = 1; els.period.max.value = 12; Modals.Filter.updateRange('period');
                if (els.newOnly) els.newOnly.checked = false;
            },

            // 絞り込み条件数をボタンのバッジに反映
            syncBadge: () => {
                const c = state.criteria;
                let n = 0;
                n += c.tags.length;
                if (c.isNewOnly) n++;
                if (c.minPeriod > 1 || c.maxPeriod < 12) n++;
                if (c.minPrice > 0 || c.maxPrice < 50000) n++;
                const badge = document.getElementById('filter-count-badge');
                if (!badge) return;
                badge.textContent = n;
                badge.classList.toggle('hidden', n === 0);
            }
        },

        // ① ジャンル選択シート（人気TOP超過分の全ジャンルを検索・複数選択／即時反映）
        Genre: {
            init: () => {
                document.getElementById('genre-close')?.addEventListener('click', Modals.Genre.close);
                document.getElementById('genre-done')?.addEventListener('click', Modals.Genre.close);
                document.getElementById('genre-backdrop')?.addEventListener('click', (e) => {
                    if (e.target === document.getElementById('genre-backdrop')) Modals.Genre.close();
                });
                document.getElementById('genre-clear')?.addEventListener('click', () => {
                    state.criteria.genres = [];
                    Core.applyAndRender();
                });
                document.getElementById('genre-search')?.addEventListener('input', () => Modals.Genre.renderList());
            },

            open: () => {
                const search = document.getElementById('genre-search');
                if (search) search.value = '';
                Modals.Genre.renderList();
                Modals.toggle('genre-dialog', true, 'genre-backdrop', 'genre-panel');
            },
            close: () => Modals.toggle('genre-dialog', false, 'genre-backdrop', 'genre-panel'),

            renderList: () => {
                const list = document.getElementById('genre-list');
                if (!list) return;
                const q = Search.normalize(document.getElementById('genre-search')?.value || '');
                const active = state.criteria.genres;
                const items = UI.GenreBar.genres.filter(g => !q || Search.normalize(g).includes(q));

                document.getElementById('genre-empty')?.classList.toggle('hidden', items.length > 0);

                list.innerHTML = '';
                items.forEach(g => {
                    const on = active.includes(g);
                    const u = UI.GenreBar.usage[g] || { count: 0 };
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = "genre-item flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition text-left " + (on
                        ? "bg-sky-50 border-sky-300 text-sky-700 font-bold"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50");
                    btn.innerHTML = `
                        <span class="inline-flex items-center gap-1.5 min-w-0">
                            <span class="material-symbols-outlined text-[18px] ${on ? 'text-sky-600' : 'text-transparent'}" aria-hidden="true">check</span>
                            <span class="truncate">${g}</span>
                        </span>
                        <span class="text-[11px] font-medium ${on ? 'text-sky-400' : 'text-gray-400'}">${u.count}</span>`;
                    btn.addEventListener('click', () => {
                        const i = state.criteria.genres.indexOf(g);
                        if (i >= 0) state.criteria.genres.splice(i, 1);
                        else state.criteria.genres.push(g);
                        Core.applyAndRender(); // バー・一覧・本シートを再同期
                    });
                    list.appendChild(btn);
                });

                const cnt = document.getElementById('genre-selected-count');
                if (cnt) cnt.textContent = active.length ? `${active.length}件選択中` : '';
            },

            // シートが開いているときだけ外部操作（チップ削除等）に追従して再描画
            syncList: () => {
                const dialog = document.getElementById('genre-dialog');
                if (dialog && !dialog.classList.contains('hidden')) Modals.Genre.renderList();
            }
        }
    };

    return { init: Core.init };
})();

document.addEventListener('DOMContentLoaded', CourseApp.init);

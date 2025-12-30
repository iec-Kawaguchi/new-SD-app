/**
 * ==========================================
 * Course Catalog Application
 * ==========================================
 */

const CourseApp = (() => {
    // ------------------------------------------------
    // 1. Configuration & Constants
    // ------------------------------------------------
    const CONFIG = {
        BATCH_SIZE: 6,
        TAG_COLORS: {
            target: "bg-sky-400",
            genre:  "bg-slate-600",
            level:  "bg-emerald-400",
            other:  "bg-rose-400"
        },
        // 画像がない場合のランダム背景用パレット
        BG_GRADIENTS: [
            "bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100",
            "bg-gradient-to-tr from-emerald-100 via-teal-50 to-cyan-100",
            "bg-gradient-to-bl from-indigo-100 via-purple-50 to-pink-100",
            "bg-gradient-to-r from-sky-100 via-blue-50 to-indigo-100",
            "bg-gradient-to-tl from-fuchsia-100 via-pink-50 to-rose-100",
            "bg-gradient-to-br from-amber-100 via-yellow-50 to-lime-100",
            "bg-gradient-to-tr from-slate-200 via-gray-100 to-zinc-200"
        ],
        SELECTORS: {
            container: 'course-panel',
            sentinel: 'loading-sentinel',
            hero: 'hero',
            filterDialog: 'filter-dialog',
            sortDialog: 'sort-dialog',
            viewToggleGrid: 'view-toggle-grid',
            viewToggleList: 'view-toggle-list'
        }
    };

    // ------------------------------------------------
    // 2. Global State Management
    // ------------------------------------------------
    const state = {
        fullList: [],      // 元のデータ (courseList)
        filteredList: [],  // フィルタ・ソート適用後のデータ
        currentOffset: 0,
        isLoading: false,
        isListMode: false,
        currentSortType: 'recommend'
    };

    // ------------------------------------------------
    // 3. Template Engine (HTML Generators)
    // ------------------------------------------------
    const Templates = {
        // タグのHTML生成
        tag: (tag) => {
            const colorClass = CONFIG.TAG_COLORS[tag.type] || CONFIG.TAG_COLORS.other;
            return `<span class="px-2.5 py-0.5 rounded-md ${colorClass} text-white text-[11px] font-bold tracking-wide">${tag.text}</span>`;
        },

        // NEWバッジ生成
        newBadge: (isNew) => {
            return isNew 
                ? `<div class="absolute top-3 left-3 z-10"><span class="px-2.5 py-1 rounded-lg bg-amber-400/90 backdrop-blur text-white text-[10px] font-bold shadow-sm">NEW</span></div>`
                : '';
        },

        // サムネイル部分生成 (画像 or グラデーション)
        thumbnail: (course) => {
            const badge = Templates.newBadge(course.isNew);
            const commonClasses = "course-img-wrapper relative aspect-[16/10] overflow-hidden transition-transform"; 

            if (course.image) {
                // --- 画像がある場合 ---
                return `
                    <div class="${commonClasses} bg-gray-100">
                        <img src="${course.image}" alt="${course.title}" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        ${badge}
                    </div>`;
            } else {
                // --- 画像がない場合 (自動グラデーション + タイトル) ---
                // IDに基づいて一意のグラデーションを選択（リロードしても色が変わらないようにする）
                const idNum = course.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const bgClass = CONFIG.BG_GRADIENTS[idNum % CONFIG.BG_GRADIENTS.length];

                return `
                    <div class="${commonClasses} ${bgClass} grid place-items-center p-6">
                        <h3 class="font-bold text-lg md:text-xl text-slate-700 text-center leading-relaxed group-hover:scale-105 transition-transform duration-300 drop-shadow-sm">
                            ${course.title}
                        </h3>
                        ${badge}
                    </div>`;
            }
        },

        // カード全体の生成
        card: (course) => {
            const tagsHtml = course.tags.map(Templates.tag).join('');
            const thumbHtml = Templates.thumbnail(course);
            const favImgSrc = course.image || ""; // お気に入り用画像（なければ空）

            return `
                <a href="${course.url}" class="course-card group flex flex-col bg-white rounded-3xl overflow-hidden ring-1 ring-slate-200 hover:ring-sky-500/30 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative">
                    ${thumbHtml}
                    <button type="button" class="btn-fav flex absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-rose-500 shadow-sm transition-colors z-10" 
                        data-id="${course.id}" data-title="${course.title}" data-img="${favImgSrc}" data-link="${course.url}" aria-label="お気に入り">
                        <span class="material-symbols-outlined text-[22px]">favorite</span>
                    </button>
                    <div class="flex flex-col flex-1 p-5">
                        <div class="flex gap-2 mb-2">${tagsHtml}</div>
                        <h3 class="text-lg font-bold text-slate-900 line-clamp-2 mb-1 group-hover:text-sky-600 transition-colors">${course.title}</h3>
                        <p class="text-sm text-slate-500 line-clamp-2 mb-3 leading-normal">${course.desc}</p>
                        <div class="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div>
                                <span class="text-lg font-bold text-slate-900">${course.price.toLocaleString()}<span class="text-xs font-normal text-slate-500 ml-0.5">円</span></span>
                            </div>
                            <div class="flex items-center text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                <span class="material-symbols-outlined text-sm mr-1.5">schedule</span> ${course.period}ヶ月
                            </div>
                        </div>
                    </div>
                </a>`;
        }
    };

    // ------------------------------------------------
    // 4. Core Logic (Load, Sort, Intersection)
    // ------------------------------------------------
    const Core = {
        init: () => {
            // データ読み込み
            if (typeof courseList !== 'undefined') {
                state.fullList = [...courseList];
                state.filteredList = [...courseList];
            } else {
                console.warn('courseList not found.');
                return;
            }

            // 各モジュールの初期化
            Core.sort('recommend'); // 初期ソート
            UI.ViewMode.init();
            UI.Carousel.init();
            UI.DeadlineBanner.init();
            UI.SearchClear.init(); // ★ここに追加！

            Modals.Sort.init();
            Modals.Filter.init();

            // モバイル検索フォーカスのUX
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('focus', (e) => {
                    if (window.innerWidth < 768) {
                        e.preventDefault();
                        searchInput.blur();
                        Modals.Filter.open();
                        // 少し遅延させてフォーカス移動
                        setTimeout(() => {
                            const filterKey = document.getElementById('filter-keyword');
                            if(filterKey) filterKey.focus(); 
                        }, 50);
                    }
                });
            }

            // Intersection Observerのセットアップ
            const sentinel = document.getElementById(CONFIG.SELECTORS.sentinel);
            if (sentinel) observer.observe(sentinel);
        },

        loadMore: () => {
            const container = document.getElementById(CONFIG.SELECTORS.container);
            const sentinel = document.getElementById(CONFIG.SELECTORS.sentinel);
            
            if (!container || state.isLoading) return;
            if (state.currentOffset >= state.filteredList.length) {
                sentinel.classList.add('hidden');
                return;
            }

            state.isLoading = true;
            sentinel.classList.remove('opacity-0');

            // 擬似的なロード遅延
            setTimeout(() => {
                const nextBatch = state.filteredList.slice(state.currentOffset, state.currentOffset + CONFIG.BATCH_SIZE);
                const html = nextBatch.map(Templates.card).join('');

                container.insertAdjacentHTML('beforeend', html);
                state.currentOffset += nextBatch.length;

                // レイアウトとイベントの適用
                UI.ViewMode.apply();
                Core.syncFavorites(container);

                state.isLoading = false;
                
                // 次の読み込み判定
                if (state.currentOffset >= state.filteredList.length) {
                    sentinel.classList.add('hidden');
                } else {
                    sentinel.classList.add('opacity-0');
                }
            }, 400);
        },

        // お気に入りボタンの状態同期とイベント設定
        syncFavorites: (container) => {
            const btns = container.querySelectorAll('.btn-fav:not(.initialized)'); // 重複登録防止
            const favs = JSON.parse(localStorage.getItem('my_favorites') || '[]');

            btns.forEach(btn => {
                btn.classList.add('initialized');
                if (favs.some(i => i.id === btn.dataset.id)) {
                    btn.classList.add('heart-active');
                }
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Toggle Favorite:', btn.dataset.id);
                });
            });
        },

        sort: (type) => {
            state.currentSortType = type;
            
            // ソートロジック
            state.filteredList.sort((a, b) => {
                switch (type) {
                    case 'recommend':  return a.period - b.period;
                    case 'new':        return b.period - a.period;
                    case 'price_asc':  return a.price - b.price;
                    case 'price_desc': return b.price - a.price;
                    default: return 0;
                }
            });

            // UI更新
            Modals.Sort.updateUI(type);
            
            // リスト再描画
            const container = document.getElementById(CONFIG.SELECTORS.container);
            container.innerHTML = '';
            state.currentOffset = 0;
            document.getElementById(CONFIG.SELECTORS.sentinel).classList.remove('hidden');
            Core.loadMore();
        },

        // フィルタ実行ロジック
        filter: (criteria) => {
            const { keyword, activeTags, minPrice, maxPrice, minPeriod, maxPeriod, isNewOnly } = criteria;
            const kw = keyword.toLowerCase().trim();

            state.filteredList = state.fullList.filter(course => {
                // (A) NEW
                if (isNewOnly && !course.isNew) return false;
                
                // (B) Keyword
                if (kw) {
                    const textData = (course.title + course.desc + course.tags.map(t => t.text).join('')).toLowerCase();
                    if (!textData.includes(kw)) return false;
                }

                // (C) Tags (OR検索)
                if (activeTags.length > 0) {
                    const courseTagTexts = course.tags.map(t => t.text);
                    if (!activeTags.some(tag => courseTagTexts.includes(tag))) return false;
                }

                // (D) Period
                if (course.period < minPeriod || course.period > maxPeriod) return false;

                // (E) Price
                if (course.price < minPrice || course.price > maxPrice) return false;

                return true;
            });

            Core.sort(state.currentSortType);
        }
    };

    // IntersectionObserver インスタンス
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && state.currentOffset < state.filteredList.length) {
            Core.loadMore();
        }
    }, { rootMargin: '100px' });

    // ------------------------------------------------
    // 5. UI Modules
    // ------------------------------------------------
    const UI = {
        // --- View Mode (Grid/List) ---
        ViewMode: {
            init: () => {
                const btnGrid = document.getElementById(CONFIG.SELECTORS.viewToggleGrid);
                const btnList = document.getElementById(CONFIG.SELECTORS.viewToggleList);
                if (!btnGrid || !btnList) return;

                btnGrid.addEventListener('click', () => UI.ViewMode.setMode(false));
                btnList.addEventListener('click', () => UI.ViewMode.setMode(true));
                UI.ViewMode.updateButtons();
            },
            setMode: (isList) => {
                state.isListMode = isList;
                UI.ViewMode.updateButtons();
                UI.ViewMode.apply();
            },
            updateButtons: () => {
                const btnGrid = document.getElementById(CONFIG.SELECTORS.viewToggleGrid);
                const btnList = document.getElementById(CONFIG.SELECTORS.viewToggleList);
                const activeClass = "bg-sky-100 text-sky-600 shadow-inner";
                const inactiveClass = "text-gray-400 hover:bg-gray-100 hover:text-gray-600";

                if (state.isListMode) {
                    btnList.className = `flex p-2 rounded-full transition ${activeClass}`;
                    btnGrid.className = `flex p-2 rounded-full transition ${inactiveClass}`;
                } else {
                    btnGrid.className = `flex p-2 rounded-full transition ${activeClass}`;
                    btnList.className = `flex p-2 rounded-full transition ${inactiveClass}`;
                }
            },
            apply: () => {
                const container = document.getElementById(CONFIG.SELECTORS.container);
                if (!container) return;

                const cards = Array.from(container.children);
                const GRID_CLASSES = ['md:grid-cols-2', 'lg:grid-cols-3'];
                const LIST_CLASSES = ['grid-cols-1', 'max-w-6xl', 'mx-auto'];

                if (state.isListMode) {
                    container.classList.remove(...GRID_CLASSES);
                    container.classList.add(...LIST_CLASSES);
                } else {
                    container.classList.remove(...LIST_CLASSES);
                    container.classList.add(...GRID_CLASSES);
                }

                // カード内部のレイアウト調整
                cards.forEach(card => {
                    const imgWrapper = card.querySelector('.course-img-wrapper');
                    if (state.isListMode) {
                        card.classList.add('md:flex-row');
                        if (imgWrapper) {
                            imgWrapper.classList.remove('aspect-[16/10]');
                            imgWrapper.classList.add('md:w-72', 'md:aspect-video', 'shrink-0');
                        }
                    } else {
                        card.classList.remove('md:flex-row');
                        if (imgWrapper) {
                            imgWrapper.classList.add('aspect-[16/10]');
                            imgWrapper.classList.remove('md:w-72', 'md:aspect-video', 'shrink-0');
                        }
                    }
                });
            }
        },

        // --- Carousel ---
        Carousel: {
            init: () => {
                const hero = document.getElementById(CONFIG.SELECTORS.hero);
                const dotsContainer = document.getElementById('hero-dots');
                if (!hero || !dotsContainer) return;

                const slides = Array.from(hero.children);
                
                // Dots生成
                dotsContainer.innerHTML = '';
                slides.forEach((_, i) => {
                    const dot = document.createElement('div');
                    dot.className = `h-1.5 w-1.5 rounded-full transition-all duration-300 cursor-pointer ${i===0 ? 'bg-sky-500 scale-125 w-4' : 'bg-gray-300'}`;
                    dot.addEventListener('click', () => {
                        hero.scrollTo({ left: slides[i].offsetLeft, behavior: 'smooth' });
                    });
                    dotsContainer.appendChild(dot);
                });

                // スクロール監視
                hero.addEventListener('scroll', () => UI.Carousel.updateActiveDot(hero, slides, dotsContainer), { passive: true });

                // ボタン制御
                const prev = document.querySelector('[data-prev]');
                const next = document.querySelector('[data-next]');
                
                if (prev) {
                    prev.addEventListener('click', () => {
                        const heroRect = hero.getBoundingClientRect();
                        const currentIndex = slides.findIndex(slide => Math.abs(slide.getBoundingClientRect().left - heroRect.left) < 50);
                        if (currentIndex > 0) {
                            hero.scrollTo({ left: slides[currentIndex - 1].offsetLeft, behavior: 'smooth' });
                        } else {
                            hero.scrollBy({ left: -320, behavior: 'smooth' });
                        }
                    });
                }
                if (next) {
                    next.addEventListener('click', () => {
                        const heroRect = hero.getBoundingClientRect();
                        let activeIndex = 0;
                        let minDiff = Number.MAX_VALUE;
                        slides.forEach((slide, index) => {
                            const diff = Math.abs(slide.getBoundingClientRect().left - heroRect.left);
                            if (diff < minDiff) { minDiff = diff; activeIndex = index; }
                        });
                        if (activeIndex < slides.length - 1) {
                            hero.scrollTo({ left: slides[activeIndex + 1].offsetLeft, behavior: 'smooth' });
                        }
                    });
                }
            },
            updateActiveDot: (hero, slides, dotsContainer) => {
                const heroRect = hero.getBoundingClientRect();
                let activeIndex = 0;
                let minDiff = Number.MAX_VALUE;

                slides.forEach((slide, index) => {
                    const diff = Math.abs(slide.getBoundingClientRect().left - heroRect.left);
                    if (diff < minDiff) { minDiff = diff; activeIndex = index; }
                });

                Array.from(dotsContainer.children).forEach((dot, index) => {
                    if (index === activeIndex) {
                        dot.classList.remove('bg-gray-300');
                        dot.classList.add('bg-sky-500', 'scale-125', 'w-4');
                    } else {
                        dot.classList.add('bg-gray-300');
                        dot.classList.remove('bg-sky-500', 'scale-125', 'w-4');
                    }
                });
            }
        },

        // --- Deadline Banner ---
        DeadlineBanner: {
            init: () => {
                const banner = document.getElementById('deadline-banner');
                const closeBtn = document.getElementById('deadline-banner-close');
                if (banner && closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        banner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        banner.style.opacity = '0';
                        banner.style.transform = 'translateY(1rem)';
                        setTimeout(() => banner.classList.add('hidden'), 300);
                    });
                }
            }
        },  // ← ★ここにカンマ「,」を忘れずにつけてください

        // ▼▼▼ ここに挿入 ▼▼▼
        // --- Search Clear Button ---
        SearchClear: {
            init: () => {
                const setup = (inputId, btnId) => {
                    const input = document.getElementById(inputId);
                    const btn = document.getElementById(btnId);
                    if (!input || !btn) return;

                    const toggle = () => {
                        if (input.value.length > 0) {
                            btn.classList.remove('hidden');
                            btn.classList.add('flex');
                        } else {
                            btn.classList.add('hidden');
                            btn.classList.remove('flex');
                        }
                    };

                    input.addEventListener('input', toggle);
                    toggle(); // 初期チェック

                    btn.addEventListener('click', () => {
                        input.value = '';
                        input.focus();
                        toggle();
                        // 検索結果もリセットしたい場合はここでフィルタ実行などを呼ぶ
                        // 例: Modals.Filter.apply() と同等の処理が必要なら追加検討
                    });
                };

                setup('search-input', 'btn-clear-main');
                setup('filter-keyword', 'btn-clear-filter');
            }
        }
    };

    // ------------------------------------------------
    // 6. Modals (Sort & Filter)
    // ------------------------------------------------
    const Modals = {
        // 共通：モーダル開閉処理
        toggle: (id, isOpen, backdropId, panelId) => {
            const el = document.getElementById(id);
            const bd = document.getElementById(backdropId);
            const pn = document.getElementById(panelId);
            if (!el || !bd || !pn) return;

            if (isOpen) {
                el.classList.remove('hidden');
                requestAnimationFrame(() => {
                    bd.style.opacity = '1';
                    if (id === 'filter-dialog') {
                        pn.style.opacity = '1';
                        pn.style.transform = 'translateY(0) scale(1)';
                    } else {
                        pn.style.transform = 'translateY(0)';
                    }
                });
            } else {
                bd.style.opacity = '0';
                if (id === 'filter-dialog') {
                    pn.style.opacity = '0';
                    pn.style.transform = 'translateY(1.5rem) scale(0.97)';
                } else {
                    pn.style.transform = 'translateY(100%)';
                }
                setTimeout(() => el.classList.add('hidden'), 200);
            }
        },

        Sort: {
            init: () => {
                const btnOpen = document.getElementById('btn-sort');
                const btnClose = document.getElementById('sort-close');
                const backdrop = document.getElementById('sort-backdrop');
                
                btnOpen?.addEventListener('click', () => Modals.toggle('sort-dialog', true, 'sort-backdrop', 'sort-panel'));
                btnClose?.addEventListener('click', () => Modals.toggle('sort-dialog', false, 'sort-backdrop', 'sort-panel'));
                backdrop?.addEventListener('click', () => Modals.toggle('sort-dialog', false, 'sort-backdrop', 'sort-panel'));

                document.querySelectorAll('.sort-option').forEach(btn => {
                    btn.addEventListener('click', () => {
                        Core.sort(btn.dataset.val);
                        Modals.toggle('sort-dialog', false, 'sort-backdrop', 'sort-panel');
                    });
                });
            },
            updateUI: (currentType) => {
                document.querySelectorAll('.sort-option').forEach(btn => {
                    const icon = btn.querySelector('.material-symbols-outlined');
                    const isSelected = btn.dataset.val === currentType;
                    
                    btn.className = isSelected 
                        ? "sort-option w-full text-left px-4 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-sky-700 flex items-center justify-between group"
                        : "sort-option w-full text-left px-4 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-gray-600 hover:text-sky-700 flex items-center justify-between group";
                    
                    icon.className = isSelected
                        ? "material-symbols-outlined text-sky-600 text-[20px]"
                        : "material-symbols-outlined text-sky-600 text-[20px] opacity-0 group-hover:opacity-50";
                });
            }
        },

        Filter: {
            elements: {}, // DOMキャッシュ用

            init: () => {
                const els = Modals.Filter.elements = {
                    dialog: document.getElementById('filter-dialog'),
                    mainSearch: document.getElementById('search-input'),
                    keyword: document.getElementById('filter-keyword'),
                    tagContainer: document.getElementById('filter-tag-container'),
                    newOnly: document.getElementById('filter-new-only'),
                    price: {
                        min: document.getElementById('range-min'),
                        max: document.getElementById('range-max'),
                        lblMin: document.getElementById('price-min'),
                        lblMax: document.getElementById('price-max'),
                        fill: document.getElementById('price-fill')
                    },
                    period: {
                        min: document.getElementById('period-range-min'),
                        max: document.getElementById('period-range-max'),
                        lblMin: document.getElementById('period-min-label'),
                        lblMax: document.getElementById('period-max-label'),
                        fill: document.getElementById('period-fill')
                    }
                };

                // 開閉イベント
                document.getElementById('btn-filter')?.addEventListener('click', Modals.Filter.open);
                document.getElementById('filter-close')?.addEventListener('click', Modals.Filter.close);
                document.getElementById('filter-cancel')?.addEventListener('click', Modals.Filter.close);
                document.getElementById('filter-backdrop')?.addEventListener('click', (e) => {
                    if (e.target === document.getElementById('filter-backdrop')) Modals.Filter.close();
                });

                // タグ生成
                Modals.Filter.renderTags(els.tagContainer);

                // Range Slider初期化
                ['price', 'period'].forEach(key => {
                    const group = els[key];
                    if (group.min && group.max) {
                        group.min.addEventListener('input', () => Modals.Filter.updateRange(key));
                        group.max.addEventListener('input', () => Modals.Filter.updateRange(key));
                        Modals.Filter.updateRange(key); // Init
                    }
                });

                // 適用・リセット
                document.getElementById('filter-apply')?.addEventListener('click', Modals.Filter.apply);
                document.getElementById('filter-reset')?.addEventListener('click', Modals.Filter.reset);

                // Enter Key連携
                if (els.mainSearch) {
                    els.mainSearch.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (els.keyword) els.keyword.value = els.mainSearch.value;
                            Modals.Filter.apply();
                            els.mainSearch.blur();
                        }
                    });
                }
                if (els.keyword) {
                    els.keyword.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (els.mainSearch) els.mainSearch.value = els.keyword.value;
                            Modals.Filter.apply();
                            Modals.Filter.close();
                        }
                    });
                }
            },

            open: () => {
                const els = Modals.Filter.elements;
                if (els.mainSearch && els.keyword) {
                    els.keyword.value = els.mainSearch.value;
                    els.keyword.dispatchEvent(new Event('input'));
                }
                Modals.toggle('filter-dialog', true, 'filter-backdrop', 'filter-panel');
            },

            close: () => {
                Modals.toggle('filter-dialog', false, 'filter-backdrop', 'filter-panel');
            },

            renderTags: (container) => {
                if (!container) return;
                container.innerHTML = '';
                
                const categoryLabels = { target: "対象・階層", genre: "ジャンル", level: "難易度", other: "その他" };
                const tagMap = { target: new Set(), genre: new Set(), level: new Set(), other: new Set() };

                state.fullList.forEach(course => {
                    course.tags.forEach(tag => {
                        const type = (tag.type && tagMap[tag.type]) ? tag.type : 'other';
                        tagMap[type].add(tag.text);
                    });
                });

                Object.keys(categoryLabels).forEach(key => {
                    if (tagMap[key].size === 0) return;

                    const groupDiv = document.createElement('div');
                    groupDiv.innerHTML = `<h4 class="text-xs font-bold text-gray-500 mb-2 pl-1 border-l-2 border-sky-500 leading-none">${categoryLabels[key]}</h4>`;
                    
                    const wrapper = document.createElement('div');
                    wrapper.className = "flex flex-wrap gap-2";

                    Array.from(tagMap[key]).forEach(tagText => {
                        const btn = document.createElement('button');
                        btn.className = "rounded-full px-3 py-1.5 text-xs md:text-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition";
                        btn.textContent = tagText;
                        btn.dataset.chip = "true";
                        btn.setAttribute('aria-pressed', 'false');
                        
                        btn.addEventListener('click', () => {
                            const isActive = btn.getAttribute('aria-pressed') === 'true';
                            Modals.Filter.setChipState(btn, !isActive);
                        });
                        wrapper.appendChild(btn);
                    }); 
                    
                    groupDiv.appendChild(wrapper);
                    container.appendChild(groupDiv);
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

            updateRange: (type) => { // type: 'price' | 'period'
                const els = Modals.Filter.elements[type];
                if (!els.min || !els.max) return;

                const min = Math.min(+els.min.value, +els.max.value);
                const max = Math.max(+els.min.value, +els.max.value);
                const rMin = +els.min.min;
                const rMax = +els.max.max;

                const minPct = ((min - rMin) / (rMax - rMin)) * 100;
                const maxPct = ((max - rMin) / (rMax - rMin)) * 100;

                if (els.fill) {
                    els.fill.style.left = minPct + '%';
                    els.fill.style.right = (100 - maxPct) + '%';
                }
                if (els.lblMin) els.lblMin.textContent = min.toLocaleString();
                if (els.lblMax) els.lblMax.textContent = max.toLocaleString();
            },

            apply: () => {
                const els = Modals.Filter.elements;
                const activeChips = Array.from(els.tagContainer.querySelectorAll('[data-chip][aria-pressed="true"]'));
                
                // 検索条件オブジェクトを作成
                const criteria = {
                    keyword: els.keyword ? els.keyword.value : '',
                    activeTags: activeChips.map(c => c.textContent.trim()),
                    minPrice: Math.min(+els.price.min.value, +els.price.max.value),
                    maxPrice: Math.max(+els.price.min.value, +els.price.max.value),
                    minPeriod: Math.min(+els.period.min.value, +els.period.max.value),
                    maxPeriod: Math.max(+els.period.min.value, +els.period.max.value),
                    isNewOnly: els.newOnly ? els.newOnly.checked : false
                };

                // メイン検索窓にも反映
                if (els.mainSearch && els.keyword) {
                    els.mainSearch.value = els.keyword.value;
                    els.mainSearch.dispatchEvent(new Event('input'));
                }

                Core.filter(criteria);
                Modals.Filter.close();
            },

            reset: () => {
                const els = Modals.Filter.elements;
                if(els.keyword) els.keyword.value = '';
                if(els.mainSearch) els.mainSearch.value = '';
                
                // Tags
                const allChips = els.tagContainer.querySelectorAll('[data-chip]');
                allChips.forEach(c => Modals.Filter.setChipState(c, false));

                // Ranges
                ['price', 'period'].forEach(key => {
                    const g = els[key];
                    g.min.value = g.min.min;
                    g.max.value = g.max.max;
                    Modals.Filter.updateRange(key);
                });

                if(els.newOnly) els.newOnly.checked = false;
            }
        }
    };

    // ------------------------------------------------
    // 7. Public API
    // ------------------------------------------------
    return {
        init: Core.init
    };

})();

// Initialize on Load
document.addEventListener('DOMContentLoaded', CourseApp.init);
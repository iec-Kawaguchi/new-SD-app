/**
 * ==========================================
 * 1. Global State
 * ==========================================
 */
let filteredList = [];     // フィルタリング・ソート済みリスト
let currentOffset = 0;
const BATCH_SIZE = 6;
let isListMode = false;
let isLoading = false;
let currentSortType = 'recommend'; // ソート状態

/**
 * ==========================================
 * 2. Rendering & Infinite Scroll
 * ==========================================
 */
function loadMoreCourses() {
    const container = document.getElementById('course-panel');
    const sentinel = document.getElementById('loading-sentinel');
    
    if (!container || isLoading) return;
    // courseListは js/course-data.js で定義されている前提
    if (typeof courseList === 'undefined') return;
    
    if (currentOffset >= filteredList.length) {
        sentinel.classList.add('hidden');
        return;
    }

    isLoading = true;
    sentinel.classList.remove('opacity-0');

    setTimeout(() => {
        const nextBatch = filteredList.slice(currentOffset, currentOffset + BATCH_SIZE);
        let html = '';

        nextBatch.forEach(course => {
            const tagsHtml = course.tags.map(tag => 
                `<span class="px-2.5 py-0.5 rounded-md ${tag.color} text-white text-[11px] font-bold tracking-wide">${tag.text}</span>`
            ).join('');

            let favImgSrc = (course.thumbnail.type === "image") ? course.thumbnail.src : "";
            
            // NEWバッジ
            let newBadgeHtml = course.thumbnail.isNew 
                ? `<div class="absolute top-3 left-3 z-10"><span class="px-2.5 py-1 rounded-lg bg-amber-400/90 backdrop-blur text-white text-[10px] font-bold shadow-sm">NEW</span></div>` 
                : '';

            // サムネイル生成
            let thumbHtml = '';
            if (course.thumbnail.type === 'image') {
                thumbHtml = `
                    <div class="course-img-wrapper relative aspect-[16/10] overflow-hidden bg-gray-100">
                        <img src="${course.thumbnail.src}" alt="${course.thumbnail.alt}" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        ${newBadgeHtml}
                    </div>`;
            } else if (course.thumbnail.type === 'icon') {
                thumbHtml = `
                    <div class="course-img-wrapper relative aspect-[16/10] overflow-hidden ${course.thumbnail.bgClass} grid place-items-center transition-colors">
                        <div class="text-center p-6">
                            <div class="h-12 w-12 mx-auto bg-white rounded-2xl shadow-sm grid place-items-center mb-3 ${course.thumbnail.iconColor} group-hover:scale-110 transition-transform">
                                <span class="material-symbols-outlined text-2xl">${course.thumbnail.iconName}</span>
                            </div>
                            <h3 class="text-lg font-bold text-slate-700">${course.title}</h3>
                        </div>
                        ${newBadgeHtml}
                    </div>`;
            } else if (course.thumbnail.type === 'text-overlay') {
                thumbHtml = `
                    <div class="course-img-wrapper relative aspect-[16/10] overflow-hidden ${course.thumbnail.bgClass} grid place-items-center">
                        <h3 class="font-bold text-2xl text-slate-700 px-6 text-center group-hover:scale-105 transition-transform">${course.thumbnail.overlayText}</h3>
                        ${newBadgeHtml}
                    </div>`;
            }

            html += `
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
        });

        container.insertAdjacentHTML('beforeend', html);
        currentOffset += nextBatch.length;
        applyLayoutMode();
        
        // ハートボタン同期
        const btns = container.querySelectorAll('.btn-fav');
        const favs = JSON.parse(localStorage.getItem('my_favorites') || '[]');
        btns.forEach(btn => {
            if(favs.some(i => i.id === btn.dataset.id)) {
                btn.classList.add('heart-active');
            }
            // クリックイベント（必要に応じて）
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // お気に入りトグル処理などをここに書く
            });
        });

        isLoading = false;
        
        if (currentOffset >= filteredList.length) {
            sentinel.classList.add('hidden');
        } else {
            sentinel.classList.add('opacity-0');
        }
    }, 400); 
}

const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && typeof filteredList !== 'undefined' && currentOffset < filteredList.length) {
        loadMoreCourses();
    }
}, { rootMargin: '100px' });


/**
 * ==========================================
 * 3. View Mode Toggle
 * ==========================================
 */
function initViewToggle() {
    const btnGrid = document.getElementById('view-toggle-grid');
    const btnList = document.getElementById('view-toggle-list');
    if(!btnGrid || !btnList) return;

    btnGrid.addEventListener('click', () => { isListMode = false; updateToggleButtons(); applyLayoutMode(); });
    btnList.addEventListener('click', () => { isListMode = true; updateToggleButtons(); applyLayoutMode(); });
    updateToggleButtons();
}

function updateToggleButtons() {
    const btnGrid = document.getElementById('view-toggle-grid');
    const btnList = document.getElementById('view-toggle-list');
    if(isListMode) {
        btnList.className = "flex p-2 rounded-full bg-sky-100 text-sky-600 shadow-inner transition";
        btnGrid.className = "flex p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition";
    } else {
        btnGrid.className = "flex p-2 rounded-full bg-sky-100 text-sky-600 shadow-inner transition";
        btnList.className = "flex p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition";
    }
}

function applyLayoutMode() {
    const container = document.getElementById('course-panel');
    if (!container) return;
    const cards = Array.from(container.children);
    const GRID_CONTAINER = ['md:grid-cols-2', 'lg:grid-cols-3'];
    const LIST_CONTAINER = ['grid-cols-1', 'max-w-6xl', 'mx-auto'];

    if (isListMode) {
        container.classList.remove(...GRID_CONTAINER);
        container.classList.add(...LIST_CONTAINER);
    } else {
        container.classList.remove(...LIST_CONTAINER);
        container.classList.add(...GRID_CONTAINER);
    }
    cards.forEach(card => {
        const imgWrapper = card.querySelector('.course-img-wrapper');
        if (isListMode) {
            card.classList.add('md:flex-row');
            if(imgWrapper) {
                imgWrapper.classList.remove('aspect-[16/10]');
                imgWrapper.classList.add('md:w-72', 'md:aspect-video', 'shrink-0');
            }
        } else {
            card.classList.remove('md:flex-row');
            if(imgWrapper) {
                imgWrapper.classList.add('aspect-[16/10]');
                imgWrapper.classList.remove('md:w-72', 'md:aspect-video', 'shrink-0');
            }
        }
    });
}

/**
 * ==========================================
 * 4. Sort Logic
 * ==========================================
 */
function sortCourses(type) {
    if (!filteredList) return;
    currentSortType = type;

    filteredList.sort((a, b) => {
        if (type === 'recommend') return a.period - b.period;
        if (type === 'new') return b.period - a.period;
        if (type === 'price_asc') return a.price - b.price;
        if (type === 'price_desc') return b.price - a.price;
        return 0;
    });

    // UI Update
    document.querySelectorAll('.sort-option').forEach(btn => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if(btn.dataset.val === type) {
            btn.className = "sort-option w-full text-left px-4 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-sky-700 flex items-center justify-between group";
            icon.className = "material-symbols-outlined text-sky-600 text-[20px]";
        } else {
            btn.className = "sort-option w-full text-left px-4 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-gray-600 hover:text-sky-700 flex items-center justify-between group";
            icon.className = "material-symbols-outlined text-sky-600 text-[20px] opacity-0 group-hover:opacity-50";
        }
    });

    const container = document.getElementById('course-panel');
    container.innerHTML = ''; 
    currentOffset = 0;        
    document.getElementById('loading-sentinel').classList.remove('hidden');
    loadMoreCourses();
}

/**
 * ==========================================
 * 5. Carousel Logic
 * ==========================================
 */
function initCarousel() {
    const hero = document.getElementById('hero');
    const prev = document.querySelector('[data-prev]');
    const next = document.querySelector('[data-next]');
    const dotsContainer = document.getElementById('hero-dots');

    if(!hero || !dotsContainer) return;

    // 1. Dots生成
    const slides = Array.from(hero.children);
    dotsContainer.innerHTML = ''; 
    
    slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = "h-1.5 w-1.5 rounded-full transition-all duration-300 cursor-pointer";
        if(i === 0) {
            dot.classList.add('bg-sky-500', 'scale-125', 'w-4');
        } else {
            dot.classList.add('bg-gray-300');
        }
        
        dot.addEventListener('click', () => {
            const targetLeft = slides[i].offsetLeft;
            hero.scrollTo({ left: targetLeft, behavior: 'smooth' });
        });
        
        dotsContainer.appendChild(dot);
    });

    // 2. スクロール連動
    const updateActiveDot = () => {
        const heroRect = hero.getBoundingClientRect();
        let activeIndex = 0;
        let minDiff = Number.MAX_VALUE;

        slides.forEach((slide, index) => {
            const slideRect = slide.getBoundingClientRect();
            const diff = Math.abs(slideRect.left - heroRect.left);
            if(diff < minDiff) {
                minDiff = diff;
                activeIndex = index;
            }
        });

        Array.from(dotsContainer.children).forEach((dot, index) => {
            if(index === activeIndex) {
                dot.classList.remove('bg-gray-300');
                dot.classList.add('bg-sky-500', 'scale-125', 'w-4');
            } else {
                dot.classList.add('bg-gray-300');
                dot.classList.remove('bg-sky-500', 'scale-125', 'w-4');
            }
        });
    };

    hero.addEventListener('scroll', updateActiveDot, { passive: true });

    // 3. 左右ボタンの制御
    if(prev) {
        prev.addEventListener('click', () => {
            const heroRect = hero.getBoundingClientRect();
            // 現在左端にあるとみなせるインデックスを探す
            const currentIndex = slides.findIndex(slide => {
                const rect = slide.getBoundingClientRect();
                return Math.abs(rect.left - heroRect.left) < 50; 
            });
            
            if(currentIndex > 0) {
                hero.scrollTo({ left: slides[currentIndex - 1].offsetLeft, behavior: 'smooth' });
            } else {
                 hero.scrollBy({ left: -320, behavior: 'smooth' });
            }
        });
    }
    
    if(next) {
        next.addEventListener('click', () => {
            const heroRect = hero.getBoundingClientRect();
            // 現在表示中の最も左にあるスライドを探す
            let activeIndex = 0;
            let minDiff = Number.MAX_VALUE;
            slides.forEach((slide, index) => {
                const diff = Math.abs(slide.getBoundingClientRect().left - heroRect.left);
                if(diff < minDiff) {
                    minDiff = diff;
                    activeIndex = index;
                }
            });

            if(activeIndex < slides.length - 1) {
                hero.scrollTo({ left: slides[activeIndex + 1].offsetLeft, behavior: 'smooth' });
            }
        });
    }
}


/**
 * ==========================================
 * 6. Main Initialization
 * ==========================================
 */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof courseList !== 'undefined') {
        filteredList = [...courseList];
    } else {
        console.warn('courseList not found.');
    }

    initViewToggle();
    initCarousel();
    
    // Initial Sort & Load
    sortCourses('recommend');
    
    const sentinel = document.getElementById('loading-sentinel');
    if (sentinel) observer.observe(sentinel);
    
    // Mobile Search Input Focus UI (optional)
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('focus', () => {
           // optional behavior
        });
    }
});

/**
 * ==========================================
 * 7. Modals (Sort & Filter)
 * ==========================================
 */
(() => {
    // --- Sort Modal ---
    const sortDlg = document.getElementById('sort-dialog');
    const sortBackdrop = document.getElementById('sort-backdrop');
    const sortPanel = document.getElementById('sort-panel');
    const btnSortOpen = document.getElementById('btn-sort');
    const btnSortClose = document.getElementById('sort-close');
    
    function openSort() {
        sortDlg.classList.remove('hidden');
        requestAnimationFrame(() => {
            sortBackdrop.style.opacity = '1';
            sortPanel.style.transform = 'translateY(0)';
        });
    }
    function closeSort() {
        sortBackdrop.style.opacity = '0';
        sortPanel.style.transform = 'translateY(100%)';
        setTimeout(() => sortDlg.classList.add('hidden'), 200);
    }
    btnSortOpen?.addEventListener('click', openSort);
    btnSortClose?.addEventListener('click', closeSort);
    sortBackdrop?.addEventListener('click', closeSort);

    // Sort Options Click
    document.querySelectorAll('.sort-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.dataset.val;
            sortCourses(val);
            closeSort();
        });
    });


    // --- Filter Modal ---
    const filterDlg = document.getElementById('filter-dialog');
    const filterBackdrop = document.getElementById('filter-backdrop');
    const filterPanel = document.getElementById('filter-panel');
    const btnFilterOpen = document.getElementById('btn-filter');
    const btnFilterClose = document.getElementById('filter-close');
    const btnFilterCancel = document.getElementById('filter-cancel');
    const btnApply = document.getElementById('filter-apply');
    const btnReset = document.getElementById('filter-reset');

    // Inputs
    const mainSearchInput = document.getElementById('search-input');
    const keywordInput = document.getElementById('filter-keyword');
    const chips = Array.from(filterDlg.querySelectorAll('[data-chip]'));
    
    const filterNewOnly = document.getElementById('filter-new-only');

    // ▼▼▼ Price Range Elements ▼▼▼
    const priceRMin = document.getElementById('range-min');
    const priceRMax = document.getElementById('range-max');
    const priceLMin = document.getElementById('price-min');
    const priceLMax = document.getElementById('price-max');
    const priceFill = document.getElementById('price-fill');

    // ▼▼▼ Period Range Elements (追加) ▼▼▼
    const periodRMin = document.getElementById('period-range-min');
    const periodRMax = document.getElementById('period-range-max');
    const periodLMin = document.getElementById('period-min-label');
    const periodLMax = document.getElementById('period-max-label');
    const periodFill = document.getElementById('period-fill');

    function openFilter() {
        filterDlg.classList.remove('hidden');
        if (mainSearchInput && keywordInput) {
            keywordInput.value = mainSearchInput.value;
        }
        requestAnimationFrame(() => {
            filterBackdrop.style.opacity = '1';
            filterPanel.style.opacity = '1';
            filterPanel.style.transform = 'translateY(0) scale(1)';
        });
    }

    function closeFilter() {
        filterBackdrop.style.opacity = '0';
        filterPanel.style.opacity = '0';
        filterPanel.style.transform = 'translateY(1.5rem) scale(0.97)';
        setTimeout(() => filterDlg.classList.add('hidden'), 200);
    }

    btnFilterOpen?.addEventListener('click', openFilter);
    btnFilterClose?.addEventListener('click', closeFilter);
    btnFilterCancel?.addEventListener('click', closeFilter);
    filterBackdrop?.addEventListener('click', (e) => { if(e.target===filterBackdrop) closeFilter(); });

    // --- Price Range Logic ---
    function updatePriceRange(){
        if(!priceRMin || !priceRMax) return;
        let min = Math.min(+priceRMin.value, +priceRMax.value);
        let max = Math.max(+priceRMin.value, +priceRMax.value);
        const minPct = (min / (+priceRMin.max)) * 100;
        const maxPct = (max / (+priceRMax.max)) * 100;
        
        if(priceFill) {
            priceFill.style.left = minPct + '%';
            priceFill.style.right = (100 - maxPct) + '%';
        }
        if(priceLMin) priceLMin.textContent = min.toLocaleString();
        if(priceLMax) priceLMax.textContent = max.toLocaleString();
    }
    priceRMin?.addEventListener('input', updatePriceRange);
    priceRMax?.addEventListener('input', updatePriceRange);

    // --- Period Range Logic (追加) ---
    function updatePeriodRange(){
        if(!periodRMin || !periodRMax) return;

        // 現在の入力値を取得
        let currentMinVal = Math.min(+periodRMin.value, +periodRMax.value);
        let currentMaxVal = Math.max(+periodRMin.value, +periodRMax.value);

        // スライダーの設定値（min="1", max="12"）を取得
        const rangeMin = +periodRMin.min; 
        const rangeMax = +periodRMax.max;

        // 範囲の幅（1〜12なら 11）
        const totalRange = rangeMax - rangeMin;

        // 0%〜100% の位置を計算
        // 式: ((現在値 - 最小設定値) / 全体の幅) * 100
        const minPct = ((currentMinVal - rangeMin) / totalRange) * 100;
        const maxPct = ((currentMaxVal - rangeMin) / totalRange) * 100;

        if(periodFill) {
            periodFill.style.left = minPct + '%';
            periodFill.style.right = (100 - maxPct) + '%';
        }
        if(periodLMin) periodLMin.textContent = currentMinVal;
        if(periodLMax) periodLMax.textContent = currentMaxVal;
    }
    periodRMin?.addEventListener('input', updatePeriodRange);
    periodRMax?.addEventListener('input', updatePeriodRange);


    // Chip Logic
    function setChipState(el, active){
        el.setAttribute('aria-pressed', active ? 'true' : 'false');
        el.classList.toggle('bg-sky-50', active);
        el.classList.toggle('hover:bg-sky-100', active);
        el.classList.toggle('border-sky-300', active);
        el.classList.toggle('text-sky-600', active);
        el.classList.toggle('font-bold', active);
    }
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const next = chip.getAttribute('aria-pressed') !== 'true';
            setChipState(chip, next);
        });
    });

    /**
     * 共通フィルタ処理関数
     */
    function applyFilter() {
        const kw = keywordInput ? keywordInput.value.toLowerCase().trim() : '';
        const activeTags = chips.filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.textContent.trim());
        
        // Price Values
        const minPrice = Math.min(+priceRMin.value, +priceRMax.value);
        const maxPrice = Math.max(+priceRMin.value, +priceRMax.value);
        
        // Period Values (追加)
        const minPeriod = Math.min(+periodRMin.value, +periodRMax.value);
        const maxPeriod = Math.max(+periodRMin.value, +periodRMax.value);

        const isNewOnly = filterNewOnly ? filterNewOnly.checked : false;

        // リストのフィルタリング
        filteredList = courseList.filter(course => {
            // (A) NEW
            if (isNewOnly && !course.thumbnail.isNew) return false;
            // (B) Keyword
            if (kw) {
                const textData = (course.title + course.desc + course.tags.map(t=>t.text).join('')).toLowerCase();
                if (!textData.includes(kw)) return false;
            }
            // (C) Tags
            if (activeTags.length > 0) {
                const courseTagTexts = course.tags.map(t => t.text);
                if (!activeTags.some(tag => courseTagTexts.includes(tag))) return false;
            }
            // (D) Period Range (変更: 範囲判定)
            if (course.period < minPeriod || course.period > maxPeriod) return false;

            // (E) Price Range
            if (course.price < minPrice || course.price > maxPrice) return false;

            return true;
        });

        sortCourses(currentSortType);
    }

    // Apply Button
    btnApply?.addEventListener('click', () => {
        if (mainSearchInput && keywordInput) {
            mainSearchInput.value = keywordInput.value;
        }
        applyFilter();
        closeFilter();
    });

    // Enter Key Logic (Main)
    if (mainSearchInput) {
        mainSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (keywordInput) keywordInput.value = mainSearchInput.value;
                applyFilter();
                mainSearchInput.blur();
            }
        });
    }
    
    // Enter Key Logic (Modal)
    if (keywordInput) {
        keywordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (mainSearchInput) mainSearchInput.value = keywordInput.value;
                applyFilter();
                closeFilter();
            }
        });
    }

    // Reset Logic
    btnReset?.addEventListener('click', () => {
        if(keywordInput) keywordInput.value = '';
        if(mainSearchInput) mainSearchInput.value = '';

        // Reset Chips
        chips.forEach(c => setChipState(c, false));
        
        // Reset Price Range
        if(priceRMin) priceRMin.value = priceRMin.min || '0';
        if(priceRMax) priceRMax.value = priceRMax.max || '50000';
        
        // Reset Period Range (追加)
        if(periodRMin) periodRMin.value = periodRMin.min || '1';
        if(periodRMax) periodRMax.value = periodRMax.max || '12';

        if(filterNewOnly) filterNewOnly.checked = false;
        
        updatePriceRange();
        updatePeriodRange();
    });
    
    // Init UI
    updatePriceRange();
    updatePeriodRange();

    // Mobile UX
    if(mainSearchInput) {
        mainSearchInput.addEventListener('focus', (e) => {
            if(window.innerWidth < 768) {
                e.preventDefault();
                mainSearchInput.blur();
                openFilter();
                setTimeout(() => {
                    if(keywordInput) keywordInput.focus();
                }, 50);
            }
        });
    }

})();

/**
 * ==========================================
 * 8. Deadline Banner Logic
 * ==========================================
 */
(() => {
    const banner = document.getElementById('deadline-banner');
    const closeBtn = document.getElementById('deadline-banner-close');

    if (banner && closeBtn) {
        closeBtn.addEventListener('click', () => {
            banner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            banner.style.opacity = '0';
            banner.style.transform = 'translateY(1rem)';
            setTimeout(() => {
                banner.classList.add('hidden');
            }, 300);
        });
    }
})();
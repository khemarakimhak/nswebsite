// js/app.js - Main UI controller & Event Handlers

import {
    WOGGLE_PRODUCTS,
    SHOP_PRODUCTS,
    PIN_PRODUCTS,
    BADGE_PRODUCTS,
    WOGGLE_STYLES,
    COLOR_HEX,
    colorSlug,
    imgPath
} from './products.js';

import {
    loadCartFromStorage,
    getCart,
    addCustomWoggle,
    changeWoggleQty,
    changeStandardQty,
    clearCartState,
    generateFormattedReceipt,
    getValidStandardEntries,
    woggleLabel,
    isCartEmpty
} from './cart.js';

import { formatPrice } from './currency.js';
import { t, setLang, productName, colorLabel, applyStaticTranslations } from './i18n.js';
import { NEWS } from '../data/news.js';

// SVG Definitions for icons
const SVG_ICONS = {
    woggle: `<svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12.75 2.25c-.41 0-.75.34-.75.75v3.19c-.83-.43-1.84-.52-2.76-.23-1.34.42-2.34 1.54-2.58 2.93-.15.86.08 1.73.61 2.4.52.66 1.3 1.05 2.14 1.08.38.01.76-.06 1.12-.2.4.67 1.03 1.18 1.77 1.43v.8c-1.32.18-2.55.77-3.5 1.68C7.45 17.41 6.5 19.38 6.5 21.5c0 .41.34.75.75.75s.75-.34.75-.75c0-1.74.78-3.32 2.06-4.38.9-.74 2.04-1.17 3.19-1.22 1.15.05 2.29.48 3.19 1.22 1.28 1.06 2.06 2.64 2.06 4.38 0 .41.34.75.75.75s.75-.34.75-.75c0-2.12-.95-4.09-2.8-5.42-.95-.91-2.18-1.5-3.5-1.68v-.8c.74-.25 1.37-.76 1.77-1.43.36.14.74.21 1.12.2.84-.03 1.62-.42 2.14-1.08.53-.67.76-1.54.61-2.4-.24-1.39-1.24-2.51-2.58-2.93-.92-.29-1.93-.2-2.76.23V3c0-.41-.34-.75-.75-.75zM12 7.75c.97 0 1.75.78 1.75 1.75s-.78 1.75-1.75 1.75S10.25 10.47 10.25 9.5 11.03 7.75 12 7.75z"/></svg>`,
    pin: `<svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 2C8.7 2 6 4.7 6 8C6 11.5 9 14.5 11 16.2V21C11 21.6 11.4 22 12 22C12.6 22 13 21.6 13 21V16.2C15 14.5 18 11.5 18 8C18 4.7 15.3 2 12 2ZM12 14.2C10.3 12.7 8 10.3 8 8C8 5.8 9.8 4 12 4C14.2 4 16 5.8 16 8C16 10.3 13.7 12.7 12 14.2ZM12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6Z"/></svg>`
};

// Woggle customizer state
let activeProduct = null;   // the woggle card that opened the menu
let activeStyle = null;
let selectedColor = '';
let modalQty = 1;           // how many to add from the customizer menu
const MAX_QTY = 99;
let currentLang = 'kh';     // Default to Khmer (prices shown in riel)

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// ---------- Product grids ----------
function renderGrid(containerId, allProducts, query = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Search matches the English name, the Khmer name and the name shown right now
    const q = query.trim().toLowerCase();
    const products = q
        ? allProducts.filter(p => `${p.name} ${p.nameKh || ''} ${productName(p)}`.toLowerCase().includes(q))
        : allProducts;

    if (products.length === 0) {
        const msg = q ? t('search_no_match') : t('section_empty');
        container.innerHTML = `<p class="col-span-2 text-xs text-gray-400 italic text-center py-6">${msg}</p>`;
        return;
    }

    container.innerHTML = products.map(p => {
        const fallbackElement = p.svgIcon ? SVG_ICONS[p.svgIcon] : `<i class="fa-solid ${p.icon} text-3xl"></i>`;
        const name = escapeHTML(productName(p));
        const opensModal = !!p.styleId;

        return `
        <div class="bg-white rounded-3xl p-3 border border-purple-100 shadow-sm flex flex-col justify-between overflow-hidden">
            <div class="w-full aspect-square bg-purple-50 rounded-2xl flex items-center justify-center text-[#7414DC] mb-3 relative overflow-hidden group">
                <img src="${p.image}" alt="${name}" loading="lazy"
                     class="w-full h-full object-cover rounded-2xl"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="w-full h-full flex items-center justify-center" style="display: none;">
                    ${fallbackElement}
                </div>
                ${p.isCustom ? `<span class="absolute top-2 left-2 px-2 py-0.5 bg-[#F4A81E] text-gray-900 font-black text-[9px] rounded-full uppercase tracking-wider shadow-sm z-10">${escapeHTML(t('tag_custom'))}</span>` : ''}
            </div>

            <div class="flex items-end justify-between gap-1">
                <div class="min-w-0 flex-1">
                    <h4 class="font-extrabold text-gray-900 text-xs leading-tight truncate mb-0.5">${name}</h4>
                    <p class="text-xs font-black text-[#7414DC]">${formatPrice(p.price)}</p>
                </div>

                ${opensModal ? `
                    <button data-action="open-woggle-modal" data-id="${p.id}" aria-label="Choose options for ${name}" class="w-9 h-9 bg-[#F4A81E] text-gray-900 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                ` : `
                    <button data-action="add-standard" data-id="${p.id}" aria-label="Add ${name}" class="w-9 h-9 bg-[#7414DC] hover:bg-purple-800 text-white rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                `}
            </div>
        </div>
    `}).join('');
}

// ---------- Search (one search box per section) ----------
const SECTIONS = {
    woggle: WOGGLE_PRODUCTS,
    shop: SHOP_PRODUCTS,
    pin: PIN_PRODUCTS,
    badge: BADGE_PRODUCTS
};
const searchQueries = { woggle: '', shop: '', pin: '', badge: '' };

function renderSection(section) {
    renderGrid(`${section}-products-grid`, SECTIONS[section], searchQueries[section]);
}

function renderAllGrids() {
    Object.keys(SECTIONS).forEach(renderSection);
}

function updateClearButton(section) {
    const btn = document.querySelector(`[data-action="clear-search"][data-section="${section}"]`);
    if (!btn) return;
    const hasText = searchQueries[section].length > 0;
    btn.classList.toggle('hidden', !hasText);
    btn.classList.toggle('flex', hasText);
}

// ---------- Newsfeed (data/news.js) ----------
function formatNewsDate(dateStr) {
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt)) return dateStr;
    try {
        return dt.toLocaleDateString(currentLang === 'kh' ? 'km-KH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

function renderNews() {
    const container = document.getElementById('news-feed');
    if (!container) return;

    const posts = [...NEWS].sort((a, b) => String(b.date).localeCompare(String(a.date)));

    if (posts.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-6">${escapeHTML(t('home_empty'))}</p>`;
        return;
    }

    container.innerHTML = posts.map(post => {
        const useKh = currentLang === 'kh';
        const title = escapeHTML((useKh && post.titleKh) || post.title || '');
        const text = escapeHTML((useKh && post.textKh) || post.text || '');
        const img = post.image ? imgPath(post.image, 'news') : '';

        return `
        <article class="bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden">
            ${img ? `<img src="${img}" alt="${title}" loading="lazy" class="w-full aspect-video object-cover" onerror="this.style.display='none'" />` : ''}
            <div class="p-4">
                <p class="text-[10px] font-bold text-[#7414DC] uppercase tracking-wider mb-1">${escapeHTML(formatNewsDate(post.date))}</p>
                <h3 class="font-black text-sm text-gray-900 leading-snug mb-1">${title}</h3>
                <p class="text-xs text-gray-600 leading-relaxed whitespace-pre-line">${text}</p>
            </div>
        </article>`;
    }).join('');
}

// ---------- Tabs ----------
export function switchTab(tabName) {
    const tabs = ['home', 'woggle', 'shop', 'pin', 'badge'];

    tabs.forEach(t => {
        const view = document.getElementById(`tab-${t}-view`);
        const btn = document.getElementById(`nav-btn-${t}`);
        if (view) {
            if (t === tabName) view.classList.remove('hidden');
            else view.classList.add('hidden');
        }
        if (btn) {
            if (t === tabName) {
                btn.className = "py-1.5 flex flex-col items-center justify-center text-center transition-all rounded-2xl text-[#7414DC]";
            } else {
                btn.className = "py-1.5 flex flex-col items-center justify-center text-center transition-all rounded-2xl text-gray-400 hover:text-[#7414DC]";
            }
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- Language / currency ----------
export function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'kh' : 'en';
    setLang(currentLang);
    applyStaticTranslations();
    updateLangUI(true);
    refreshPrices();
}

// Re-draw everything that shows a price or language-dependent text
function refreshPrices() {
    renderAllGrids();
    renderNews();
    updateCartStateUI();
    updateModalPrice();
    refreshModalText();
}

function updateLangUI(animated = true) {
    const sliderPill = document.getElementById('lang-slider-pill');
    const btnEn = document.getElementById('lang-btn-en');
    const btnKh = document.getElementById('lang-btn-kh');

    if (!sliderPill || !btnEn || !btnKh) return;

    sliderPill.style.transition = animated ? 'all 0.3s ease-out' : 'none';

    if (currentLang === 'en') {
        sliderPill.style.left = '4px';
        btnEn.className = "relative z-10 w-[56px] py-1 text-[11px] font-black tracking-wider transition-colors duration-300 text-gray-900 flex items-center justify-center gap-1";
        btnKh.className = "relative z-10 w-[56px] py-1 text-[11px] font-black tracking-wider transition-colors duration-300 text-purple-200 flex items-center justify-center gap-1";
    } else {
        sliderPill.style.left = '62px';
        btnEn.className = "relative z-10 w-[56px] py-1 text-[11px] font-black tracking-wider transition-colors duration-300 text-purple-200 flex items-center justify-center gap-1";
        btnKh.className = "relative z-10 w-[56px] py-1 text-[11px] font-black tracking-wider transition-colors duration-300 text-gray-900 flex items-center justify-center gap-1";
    }
}

// ---------- Woggle customizer ----------

// Square preview: per-color image -> style image -> tinted icon
function updateWoggleImage() {
    const img = document.getElementById('woggle-modal-image');
    const fallback = document.getElementById('woggle-modal-fallback');
    if (!img || !fallback || !activeStyle || !activeProduct) return;

    const prefix = activeProduct.kind === 'normal' ? 'normal-' : '';
    const colorSrc = `assets/woggle/${prefix}${activeStyle.id}-${colorSlug(selectedColor)}.jpg`;
    const sources = [colorSrc, activeProduct.image].filter(Boolean);
    let attempt = 0;

    fallback.style.display = 'none';
    fallback.style.color = COLOR_HEX[selectedColor] || '#7414DC';
    fallback.innerHTML = SVG_ICONS.woggle.replace('w-8 h-8', 'w-24 h-24');

    img.style.display = 'block';
    img.onerror = () => {
        attempt++;
        if (attempt < sources.length) {
            img.src = sources[attempt];
        } else {
            img.style.display = 'none';
            fallback.style.display = 'flex';
        }
    };
    img.src = sources[0];
}

function renderWoggleColors() {
    if (!activeStyle) return;

    const colorContainer = document.getElementById('woggle-color-selector');
    if (colorContainer) {
        colorContainer.innerHTML = activeStyle.colors.map(c => {
            const active = selectedColor === c;
            return `
            <button data-action="select-color" data-value="${escapeHTML(c)}"
                class="py-2 px-2 text-[11px] font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-700 border-gray-200'}">
                <span class="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style="background:${COLOR_HEX[c] || '#ccc'}"></span>
                <span class="leading-tight">${escapeHTML(colorLabel(c))}</span>
            </button>`;
        }).join('');
    }

    const colorNameEl = document.getElementById('woggle-modal-color-name');
    if (colorNameEl) colorNameEl.innerText = colorLabel(selectedColor);
}

function updateModalPrice() {
    const priceEl = document.getElementById('woggle-modal-price');
    if (priceEl && activeProduct) priceEl.innerText = formatPrice(activeProduct.price * modalQty);
    const qtyEl = document.getElementById('woggle-modal-qty');
    if (qtyEl) qtyEl.innerText = modalQty;
}

// Re-draw the open woggle menu after a language switch
function refreshModalText() {
    if (!activeProduct) return;
    const title = document.getElementById('woggle-modal-title');
    if (title) title.innerText = productName(activeProduct);
    renderWoggleColors();
}

function openWoggleModal(productId) {
    const product = WOGGLE_PRODUCTS.find(p => p.id === productId);
    const style = product && WOGGLE_STYLES.find(s => s.id === product.styleId);
    if (!product || !style) return;

    activeProduct = product;
    activeStyle = style;
    selectedColor = style.colors[0];
    modalQty = 1;

    const title = document.getElementById('woggle-modal-title');
    if (title) title.innerText = productName(product);

    // Normal woggles: color only, so hide the name field
    const nameWrapper = document.getElementById('woggle-name-wrapper');
    if (nameWrapper) nameWrapper.classList.toggle('hidden', product.kind === 'normal');

    updateModalPrice();
    renderWoggleColors();
    updateWoggleImage();

    const modal = document.getElementById('woggle-customizer-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const sheet = document.getElementById('woggle-modal-sheet');
        if (sheet) sheet.scrollTop = 0;
    }
}

// ---------- Cart ----------
export function updateCartStateUI() {
    const cart = getCart();
    const standardEntries = getValidStandardEntries();
    const totalCount = standardEntries.reduce((sum, e) => sum + e.qty, 0)
        + cart.customWoggles.reduce((sum, w) => sum + w.qty, 0);

    const badge = document.getElementById('header-cart-badge');
    if (badge) badge.innerText = totalCount;

    const itemsContainer = document.getElementById('cart-items-container');
    let itemsHTML = '';
    let totalCost = 0;

    standardEntries.forEach(({ prod, qty }) => {
        const subtotal = prod.price * qty;
        totalCost += subtotal;
        itemsHTML += `
            <div class="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center justify-between text-xs">
                <div>
                    <h5 class="font-bold text-gray-900">${escapeHTML(productName(prod))}</h5>
                    <p class="text-gray-500">${qty}x @ ${formatPrice(prod.price)} = <strong class="text-[#7414DC]">${formatPrice(subtotal)}</strong></p>
                </div>
                <div class="flex items-center gap-1">
                    <button data-action="change-qty" data-id="${prod.id}" data-change="-1" class="w-7 h-7 bg-white text-gray-700 border rounded-lg font-bold">-</button>
                    <button data-action="change-qty" data-id="${prod.id}" data-change="1" class="w-7 h-7 bg-[#7414DC] text-white rounded-lg font-bold">+</button>
                </div>
            </div>
        `;
    });

    cart.customWoggles.forEach((w, idx) => {
        const subtotal = w.price * w.qty;
        totalCost += subtotal;
        const priceText = `${w.qty}x @ ${formatPrice(w.price)} = <strong class="text-[#7414DC]">${formatPrice(subtotal)}</strong>`;
        const detail = w.kind === 'normal'
            ? priceText
            : `${escapeHTML(t('cart_name_label'))} <strong class="text-gray-900">${escapeHTML(w.name)}</strong><br>${priceText}`;
        itemsHTML += `
            <div class="bg-purple-50/70 border border-purple-100 p-3 rounded-2xl flex items-center justify-between text-xs">
                <div>
                    <h5 class="font-extrabold text-purple-950">${escapeHTML(woggleLabel(w))}</h5>
                    <p class="text-[11px] text-gray-600">${detail}</p>
                </div>
                <div class="flex items-center gap-1">
                    <button data-action="change-woggle-qty" data-index="${idx}" data-change="-1" class="w-7 h-7 bg-white text-gray-700 border rounded-lg font-bold">-</button>
                    <button data-action="change-woggle-qty" data-index="${idx}" data-change="1" class="w-7 h-7 bg-[#7414DC] text-white rounded-lg font-bold">+</button>
                </div>
            </div>
        `;
    });

    if (itemsContainer) {
        itemsContainer.innerHTML = itemsHTML || `<p class="text-xs text-gray-400 italic text-center py-4">${escapeHTML(t('cart_empty_items'))}</p>`;
    }

    const totalPriceEl = document.getElementById('cart-total-price');
    if (totalPriceEl) totalPriceEl.innerText = formatPrice(totalCost);

    const receiptEl = document.getElementById('receipt-formatted-output');
    if (receiptEl) receiptEl.innerText = generateFormattedReceipt();
}

// Toast Notification
export function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;

    toastText.innerText = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2000);
}

// ---------- Setup ----------
window.addEventListener('DOMContentLoaded', () => {
    setLang(currentLang);
    applyStaticTranslations();
    loadCartFromStorage();
    renderAllGrids();
    renderNews();
    updateCartStateUI();
    updateLangUI(false);

    // Event delegation for clicks
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');

        if (action === 'open-woggle-modal') {
            openWoggleModal(target.getAttribute('data-id'));
        } else if (action === 'add-standard') {
            changeStandardQty(target.getAttribute('data-id'), 1);
            updateCartStateUI();
            showToast(t('toast_added'));
        } else if (action === 'select-color') {
            selectedColor = target.getAttribute('data-value');
            renderWoggleColors();
            updateWoggleImage();
        } else if (action === 'change-qty') {
            changeStandardQty(target.getAttribute('data-id'), parseInt(target.getAttribute('data-change')));
            updateCartStateUI();
        } else if (action === 'change-woggle-qty') {
            changeWoggleQty(parseInt(target.getAttribute('data-index')), parseInt(target.getAttribute('data-change')));
            updateCartStateUI();
        } else if (action === 'clear-search') {
            const section = target.getAttribute('data-section');
            const input = document.querySelector(`[data-search="${section}"]`);
            searchQueries[section] = '';
            if (input) { input.value = ''; input.focus(); }
            renderSection(section);
            updateClearButton(section);
        } else if (action === 'modal-qty') {
            const next = modalQty + parseInt(target.getAttribute('data-change'));
            modalQty = Math.min(MAX_QTY, Math.max(1, next));
            updateModalPrice();
        }
    });

    // Live search: update the list on every keystroke
    document.addEventListener('input', (e) => {
        const input = e.target.closest('[data-search]');
        if (!input) return;
        const section = input.getAttribute('data-search');
        searchQueries[section] = input.value;
        renderSection(section);
        updateClearButton(section);
    });

    // Close customizer when tapping the dark backdrop
    const woggleModal = document.getElementById('woggle-customizer-modal');
    if (woggleModal) {
        woggleModal.addEventListener('click', (e) => {
            if (e.target === woggleModal) woggleModal.classList.add('hidden');
        });
    }

    // Add woggle to cart
    const addWoggleBtn = document.getElementById('btn-add-custom-woggle');
    if (addWoggleBtn) {
        addWoggleBtn.addEventListener('click', () => {
            if (!activeProduct || !activeStyle) return;
            const nameInput = document.getElementById('woggle-custom-name');
            const isNormal = activeProduct.kind === 'normal';
            const customName = isNormal ? '' : (nameInput.value.trim() || "Standard");

            addCustomWoggle(activeStyle.name, selectedColor, customName, activeProduct.price, activeProduct.kind, modalQty);
            if (nameInput) nameInput.value = '';
            woggleModal?.classList.add('hidden');
            updateCartStateUI();
            showToast(t('toast_added_named', { qty: modalQty, name: productName(activeProduct) }));
        });
    }

    // Copy receipt
    const copyBtn = document.getElementById('copy-receipt-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (isCartEmpty()) {
                showToast(t('toast_cart_empty'));
                return;
            }
            const text = generateFormattedReceipt();
            navigator.clipboard.writeText(text).then(() => {
                showToast(t('toast_copied'));
            }).catch(() => showToast(t('toast_copy_failed')));
        });
    }

    // Clear cart
    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearCartState();
            updateCartStateUI();
            showToast(t('toast_cleared'));
        });
    }
});

// Expose navigation functions globally for inline HTML callers
window.switchTab = switchTab;
window.toggleLanguage = toggleLanguage;
window.toggleCartModal = (show) => {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        if (show) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
    }
};
window.closeWoggleModal = () => {
    document.getElementById('woggle-customizer-modal')?.classList.add('hidden');
};

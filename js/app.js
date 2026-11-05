// js/app.js - Main UI controller & Event Handlers

import {
    WOGGLE_PRODUCTS,
    SHOP_PRODUCTS,
    PIN_PRODUCTS,
    BADGE_PRODUCTS,
    COLOR_HEX,
    optionImagePath,
    imgPath
} from './products.js';

import {
    loadCartFromStorage,
    getCart,
    addVariantItem,
    changeWoggleQty,
    changeStandardQty,
    clearCartState,
    generateFormattedReceipt,
    getValidStandardEntries,
    woggleLabel,
    isCartEmpty,
    getReceiver,
    setReceiverField,
    receiverHasData,
    clearReceiverState,
    setDeliveryMethod,
    setDeliveryFee,
    setSource,
    sourceLabel,
    zoneLabel,
    getDeliveryFee,
    getDeliveryRow,
    getCartTotal,
    needsDeliveryFeeChoice
} from './cart.js';

import { createReceiptPdf } from './pdf.js';
import './print.js';   // optional Bluetooth print feature (delete this line + js/print.js + the Print button to remove it)
import { createOrder, getCurrentUser } from './firebase.js';
import { startAdminSession } from './admin-session.js';
import {
    listSaved,
    saveCurrentOrder,
    loadSavedOrder,
    deleteSavedOrder,
    summarizeSaved,
    hasUnsavedItems,
    hasUnsavedOrder,
    sameName
} from './saved-orders.js';

import { formatPrice } from './currency.js';
import { DELIVERY } from '../data/catalog.js';
import { SCOUT_LOGO_PATHS, SCOUT_VIEWBOX } from './icons.js';
import { t, setLang, productName, optionLabel, optionTitleKey, applyStaticTranslations } from './i18n.js';
import { NEWS } from '../data/news.js';

// SVG Definitions for icons
const SVG_ICONS = {
    woggle: `<svg class="w-8 h-8 fill-current" viewBox="${SCOUT_VIEWBOX}">${SCOUT_LOGO_PATHS}</svg>`,
    pin: `<svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 2C8.7 2 6 4.7 6 8C6 11.5 9 14.5 11 16.2V21C11 21.6 11.4 22 12 22C12.6 22 13 21.6 13 21V16.2C15 14.5 18 11.5 18 8C18 4.7 15.3 2 12 2ZM12 14.2C10.3 12.7 8 10.3 8 8C8 5.8 9.8 4 12 4C14.2 4 16 5.8 16 8C16 10.3 13.7 12.7 12 14.2ZM12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6Z"/></svg>`
};

// Woggle customizer state
let activeProduct = null;   // the product whose choice menu is open
let selectedColor = '';     // the chosen option (a color, "White-Red", "Star Class"...)
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

        return `
        <div data-action="open-product" data-id="${p.id}" role="button" tabindex="0" aria-label="${name}" class="bg-white rounded-3xl p-3 border border-purple-100 shadow-sm flex flex-col justify-between overflow-hidden cursor-pointer active:scale-[0.98] transition-transform">
            <div class="w-full aspect-square bg-purple-50 rounded-2xl flex items-center justify-center text-[#7414DC] mb-3 relative overflow-hidden group">
                <img src="${p.image}" alt="${name}" loading="lazy"
                     class="w-full h-full object-cover rounded-2xl"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="w-full h-full flex items-center justify-center" style="display: none;">
                    ${fallbackElement}
                </div>
                ${p.isCustom ? `<span class="absolute top-2 left-2 px-4 py-1.5 bg-[#F4A81E] text-gray-900 font-black text-[11px] rounded-full uppercase tracking-wider shadow-sm z-10">${escapeHTML(t('tag_custom'))}</span>` : ''}
            </div>

            <div class="min-w-0">
                <h4 class="font-extrabold text-gray-900 text-xs leading-tight line-clamp-2 mb-0.5">${name}</h4>
                <p class="text-xs font-black text-[#7414DC]">${formatPrice(p.price)}</p>
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

// Video ID from any YouTube link (watch?v=, youtu.be/, shorts/, live/, embed/) or from the bare 11-character ID
export function youtubeId(input) {
    const text = String(input || '').trim();
    if (/^[\w-]{11}$/.test(text)) return text;
    try {
        const url = new URL(text);
        const host = url.hostname.replace(/^www\./, '');
        if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0].slice(0, 11);
        if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
            const v = url.searchParams.get('v');
            if (v) return v.slice(0, 11);
            const match = url.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
            if (match) return match[1];
        }
    } catch (e) { /* not a link */ }
    return '';
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
        const videoId = youtubeId(post.youtube);

        return `
        <article class="bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden">
            ${videoId
                // YouTube's own player: it shows the video thumbnail with YouTube's own play button
                ? `<div class="w-full aspect-video bg-black"><iframe class="w-full h-full" src="https://www.youtube-nocookie.com/embed/${videoId}" title="${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`
                : (img ? `<img src="${img}" alt="${title}" loading="lazy" class="w-full aspect-video object-cover" onerror="this.style.display='none'" />` : '')}
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
    renderDelivery();
    renderSavedList();
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

// ---------- Choice menu (woggles, Round/Square Lis, Rank Badge...) ----------

const ALL_PRODUCTS = [...WOGGLE_PRODUCTS, ...SHOP_PRODUCTS, ...PIN_PRODUCTS, ...BADGE_PRODUCTS];

// Swatch colors for an option: "Red" -> ["#DC2626"], "White-Red" -> two colors, "Star Class" -> none
function optionSwatches(option) {
    const parts = COLOR_HEX[option] ? [option] : option.split('-');
    return parts.every(c => COLOR_HEX[c]) ? parts.map(c => COLOR_HEX[c]) : [];
}

function swatchStyle(option) {
    const colors = optionSwatches(option);
    if (colors.length === 0) return '';
    if (colors.length === 1) return `background:${colors[0]}`;
    return `background:linear-gradient(90deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
}

// Does this product have a choice menu (colors, classes...)?
const hasProductOptions = p => Array.isArray(p.options) && p.options.length > 0;

// Square picture: picture of the chosen option -> main picture -> tinted icon
function updateWoggleImage() {
    const img = document.getElementById('woggle-modal-image');
    const fallback = document.getElementById('woggle-modal-fallback');
    if (!img || !fallback || !activeProduct) return;

    const hasOptions = hasProductOptions(activeProduct);
    const sources = [hasOptions ? optionImagePath(activeProduct, selectedColor) : '', activeProduct.image].filter(Boolean);
    let attempt = 0;

    // Products without a menu have more room, so their picture is shown bigger
    const picture = document.getElementById('woggle-modal-picture');
    if (picture) picture.style.maxWidth = hasOptions ? 'min(100%, 42vh)' : 'min(100%, 56vh)';

    const swatches = hasOptions ? optionSwatches(selectedColor) : [];
    const tint = swatches.find(c => c.toUpperCase() !== '#FFFFFF') || swatches[0] || '#7414DC';

    fallback.style.display = 'none';
    fallback.style.color = tint;
    if (activeProduct.svgIcon) {
        fallback.innerHTML = (SVG_ICONS[activeProduct.svgIcon] || SVG_ICONS.woggle).replace('w-8 h-8', 'w-24 h-24');
    } else if (activeProduct.icon) {
        fallback.innerHTML = `<i class="fa-solid ${activeProduct.icon} text-7xl"></i>`;
    } else {
        fallback.innerHTML = SVG_ICONS.woggle.replace('w-8 h-8', 'w-24 h-24');
    }

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
    if (!activeProduct || !hasProductOptions(activeProduct)) return;

    const container = document.getElementById('woggle-color-selector');
    if (container) {
        container.innerHTML = activeProduct.options.map(c => {
            const active = selectedColor === c;
            const swatch = swatchStyle(c);
            return `
            <button data-action="select-color" data-value="${escapeHTML(c)}"
                class="py-2 px-2 text-[11px] font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-700 border-gray-200'}">
                ${swatch ? `<span class="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style="${swatch}"></span>` : ''}
                <span class="leading-tight">${escapeHTML(optionLabel(c))}</span>
            </button>`;
        }).join('');
    }

    const colorNameEl = document.getElementById('woggle-modal-color-name');
    if (colorNameEl) colorNameEl.innerText = optionLabel(selectedColor);
}

function updateModalPrice() {
    const priceEl = document.getElementById('woggle-modal-price');
    if (priceEl && activeProduct) priceEl.innerText = formatPrice(activeProduct.price * modalQty);
    const qtyEl = document.getElementById('woggle-modal-qty');
    if (qtyEl) qtyEl.innerText = modalQty;
}

// Menu headings ("1. Color" / "1. Class") follow the product
function updateModalHeadings() {
    if (!activeProduct) return;
    const titleEl = document.getElementById('woggle-modal-title');
    if (titleEl) titleEl.innerText = productName(activeProduct);
    const optTitle = document.getElementById('woggle-options-label');
    if (optTitle) {
        const key = optionTitleKey(activeProduct, 'optiontitle');
        optTitle.setAttribute('data-i18n', key);
        optTitle.textContent = t(key);
    }
    const selLabel = document.getElementById('woggle-selected-label');
    if (selLabel) {
        const key = optionTitleKey(activeProduct, 'optionselected');
        selLabel.setAttribute('data-i18n', key);
        selLabel.textContent = t(key);
    }
}

// Re-draw the open menu after a language switch
function refreshModalText() {
    if (!activeProduct) return;
    updateModalHeadings();
    renderWoggleColors();
}

// The product pop-up: big picture, quantity and Add to Cart for every product.
// Products with a choice menu also show their options (and the name field for "Woggle Name").
function openProductModal(productId) {
    const product = ALL_PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const hasOptions = hasProductOptions(product);
    activeProduct = product;
    selectedColor = hasOptions ? product.options[0] : '';
    modalQty = 1;

    updateModalHeadings();

    // Hide the option parts when the product has no menu
    document.getElementById('woggle-selected-row')?.classList.toggle('hidden', !hasOptions);
    document.getElementById('woggle-options-block')?.classList.toggle('hidden', !hasOptions);

    // Only woggles with a name show the name field
    const nameWrapper = document.getElementById('woggle-name-wrapper');
    if (nameWrapper) nameWrapper.classList.toggle('hidden', product.kind !== 'custom');

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

// ---------- Receiver details (cart) ----------
function fillReceiverForm() {
    const r = getReceiver();
    document.querySelectorAll('[data-receiver]').forEach(el => {
        el.value = r[el.getAttribute('data-receiver')] || '';
    });
    renderSource();
    renderDelivery();
}

const BTN_ON = 'bg-gray-900 text-white border-gray-900';
const BTN_OFF = 'bg-gray-50 text-gray-700 border-gray-200';
// Selected colors: VET orange, J&T red, the others dark
const DELIVERY_ON = {
    vet: 'bg-orange-500 text-white border-orange-500',
    jt: 'bg-red-600 text-white border-red-600'
};

// Price shown under each delivery button, in the current currency
function deliveryFeeText(code) {
    const config = DELIVERY[code];
    if (!config) return '';
    if (Array.isArray(config.fees)) {
        const prices = config.fees.map(z => z.fee);
        const lowest = Math.min(...prices), highest = Math.max(...prices);
        return lowest === highest ? formatPrice(lowest) : `${formatPrice(lowest)} - ${formatPrice(highest)}`;
    }
    return config.fee > 0 ? `+${formatPrice(config.fee)}` : t('delivery_free');
}

function renderDelivery() {
    const receiver = getReceiver();

    // 1. The four methods
    document.querySelectorAll('[data-action="select-delivery"]').forEach(btn => {
        const code = btn.getAttribute('data-value');
        const active = code === receiver.delivery;
        const onClasses = DELIVERY_ON[code] || BTN_ON;
        btn.className = `py-2 px-2 text-xs font-bold rounded-xl border transition-all ${active ? onClasses : BTN_OFF}`;
        const feeEl = btn.querySelector('[data-delivery-fee]');
        if (feeEl) feeEl.textContent = deliveryFeeText(code);
    });

    // 2. Methods with several zones (Delivery: Near / Average / Outside PP)
    const config = DELIVERY[receiver.delivery];
    const subBox = document.getElementById('delivery-sub');
    if (subBox) {
        const hasChoices = !!(config && Array.isArray(config.fees));
        subBox.classList.toggle('hidden', !hasChoices);
        subBox.innerHTML = hasChoices ? config.fees.map(zone => {
            const active = Number(receiver.deliverySub) === zone.fee;
            return `<button type="button" data-action="select-delivery-fee" data-value="${zone.fee}" class="py-2 px-1 text-xs font-bold rounded-xl border transition-all ${active ? BTN_ON : BTN_OFF}">
                <span class="block leading-tight">${escapeHTML(zoneLabel(zone))}</span>
                <span class="block text-[10px] font-semibold opacity-70">${formatPrice(zone.fee)}</span>
            </button>`;
        }).join('') : '';
    }

    // 3. Reminder while the zone has not been chosen
    const hint = document.getElementById('delivery-fee-hint');
    if (hint) hint.classList.toggle('hidden', !needsDeliveryFeeChoice());
}

// Selected colors of the order source: Page blue, Telegram light blue, TikTok black
const SOURCE_ON = {
    page: 'bg-[#0866FF] text-white border-[#0866FF]',
    telegram: 'bg-[#0088CC] text-white border-[#0088CC]',
    tiktok: 'bg-black text-white border-black'
};

// Where the customer ordered from (Page / Telegram / TikTok)
function renderSource() {
    const chosen = getReceiver().source;
    document.querySelectorAll('[data-action="select-source"]').forEach(btn => {
        const code = btn.getAttribute('data-value');
        const active = code === chosen;
        btn.className = `py-2 px-1 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${active ? (SOURCE_ON[code] || BTN_ON) : BTN_OFF}`;
    });
}

function refreshReceiptText() {
    const receiptEl = document.getElementById('receipt-formatted-output');
    if (receiptEl) receiptEl.innerText = generateFormattedReceipt();
}

// A small question with 1-3 buttons. Resolves with the value of the tapped button ('cancel' when dismissed).
function askChoice(message, buttons) {
    return new Promise(resolve => {
        const modal = document.getElementById('choice-modal');
        const messageEl = document.getElementById('choice-message');
        const buttonsEl = document.getElementById('choice-buttons');
        if (!modal || !messageEl || !buttonsEl) { resolve('cancel'); return; }

        const tones = {
            primary: 'bg-[#7414DC] text-white',
            danger: 'bg-rose-100 text-rose-700',
            neutral: 'bg-gray-100 text-gray-700'
        };
        messageEl.textContent = message;
        buttonsEl.innerHTML = buttons.map((b, i) =>
            `<button type="button" data-choice="${i}" class="w-full py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition-all ${tones[b.tone] || tones.neutral}">${escapeHTML(b.label)}</button>`
        ).join('');

        const finish = (value) => {
            modal.classList.add('hidden');
            modal.removeEventListener('click', onClick);
            resolve(value);
        };
        const onClick = (e) => {
            const btn = e.target.closest('[data-choice]');
            if (btn) finish(buttons[Number(btn.getAttribute('data-choice'))].value);
            else if (e.target === modal) finish('cancel');      // tapped the dark background
        };
        modal.addEventListener('click', onClick);
        modal.classList.remove('hidden');
    });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ---------- Saved orders (customers and their carts) ----------
function formatSavedDate(timestamp) {
    try {
        return new Date(timestamp).toLocaleString(currentLang === 'kh' ? 'km-KH' : 'en-GB',
            { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '';
    }
}

function renderSavedList() {
    const saved = listSaved();

    const badge = document.getElementById('saved-count-badge');
    if (badge) {
        badge.innerText = saved.length;
        badge.classList.toggle('hidden', saved.length === 0);
        badge.classList.toggle('flex', saved.length > 0);
    }

    const list = document.getElementById('saved-list');
    if (!list) return;

    if (saved.length === 0) {
        list.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-3">${escapeHTML(t('saved_empty'))}</p>`;
        return;
    }

    const currentName = getReceiver().name;
    list.innerHTML = saved.map(entry => {
        const { count, total } = summarizeSaved(entry);
        const active = currentName.trim() && sameName(entry.name, currentName);
        return `
        <div class="flex items-center gap-2 rounded-xl border p-2 ${active ? 'bg-white border-[#7414DC]' : 'bg-white border-gray-200'}">
            <button type="button" data-action="load-order" data-id="${entry.id}" class="flex-1 min-w-0 text-left active:opacity-70" style="min-height:0">
                <p class="font-bold text-xs text-gray-900 truncate">${escapeHTML(entry.name)}${entry.receiver.source ? ` <span class="text-[#7414DC]">(${escapeHTML(sourceLabel(entry.receiver.source))})</span>` : ''}</p>
                <p class="text-[10px] text-gray-500 truncate">${escapeHTML(t('saved_items', { count }))} • ${formatPrice(total)} • ${escapeHTML(formatSavedDate(entry.savedAt))}</p>
            </button>
            <button type="button" data-action="delete-order" data-id="${entry.id}" aria-label="Delete" class="w-9 h-9 shrink-0 text-rose-600 hover:bg-rose-100 rounded-lg flex items-center justify-center" style="min-height:0">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>`;
    }).join('');
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
                    <button data-action="change-qty" data-id="${prod.id}" data-change="-1" class="w-8 h-8 min-h-0 bg-white text-gray-700 border rounded-lg font-bold">-</button>
                    <button data-action="change-qty" data-id="${prod.id}" data-change="1" class="w-8 h-8 min-h-0 bg-[#7414DC] text-white rounded-lg font-bold">+</button>
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
                    <button data-action="change-woggle-qty" data-index="${idx}" data-change="-1" class="w-8 h-8 min-h-0 bg-white text-gray-700 border rounded-lg font-bold">-</button>
                    <button data-action="change-woggle-qty" data-index="${idx}" data-change="1" class="w-8 h-8 min-h-0 bg-[#7414DC] text-white rounded-lg font-bold">+</button>
                </div>
            </div>
        `;
    });

    const feeRow = getDeliveryRow();
    if (feeRow) {
        itemsHTML += `
            <div class="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-center justify-between text-xs">
                <span class="font-bold text-gray-900">${escapeHTML(feeRow.label)}</span>
                <strong class="text-[#7414DC]">${formatPrice(feeRow.amount)}</strong>
            </div>`;
    }

    if (itemsContainer) {
        itemsContainer.innerHTML = itemsHTML || `<p class="text-xs text-gray-400 italic text-center py-4">${escapeHTML(t('cart_empty_items'))}</p>`;
    }

    const totalPriceEl = document.getElementById('cart-total-price');
    if (totalPriceEl) totalPriceEl.innerText = formatPrice(getCartTotal());

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
    // Scout logo for every <svg data-icon="scout"> (bottom menu)
    document.querySelectorAll('svg[data-icon="scout"]').forEach(svg => {
        svg.setAttribute('viewBox', SCOUT_VIEWBOX);
        svg.innerHTML = SCOUT_LOGO_PATHS;
    });

    setLang(currentLang);
    applyStaticTranslations();
    loadCartFromStorage();
    fillReceiverForm();
    renderSavedList();
    renderAllGrids();
    renderNews();
    updateCartStateUI();
    updateLangUI(false);

    // Event delegation for clicks
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');

        if (action === 'open-product') {
            openProductModal(target.getAttribute('data-id'));
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
        } else if (action === 'toggle-saved') {
            document.getElementById('saved-panel')?.classList.toggle('hidden');
            renderSavedList();
        } else if (action === 'save-order') {
            const result = saveCurrentOrder();
            if (!result.ok) {
                showToast(t('toast_need_name'));
                document.getElementById('receiver-name')?.focus();
            } else {
                renderSavedList();
                showToast(t(result.updated ? 'toast_saved_updated' : 'toast_saved'));
            }
        } else if (action === 'load-order') {
            const entry = listSaved().find(e => e.id === target.getAttribute('data-id'));
            if (!entry) return;
            if (hasUnsavedItems() && !confirm(t('confirm_replace_cart', { name: entry.name }))) return;
            loadSavedOrder(entry.id);
            fillReceiverForm();
            updateCartStateUI();
            renderSavedList();
            const scroller = document.querySelector('#cart-modal .overflow-y-auto');
            if (scroller) scroller.scrollTop = 0;
            showToast(t('toast_loaded', { name: entry.name }));
        } else if (action === 'delete-order') {
            const entry = listSaved().find(e => e.id === target.getAttribute('data-id'));
            if (!entry) return;
            if (!confirm(t('confirm_delete_saved', { name: entry.name }))) return;
            deleteSavedOrder(entry.id);
            renderSavedList();
            showToast(t('toast_deleted'));
        } else if (action === 'select-source') {
            setSource(target.getAttribute('data-value'));
            renderSource();
            refreshReceiptText();
        } else if (action === 'select-delivery') {
            setDeliveryMethod(target.getAttribute('data-value'));
            renderDelivery();
            updateCartStateUI();
        } else if (action === 'select-delivery-fee') {
            setDeliveryFee(parseFloat(target.getAttribute('data-value')));
            renderDelivery();
            updateCartStateUI();
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

    // Receiver details: save as the customer types and refresh the receipt
    document.addEventListener('input', (e) => {
        const field = e.target.closest('[data-receiver]');
        if (!field) return;
        setReceiverField(field.getAttribute('data-receiver'), field.value);
        refreshReceiptText();
        if (field.getAttribute('data-receiver') === 'name') renderSavedList();
    });

    // Keyboard: Enter or Space on a product card opens it
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest && e.target.closest('[data-action="open-product"]');
        if (!card) return;
        e.preventDefault();
        card.click();
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
            if (!activeProduct) return;
            const nameInput = document.getElementById('woggle-custom-name');

            if (!hasProductOptions(activeProduct)) {
                // Plain product (no menu): add straight to the cart
                changeStandardQty(activeProduct.id, modalQty);
                woggleModal?.classList.add('hidden');
                updateCartStateUI();
                showToast(t('toast_added_named', { qty: modalQty, name: productName(activeProduct) }));
                return;
            }

            const isNormal = activeProduct.kind !== 'custom';
            const customName = isNormal ? '' : (nameInput.value.trim() || "Standard");

            addVariantItem({
                productId: activeProduct.id,
                title: activeProduct.name,
                style: activeProduct.styleName || '',
                option: selectedColor,
                name: customName,
                price: activeProduct.price,
                kind: activeProduct.kind,
                qty: modalQty
            });
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

    // Export the receipt as a PDF for the 55 mm thermal printer
    const pdfBtn = document.getElementById('export-pdf-btn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', async () => {
            if (isCartEmpty()) {
                showToast(t('toast_cart_empty'));
                return;
            }
            pdfBtn.disabled = true;
            try {
                const blob = await createReceiptPdf();
                const d = new Date();
                const pad = n => String(n).padStart(2, '0');
                downloadBlob(blob, `nimet-receipt-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.pdf`);
                showToast(t('toast_pdf_done'));
            } catch (err) {
                console.error('PDF error:', err);
                showToast(t('toast_pdf_failed'));
            } finally {
                pdfBtn.disabled = false;
            }
        });
    }

    // Clear cart
    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            // Clear the cart AND the customer details directly without asking to save
            clearCartState();
            clearReceiverState();
            fillReceiverForm();
            updateCartStateUI();
            showToast(t('toast_cleared'));
        });
    }

    // Checkout — sends order to Firebase without requiring customer account
    document.getElementById('checkout-btn')?.addEventListener('click', async () => {
        if (isCartEmpty()) { showToast(t('toast_cart_empty')); return; }
        const receiver = getReceiver();
        const name = (receiver.name || '').trim();
        if (!name) { showToast(t('toast_need_name')); document.getElementById('receiver-name')?.focus(); return; }

        const btn = document.getElementById('checkout-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...`; }
        try {
            const cart = getCart();
            const stdEntries = getValidStandardEntries();
            const itemCount = stdEntries.reduce((s, e) => s + e.qty, 0) + cart.customWoggles.reduce((s, w) => s + (w.qty || 1), 0);
            const totalUsd = getCartTotal();
            const uid = getCurrentUser()?.uid ?? null;
            await createOrder({ name, phone: receiver.phone || '', address: receiver.address || '', source: receiver.source || '', receiver: { ...receiver, name }, cart: JSON.parse(JSON.stringify(cart)), itemCount, totalUsd, status: 'new', userId: uid, customerUid: uid, searchText: `${name} ${receiver.phone || ''}`.toLowerCase() });
            try { await navigator.clipboard.writeText(generateFormattedReceipt()); } catch (_) {}
            clearCartState(); clearReceiverState(); fillReceiverForm(); updateCartStateUI();
            window.toggleCartModal(false);
            showToast('Order sent to Admin successfully!');
        } catch (err) {
            console.error('Checkout failed:', err);
            showToast(`Checkout failed: ${err.message || 'Please check connection'}`);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span data-i18n="cart_checkout">Check Out</span>`; }
        }
    });

    // Admin session (edit orders from admin.html, inline save icon)
    startAdminSession({
        toast: showToast,
        afterRestore: () => { fillReceiverForm(); updateCartStateUI(); window.toggleCartModal(true); }
    });
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

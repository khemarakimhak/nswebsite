// js/app.js - Main UI controller & Event Handlers

import {
    WOGGLE_PRODUCTS,
    SHOP_PRODUCTS,
    PIN_PRODUCTS,
    BADGE_PRODUCTS,
    WOGGLE_STYLES,
    COLOR_HEX,
    colorSlug
} from './products.js';

import {
    loadCartFromStorage,
    getCart,
    addCustomWoggle,
    removeCustomWoggle,
    changeStandardQty,
    clearCartState,
    generateFormattedReceipt
} from './cart.js';

// SVG Definitions for icons
const SVG_ICONS = {
    woggle: `<svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12.75 2.25c-.41 0-.75.34-.75.75v3.19c-.83-.43-1.84-.52-2.76-.23-1.34.42-2.34 1.54-2.58 2.93-.15.86.08 1.73.61 2.4.52.66 1.3 1.05 2.14 1.08.38.01.76-.06 1.12-.2.4.67 1.03 1.18 1.77 1.43v.8c-1.32.18-2.55.77-3.5 1.68C7.45 17.41 6.5 19.38 6.5 21.5c0 .41.34.75.75.75s.75-.34.75-.75c0-1.74.78-3.32 2.06-4.38.9-.74 2.04-1.17 3.19-1.22 1.15.05 2.29.48 3.19 1.22 1.28 1.06 2.06 2.64 2.06 4.38 0 .41.34.75.75.75s.75-.34.75-.75c0-2.12-.95-4.09-2.8-5.42-.95-.91-2.18-1.5-3.5-1.68v-.8c.74-.25 1.37-.76 1.77-1.43.36.14.74.21 1.12.2.84-.03 1.62-.42 2.14-1.08.53-.67.76-1.54.61-2.4-.24-1.39-1.24-2.51-2.58-2.93-.92-.29-1.93-.2-2.76.23V3c0-.41-.34-.75-.75-.75zM12 7.75c.97 0 1.75.78 1.75 1.75s-.78 1.75-1.75 1.75S10.25 10.47 10.25 9.5 11.03 7.75 12 7.75z"/></svg>`,
    pin: `<svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 2C8.7 2 6 4.7 6 8C6 11.5 9 14.5 11 16.2V21C11 21.6 11.4 22 12 22C12.6 22 13 21.6 13 21V16.2C15 14.5 18 11.5 18 8C18 4.7 15.3 2 12 2ZM12 14.2C10.3 12.7 8 10.3 8 8C8 5.8 9.8 4 12 4C14.2 4 16 5.8 16 8C16 10.3 13.7 12.7 12 14.2ZM12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6Z"/></svg>`
};

// Current woggle customizer state
let activeStyle = WOGGLE_STYLES[0];
let selectedColor = activeStyle.colors[0];
let currentLang = 'kh'; // Default to Khmer

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// Render Product Grids
function renderGrid(containerId, products) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = products.map(p => {
        const fallbackElement = p.svgIcon ? SVG_ICONS[p.svgIcon] : `<i class="fa-solid ${p.icon} text-3xl"></i>`;

        return `
        <div class="bg-white rounded-3xl p-3 border border-purple-100 shadow-sm flex flex-col justify-between overflow-hidden">
            <div class="w-full aspect-square bg-purple-50 rounded-2xl flex items-center justify-center text-[#7414DC] mb-3 relative overflow-hidden group">
                <img src="${p.image}" alt="${p.name}"
                     class="w-full h-full object-cover rounded-2xl"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="w-full h-full flex items-center justify-center" style="display: none;">
                    ${fallbackElement}
                </div>
                ${p.isCustom ? `<span class="absolute top-2 left-2 px-2 py-0.5 bg-[#F4A81E] text-gray-900 font-black text-[9px] rounded-full uppercase tracking-wider shadow-sm z-10">Custom</span>` : ''}
            </div>

            <div class="flex items-end justify-between gap-1">
                <div class="min-w-0 flex-1">
                    <h4 class="font-extrabold text-gray-900 text-xs leading-tight truncate mb-0.5">${p.name}</h4>
                    <p class="text-xs font-black text-[#7414DC]">$${p.price.toFixed(2)}</p>
                </div>

                ${p.isCustom ? `
                    <button data-action="open-woggle-modal" data-style="${p.styleId}" aria-label="Customize ${p.name}" class="w-9 h-9 bg-[#F4A81E] text-gray-900 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all">
                        <i class="fa-solid fa-sliders"></i>
                    </button>
                ` : `
                    <button data-action="add-standard" data-id="${p.id}" aria-label="Add ${p.name}" class="w-9 h-9 bg-[#7414DC] hover:bg-purple-800 text-white rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                `}
            </div>
        </div>
    `}).join('');
}

function renderAllGrids() {
    renderGrid('woggle-products-grid', WOGGLE_PRODUCTS);
    renderGrid('shop-products-grid', SHOP_PRODUCTS);
    renderGrid('pin-products-grid', PIN_PRODUCTS);
    renderGrid('badge-products-grid', BADGE_PRODUCTS);
}

// Tab Switching
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

// Language Switcher Slider UI
export function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'kh' : 'en';
    updateLangUI(true);
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

// ---------- Woggle customizer (one standalone customizer per style) ----------

// Square preview: tries a per-color image first, then the style image, then a tinted icon.
function updateWoggleImage() {
    const img = document.getElementById('woggle-modal-image');
    const fallback = document.getElementById('woggle-modal-fallback');
    if (!img || !fallback) return;

    const colorSrc = `assets/images/woggles/${activeStyle.id}-${colorSlug(selectedColor)}.jpg`;
    const sources = [colorSrc, activeStyle.image];
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
    const colorContainer = document.getElementById('woggle-color-selector');
    if (colorContainer) {
        colorContainer.innerHTML = activeStyle.colors.map(c => {
            const active = selectedColor === c;
            return `
            <button data-action="select-color" data-value="${c}"
                class="py-2 px-2 text-[11px] font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-700 border-gray-200'}">
                <span class="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style="background:${COLOR_HEX[c] || '#ccc'}"></span>
                <span class="leading-tight">${c}</span>
            </button>`;
        }).join('');
    }

    const colorLabel = document.getElementById('woggle-modal-color-name');
    if (colorLabel) colorLabel.innerText = selectedColor;
}

function openWoggleModal(styleId) {
    const style = WOGGLE_STYLES.find(s => s.id === styleId);
    if (!style) return;

    activeStyle = style;
    selectedColor = style.colors[0];

    const title = document.getElementById('woggle-modal-title');
    if (title) title.innerText = `${style.name} Woggle`;

    const priceEl = document.getElementById('woggle-modal-price');
    if (priceEl) priceEl.innerText = `$${style.price.toFixed(2)}`;

    renderWoggleColors();
    updateWoggleImage();

    const modal = document.getElementById('woggle-customizer-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const sheet = document.getElementById('woggle-modal-sheet');
        if (sheet) sheet.scrollTop = 0;
    }
}

export function updateCartStateUI() {
    const cart = getCart();
    const standardTotalCount = Object.values(cart.standardItems).reduce((a, b) => a + b, 0);
    const totalCount = standardTotalCount + cart.customWoggles.length;

    const badge = document.getElementById('header-cart-badge');
    if (badge) badge.innerText = totalCount;

    const itemsContainer = document.getElementById('cart-items-container');
    let itemsHTML = '';
    let totalCost = 0;

    const allProducts = [...WOGGLE_PRODUCTS, ...SHOP_PRODUCTS, ...PIN_PRODUCTS, ...BADGE_PRODUCTS];

    // Standard items list
    for (let [id, qty] of Object.entries(cart.standardItems)) {
        const prod = allProducts.find(p => p.id === id);
        if (prod && qty > 0) {
            const subtotal = prod.price * qty;
            totalCost += subtotal;
            itemsHTML += `
                <div class="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                        <h5 class="font-bold text-gray-900">${prod.name}</h5>
                        <p class="text-gray-500">${qty}x @ $${prod.price.toFixed(2)} = <strong class="text-[#7414DC]">$${subtotal.toFixed(2)}</strong></p>
                    </div>
                    <div class="flex items-center gap-1">
                        <button data-action="change-qty" data-id="${id}" data-change="-1" class="w-7 h-7 bg-white text-gray-700 border rounded-lg font-bold">-</button>
                        <button data-action="change-qty" data-id="${id}" data-change="1" class="w-7 h-7 bg-[#7414DC] text-white rounded-lg font-bold">+</button>
                    </div>
                </div>
            `;
        }
    }

    // Custom Woggles List
    cart.customWoggles.forEach((w, idx) => {
        totalCost += w.price;
        itemsHTML += `
            <div class="bg-purple-50/70 border border-purple-100 p-3 rounded-2xl flex items-center justify-between text-xs">
                <div>
                    <h5 class="font-extrabold text-purple-950">${escapeHTML(w.style)} Woggle (<span class="text-rose-600">${escapeHTML(w.color)}</span>)</h5>
                    <p class="text-[11px] text-gray-600">Name: <strong class="text-gray-900">${escapeHTML(w.name)}</strong> • $${w.price.toFixed(2)}</p>
                </div>
                <button data-action="remove-custom" data-index="${idx}" aria-label="Remove" class="w-7 h-7 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors flex items-center justify-center">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    });

    if (itemsContainer) {
        itemsContainer.innerHTML = itemsHTML || `<p class="text-xs text-gray-400 italic text-center py-4">No items in your cart yet.</p>`;
    }

    const totalPriceEl = document.getElementById('cart-total-price');
    if (totalPriceEl) totalPriceEl.innerText = `$${totalCost.toFixed(2)}`;

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

// Global Event Listeners Setup
window.addEventListener('DOMContentLoaded', () => {
    loadCartFromStorage();
    renderAllGrids();
    updateCartStateUI();
    updateLangUI(false);

    // Event delegation for clicks
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');

        if (action === 'open-woggle-modal') {
            openWoggleModal(target.getAttribute('data-style'));
        } else if (action === 'add-standard') {
            const id = target.getAttribute('data-id');
            changeStandardQty(id, 1);
            updateCartStateUI();
            showToast("Item added to cart!");
        } else if (action === 'select-color') {
            selectedColor = target.getAttribute('data-value');
            renderWoggleColors();
            updateWoggleImage();
        } else if (action === 'change-qty') {
            const id = target.getAttribute('data-id');
            const change = parseInt(target.getAttribute('data-change'));
            changeStandardQty(id, change);
            updateCartStateUI();
        } else if (action === 'remove-custom') {
            const idx = parseInt(target.getAttribute('data-index'));
            removeCustomWoggle(idx);
            updateCartStateUI();
            showToast("Item removed");
        }
    });

    // Close customizer when tapping the dark backdrop
    const woggleModal = document.getElementById('woggle-customizer-modal');
    if (woggleModal) {
        woggleModal.addEventListener('click', (e) => {
            if (e.target === woggleModal) woggleModal.classList.add('hidden');
        });
    }

    // Handle Custom Woggle Submission
    const addWoggleBtn = document.getElementById('btn-add-custom-woggle');
    if (addWoggleBtn) {
        addWoggleBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('woggle-custom-name');
            const customName = nameInput.value.trim() || "Standard";
            addCustomWoggle(activeStyle.name, selectedColor, customName, activeStyle.price);
            nameInput.value = '';
            document.getElementById('woggle-customizer-modal')?.classList.add('hidden');
            updateCartStateUI();
            showToast(`${activeStyle.name} Woggle added!`);
        });
    }

    // Modal Copy Receipt Listener
    const copyBtn = document.getElementById('copy-receipt-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const text = generateFormattedReceipt();
            if (text === "Cart is empty.") {
                showToast("Cart is empty!");
                return;
            }
            navigator.clipboard.writeText(text).then(() => {
                showToast("Receipt copied!");
            }).catch(() => showToast("Copy failed"));
        });
    }

    // Modal Clear Cart Listener
    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearCartState();
            updateCartStateUI();
            showToast("Cart cleared");
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

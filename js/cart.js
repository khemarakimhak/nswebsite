// js/cart.js - Cart state management & LocalStorage persistence

import { WOGGLE_PRODUCTS, SHOP_PRODUCTS, PIN_PRODUCTS, BADGE_PRODUCTS } from './products.js';
import { formatPrice } from './currency.js';
import { t, productName, styleLabel, colorLabel } from './i18n.js';

let cart = { standardItems: {}, customWoggles: [] };

export function loadCartFromStorage() {
    try {
        const stored = localStorage.getItem('nimet_scout_cart');
        if (stored) {
            const parsed = JSON.parse(stored);
            cart = {
                standardItems: parsed.standardItems || {},
                customWoggles: (parsed.customWoggles || []).map(w => ({ ...w, qty: w.qty || 1 }))
            };
        }
    } catch (e) {
        console.error("Storage load error:", e);
    }
}

export function saveCartToStorage() {
    try {
        localStorage.setItem('nimet_scout_cart', JSON.stringify(cart));
    } catch (e) {
        console.error("Storage save error:", e);
    }
}

export function getCart() {
    return cart;
}

// kind: 'custom' (has a name) or 'normal' (color only). Prices are in USD (per piece).
// Identical woggles (same kind, style, color and name) are merged into one line with a quantity.
export function addCustomWoggle(style, color, name, price, kind = 'custom', qty = 1) {
    const cleanName = name || '';
    const existing = cart.customWoggles.find(w =>
        (w.kind || 'custom') === kind && w.style === style && w.color === color && (w.name || '') === cleanName);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.customWoggles.push({ kind, style, color, name: cleanName, price, qty });
    }
    saveCartToStorage();
}

// +1 / -1 on a woggle line in the cart (going below 1 removes it)
export function changeWoggleQty(index, change) {
    const w = cart.customWoggles[index];
    if (!w) return;
    w.qty += change;
    if (w.qty <= 0) cart.customWoggles.splice(index, 1);
    saveCartToStorage();
}

export function removeCustomWoggle(index) {
    cart.customWoggles.splice(index, 1);
    saveCartToStorage();
}

export function changeStandardQty(id, change) {
    const current = cart.standardItems[id] || 0;
    const updated = current + change;
    if (updated <= 0) {
        delete cart.standardItems[id];
    } else {
        cart.standardItems[id] = updated;
    }
    saveCartToStorage();
}

export function clearCartState() {
    cart = { standardItems: {}, customWoggles: [] };
    saveCartToStorage();
}

// Cart/receipt label, in the current language (the cart itself stores English names)
export function woggleLabel(w) {
    const vars = { style: styleLabel(w.style), color: colorLabel(w.color) };
    return t(w.kind === 'normal' ? 'woggle_normal_cart_label' : 'woggle_cart_label', vars);
}

export function isCartEmpty() {
    return getValidStandardEntries().length === 0 && cart.customWoggles.length === 0;
}

const allProducts = () => [...WOGGLE_PRODUCTS, ...SHOP_PRODUCTS, ...PIN_PRODUCTS, ...BADGE_PRODUCTS];

// Standard items still in the catalog (items you removed from catalog.js are ignored)
export function getValidStandardEntries() {
    const products = allProducts();
    return Object.entries(cart.standardItems)
        .map(([id, qty]) => ({ prod: products.find(p => p.id === id), qty }))
        .filter(e => e.prod && e.qty > 0);
}

// Color-Sorted Receipt Generator (Color -> Style -> Name). Uses the current display currency.
export function generateFormattedReceipt() {
    const standard = getValidStandardEntries();
    const hasWoggles = cart.customWoggles.length > 0;

    if (standard.length === 0 && !hasWoggles) {
        return t('receipt_empty');
    }

    let total = 0.0;
    let lines = [t('receipt_title') + "\n"];

    standard.forEach(({ prod, qty }) => {
        const subtotal = prod.price * qty;
        total += subtotal;
        lines.push(`• ${productName(prod)}: ${qty}x @ ${formatPrice(prod.price)} = ${formatPrice(subtotal)}`);
    });

    if (hasWoggles) {
        const sorted = [...cart.customWoggles].sort((a, b) => {
            if (a.color !== b.color) return a.color.localeCompare(b.color);
            if (a.style !== b.style) return a.style.localeCompare(b.style);
            if ((a.kind || 'custom') !== (b.kind || 'custom')) return (a.kind || 'custom').localeCompare(b.kind || 'custom');
            return (a.name || '').localeCompare(b.name || '');
        });

        sorted.forEach(w => {
            const subtotal = w.price * w.qty;
            total += subtotal;
            const nameText = w.kind === 'normal' ? '' : ` ${t('receipt_name', { name: w.name })}`;
            lines.push(`• ${woggleLabel(w)}${nameText}: ${w.qty}x @ ${formatPrice(w.price)} = ${formatPrice(subtotal)}`);
        });
    }

    lines.push("\n" + t('receipt_total', { total: formatPrice(total) }));
    lines.push(t('receipt_thanks'));
    return lines.join("\n");
}

// js/cart.js - Cart state management & LocalStorage persistence

import { WOGGLE_PRODUCTS, SHOP_PRODUCTS, PIN_PRODUCTS, BADGE_PRODUCTS } from './products.js';
import { formatPrice } from './currency.js';
import { t, productName, styleLabel, optionLabel } from './i18n.js';
import { DELIVERY } from '../data/catalog.js';

let cart = { standardItems: {}, customWoggles: [] };

// Receiver details typed in the cart (kept on the phone so customers don't retype them)
const RECEIVER_KEY = 'nimet_scout_receiver';
export const DELIVERY_METHODS = ['vet', 'jt', 'delivery', 'pickup'];
// delivery = chosen method; deliverySub = the chosen price when a method offers several (Delivery)
let receiver = { name: '', phone: '', address: '', delivery: '', deliverySub: '' };

export function getReceiver() {
    return receiver;
}

function saveReceiver() {
    try {
        localStorage.setItem(RECEIVER_KEY, JSON.stringify(receiver));
    } catch (e) {
        console.error("Storage save error:", e);
    }
}

export function setReceiverField(field, value) {
    if (!(field in receiver)) return;
    receiver[field] = value;
    saveReceiver();
}

export function deliveryLabel(code) {
    return DELIVERY_METHODS.includes(code) ? t(`delivery_${code}`) : '';
}

// Choose a delivery method. Choosing the same one again clears it.
export function setDeliveryMethod(code) {
    const next = receiver.delivery === code ? '' : code;
    setReceiverField('delivery', next);
    setReceiverField('deliverySub', '');
}

export function setDeliveryFee(amount) {
    const current = Number(receiver.deliverySub);
    setReceiverField('deliverySub', current === amount ? '' : amount);
}

// Delivery fee in USD for a receiver (0 if nothing chosen or the price still has to be picked)
export function deliveryFeeFor(rec) {
    const config = DELIVERY[rec.delivery];
    if (!config) return 0;
    if (Array.isArray(config.fees)) {
        const picked = Number(rec.deliverySub);
        return config.fees.includes(picked) ? picked : 0;
    }
    return config.fee || 0;
}

export function getDeliveryFee() {
    return deliveryFeeFor(receiver);
}

// True when the method needs a price choice that has not been made yet
export function needsDeliveryFeeChoice() {
    const config = DELIVERY[receiver.delivery];
    return !!(config && Array.isArray(config.fees) && getDeliveryFee() === 0);
}

// The delivery fee as one extra row for the cart / receipt / PDF (null when free or nothing chosen)
export function getDeliveryRow() {
    if (isCartEmpty()) return null;
    const amount = getDeliveryFee();
    if (amount <= 0) return null;
    return { label: `${t('delivery_fee_label')} (${deliveryLabel(receiver.delivery)})`, amount };
}

// "customWoggles" holds every item that was added from a choice menu:
// woggles (style + color + name), Round/Square Lis woggles, Rank Badge...
// Its field  color  holds the chosen option (a color, "White-Red", "Star Class"...).

export function loadCartFromStorage() {
    try {
        const savedReceiver = localStorage.getItem(RECEIVER_KEY);
        if (savedReceiver) receiver = { ...receiver, ...JSON.parse(savedReceiver) };
    } catch (e) {
        console.error("Storage load error:", e);
    }
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

// item = { productId, title, style, option, name, price, kind, qty }   (prices in USD, per piece)
// Identical items are merged into one line with a quantity.
export function addVariantItem(item) {
    const entry = {
        productId: item.productId || '',
        title: item.title || '',
        kind: item.kind || 'custom',
        style: item.style || '',
        color: item.option,
        name: item.name || '',
        price: item.price,
        qty: item.qty || 1
    };
    const existing = cart.customWoggles.find(w =>
        (w.productId || '') === entry.productId &&
        (w.kind || 'custom') === entry.kind &&
        (w.style || '') === entry.style &&
        w.color === entry.color &&
        (w.name || '') === entry.name);
    if (existing) {
        existing.qty += entry.qty;
    } else {
        cart.customWoggles.push(entry);
    }
    saveCartToStorage();
}

// +1 / -1 on a line in the cart (going below 1 removes it)
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

// A copy of the whole order (cart + receiver details) for the saved-orders list
export function getSnapshot() {
    return JSON.parse(JSON.stringify({ cart, receiver }));
}

// Replace the current cart and receiver details with a saved order
export function restoreSnapshot(snapshot) {
    const saved = JSON.parse(JSON.stringify(snapshot));
    cart = {
        standardItems: saved.cart.standardItems || {},
        customWoggles: (saved.cart.customWoggles || []).map(w => ({ ...w, qty: w.qty || 1 }))
    };
    receiver = { name: '', phone: '', address: '', delivery: '', deliverySub: '', ...saved.receiver };
    saveCartToStorage();
    saveReceiver();
}

export function clearCartState() {
    cart = { standardItems: {}, customWoggles: [] };
    saveCartToStorage();
}

const allProducts = () => [...WOGGLE_PRODUCTS, ...SHOP_PRODUCTS, ...PIN_PRODUCTS, ...BADGE_PRODUCTS];

// Cart/receipt label in the current language (the cart itself stores English names)
export function woggleLabel(w) {
    if (w.style) {
        const vars = { style: styleLabel(w.style), color: optionLabel(w.color) };
        return t(w.kind === 'normal' ? 'woggle_normal_cart_label' : 'woggle_cart_label', vars);
    }
    const prod = allProducts().find(p => p.id === w.productId);
    const title = prod ? productName(prod) : (w.title || '');
    return `${title} (${optionLabel(w.color)})`;
}

// Standard items still in the catalog (items you removed from catalog.js are ignored)
export function getValidStandardEntries() {
    const products = allProducts();
    return Object.entries(cart.standardItems)
        .map(([id, qty]) => ({ prod: products.find(p => p.id === id), qty }))
        .filter(e => e.prod && e.qty > 0);
}

export function isCartEmpty() {
    return getValidStandardEntries().length === 0 && cart.customWoggles.length === 0;
}

// The cart as printable rows, in receipt order (standard items first, then choice-menu items
// sorted by option/color -> style -> name). Labels are in the current language.
export function getReceiptItems() {
    const rows = getValidStandardEntries().map(({ prod, qty }) => ({
        label: productName(prod), qty, unit: prod.price, subtotal: prod.price * qty
    }));

    const sorted = [...cart.customWoggles].sort((a, b) => {
        if (a.color !== b.color) return a.color.localeCompare(b.color);
        if ((a.style || '') !== (b.style || '')) return (a.style || '').localeCompare(b.style || '');
        if ((a.productId || '') !== (b.productId || '')) return (a.productId || '').localeCompare(b.productId || '');
        return (a.name || '').localeCompare(b.name || '');
    });

    sorted.forEach(w => {
        const nameText = (w.kind === 'normal' || !w.name) ? '' : ` ${t('receipt_name', { name: w.name })}`;
        rows.push({ label: `${woggleLabel(w)}${nameText}`, qty: w.qty, unit: w.price, subtotal: w.price * w.qty });
    });
    return rows;
}

export function getItemsTotal() {
    return getReceiptItems().reduce((sum, r) => sum + r.subtotal, 0);
}

// Items + delivery fee
export function getCartTotal() {
    const row = getDeliveryRow();
    return getItemsTotal() + (row ? row.amount : 0);
}

// Text receipt (shown in the cart and copied). Uses the current language and currency.
export function generateFormattedReceipt() {
    if (isCartEmpty()) {
        return t('receipt_empty');
    }

    const dash = v => (v && String(v).trim()) ? String(v).trim() : '-';
    const lines = [t('receipt_title') + "\n"];

    lines.push(`${t('receipt_receiver')}: ${dash(receiver.name)}`);
    lines.push(`${t('receipt_phone')}: ${dash(receiver.phone)}`);
    lines.push(`${t('receipt_address')}: ${dash(receiver.address)}`);
    lines.push(`${t('receipt_delivery')}: ${dash(deliveryLabel(receiver.delivery))}`);
    lines.push("");

    getReceiptItems().forEach(r => {
        lines.push(`• ${r.label}: ${r.qty}x @ ${formatPrice(r.unit)} = ${formatPrice(r.subtotal)}`);
    });

    const feeRow = getDeliveryRow();
    if (feeRow) lines.push(`• ${feeRow.label}: ${formatPrice(feeRow.amount)}`);

    lines.push("\n" + t('receipt_total', { total: formatPrice(getCartTotal()) }));
    lines.push(t('receipt_thanks'));
    return lines.join("\n");
}

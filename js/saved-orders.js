// js/saved-orders.js - Save customers and their carts on this device (localStorage)
//
// One saved order per receiver name. Saving again with the same name updates it.
// Everything stays in this browser only; nothing is sent anywhere.

import { WOGGLE_PRODUCTS, SHOP_PRODUCTS, PIN_PRODUCTS, BADGE_PRODUCTS } from './products.js';
import { getSnapshot, restoreSnapshot, getReceiver, isCartEmpty, deliveryFeeFor, receiverHasData } from './cart.js';

const SAVED_KEY = 'nimet_scout_saved_orders';
let saved = [];

function load() {
    try {
        const raw = localStorage.getItem(SAVED_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        saved = Array.isArray(parsed) ? parsed.filter(e => e && e.id && e.cart && e.receiver) : [];
    } catch (e) {
        console.error('Storage load error:', e);
        saved = [];
    }
}
load();

function persist() {
    try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch (e) {
        console.error('Storage save error:', e);
    }
}

export const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// Newest first
export function listSaved() {
    return [...saved].sort((a, b) => b.savedAt - a.savedAt);
}

// Save the current cart + receiver details under the receiver name.
// Returns { ok: false, reason: 'name' } when there is no name, else { ok: true, updated }
export function saveCurrentOrder() {
    const name = getReceiver().name.trim();
    if (!name) return { ok: false, reason: 'name' };

    const snapshot = getSnapshot();
    snapshot.receiver.name = name;

    const index = saved.findIndex(e => sameName(e.name, name));
    const entry = {
        id: index >= 0 ? saved[index].id : `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name,
        savedAt: Date.now(),
        ...snapshot
    };
    if (index >= 0) saved[index] = entry; else saved.push(entry);
    persist();
    return { ok: true, updated: index >= 0 };
}

export function loadSavedOrder(id) {
    const entry = saved.find(e => e.id === id);
    if (!entry) return null;
    restoreSnapshot({ cart: entry.cart, receiver: entry.receiver });
    return entry;
}

export function deleteSavedOrder(id) {
    saved = saved.filter(e => e.id !== id);
    persist();
}

// Order of keys must not matter when comparing
function stable(value) {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

// True when the cart has items that are not stored in any saved order (loading another order would lose them)
export function hasUnsavedItems() {
    if (isCartEmpty()) return false;
    const now = stable(getSnapshot());
    return !saved.some(e => stable({ cart: e.cart, receiver: e.receiver }) === now);
}

// True when there is a customer or cart on screen that is not stored in any saved order
// (used before clearing, so nothing is lost by accident)
export function hasUnsavedOrder() {
    if (isCartEmpty() && !receiverHasData(getReceiver())) return false;
    const now = stable(getSnapshot());
    return !saved.some(e => stable({ cart: e.cart, receiver: e.receiver }) === now);
}

// Item count and total (USD, with delivery fee) of a saved order, using today's catalog prices
export function summarizeSaved(entry) {
    const products = [...WOGGLE_PRODUCTS, ...SHOP_PRODUCTS, ...PIN_PRODUCTS, ...BADGE_PRODUCTS];
    let count = 0, total = 0;

    Object.entries(entry.cart.standardItems || {}).forEach(([id, qty]) => {
        const prod = products.find(p => p.id === id);
        if (prod && qty > 0) { count += qty; total += prod.price * qty; }
    });
    (entry.cart.customWoggles || []).forEach(w => {
        const qty = w.qty || 1;
        count += qty;
        total += w.price * qty;
    });
    if (count > 0) total += deliveryFeeFor(entry.receiver);
    return { count, total };
}

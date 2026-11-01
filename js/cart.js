// js/cart.js - Cart state management & LocalStorage persistence

import { WOGGLE_PRODUCTS, SHOP_PRODUCTS, PIN_PRODUCTS, BADGE_PRODUCTS } from './products.js';

let cart = { standardItems: {}, customWoggles: [] };

export function loadCartFromStorage() {
    try {
        const stored = localStorage.getItem('nimet_scout_cart');
        if (stored) {
            const parsed = JSON.parse(stored);
            cart = {
                standardItems: parsed.standardItems || {},
                customWoggles: parsed.customWoggles || []
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

// style = display name (e.g. "Scout", "Red Cross")
export function addCustomWoggle(style, color, name, price = 5.00) {
    cart.customWoggles.push({ style, color, name, price });
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

// Color-Sorted Receipt Generator (Color -> Style -> Name)
export function generateFormattedReceipt() {
    const hasStandard = Object.keys(cart.standardItems).length > 0;
    const hasWoggles = cart.customWoggles.length > 0;

    if (!hasStandard && !hasWoggles) {
        return "Cart is empty.";
    }

    let total = 0.0;
    let lines = ["📋 CUSTOMER ORDER SUMMARY (@nimet_giftshop)\n"];
    const allProducts = [...WOGGLE_PRODUCTS, ...SHOP_PRODUCTS, ...PIN_PRODUCTS, ...BADGE_PRODUCTS];

    // Standard Items
    for (let [id, qty] of Object.entries(cart.standardItems)) {
        const prod = allProducts.find(p => p.id === id);
        if (prod && qty > 0) {
            const subtotal = prod.price * qty;
            total += subtotal;
            lines.push(`• ${prod.name}: ${qty}x @ $${prod.price.toFixed(2)} = $${subtotal.toFixed(2)}`);
        }
    }

    // Custom Woggles Auto-Sorted by Color -> Style -> Name
    if (hasWoggles) {
        const sortedWoggles = [...cart.customWoggles].sort((a, b) => {
            if (a.color !== b.color) return a.color.localeCompare(b.color);
            if (a.style !== b.style) return a.style.localeCompare(b.style);
            return a.name.localeCompare(b.name);
        });

        sortedWoggles.forEach(w => {
            total += w.price;
            lines.push(`• ${w.style} Woggle (${w.color}) [Name: ${w.name}] = $${w.price.toFixed(2)}`);
        });
    }

    lines.push(`\n💵 Total Due: $${total.toFixed(2)}`);
    lines.push("Thank you for ordering with Nimet Scout Shop!");
    return lines.join("\n");
}

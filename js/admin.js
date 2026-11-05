// js/admin.js - Back-office admin dashboard logic
// Handles authentication, live order tracking, status updates, and the crafting job list.
// Supports a live Firebase backend and a demo/preview mode with sample orders.

import {
    firebaseConfigured,
    watchAdmin,
    signIn,
    signOutNow,
    sendReset,
    watchOrders,
    updateOrder,
    deleteOrder
} from './firebase.js';

import { formatPrice } from './currency.js';
import { getLang, setLang, t, applyStaticTranslations } from './i18n.js';
import { woggleLabel, receiverDisplayName, receiverDeliveryText, generateFormattedReceipt, withSnapshot } from './cart.js';
import { createReceiptPdf } from './pdf.js';
import { printOrderDirect } from './print.js';

const $ = id => document.getElementById(id);

// Status definitions & colors (Done moved before Ship as requested)
const STATUSES = [
    { key: 'all', labelEn: 'All', labelKh: 'ទាំងអស់', icon: '', badge: 'bg-gray-100 text-gray-700' },
    { key: 'new', labelEn: 'New', labelKh: 'ថ្មី', icon: '<i class="fa-solid fa-circle-plus text-emerald-500"></i>', badge: 'bg-emerald-50 text-emerald-800' },
    { key: 'making', labelEn: 'Making', labelKh: 'កំពុងធ្វើ', icon: '<i class="fa-solid fa-spinner fa-spin text-amber-500"></i>', badge: 'bg-amber-50 text-amber-800' },
    { key: 'done', labelEn: 'Done', labelKh: 'បានបញ្ចប់', icon: '<i class="fa-solid fa-circle-check text-emerald-500"></i>', badge: 'bg-emerald-50 text-emerald-800' },
    { key: 'ship', labelEn: 'Ship', labelKh: 'បានផ្ញើ', icon: '<i class="fa-solid fa-truck text-emerald-500"></i>', badge: 'bg-blue-50 text-blue-800' },
    { key: 'cancel', labelEn: 'Cancel', labelKh: 'បានបោះបង់', icon: '<i class="fa-solid fa-circle-xmark text-rose-500"></i>', badge: 'bg-rose-50 text-rose-800' }
];

export function normalizeStatus(st) {
    if (!st) return 'new';
    const s = String(st).toLowerCase();
    if (s === 'ready' || s === 'done') return 'done';
    if (s === 'shipped' || s === 'ship') return 'ship';
    if (s === 'cancelled' || s === 'cancel') return 'cancel';
    if (s === 'making') return 'making';
    return 'new';
}

// Sample orders for preview/demo mode
const SAMPLE_ORDERS = [
    {
        id: 'sample-ord-1',
        name: 'Sokha Meng',
        phone: '012 345 678',
        source: 'telegram',
        address: 'St 271, Phnom Penh',
        status: 'making',
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        receiver: {
            name: 'Sokha Meng',
            phone: '012 345 678',
            source: 'telegram',
            address: 'St 271, Phnom Penh',
            delivery: 'vet'
        },
        cart: {
            standardItems: { 'shop-coffee-mug': 1 },
            customWoggles: [
                { kind: 'custom', style: 'lis', color: 'Dark Blue', name: 'SOKHA', qty: 2, price: 3.0 },
                { kind: 'normal', style: 'romdoul', color: 'Red', qty: 1, price: 1.25 }
            ]
        },
        itemCount: 4,
        totalUsd: 10.75
    },
    {
        id: 'sample-ord-2',
        name: 'Bopha Chea',
        phone: '098 765 432',
        source: 'page',
        address: 'BKK1, Khan Boeung Keng Kang',
        status: 'making',
        createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
        receiver: {
            name: 'Bopha Chea',
            phone: '098 765 432',
            source: 'page',
            address: 'BKK1, Khan Boeung Keng Kang',
            delivery: 'delivery',
            deliverySub: 1.0
        },
        cart: {
            standardItems: {},
            customWoggles: [
                { kind: 'custom', style: 'angkor', color: 'White-Red', name: 'BOPHA', qty: 1, price: 3.0 },
                { kind: 'custom', style: 'lis', color: 'Dark Blue', name: 'BOPHA', qty: 1, price: 3.0 }
            ]
        },
        itemCount: 2,
        totalUsd: 7.00
    },
    {
        id: 'sample-ord-3',
        name: 'Vireak Chan',
        phone: '010 888 999',
        source: 'tiktok',
        address: 'Siem Reap Town',
        status: 'new',
        createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        receiver: {
            name: 'Vireak Chan',
            phone: '010 888 999',
            source: 'tiktok',
            address: 'Siem Reap Town',
            delivery: 'jt'
        },
        cart: {
            standardItems: { 'pin-national': 2 },
            customWoggles: [
                { kind: 'normal', style: 'lis', color: 'Gold', qty: 2, price: 1.25 }
            ]
        },
        itemCount: 4,
        totalUsd: 7.125
    },
    {
        id: 'sample-ord-4',
        name: 'Kosal Rath',
        phone: '077 112 233',
        source: 'telegram',
        address: 'Pick up at store',
        status: 'done',
        createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
        receiver: {
            name: 'Kosal Rath',
            phone: '077 112 233',
            source: 'telegram',
            address: 'Pick up at store',
            delivery: 'pickup'
        },
        cart: {
            standardItems: {},
            customWoggles: [
                { kind: 'custom', style: 'red-cross', color: 'Red', name: 'KOSAL', qty: 1, price: 3.0 }
            ]
        },
        itemCount: 1,
        totalUsd: 3.00
    },
    {
        id: 'sample-ord-5',
        name: 'Chanthy Soun',
        phone: '085 443 221',
        source: 'page',
        address: 'Battambang City',
        status: 'ship',
        createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
        receiver: {
            name: 'Chanthy Soun',
            phone: '085 443 221',
            source: 'page',
            address: 'Battambang City',
            delivery: 'vet'
        },
        cart: {
            standardItems: {},
            customWoggles: [
                { kind: 'custom', style: 'lis', color: 'Dark Blue', name: 'CHANTHY', qty: 1, price: 3.0 }
            ]
        },
        itemCount: 1,
        totalUsd: 4.50
    }
];

// App State
let allOrders = [];
let currentFilter = 'all';
let searchQuery = '';
let currentTab = 'orders'; // 'orders' or 'jobs'
let isDemoMode = false;
let toastTimer = null;

// ---------- Toast Notification ----------
function showToast(message) {
    const toast = $('toast');
    const toastText = $('toast-text');
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
        toast.classList.remove('opacity-100');
    }, 2500);
}

// ---------- Screen Management ----------
function showScreen(screenId) {
    const screens = ['screen-setup', 'screen-loading', 'screen-login', 'screen-denied', 'screen-app'];
    screens.forEach(id => {
        const el = $(id);
        if (el) el.classList.toggle('hidden', id !== screenId);
    });

    const headerTools = $('header-tools');
    if (headerTools) {
        headerTools.classList.toggle('hidden', screenId !== 'screen-app');
        headerTools.classList.toggle('flex', screenId === 'screen-app');
    }
}

// ---------- Helpers & Formatting ----------
function escapeHTML(str) {
    return String(str || '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function getStatusInfo(statusKey) {
    const norm = normalizeStatus(statusKey);
    return STATUSES.find(s => s.key === norm) || STATUSES[1]; // default 'new'
}

function formatDate(isoString) {
    if (!isoString) return '';
    try {
        const date = typeof isoString === 'string' ? new Date(isoString) : (isoString.toDate ? isoString.toDate() : new Date());
        return date.toLocaleDateString(getLang() === 'kh' ? 'km-KH' : 'en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '';
    }
}

function renderSourceIcon(source) {
    if (source === 'telegram') return '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-[#0088CC]"><i class="fa-brands fa-telegram"></i> Telegram</span>';
    if (source === 'tiktok') return '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-gray-900"><i class="fa-brands fa-tiktok"></i> TikTok</span>';
    if (source === 'page') return '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-[#0866FF]"><i class="fa-brands fa-facebook"></i> Page</span>';
    return '';
}

// ---------- Orders Rendering ----------
function renderStatusFilters() {
    const container = $('status-filters');
    if (!container) return;

    // Count per status
    const counts = { all: allOrders.length };
    STATUSES.forEach(s => {
        if (s.key !== 'all') {
            counts[s.key] = allOrders.filter(o => normalizeStatus(o.status) === s.key).length;
        }
    });

    container.innerHTML = STATUSES.map(s => {
        const count = counts[s.key] || 0;
        const isActive = currentFilter === s.key;
        const label = getLang() === 'kh' ? s.labelKh : s.labelEn;
        const activeClass = isActive
            ? 'bg-[#7414DC] text-white shadow-sm'
            : 'bg-white text-gray-600 border border-purple-100 hover:bg-purple-50';

        return `
            <button type="button" data-filter="${s.key}" class="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 ${activeClass}" style="min-height:0">
                ${s.icon ? `<span class="text-xs leading-none inline-flex items-center">${s.icon}</span>` : ''}
                <span>${label}</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'} font-black">${count}</span>
            </button>
        `;
    }).join('');

    container.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            renderOrders();
            renderStatusFilters();
        });
    });
}

function filterOrders() {
    let list = allOrders;
    if (currentFilter !== 'all') {
        list = list.filter(o => normalizeStatus(o.status) === currentFilter);
    }
    if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        list = list.filter(o => {
            const name = (o.name || (o.receiver && o.receiver.name) || '').toLowerCase();
            const phone = (o.phone || (o.receiver && o.receiver.phone) || '').toLowerCase();
            const addr = (o.address || (o.receiver && o.receiver.address) || '').toLowerCase();
            return name.includes(q) || phone.includes(q) || addr.includes(q);
        });
    }
    return list;
}

function formatItemsSummary(order) {
    const cart = order.cart || {};
    const lines = [];

    // Custom woggles / choice items
    const customList = cart.customWoggles || [];
    customList.forEach(w => {
        const namePart = w.name ? ` "${w.name}"` : '';
        const style = (w.style || '').toUpperCase();
        const color = w.color || '';
        lines.push(`<b>${w.qty}x</b> Woggle ${style} (${color}${namePart})`);
    });

    // Standard items
    const standard = cart.standardItems || {};
    Object.entries(standard).forEach(([id, qty]) => {
        const cleanName = id.replace(/^(shop|pin|badge)-/, '').replace(/-/g, ' ');
        lines.push(`<b>${qty}x</b> ${cleanName}`);
    });

    return lines.length ? lines.join('<br>') : '<span class="text-gray-400 italic">No items</span>';
}

function renderOrders() {
    const container = $('orders-list');
    const countBadge = $('orders-count');
    if (!container) return;

    const list = filterOrders();
    if (countBadge) countBadge.textContent = allOrders.length ? `(${allOrders.length})` : '';

    if (list.length === 0) {
        container.innerHTML = `
            <div class="bg-white rounded-3xl border border-purple-100 p-8 text-center text-gray-400 text-sm space-y-2">
                <i class="fa-solid fa-box-open text-3xl text-purple-200"></i>
                <p>No orders found.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(order => {
        const receiver = order.receiver || {};
        const displayName = escapeHTML(receiverDisplayName(receiver) || order.name || 'Unnamed');
        const phone = escapeHTML(receiver.phone || order.phone || '-');
        const address = escapeHTML(receiver.address || order.address || '-');
        const deliveryText = escapeHTML(receiverDeliveryText(receiver) || 'Pick up');
        const status = getStatusInfo(order.status || 'new');
        const statusLabel = getLang() === 'kh' ? status.labelKh : status.labelEn;
        const total = formatPrice(order.totalUsd || 0);
        const dateStr = formatDate(order.createdAt);
        const itemsHtml = formatItemsSummary(order);
        const sourceHtml = renderSourceIcon(receiver.source || order.source);

        return `
            <div class="bg-white rounded-2xl border border-purple-100 p-4 shadow-sm space-y-3" data-order-id="${order.id}">
                <!-- Top: Name, Source, Date & Status -->
                <div class="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <div class="flex items-center gap-1.5">
                                <span class="text-base shrink-0 leading-none inline-flex items-center" title="${statusLabel}">${status.icon}</span>
                                <h3 class="font-black text-base text-gray-900 leading-tight">${displayName}</h3>
                            </div>
                            ${sourceHtml}
                        </div>
                        <p class="text-[11px] text-gray-400 font-medium">${dateStr}</p>
                    </div>
                    <!-- Status selector dropdown -->
                    <div class="shrink-0">
                        <select data-action="change-status" data-id="${order.id}" class="text-xs font-bold px-2 py-1 rounded-xl border border-gray-200 bg-gray-50 focus:ring-1 focus:ring-[#7414DC]" style="min-height:0">
                            ${STATUSES.filter(s => s.key !== 'all').map(s => `
                                <option value="${s.key}" ${s.key === normalizeStatus(order.status) ? 'selected' : ''}>
                                    ${getLang() === 'kh' ? s.labelKh : s.labelEn}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <!-- Middle: Contact & Delivery -->
                <div class="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-purple-50/40 p-2.5 rounded-xl">
                    <div>
                        <span class="text-[10px] uppercase font-bold text-gray-400 block">Phone</span>
                        ${phone !== '-' ? `<a href="tel:${phone}" class="font-bold text-[#7414DC]"><i class="fa-solid fa-phone text-[10px]"></i> ${phone}</a>` : '-'}
                    </div>
                    <div>
                        <span class="text-[10px] uppercase font-bold text-gray-400 block">Delivery</span>
                        <span class="font-bold text-gray-800">${deliveryText}</span>
                    </div>
                    <div class="col-span-2">
                        <span class="text-[10px] uppercase font-bold text-gray-400 block">Address</span>
                        <span class="text-gray-700">${address}</span>
                    </div>
                </div>

                <!-- Items Breakdown -->
                <div class="text-xs text-gray-700 leading-relaxed bg-gray-50/80 p-2.5 rounded-xl">
                    <span class="text-[10px] uppercase font-bold text-gray-400 block mb-1">Ordered Items (${order.itemCount || 0})</span>
                    ${itemsHtml}
                </div>

                <!-- Bottom: Total & Actions -->
                <div class="flex items-center justify-between pt-1 border-t border-gray-100 flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                        <div>
                            <span class="text-[10px] text-gray-400 uppercase font-bold block">Total</span>
                            <span class="text-base font-black text-gray-900">${total}</span>
                        </div>
                        <!-- Order action buttons: Copy, Print, Export PDF near Total -->
                        <div class="flex items-center gap-1 pl-2 border-l border-gray-200">
                            <button type="button" data-action="copy-order" data-id="${order.id}" class="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold" style="min-height:0" title="Copy text receipt">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                            <button type="button" data-action="print-order" data-id="${order.id}" class="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold" style="min-height:0" title="Print to thermal printer">
                                <i class="fa-solid fa-print"></i>
                            </button>
                            <button type="button" data-action="pdf-order" data-id="${order.id}" class="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold" style="min-height:0" title="Export PDF">
                                <i class="fa-solid fa-file-pdf"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <a href="index.html?edit=${order.id}" class="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-[#7414DC] text-xs font-bold flex items-center gap-1" style="min-height:0" title="Add new products or edit this order in shop cart">
                            <i class="fa-solid fa-pen-to-square text-[11px]"></i> Edit / Add items
                        </a>
                        <button type="button" data-action="delete-order" data-id="${order.id}" data-name="${displayName}" class="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 text-xs transition-colors" style="min-height:0" title="Delete order">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Wire action listeners
    container.querySelectorAll('[data-action="change-status"]').forEach(select => {
        select.addEventListener('change', async e => {
            const orderId = e.target.dataset.id;
            const newStatus = e.target.value;
            await handleStatusUpdate(orderId, newStatus);
        });
    });

    container.querySelectorAll('[data-action="copy-order"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const order = allOrders.find(o => o.id === btn.dataset.id);
            if (!order) return;
            const snapshot = { cart: order.cart, receiver: order.receiver };
            const text = withSnapshot(snapshot, generateFormattedReceipt);
            try {
                await navigator.clipboard.writeText(text);
                showToast('Receipt copied to clipboard');
            } catch (_) {
                showToast('Failed to copy');
            }
        });
    });

    container.querySelectorAll('[data-action="print-order"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const order = allOrders.find(o => o.id === btn.dataset.id);
            if (!order) return;
            const snapshot = { cart: order.cart, receiver: order.receiver };
            try {
                await printOrderDirect(snapshot);
            } catch (err) {
                console.error('Print failed:', err);
                showToast(`Print error: ${err.message || 'unknown'}`);
            }
        });
    });

    container.querySelectorAll('[data-action="pdf-order"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const order = allOrders.find(o => o.id === btn.dataset.id);
            if (!order) return;
            const snapshot = { cart: order.cart, receiver: order.receiver };
            try {
                const blob = await createReceiptPdf(snapshot);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `order-${(order.name || 'receipt').replace(/\s+/g, '_')}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
                showToast('PDF downloaded');
            } catch (err) {
                console.error('PDF export failed:', err);
                showToast('Failed to generate PDF');
            }
        });
    });

    container.querySelectorAll('[data-action="delete-order"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const orderId = btn.dataset.id;
            const name = btn.dataset.name;
            if (confirm(`Delete the order of ${name}?`)) {
                await handleDeleteOrder(orderId);
            }
        });
    });
}

// ---------- Job List Rendering (Orders marked 'Making') ----------
function renderJobList() {
    const container = $('jobs-list');
    const summary = $('jobs-summary');
    const ordersMeta = $('jobs-orders');
    const countBadge = $('jobs-count');
    if (!container) return;

    // Filter orders currently marked 'making'
    const makingOrders = allOrders.filter(o => normalizeStatus(o.status) === 'making');

    // Aggregate all custom woggles across making orders
    const aggregated = {};
    let totalWoggleCount = 0;

    makingOrders.forEach(order => {
        const cart = order.cart || {};
        const customWoggles = cart.customWoggles || [];
        customWoggles.forEach(w => {
            const key = `${w.style || 'plain'}|${w.color || ''}|${(w.name || '').trim().toUpperCase()}|${w.kind || 'custom'}`;
            if (!aggregated[key]) {
                aggregated[key] = {
                    style: w.style || 'Standard',
                    color: w.color || 'Default',
                    name: (w.name || '').trim().toUpperCase(),
                    kind: w.kind || 'custom',
                    qty: 0,
                    customers: []
                };
            }
            aggregated[key].qty += (w.qty || 1);
            totalWoggleCount += (w.qty || 1);
            const custName = (order.receiver && order.receiver.name) || order.name || 'Customer';
            aggregated[key].customers.push({ name: custName, qty: w.qty || 1 });
        });
    });

    if (countBadge) countBadge.textContent = totalWoggleCount;
    if (summary) summary.textContent = `${makingOrders.length} order(s) in production, ${totalWoggleCount} woggle(s) to craft`;
    if (ordersMeta) {
        ordersMeta.textContent = makingOrders.length
            ? `Orders: ${makingOrders.map(o => (o.receiver && o.receiver.name) || o.name).join(', ')}`
            : '';
    }

    const items = Object.values(aggregated);
    if (items.length === 0) {
        container.innerHTML = `
            <div class="bg-white rounded-3xl border border-purple-100 p-8 text-center text-gray-400 text-sm space-y-2">
                <i class="fa-solid fa-clipboard-check text-3xl text-emerald-300"></i>
                <p>No woggles to make right now.</p>
                <p class="text-xs text-gray-400">Mark an order as "Making" to see its woggles here.</p>
            </div>
        `;
        return;
    }

    // Sort by style then name
    items.sort((a, b) => a.style.localeCompare(b.style) || a.name.localeCompare(b.name));

    container.innerHTML = items.map(item => {
        const isNameWoggle = item.kind === 'custom' && item.name;
        const nameBadge = isNameWoggle
            ? `<span class="bg-[#F4A81E]/20 text-gray-900 font-mono font-black px-2 py-0.5 rounded-lg border border-[#F4A81E]/40 text-xs">NAME: ${escapeHTML(item.name)}</span>`
            : `<span class="text-xs text-gray-400 font-semibold italic">Plain (no name)</span>`;

        const customerPills = item.customers.map(c => `<span class="text-[11px] bg-gray-100 px-2 py-0.5 rounded-md">${escapeHTML(c.name)} (${c.qty})</span>`).join(' ');

        return `
            <div class="bg-white rounded-2xl border border-purple-100 p-3.5 shadow-sm flex items-center justify-between gap-3">
                <div class="space-y-1.5 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-black text-sm text-purple-900 uppercase tracking-wide">${escapeHTML(item.style)}</span>
                        <span class="text-xs font-bold text-gray-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">${escapeHTML(item.color)}</span>
                        ${nameBadge}
                    </div>
                    <div class="text-[11px] text-gray-500 flex items-center gap-1 flex-wrap">
                        <span class="text-gray-400">For:</span> ${customerPills}
                    </div>
                </div>
                <div class="shrink-0 text-center bg-[#7414DC]/10 border border-[#7414DC]/20 px-3 py-1.5 rounded-xl">
                    <span class="block text-[10px] text-[#7414DC] uppercase font-bold">Qty</span>
                    <span class="text-lg font-black text-[#7414DC] leading-none">${item.qty}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Copy the aggregated job list to clipboard
function copyJobList() {
    const makingOrders = allOrders.filter(o => normalizeStatus(o.status) === 'making');
    if (makingOrders.length === 0) {
        showToast('No jobs to copy');
        return;
    }

    const aggregated = {};
    makingOrders.forEach(order => {
        const cart = order.cart || {};
        (cart.customWoggles || []).forEach(w => {
            const key = `${w.style}|${w.color}|${(w.name || '').trim().toUpperCase()}`;
            if (!aggregated[key]) {
                aggregated[key] = {
                    style: w.style,
                    color: w.color,
                    name: (w.name || '').trim().toUpperCase(),
                    qty: 0,
                    customers: []
                };
            }
            aggregated[key].qty += (w.qty || 1);
            const cust = (order.receiver && order.receiver.name) || order.name || 'Customer';
            aggregated[key].customers.push(cust);
        });
    });

    const lines = [
        `📋 NIMET SCOUT SHOP - JOB LIST (${new Date().toLocaleDateString()})`,
        `Orders in progress: ${makingOrders.length}`,
        '---------------------------------------'
    ];

    Object.values(aggregated).forEach(item => {
        const nameStr = item.name ? ` [NAME: ${item.name}]` : ' [Plain]';
        lines.push(`• ${item.qty}x ${item.style.toUpperCase()} - ${item.color}${nameStr} (${item.customers.join(', ')})`);
    });

    lines.push('---------------------------------------');

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
        showToast('Job list copied to clipboard!');
    }).catch(() => {
        showToast('Could not copy to clipboard');
    });
}

// ---------- Order Operations ----------
async function handleStatusUpdate(orderId, newStatus) {
    if (isDemoMode) {
        const order = allOrders.find(o => o.id === orderId);
        if (order) order.status = newStatus;
        renderOrders();
        renderJobList();
        renderStatusFilters();
        showToast(`Status updated to ${newStatus}`);
        return;
    }

    try {
        await updateOrder(orderId, { status: newStatus });
        showToast(`Status updated to ${newStatus}`);
    } catch (err) {
        console.error('Failed to update status:', err);
        showToast('Failed to update status');
    }
}

async function handleDeleteOrder(orderId) {
    if (isDemoMode) {
        allOrders = allOrders.filter(o => o.id !== orderId);
        renderOrders();
        renderJobList();
        renderStatusFilters();
        showToast('Order deleted (Demo)');
        return;
    }

    try {
        await deleteOrder(orderId);
        showToast('Order deleted');
    } catch (err) {
        console.error('Failed to delete order:', err);
        showToast('Failed to delete order');
    }
}

// ---------- Tab Navigation ----------
function switchTab(tab) {
    currentTab = tab;
    const isOrders = tab === 'orders';
    $('tab-orders-btn')?.classList.toggle('bg-[#7414DC]', isOrders);
    $('tab-orders-btn')?.classList.toggle('text-white', isOrders);
    $('tab-orders-btn')?.classList.toggle('text-gray-700', !isOrders);

    $('tab-jobs-btn')?.classList.toggle('bg-[#7414DC]', !isOrders);
    $('tab-jobs-btn')?.classList.toggle('text-white', !isOrders);
    $('tab-jobs-btn')?.classList.toggle('text-gray-700', isOrders);

    $('panel-orders')?.classList.toggle('hidden', !isOrders);
    $('panel-jobs')?.classList.toggle('hidden', isOrders);

    if (isOrders) renderOrders();
    else renderJobList();
}

// ---------- Demo Mode Activation ----------
function startDemoMode() {
    isDemoMode = true;
    allOrders = JSON.parse(JSON.stringify(SAMPLE_ORDERS));
    showScreen('screen-app');
    switchTab('orders');
    renderStatusFilters();
    renderOrders();
    renderJobList();
    showToast('Loaded Demo Mode with sample orders');
}

// ---------- Language Toggle ----------
function toggleAdminLang() {
    const next = getLang() === 'kh' ? 'en' : 'kh';
    setLang(next);
    const btn = $('lang-toggle');
    if (btn) btn.textContent = next.toUpperCase();
    renderStatusFilters();
    renderOrders();
    renderJobList();
}

// ---------- Initialization ----------
async function init() {
    // Language toggle in header
    $('lang-toggle')?.addEventListener('click', toggleAdminLang);
    if ($('lang-toggle')) $('lang-toggle').textContent = getLang().toUpperCase();

    // Sign out button in header
    $('signout-btn')?.addEventListener('click', async () => {
        if (isDemoMode) {
            location.reload();
            return;
        }
        await signOutNow();
    });

    // Tab buttons
    $('tab-orders-btn')?.addEventListener('click', () => switchTab('orders'));
    $('tab-jobs-btn')?.addEventListener('click', () => switchTab('jobs'));

    // Search input
    $('order-search')?.addEventListener('input', e => {
        searchQuery = e.target.value;
        renderOrders();
    });

    // Copy job list button
    $('copy-jobs-btn')?.addEventListener('click', copyJobList);

    // Setup demo button in setup screen if it exists
    const setupSection = $('screen-setup');
    if (setupSection) {
        // Add a friendly demo button so the user can explore without configuring Firebase first
        const demoBtnHtml = `
            <div class="pt-3 border-t border-amber-100 flex items-center justify-between">
                <span class="text-xs text-amber-800 font-bold">Want to preview the admin page first?</span>
                <button id="btn-start-demo" type="button" class="px-3 py-1.5 rounded-xl bg-[#F4A81E] text-gray-900 font-black text-xs shadow-sm active:scale-95 transition-transform" style="min-height:0">
                    <i class="fa-solid fa-eye"></i> Preview Admin Page
                </button>
            </div>
        `;
        setupSection.insertAdjacentHTML('beforeend', demoBtnHtml);
        $('btn-start-demo')?.addEventListener('click', startDemoMode);
    }

    // Check URL parameters: ?demo=1 automatically opens demo mode
    const params = new URLSearchParams(location.search);
    if (params.get('demo') === '1') {
        startDemoMode();
        return;
    }

    // Check if Firebase credentials are provided
    if (!firebaseConfigured()) {
        showScreen('screen-setup');
        return;
    }

    // Firebase is configured: handle Authentication
    showScreen('screen-loading');

    // Sign in form handlers
    $('login-btn')?.addEventListener('click', async () => {
        const email = $('login-email')?.value.trim();
        const pass = $('login-password')?.value;
        const msg = $('login-message');
        if (msg) msg.classList.add('hidden');
        if (!email || !pass) {
            if (msg) { msg.textContent = 'Please enter both email and password'; msg.classList.remove('hidden'); }
            return;
        }
        try {
            $('login-btn').disabled = true;
            await signIn(email, pass);
        } catch (err) {
            if (msg) {
                msg.textContent = (err && err.message) || 'Login failed';
                msg.classList.remove('hidden');
            }
        } finally {
            if ($('login-btn')) $('login-btn').disabled = false;
        }
    });

    $('reset-btn')?.addEventListener('click', async () => {
        const email = $('login-email')?.value.trim();
        if (!email) {
            alert('Please enter your email above first');
            return;
        }
        try {
            await sendReset(email);
            alert(`Password reset email sent to ${email}`);
        } catch (err) {
            alert((err && err.message) || 'Could not send reset email');
        }
    });

    $('denied-signout-btn')?.addEventListener('click', () => signOutNow());
    $('copy-uid-btn')?.addEventListener('click', () => {
        const uid = $('denied-uid')?.textContent;
        if (uid) {
            navigator.clipboard.writeText(uid);
            showToast('UID copied');
        }
    });

    // Listen to Auth & Admin status
    try {
        await watchAdmin(async (user, isAdmin) => {
            if (!user) {
                showScreen('screen-login');
                return;
            }

            if (!isAdmin) {
                if ($('denied-email')) $('denied-email').textContent = user.email || user.uid;
                if ($('denied-uid')) $('denied-uid').textContent = user.uid;
                showScreen('screen-denied');
                return;
            }

            // User is signed in AND is an admin:
            showScreen('screen-app');
            switchTab('orders');

            // Listen for orders from Firestore in real-time
            watchOrders(
                orders => {
                    allOrders = orders;
                    renderStatusFilters();
                    if (currentTab === 'orders') renderOrders();
                    else renderJobList();
                },
                err => {
                    console.error('Error fetching orders:', err);
                    showToast('Failed to load live orders');
                }
            );
        });
    } catch (err) {
        console.error('Auth check error:', err);
        showScreen('screen-setup');
    }
}

// Start admin app
init();

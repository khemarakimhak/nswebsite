// js/account.js - Customer Account & Order Progress Tracking
// Allows customers to sign in/up and track the progress of their orders (New -> Making -> Done -> Ship).

import {
    firebaseConfigured,
    signIn,
    signUp,
    signOutNow,
    sendReset,
    watchCustomerOrders,
    createOrder
} from './firebase.js';

import { formatPrice } from './currency.js';
import { getLang, t } from './i18n.js';
import { receiverDisplayName, receiverDeliveryText } from './cart.js';
import { normalizeStatus } from './admin.js';

const $ = id => document.getElementById(id);

// Status indicator icons as requested:
// New: Green plus icon
// Making: Yellow loading spinner icon
// Done: Tick green icon
// Ship: Green truck icon
// Cancel: X red icon
export const STATUS_CONFIG = {
    new: {
        labelEn: 'New',
        labelKh: 'ថ្មី',
        icon: '<i class="fa-solid fa-circle-plus text-emerald-500"></i>',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        stepIndex: 0
    },
    making: {
        labelEn: 'Making',
        labelKh: 'កំពុងធ្វើ',
        icon: '<i class="fa-solid fa-spinner fa-spin text-amber-500"></i>',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        stepIndex: 1
    },
    done: {
        labelEn: 'Done',
        labelKh: 'បានបញ្ចប់',
        icon: '<i class="fa-solid fa-circle-check text-emerald-500"></i>',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        stepIndex: 2
    },
    ship: {
        labelEn: 'Ship',
        labelKh: 'បានផ្ញើ',
        icon: '<i class="fa-solid fa-truck text-emerald-500"></i>',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        stepIndex: 3
    },
    cancel: {
        labelEn: 'Cancelled',
        labelKh: 'បានបោះបង់',
        icon: '<i class="fa-solid fa-circle-xmark text-rose-500"></i>',
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        stepIndex: -1
    }
};

const ORDER_STEPS = ['new', 'making', 'done', 'ship'];

// Demo Customer sample orders
const DEMO_CUSTOMER_ORDERS = [
    {
        id: 'DEMO-ORD-101',
        createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        status: 'making',
        name: 'Sokha Meng',
        phone: '012 345 678',
        address: 'St 271, Sangkat Phsar Doeum Thkov, Phnom Penh',
        delivery: 'vet',
        receiver: {
            name: 'Sokha Meng',
            phone: '012 345 678',
            address: 'St 271, Phnom Penh',
            delivery: 'vet'
        },
        cart: {
            standardItems: { 'shop-coffee-mug': 1 },
            customWoggles: [
                { kind: 'custom', style: 'lis', color: 'Dark Blue', name: 'SOKHA', qty: 2, price: 3.0 }
            ]
        },
        itemCount: 3,
        totalUsd: 9.50
    },
    {
        id: 'DEMO-ORD-102',
        createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
        status: 'done',
        name: 'Sokha Meng',
        phone: '012 345 678',
        address: 'Pick up at Nimet Scout Shop',
        delivery: 'pickup',
        receiver: {
            name: 'Sokha Meng',
            phone: '012 345 678',
            address: 'Pick up at store',
            delivery: 'pickup'
        },
        cart: {
            standardItems: { 'pin-national': 1 },
            customWoggles: [
                { kind: 'normal', style: 'romdoul', color: 'Red', qty: 1, price: 1.25 }
            ]
        },
        itemCount: 2,
        totalUsd: 3.25
    }
];

let currentUser = null;
let customerOrders = [];
let ordersUnsubscribe = null;
let authMode = 'signin'; // 'signin' or 'signup'
let isDemoCustomer = false;

function escapeHTML(str) {
    return String(str || '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

export function getCurrentCustomer() {
    return currentUser;
}

// Open/close modal
export function toggleAccountModal(show = true) {
    const modal = $('account-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        renderAccountModal();
    } else {
        modal.classList.add('hidden');
    }
}

// Show message inside account auth form
function showAuthMessage(text, isError = true) {
    const el = $('account-auth-message');
    if (!el) return;
    if (!text) {
        el.classList.add('hidden');
        return;
    }
    el.textContent = text;
    el.className = `text-xs font-semibold p-2.5 rounded-xl ${isError ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`;
    el.classList.remove('hidden');
}

// Main modal render
export function renderAccountModal() {
    const authView = $('account-auth-view');
    const portalView = $('account-portal-view');
    const badge = $('account-badge');

    if (!currentUser) {
        if (badge) badge.classList.add('hidden');
        if (authView) authView.classList.remove('hidden');
        if (portalView) portalView.classList.add('hidden');
        renderAuthView();
    } else {
        if (badge) badge.classList.remove('hidden');
        if (authView) authView.classList.add('hidden');
        if (portalView) portalView.classList.remove('hidden');
        renderPortalView();
    }
}

// Render the sign in / sign up view
function renderAuthView() {
    const isSignIn = authMode === 'signin';
    const tabSignIn = $('account-tab-signin');
    const tabSignUp = $('account-tab-signup');
    const nameField = $('account-name-container');
    const submitBtn = $('account-submit-btn');
    const submitText = $('account-submit-text');
    const forgotBtn = $('account-forgot-btn');

    if (tabSignIn) {
        tabSignIn.classList.toggle('bg-[#7414DC]', isSignIn);
        tabSignIn.classList.toggle('text-white', isSignIn);
        tabSignIn.classList.toggle('text-gray-600', !isSignIn);
    }
    if (tabSignUp) {
        tabSignUp.classList.toggle('bg-[#7414DC]', !isSignIn);
        tabSignUp.classList.toggle('text-white', !isSignIn);
        tabSignUp.classList.toggle('text-gray-600', isSignIn);
    }

    if (nameField) nameField.classList.toggle('hidden', isSignIn);
    if (forgotBtn) forgotBtn.classList.toggle('hidden', !isSignIn);

    if (submitText) {
        submitText.textContent = isSignIn
            ? (getLang() === 'kh' ? 'ចូលគណនី' : 'Sign In')
            : (getLang() === 'kh' ? 'បង្កើតគណនី' : 'Create Account');
    }

    showAuthMessage('');
}

// Format items for display
function formatOrderItems(order) {
    const cart = order.cart || {};
    const lines = [];

    (cart.customWoggles || []).forEach(w => {
        const namePart = w.name ? ` <span class="font-bold text-gray-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">"${w.name}"</span>` : '';
        const style = (w.style || '').toUpperCase();
        lines.push(`• <b>${w.qty}x</b> Woggle ${style} (${w.color || ''})${namePart}`);
    });

    Object.entries(cart.standardItems || {}).forEach(([id, qty]) => {
        const clean = id.replace(/^(shop|pin|badge)-/, '').replace(/-/g, ' ');
        lines.push(`• <b>${qty}x</b> ${clean}`);
    });

    return lines.length ? lines.join('<br>') : '<span class="text-gray-400 italic">No items</span>';
}

// Render the Visual Step Progress Bar
function renderOrderProgressStepper(statusKey) {
    const norm = normalizeStatus(statusKey);
    const cfg = STATUS_CONFIG[norm] || STATUS_CONFIG.new;

    if (norm === 'cancel') {
        return `
            <div class="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                ${STATUS_CONFIG.cancel.icon}
                <span>${getLang() === 'kh' ? 'ការបញ្ជាទិញនេះត្រូវបានបោះបង់' : 'This order has been cancelled'}</span>
            </div>
        `;
    }

    const currentStep = cfg.stepIndex;

    const stepsHtml = ORDER_STEPS.map((stepKey, idx) => {
        const step = STATUS_CONFIG[stepKey];
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const label = getLang() === 'kh' ? step.labelKh : step.labelEn;

        let circleClass = 'bg-gray-100 text-gray-400 border-gray-200';
        let lineClass = 'bg-gray-200';

        if (isCompleted) {
            circleClass = 'bg-emerald-500 text-white border-emerald-500 shadow-sm';
            lineClass = 'bg-emerald-500';
        } else if (isCurrent) {
            circleClass = 'bg-[#7414DC] text-white border-[#7414DC] shadow-md ring-4 ring-purple-100';
        }

        const iconHtml = isCompleted
            ? '<i class="fa-solid fa-check text-xs"></i>'
            : (isCurrent ? step.icon.replace(/text-[a-z]+-[0-9]+/, 'text-white') : `<span class="text-[11px] font-bold">${idx + 1}</span>`);

        return `
            <div class="flex-1 flex flex-col items-center relative text-center">
                <!-- Connecting line to next step -->
                ${idx < ORDER_STEPS.length - 1 ? `
                    <div class="absolute top-3.5 left-1/2 w-full h-1 -translate-y-1/2 -z-0 ${idx < currentStep ? 'bg-emerald-500' : 'bg-gray-200'}"></div>
                ` : ''}

                <!-- Step Circle -->
                <div class="relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 ${circleClass} transition-all">
                    ${iconHtml}
                </div>

                <!-- Label -->
                <span class="mt-1.5 text-[10px] font-black ${isCurrent ? 'text-[#7414DC]' : (isCompleted ? 'text-gray-800' : 'text-gray-400')} tracking-tight leading-tight">
                    ${label}
                </span>
            </div>
        `;
    }).join('');

    return `
        <div class="bg-purple-50/50 border border-purple-100/70 p-3 rounded-2xl">
            <div class="flex items-center justify-between relative">
                ${stepsHtml}
            </div>
        </div>
    `;
}

// Render the Customer Portal View (My Orders & Progress)
function renderPortalView() {
    const emailEl = $('account-user-email');
    const nameEl = $('account-user-name');
    const ordersList = $('account-orders-list');
    const ordersCount = $('account-orders-count');

    if (emailEl) emailEl.textContent = currentUser.email || 'Customer';
    if (nameEl) nameEl.textContent = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Customer');

    if (!ordersList) return;

    if (ordersCount) {
        ordersCount.textContent = customerOrders.length ? `(${customerOrders.length})` : '';
    }

    if (customerOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="bg-gray-50 border border-gray-100 rounded-3xl p-8 text-center text-gray-400 text-xs space-y-2">
                <i class="fa-solid fa-box-open text-3xl text-purple-200"></i>
                <p>${t('account_no_orders')}</p>
                <button type="button" onclick="toggleAccountModal(false)" class="mt-2 px-4 py-2 bg-[#7414DC] text-white rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all">
                    ${getLang() === 'kh' ? 'មើលទំនិញ' : 'Browse Products'}
                </button>
            </div>
        `;
        return;
    }

    ordersList.innerHTML = customerOrders.map(order => {
        const norm = normalizeStatus(order.status || 'new');
        const statusCfg = STATUS_CONFIG[norm] || STATUS_CONFIG.new;
        const statusLabel = getLang() === 'kh' ? statusCfg.labelKh : statusCfg.labelEn;
        const total = formatPrice(order.totalUsd || 0);
        const displayName = escapeHTML((order.receiver && order.receiver.name) || order.name || currentUser.displayName || 'Customer');
        const deliveryText = escapeHTML(receiverDeliveryText(order.receiver || {}) || 'Pick up');
        const itemsHtml = formatOrderItems(order);

        // Date formatting
        let dateStr = '';
        try {
            const d = typeof order.createdAt === 'string' ? new Date(order.createdAt) : (order.createdAt?.toDate ? order.createdAt.toDate() : new Date());
            dateStr = d.toLocaleDateString(getLang() === 'kh' ? 'km-KH' : 'en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            dateStr = '';
        }

        return `
            <div class="bg-white rounded-2xl border border-purple-100 p-4 shadow-sm space-y-3.5">
                <!-- Order Card Header: Indicator in front of customer name -->
                <div class="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <!-- Indicator icon in front of customer name -->
                            <span class="text-base shrink-0 leading-none inline-flex items-center" title="${statusLabel}">${statusCfg.icon}</span>
                            <h4 class="font-black text-sm text-gray-900 leading-tight">${displayName}</h4>
                        </div>
                        <p class="text-[11px] text-gray-400 font-medium mt-0.5">${dateStr || order.id}</p>
                    </div>
                    <div class="shrink-0 text-right">
                        <span class="text-sm font-black text-[#7414DC] block">${total}</span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg.bg} ${statusCfg.color} border ${statusCfg.border}">
                            ${statusLabel}
                        </span>
                    </div>
                </div>

                <!-- Step-by-Step Progress Tracker -->
                <div class="space-y-1">
                    <div class="flex justify-between items-center px-1 text-[11px]">
                        <span class="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Progress</span>
                        <span class="font-bold ${statusCfg.color} flex items-center gap-1">
                            ${statusCfg.icon} ${statusLabel}
                        </span>
                    </div>
                    ${renderOrderProgressStepper(norm)}
                </div>

                <!-- Delivery & Items Info -->
                <div class="bg-gray-50/70 p-2.5 rounded-xl text-xs space-y-1.5 border border-gray-100">
                    <div class="flex justify-between text-gray-600">
                        <span class="text-gray-400 font-medium">Delivery:</span>
                        <span class="font-bold text-gray-800">${deliveryText}</span>
                    </div>
                    <div class="border-t border-gray-200/60 pt-1.5 text-gray-700 leading-relaxed">
                        <span class="text-[10px] uppercase font-bold text-gray-400 block mb-1">Items (${order.itemCount || 1})</span>
                        ${itemsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Demo customer login
function loginDemoCustomer() {
    isDemoCustomer = true;
    currentUser = {
        uid: 'demo-customer-123',
        email: 'customer@nimetscout.com',
        displayName: 'Sokha Meng'
    };
    customerOrders = JSON.parse(JSON.stringify(DEMO_CUSTOMER_ORDERS));
    localStorage.setItem('nimet_demo_customer', '1');
    renderAccountModal();
}

// Wire form events and auth listeners
export function initAccount() {
    // Open Account Modal button in header
    $('account-btn')?.addEventListener('click', () => toggleAccountModal(true));
    $('account-modal-close')?.addEventListener('click', () => toggleAccountModal(false));

    // Tab buttons in auth form
    $('account-tab-signin')?.addEventListener('click', () => {
        authMode = 'signin';
        renderAuthView();
    });
    $('account-tab-signup')?.addEventListener('click', () => {
        authMode = 'signup';
        renderAuthView();
    });

    // Sign out button
    $('account-signout-btn')?.addEventListener('click', async () => {
        if (isDemoCustomer) {
            isDemoCustomer = false;
            currentUser = null;
            customerOrders = [];
            localStorage.removeItem('nimet_demo_customer');
            renderAccountModal();
            return;
        }
        try {
            await signOutNow();
            currentUser = null;
            customerOrders = [];
            if (ordersUnsubscribe) { ordersUnsubscribe(); ordersUnsubscribe = null; }
            renderAccountModal();
        } catch (err) {
            console.error('Sign out error:', err);
        }
    });

    // Demo customer login button
    $('account-demo-btn')?.addEventListener('click', () => {
        loginDemoCustomer();
    });

    // Forgot password
    $('account-forgot-btn')?.addEventListener('click', async () => {
        const email = $('account-email')?.value.trim();
        if (!email) {
            showAuthMessage('Please enter your email above first', true);
            return;
        }
        try {
            await sendReset(email);
            showAuthMessage(`Password reset link sent to ${email}`, false);
        } catch (err) {
            showAuthMessage((err && err.message) || 'Could not send reset email', true);
        }
    });

    // Form submit
    $('account-auth-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const email = $('account-email')?.value.trim();
        const pass = $('account-password')?.value;
        const name = $('account-name')?.value.trim();

        if (!email || !pass) {
            showAuthMessage('Please fill in both email and password', true);
            return;
        }

        if (!firebaseConfigured()) {
            // Firebase not configured yet: offer demo login
            showAuthMessage('Firebase is not connected yet. Click "Preview as Demo Customer" below to test!', true);
            return;
        }

        const submitBtn = $('account-submit-btn');
        if (submitBtn) submitBtn.disabled = true;
        showAuthMessage('');

        try {
            if (authMode === 'signin') {
                await signIn(email, pass);
            } else {
                await signUp(email, pass, name);
            }
        } catch (err) {
            console.error('Auth error:', err);
            showAuthMessage((err && err.message) || 'Authentication failed', true);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    // Auto-login demo customer if stored
    if (localStorage.getItem('nimet_demo_customer') === '1' && !firebaseConfigured()) {
        loginDemoCustomer();
        return;
    }

    // If Firebase is configured, watch live auth
    if (firebaseConfigured()) {
        import('./firebase.js').then(({ watchAdmin }) => {
            watchAdmin((user, isAdmin) => {
                currentUser = user;
                if (user) {
                    // Pre-fill receiver name if receiver name in cart is empty
                    const recName = $('receiver-name');
                    if (recName && !recName.value && user.displayName) {
                        recName.value = user.displayName;
                    }

                    // Watch customer orders in real-time
                    watchCustomerOrders(user.uid, orders => {
                        customerOrders = orders;
                        if (!$('account-modal')?.classList.contains('hidden')) {
                            renderPortalView();
                        }
                    }, err => {
                        console.warn('Customer orders fetch error:', err);
                    });
                } else {
                    customerOrders = [];
                }
                renderAccountModal();
            }).catch(e => {
                console.warn('Account auth watcher error:', e);
            });
        });
    }
}

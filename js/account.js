// js/account.js - Customer account: phone number + password, saved details, order progress.
//
// How sign-in works (the customer only ever sees a phone number):
//   1. The owner adds the number in Firebase (collection "customerInvites", document id = number).
//   2. First time: customer types the number, the site sees the invite is unused and asks for a new password.
//   3. Next times: phone number + password.
// Firebase itself is only loaded for customers who open the account window or were signed in before,
// so people who just browse and copy a receipt download nothing extra.

import {
    firebaseConfigured,
    signOutNow,
    watchAuth,
    watchCustomerOrders,
    normalizePhone,
    localPhone,
    isCustomerUser,
    phoneFromUser,
    checkCustomerInvite,
    customerSignIn,
    customerCreateAccount,
    loadCustomerProfile,
    saveCustomerProfile
} from './firebase.js';

import { formatPrice } from './currency.js';
import { getLang, t } from './i18n.js';
import {
    receiverDeliveryText,
    getReceiver,
    setReceiverField
} from './cart.js';

const $ = id => document.getElementById(id);
const HINT_KEY = 'nimet_customer_hint';   // remembers "this phone had a customer signed in" so the login is restored

// Order status look (New -> Making -> Done -> Ship, or Cancelled)
export const STATUS_CONFIG = {
    new: {
        labelEn: 'New', labelKh: 'ថ្មី',
        icon: '<i class="fa-solid fa-circle-plus text-emerald-500"></i>',
        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', stepIndex: 0
    },
    making: {
        labelEn: 'Making', labelKh: 'កំពុងធ្វើ',
        icon: '<i class="fa-solid fa-spinner fa-spin text-amber-500"></i>',
        color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', stepIndex: 1
    },
    done: {
        labelEn: 'Done', labelKh: 'បានបញ្ចប់',
        icon: '<i class="fa-solid fa-circle-check text-emerald-500"></i>',
        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', stepIndex: 2
    },
    ship: {
        labelEn: 'Ship', labelKh: 'បានផ្ញើ',
        icon: '<i class="fa-solid fa-truck text-emerald-500"></i>',
        color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', stepIndex: 3
    },
    cancel: {
        labelEn: 'Cancelled', labelKh: 'បានបោះបង់',
        icon: '<i class="fa-solid fa-circle-xmark text-rose-500"></i>',
        color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', stepIndex: -1
    }
};

const ORDER_STEPS = ['new', 'making', 'done', 'ship'];

// Same meaning as in admin.js (kept here so the shop never has to load the admin page code)
function normalizeStatus(st) {
    if (!st) return 'new';
    const s = String(st).toLowerCase();
    if (s === 'ready' || s === 'done') return 'done';
    if (s === 'shipped' || s === 'ship') return 'ship';
    if (s === 'cancelled' || s === 'cancel') return 'cancel';
    if (s === 'making') return 'making';
    return 'new';
}

// ---------- State ----------
let currentUser = null;
let profile = null;            // saved details: { name, phone, address }
let customerOrders = [];
let ordersUnsubscribe = null;
let authUnsubscribe = null;
let watching = false;
let freshSignIn = false;       // true right after typing a password, so saved details replace the cart form
let authStep = 'phone';        // 'phone' -> 'signin' (has a password) or 'create' (first time)
let pendingPhone = '';
let activePane = 'orders';
let callbacks = { toast: () => {}, onReceiverChanged: () => {} };

function escapeHTML(str) {
    return String(str || '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

export function getCurrentCustomer() {
    return isCustomerUser(currentUser) ? currentUser : null;
}

// ---------- Open / close ----------
export function toggleAccountModal(show = true) {
    const modal = $('account-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        startWatching();
        renderAccountModal();
    } else {
        modal.classList.add('hidden');
    }
}

// Called by app.js when the language changes
export function refreshAccount() {
    const modal = $('account-modal');
    if (modal && !modal.classList.contains('hidden')) renderAccountModal();
}

// ---------- Cart form <- saved details ----------
// force = true replaces what is in the cart form (right after sign-in, after Save, after an order);
// force = false only fills empty parts, so changes typed in the cart are never overwritten.
function applyProfileToReceiver(force) {
    if (!profile || !isCustomerUser(currentUser)) return;
    const r = getReceiver();
    const defaults = {
        name: profile.name || '',
        phone: profile.phone || localPhone(phoneFromUser(currentUser)),
        address: profile.address || ''
    };
    let changed = false;
    Object.entries(defaults).forEach(([field, value]) => {
        if (value && (force || !String(r[field] || '').trim())) {
            setReceiverField(field, value);
            changed = true;
        }
    });
    if (changed) callbacks.onReceiverChanged();
}

// Used by app.js after "Clear Cart" / a placed order, so the saved details come back
export function applyProfileToCart() {
    applyProfileToReceiver(true);
}

// ---------- Messages ----------
function showMessage(id, text, isError = true) {
    const el = $(id);
    if (!el) return;
    if (!text) { el.classList.add('hidden'); return; }
    el.textContent = text;
    el.className = `text-xs font-semibold p-2.5 rounded-xl ${isError ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`;
}
const showAuthMessage = (text, isError = true) => showMessage('account-auth-message', text, isError);

// ---------- Main render ----------
export function renderAccountModal() {
    const signedIn = !!currentUser;
    const badge = $('account-badge');
    if (badge) badge.classList.toggle('hidden', !isCustomerUser(currentUser));
    $('account-auth-view')?.classList.toggle('hidden', signedIn);
    $('account-portal-view')?.classList.toggle('hidden', !signedIn);
    if (signedIn) renderPortalView(); else renderAuthView();
}

// ---------- Signed out: phone -> password ----------
function renderAuthView() {
    const hint = $('account-auth-hint');
    const phoneInput = $('account-phone');
    const passWrap = $('account-password-wrap');
    const pass2 = $('account-password2');
    const submitText = $('account-submit-text');
    const hintKey = authStep === 'create' ? 'account_first_time'
        : authStep === 'signin' ? 'account_signin_hint' : 'account_enter_phone_hint';

    if (hint) hint.textContent = t(hintKey);
    if (phoneInput) phoneInput.readOnly = authStep !== 'phone';
    passWrap?.classList.toggle('hidden', authStep === 'phone');
    pass2?.classList.toggle('hidden', authStep !== 'create');
    $('account-forgot-btn')?.classList.toggle('hidden', authStep !== 'signin');
    $('account-back-btn')?.classList.toggle('hidden', authStep === 'phone');
    if (submitText) {
        submitText.textContent = t(authStep === 'create' ? 'account_create_btn'
            : authStep === 'signin' ? 'account_signin' : 'account_continue');
    }
}

function resetAuthForm() {
    authStep = 'phone';
    pendingPhone = '';
    const phone = $('account-phone'); if (phone) phone.value = '';
    const p1 = $('account-password'); if (p1) p1.value = '';
    const p2 = $('account-password2'); if (p2) p2.value = '';
    showAuthMessage('');
    renderAuthView();
}

function friendlyAuthError(err) {
    const code = (err && err.code) || '';
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
        return t('account_wrong_password');
    }
    if (code === 'auth/weak-password') return t('account_password_short');
    if (err && err.message === 'not-invited') return t('account_not_registered');
    if (code === 'permission-denied' || code === 'auth/network-request-failed') return t('account_error');
    return t('account_error');
}

async function submitAuthForm() {
    const submitBtn = $('account-submit-btn');
    const setBusy = busy => { if (submitBtn) submitBtn.disabled = busy; };

    if (!firebaseConfigured()) { showAuthMessage(t('account_not_connected')); return; }
    showAuthMessage('');

    // Step 1: which number?
    if (authStep === 'phone') {
        const phone = normalizePhone($('account-phone')?.value);
        if (phone.length < 9) { showAuthMessage(t('account_need_phone')); return; }
        setBusy(true);
        try {
            const invite = await checkCustomerInvite(phone);
            if (!invite.exists) { showAuthMessage(t('account_not_registered')); return; }
            pendingPhone = phone;
            authStep = invite.claimed ? 'signin' : 'create';
            renderAuthView();
            $('account-password')?.focus();
        } catch (err) {
            console.warn('Phone check failed:', err);
            showAuthMessage(t('account_error'));
        } finally {
            setBusy(false);
        }
        return;
    }

    // Step 2: password
    const pass = $('account-password')?.value || '';
    if (!pass) { showAuthMessage(t('account_need_password')); return; }
    if (authStep === 'create') {
        if (pass.length < 6) { showAuthMessage(t('account_password_short')); return; }
        if (pass !== ($('account-password2')?.value || '')) { showAuthMessage(t('account_password_mismatch')); return; }
    }

    setBusy(true);
    freshSignIn = true;
    try {
        if (authStep === 'create') await customerCreateAccount(pendingPhone, pass);
        else await customerSignIn(pendingPhone, pass);
        // The auth listener takes it from here (loads details, fills the cart form, switches the view)
    } catch (err) {
        freshSignIn = false;
        console.warn('Auth error:', err);
        showAuthMessage(friendlyAuthError(err));
    } finally {
        setBusy(false);
    }
}

// ---------- Signed in ----------
function setPane(pane) {
    activePane = pane;
    $('account-pane-orders')?.classList.toggle('hidden', pane !== 'orders');
    $('account-pane-settings')?.classList.toggle('hidden', pane !== 'settings');
    [['account-tab-orders', 'orders'], ['account-tab-settings', 'settings']].forEach(([id, key]) => {
        const btn = $(id);
        if (!btn) return;
        btn.classList.toggle('bg-white', pane === key);
        btn.classList.toggle('shadow-sm', pane === key);
        btn.classList.toggle('text-[#7414DC]', pane === key);
        btn.classList.toggle('text-gray-500', pane !== key);
    });
}

function renderPortalView() {
    const isCustomer = isCustomerUser(currentUser);
    const nameEl = $('account-user-name');
    const subEl = $('account-user-email');
    const switchEl = $('account-pane-switch');

    if (isCustomer) {
        const shownName = (profile && profile.name) || localPhone(phoneFromUser(currentUser));
        if (nameEl) nameEl.textContent = shownName;
        if (subEl) subEl.textContent = localPhone(phoneFromUser(currentUser));
    } else {
        // The owner signed in on the shop page: show who, no customer settings
        if (nameEl) nameEl.textContent = currentUser.email || '';
        if (subEl) subEl.textContent = t('account_admin_note');
    }

    switchEl?.classList.toggle('hidden', !isCustomer);
    if (!isCustomer) {
        $('account-pane-orders')?.classList.add('hidden');
        $('account-pane-settings')?.classList.add('hidden');
        return;
    }
    setPane(activePane);
    renderOrdersList();
    renderSettingsForm();
}

// ----- Settings -----
function renderSettingsForm() {
    const active = document.activeElement;
    const typing = active && active.closest && active.closest('#account-pane-settings');

    // Text fields: do not overwrite while the customer is typing
    if (!typing) {
        const p = profile || {};
        const set = (id, value) => { const el = $(id); if (el) el.value = value || ''; };
        set('account-set-name', p.name);
        set('account-set-phone', p.phone || localPhone(phoneFromUser(currentUser)));
        set('account-set-address', p.address);
    }
}

async function saveSettings() {
    if (!isCustomerUser(currentUser)) return;
    const btn = $('account-save-btn');
    const next = {
        name: ($('account-set-name')?.value || '').trim(),
        phone: ($('account-set-phone')?.value || '').trim(),
        address: ($('account-set-address')?.value || '').trim()
    };
    if (btn) btn.disabled = true;
    showMessage('account-settings-message', '');
    try {
        await saveCustomerProfile(currentUser.uid, next);
        profile = { ...(profile || {}), ...next };
        applyProfileToReceiver(true);
        renderPortalView();
        callbacks.toast(t('account_saved'));
    } catch (err) {
        console.warn('Save failed:', err);
        showMessage('account-settings-message', t('account_save_failed'));
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ----- Orders -----
function formatOrderItems(order) {
    const cart = order.cart || {};
    const lines = [];

    (cart.customWoggles || []).forEach(w => {
        const namePart = w.name ? ` <span class="font-bold text-gray-900 bg-amber-50 px-1.5 rounded border border-amber-200">"${escapeHTML(w.name)}"</span>` : '';
        const label = w.style ? `Woggle ${escapeHTML(String(w.style).toUpperCase())}` : escapeHTML(w.title || 'Item');
        lines.push(`• <b>${w.qty}x</b> ${label} (${escapeHTML(w.color || '')})${namePart}`);
    });

    Object.entries(cart.standardItems || {}).forEach(([id, qty]) => {
        const clean = id.replace(/^(shop|pin|badge)-/, '').replace(/-/g, ' ');
        lines.push(`• <b>${qty}x</b> ${escapeHTML(clean)}`);
    });

    return lines.length ? lines.join('<br>') : '<span class="text-gray-400 italic">-</span>';
}

function renderOrderProgressStepper(statusKey) {
    const norm = normalizeStatus(statusKey);
    const cfg = STATUS_CONFIG[norm] || STATUS_CONFIG.new;

    if (norm === 'cancel') {
        return `
            <div class="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                ${STATUS_CONFIG.cancel.icon}
                <span>${escapeHTML(t('account_cancelled_note'))}</span>
            </div>`;
    }

    const currentStep = cfg.stepIndex;
    const stepsHtml = ORDER_STEPS.map((stepKey, idx) => {
        const step = STATUS_CONFIG[stepKey];
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const label = getLang() === 'kh' ? step.labelKh : step.labelEn;

        let circleClass = 'bg-gray-100 text-gray-400 border-gray-200';
        if (isCompleted) circleClass = 'bg-emerald-500 text-white border-emerald-500 shadow-sm';
        else if (isCurrent) circleClass = 'bg-[#7414DC] text-white border-[#7414DC] shadow-md ring-4 ring-purple-100';

        const iconHtml = isCompleted
            ? '<i class="fa-solid fa-check text-xs"></i>'
            : (isCurrent ? step.icon.replace(/text-[a-z]+-[0-9]+/, 'text-white') : `<span class="text-[11px] font-bold">${idx + 1}</span>`);

        return `
            <div class="flex-1 flex flex-col items-center relative text-center">
                ${idx < ORDER_STEPS.length - 1 ? `<div class="absolute top-3.5 left-1/2 w-full h-1 -translate-y-1/2 ${idx < currentStep ? 'bg-emerald-500' : 'bg-gray-200'}"></div>` : ''}
                <div class="relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 ${circleClass}">${iconHtml}</div>
                <span class="mt-1.5 text-[10px] font-black ${isCurrent ? 'text-[#7414DC]' : (isCompleted ? 'text-gray-800' : 'text-gray-400')} tracking-tight leading-tight">${label}</span>
            </div>`;
    }).join('');

    return `
        <div class="bg-purple-50/50 border border-purple-100/70 p-3 rounded-2xl">
            <div class="flex items-center justify-between relative">${stepsHtml}</div>
        </div>`;
}

function renderOrdersList() {
    const ordersList = $('account-orders-list');
    const ordersCount = $('account-orders-count');
    if (ordersCount) ordersCount.textContent = customerOrders.length ? `(${customerOrders.length})` : '';
    if (!ordersList) return;

    if (customerOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="bg-gray-50 border border-gray-100 rounded-3xl p-8 text-center text-gray-400 text-xs space-y-2">
                <i class="fa-solid fa-box-open text-3xl text-purple-200"></i>
                <p>${escapeHTML(t('account_no_orders'))}</p>
                <button type="button" data-account-browse class="mt-2 px-4 py-2 bg-[#7414DC] text-white rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all">
                    ${escapeHTML(t('account_browse'))}
                </button>
            </div>`;
        return;
    }

    ordersList.innerHTML = customerOrders.map(order => {
        const norm = normalizeStatus(order.status || 'new');
        const statusCfg = STATUS_CONFIG[norm] || STATUS_CONFIG.new;
        const statusLabel = getLang() === 'kh' ? statusCfg.labelKh : statusCfg.labelEn;
        const total = formatPrice(order.totalUsd || 0);
        const displayName = escapeHTML((order.receiver && order.receiver.name) || order.name || '');
        const deliveryText = escapeHTML(receiverDeliveryText(order.receiver || {}) || '-');

        let dateStr = '';
        try {
            const d = typeof order.createdAt === 'string' ? new Date(order.createdAt)
                : (order.createdAt && order.createdAt.toDate ? order.createdAt.toDate() : new Date());
            dateStr = d.toLocaleDateString(getLang() === 'kh' ? 'km-KH' : 'en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (e) { dateStr = ''; }

        return `
            <div class="bg-white rounded-2xl border border-purple-100 p-4 shadow-sm space-y-3.5">
                <div class="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-base shrink-0 leading-none inline-flex items-center" title="${statusLabel}">${statusCfg.icon}</span>
                            <h4 class="font-black text-sm text-gray-900 leading-tight">${displayName}</h4>
                        </div>
                        <p class="text-[11px] text-gray-400 font-medium mt-0.5">${escapeHTML(dateStr || order.id)}</p>
                    </div>
                    <div class="shrink-0 text-right">
                        <span class="text-sm font-black text-[#7414DC] block">${total}</span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg.bg} ${statusCfg.color} border ${statusCfg.border}">${statusLabel}</span>
                    </div>
                </div>
                <div class="space-y-1">
                    <div class="flex justify-between items-center px-1 text-[11px]">
                        <span class="font-bold text-gray-500 uppercase tracking-wider text-[10px]">${escapeHTML(t('account_progress'))}</span>
                        <span class="font-bold ${statusCfg.color} flex items-center gap-1">${statusCfg.icon} ${statusLabel}</span>
                    </div>
                    ${renderOrderProgressStepper(norm)}
                </div>
                <div class="bg-gray-50/70 p-2.5 rounded-xl text-xs space-y-1.5 border border-gray-100">
                    <div class="flex justify-between text-gray-600">
                        <span class="text-gray-400 font-medium">${escapeHTML(t('account_delivery'))}:</span>
                        <span class="font-bold text-gray-800">${deliveryText}</span>
                    </div>
                    <div class="border-t border-gray-200/60 pt-1.5 text-gray-700 leading-relaxed">
                        <span class="text-[10px] uppercase font-bold text-gray-400 block mb-1">${escapeHTML(t('account_items'))} (${order.itemCount || 1})</span>
                        ${formatOrderItems(order)}
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ---------- Watching the login ----------
// Firebase is loaded here, and only for people who open the account window or were signed in before.
function startWatching() {
    if (watching || !firebaseConfigured()) return;
    watching = true;
    watchAuth(async user => {
        currentUser = user;
        if (ordersUnsubscribe) { ordersUnsubscribe(); ordersUnsubscribe = null; }
        customerOrders = [];
        profile = null;

        if (user && isCustomerUser(user)) {
            try { localStorage.setItem(HINT_KEY, '1'); } catch (e) { /* private mode */ }
            try { profile = await loadCustomerProfile(user.uid); } catch (e) { console.warn('Profile load failed:', e); }
            applyProfileToReceiver(freshSignIn);
            freshSignIn = false;
            try {
                ordersUnsubscribe = await watchCustomerOrders(user.uid, orders => {
                    customerOrders = orders;
                    if (isCustomerUser(currentUser)) renderOrdersList();
                }, err => console.warn('Customer orders fetch error:', err));
            } catch (e) { console.warn('Orders watch failed:', e); }
            resetAuthForm();
        } else if (!user) {
            try { localStorage.removeItem(HINT_KEY); } catch (e) { /* private mode */ }
        }
        renderAccountModal();
    }).then(unsub => { authUnsubscribe = unsub; }).catch(e => {
        watching = false;
        console.warn('Account auth watcher error:', e);
    });
}

// ---------- Wire up ----------
// options.toast(message)           shows the small message at the top
// options.onReceiverChanged()      redraws the cart form after saved details were put in it
export function initAccount(options = {}) {
    callbacks = { ...callbacks, ...options };

    $('account-btn')?.addEventListener('click', () => toggleAccountModal(true));
    $('account-modal-close')?.addEventListener('click', () => toggleAccountModal(false));
    $('account-modal')?.addEventListener('click', e => { if (e.target === $('account-modal')) toggleAccountModal(false); });

    $('account-auth-form')?.addEventListener('submit', e => { e.preventDefault(); submitAuthForm(); });
    $('account-back-btn')?.addEventListener('click', resetAuthForm);
    $('account-forgot-btn')?.addEventListener('click', () => showAuthMessage(t('account_forgot_msg'), false));

    $('account-tab-orders')?.addEventListener('click', () => setPane('orders'));
    $('account-tab-settings')?.addEventListener('click', () => { setPane('settings'); renderSettingsForm(); });
    $('account-save-btn')?.addEventListener('click', saveSettings);

    // "Browse Products" in the empty orders list
    $('account-orders-list')?.addEventListener('click', e => {
        if (e.target.closest('[data-account-browse]')) toggleAccountModal(false);
    });

    $('account-signout-btn')?.addEventListener('click', async () => {
        try {
            await signOutNow();
            try { localStorage.removeItem(HINT_KEY); } catch (e) { /* private mode */ }
            profile = null;
            customerOrders = [];
            resetAuthForm();
            renderAccountModal();
        } catch (err) {
            console.error('Sign out error:', err);
        }
    });

    renderAuthView();

    // Restore the login for customers who signed in before (loads Firebase only for them)
    let hinted = false;
    try { hinted = localStorage.getItem(HINT_KEY) === '1'; } catch (e) { /* private mode */ }
    if (hinted) startWatching();
}
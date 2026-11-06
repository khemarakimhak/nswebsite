// js/account.js - Customer account: phone number + password and saved details (name, phone, address).
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

import { t } from './i18n.js';
import { getReceiver, setReceiverField } from './cart.js';

const $ = id => document.getElementById(id);
const HINT_KEY = 'nimet_customer_hint';   // remembers "this phone had a customer signed in" so the login is restored

// ---------- State ----------
let currentUser = null;
let profile = null;            // saved details: { name, phone, address }
let authUnsubscribe = null;
let watching = false;
let freshSignIn = false;       // true right after typing a password, so saved details replace the cart form
let authStep = 'phone';        // 'phone' -> 'signin' (has a password) or 'create' (first time)
let pendingPhone = '';
let callbacks = { toast: () => {}, onReceiverChanged: () => {} };

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
function renderPortalView() {
    const isCustomer = isCustomerUser(currentUser);
    const nameEl = $('account-user-name');
    const subEl = $('account-user-email');

    if (isCustomer) {
        const shownName = (profile && profile.name) || localPhone(phoneFromUser(currentUser));
        if (nameEl) nameEl.textContent = shownName;
        if (subEl) subEl.textContent = localPhone(phoneFromUser(currentUser));
    } else {
        // The owner signed in on the shop page: show who, no customer settings
        if (nameEl) nameEl.textContent = currentUser.email || '';
        if (subEl) subEl.textContent = t('account_admin_note');
    }

    $('account-pane-settings')?.classList.toggle('hidden', !isCustomer);
    if (isCustomer) renderSettingsForm();
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

// ---------- Watching the login ----------
// Firebase is loaded here, and only for people who open the account window or were signed in before.
function startWatching() {
    if (watching || !firebaseConfigured()) return;
    watching = true;
    watchAuth(async user => {
        currentUser = user;
        profile = null;

        if (user && isCustomerUser(user)) {
            try { localStorage.setItem(HINT_KEY, '1'); } catch (e) { /* private mode */ }
            try { profile = await loadCustomerProfile(user.uid); } catch (e) { console.warn('Profile load failed:', e); }
            applyProfileToReceiver(freshSignIn);
            freshSignIn = false;
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

    $('account-save-btn')?.addEventListener('click', saveSettings);

    $('account-signout-btn')?.addEventListener('click', async () => {
        try {
            await signOutNow();
            try { localStorage.removeItem(HINT_KEY); } catch (e) { /* private mode */ }
            profile = null;
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

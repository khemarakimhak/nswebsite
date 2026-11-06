// js/admin-session.js - Owner tools on the shop page (index.html).
//
// Customers never see or load any of this. It only wakes up when the owner has signed in on admin.html
// (a flag is kept in this browser) or opens an order with  index.html?edit=<order id>.
// When the owner is signed in, the cart gets an "Admin" bar to save the cart as an order, and orders can be
// opened from the admin page to add products or change details, then saved again.
//
// The text of this owner-only bar is English only on purpose (it is not part of data/translations.js).

import { firebaseConfigured, watchAdmin, fetchOrder, createOrder, updateOrder } from './firebase.js';
import { getSnapshot, restoreSnapshot, getReceiver, isCartEmpty, receiverHasData, getItemCount, getCartTotal, withSnapshot } from './cart.js';

const ADMIN_FLAG = 'nimet_admin';

let admin = false;          // true once Firebase confirmed this browser is signed in as the owner
let editingId = null;       // id of the saved order that is open in the cart (null = a new order)
let editingName = '';
let editingOwner = null;   // who the opened order belonged to + its status, kept when the order is re-sent
let lastSaved = null;       // what the cart looked like when it was last saved / opened (to spot unsaved changes)
let hooks = { toast: () => {}, afterRestore: () => {} };

const $ = id => document.getElementById(id);

// Order of keys must not matter when comparing
function stable(value) {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

export function adminActive() {
    return admin;
}

// True when the owner has a customer / cart on screen that is not saved yet (used before clearing).
// For customers (not signed in) this is always false, so Clear Cart simply clears.
export function hasUnsaved() {
    if (!admin) return false;
    if (isCartEmpty() && !receiverHasData(getReceiver())) return false;
    return stable(getSnapshot()) !== lastSaved;
}

// The cart was cleared: we are no longer editing a saved order
export function afterClear() {
    editingId = null;
    editingName = '';
    editingOwner = null;
    lastSaved = null;
    renderBar();
}

// The saved order that is open in the cart (null = a new order).
// "Check Out" in app.js sends the cart as a new order and then deletes this one, by id.
// Not kept across a page reload on purpose: after a reload "Check Out" simply makes a new order and
// leaves the old one alone, so a stale link can never delete the wrong order.
export function getEditingOrder() {
    if (!editingId) return null;
    const owner = editingOwner || {};
    return {
        id: editingId,
        userId: owner.userId ?? null,
        customerUid: owner.customerUid ?? null,
        accountPhone: owner.accountPhone || '',
        status: owner.status || 'new'
    };
}

// The fields stored with an order (the cart itself + a few extra fields for the admin lists)
function orderFields(snapshot) {
    const receiver = snapshot.receiver;
    return {
        name: receiver.name,
        source: receiver.source || '',
        phone: receiver.phone || '',
        address: receiver.address || '',
        cart: snapshot.cart,
        receiver,
        itemCount: withSnapshot(snapshot, getItemCount),
        totalUsd: withSnapshot(snapshot, getCartTotal),
        searchText: `${receiver.name} ${receiver.phone || ''}`.toLowerCase()
    };
}

// Save the cart on screen as a new order, or update the order that is open.
// Returns { ok: false, reason: 'name' } when no customer name is typed (the name is needed to find the order later).
export async function saveCurrent() {
    if (!admin) return { ok: false, reason: 'not-admin' };

    const snapshot = getSnapshot();
    const name = String(snapshot.receiver.name || '').trim();
    if (!name) return { ok: false, reason: 'name' };
    snapshot.receiver.name = name;

    const fields = orderFields(snapshot);
    let updated = false;
    if (editingId) {
        await updateOrder(editingId, fields);
        updated = true;
    } else {
        editingId = await createOrder({ ...fields, status: 'new' });
        editingOwner = { userId: null, customerUid: null, status: 'new' };
    }
    editingName = name;
    lastSaved = stable(getSnapshot());
    renderBar();
    return { ok: true, updated };
}

// ---------- The Admin bar in the cart ----------
function renderBar() {
    const bar = $('admin-bar');
    const chip = $('admin-chip');
    if (chip) chip.classList.toggle('hidden', !admin);
    if (!bar) return;
    bar.classList.toggle('hidden', !admin);
    $('admin-save-inline-btn')?.classList.toggle('hidden', !admin);
    if (!admin) return;

    const title = $('admin-bar-title');
    if (title) title.textContent = editingId ? `Editing order: ${editingName || '...'}` : 'Admin: new order';
    const saveBtn = $('admin-save-btn');
    if (saveBtn) saveBtn.textContent = editingId ? 'Save changes' : 'Save as new order';
    $('admin-close-btn')?.classList.toggle('hidden', !editingId);
}

async function onSaveClick() {
    const saveBtn = $('admin-save-btn');
    const inlineBtn = $('admin-save-inline-btn');
    if (saveBtn) saveBtn.disabled = true;
    if (inlineBtn) inlineBtn.disabled = true;
    try {
        const result = await saveCurrent();
        if (!result.ok) {
            hooks.toast(result.reason === 'name' ? 'Enter the customer name first' : 'Not signed in as admin');
            if (result.reason === 'name') $('receiver-name')?.focus();
        } else {
            hooks.toast(result.updated ? 'Order updated' : 'Order saved to admin');
            if (inlineBtn) {
                inlineBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                setTimeout(() => { inlineBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>'; }, 1500);
            }
        }
    } catch (err) {
        console.error('Save order failed:', err);
        hooks.toast(`Could not save: ${(err && err.code) || (err && err.message) || 'unknown error'}`);
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (inlineBtn) inlineBtn.disabled = false;
    }
}

// ---------- Opening a saved order in the cart ----------
async function openForEdit(id) {
    let order;
    try {
        order = await fetchOrder(id);
    } catch (err) {
        console.error('Open order failed:', err);
        hooks.toast(`Could not open the order: ${(err && err.code) || 'error'}`);
        return;
    }
    if (!order) { hooks.toast('Order not found (maybe it was deleted)'); return; }

    // Do not silently throw away a cart that was being built on this device
    const hasLocal = !isCartEmpty() || receiverHasData(getReceiver());
    if (hasLocal && stable(getSnapshot()) !== lastSaved) {
        const who = (getReceiver().name || 'the cart on screen').trim();
        if (!confirm(`Replace ${who} with the order of ${order.name}? (${who} is not saved)`)) return;
    }

    restoreSnapshot({ cart: order.cart, receiver: order.receiver });
    editingId = order.id;
    editingName = order.name || '';
    editingOwner = { userId: order.userId ?? null, customerUid: order.customerUid ?? null, accountPhone: order.accountPhone || '', status: order.status || 'new' };
    lastSaved = stable(getSnapshot());
    renderBar();
    hooks.afterRestore();
    hooks.toast(`Editing: ${editingName}`);
}

// ---------- Start ----------
// Call once when the shop page has loaded. hooks = { toast(message), afterRestore() }
export async function startAdminSession(h) {
    hooks = { ...hooks, ...h };

    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    if (!firebaseConfigured()) return;
    if (localStorage.getItem(ADMIN_FLAG) !== '1' && !editId) return;   // customers stop here: no Firebase at all

    $('admin-save-btn')?.addEventListener('click', onSaveClick);
    $('admin-save-inline-btn')?.addEventListener('click', onSaveClick);
    $('admin-close-btn')?.addEventListener('click', () => $('btn-clear-cart')?.click());

    let handledEdit = false;
    try {
        await watchAdmin(async (user, isAdmin) => {
            admin = !!isAdmin;
            if (!admin) {
                localStorage.removeItem(ADMIN_FLAG);
                renderBar();
                if (editId && !handledEdit) location.href = 'admin.html';   // not signed in: go and log in first
                return;
            }
            localStorage.setItem(ADMIN_FLAG, '1');
            renderBar();
            if (editId && !handledEdit) {
                handledEdit = true;
                history.replaceState(null, '', location.pathname);       // so a reload does not open it again
                await openForEdit(editId);
            }
        });
    } catch (err) {
        console.warn('Admin session could not start:', err);   // the shop keeps working normally
    }
}

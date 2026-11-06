// js/firebase.js - The only file that talks to Firebase (login + the saved orders database).
//
// The Firebase library is loaded from Google ONLY when something asks for it (the admin page, or the shop
// when the owner is signed in). Customers who just browse and copy a receipt never load it.

import { FIREBASE_CONFIG, FIREBASE_VERSION } from '../data/firebase-config.js';

export function firebaseConfigured() {
    const c = FIREBASE_CONFIG || {};
    return !!(c.apiKey && c.projectId && !String(c.apiKey).startsWith('PASTE') && !String(c.projectId).startsWith('PASTE'));
}

let loading = null;
let currentUser = null;   // kept up to date by the login listener below
let authReadyResolve;
const authReadyPromise = new Promise(r => { authReadyResolve = r; });

// The signed-in user right now (or null). Synchronous on purpose: app.js calls it when placing an order.
// It is null until Firebase has loaded and restored the login, which only happens for signed-in customers/admin.
export function getCurrentUser() {
    return currentUser;
}

// Resolves with the signed-in user (or null) once Firebase has restored the login. Loads Firebase if needed.
export async function authReady() {
    await load();
    return authReadyPromise;
}

function load() {
    if (loading) return loading;
    loading = (async () => {
        const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
        const [appMod, authMod, fsMod] = await Promise.all([
            import(`${base}/firebase-app.js`),
            import(`${base}/firebase-auth.js`),
            import(`${base}/firebase-firestore.js`)
        ]);
        const app = appMod.initializeApp(FIREBASE_CONFIG);
        const auth = authMod.getAuth(app);
        authMod.onAuthStateChanged(auth, user => { currentUser = user || null; authReadyResolve(currentUser); });
        return { authMod, fsMod, auth, db: fsMod.getFirestore(app) };
    })();
    loading.catch(() => { loading = null; });   // allow a retry after a network problem
    return loading;
}

// ---------- Login ----------
// The owner is a normal Firebase user whose id is also listed in the "admins" collection (see firestore.rules).
async function checkAdmin(f, user) {
    try {
        const snap = await f.fsMod.getDoc(f.fsMod.doc(f.db, 'admins', user.uid));
        return snap.exists();
    } catch (err) {
        console.warn('Admin check failed:', err);
        return false;
    }
}

// callback(user | null, isAdmin) runs now and every time the login changes
export async function watchAdmin(callback) {
    const f = await load();
    return f.authMod.onAuthStateChanged(f.auth, async user => {
        if (!user) { callback(null, false); return; }
        callback(user, await checkAdmin(f, user));
    });
}

export async function signIn(email, password) {
    const f = await load();
    return f.authMod.signInWithEmailAndPassword(f.auth, email, password);
}

export async function signUp(email, password, displayName = '') {
    const f = await load();
    const cred = await f.authMod.createUserWithEmailAndPassword(f.auth, email, password);
    if (displayName && cred.user) {
        try {
            await f.authMod.updateProfile(cred.user, { displayName });
        } catch (e) {
            console.warn('Could not update display name:', e);
        }
    }
    return cred;
}

export async function signOutNow() {
    const f = await load();
    return f.authMod.signOut(f.auth);
}

export async function sendReset(email) {
    const f = await load();
    return f.authMod.sendPasswordResetEmail(f.auth, email);
}

// ---------- Customer accounts (phone number + password) ----------
// Customers type a phone number, never an email. Behind the scenes Firebase gets the email
// "<phone>@customer.nimetscoutshop.app" (it never receives mail). The owner adds each customer in the
// "customerInvites" collection (document id = phone number). See firestore.rules.
export const CUSTOMER_EMAIL_DOMAIN = 'customer.nimetscoutshop.app';

// Any way of typing a Cambodian number -> digits with country code, e.g. "012 345 678" -> "85512345678"
export function normalizePhone(input) {
    let d = String(input || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('855')) return d;
    if (d.startsWith('0')) return '855' + d.slice(1);
    return d.length >= 8 && d.length <= 9 ? '855' + d : d;
}

// "85512345678" -> "012345678" (how people write it)
export function localPhone(phone) {
    return String(phone || '').startsWith('855') ? '0' + String(phone).slice(3) : String(phone || '');
}

export const phoneToEmail = phone => `${phone}@${CUSTOMER_EMAIL_DOMAIN}`;
export const isCustomerUser = user => !!user && String(user.email || '').endsWith('@' + CUSTOMER_EMAIL_DOMAIN);
export const phoneFromUser = user => (isCustomerUser(user) ? user.email.split('@')[0] : '');

// callback(user | null) runs now and every time the login changes (no admin check, used by the shop)
export async function watchAuth(callback) {
    const f = await load();
    return f.authMod.onAuthStateChanged(f.auth, user => callback(user || null));
}

// Is this phone number on the owner's list, and has its password already been created?
export async function checkCustomerInvite(phone) {
    const f = await load();
    const snap = await f.fsMod.getDoc(f.fsMod.doc(f.db, 'customerInvites', phone));
    return snap.exists() ? { exists: true, claimed: snap.data().claimed === true } : { exists: false, claimed: false };
}

export async function customerSignIn(phone, password) {
    const f = await load();
    return f.authMod.signInWithEmailAndPassword(f.auth, phoneToEmail(phone), password);
}

// First sign-in: create the password, then mark the invite as taken so nobody else can create it again
export async function customerCreateAccount(phone, password) {
    const f = await load();
    const email = phoneToEmail(phone);
    let cred;
    try {
        cred = await f.authMod.createUserWithEmailAndPassword(f.auth, email, password);
    } catch (err) {
        if (err && err.code === 'auth/email-already-in-use') {
            // An earlier try created the sign-in but did not finish: carry on with the same password
            cred = await f.authMod.signInWithEmailAndPassword(f.auth, email, password);
        } else {
            throw err;
        }
    }
    const { doc, getDoc, updateDoc, serverTimestamp } = f.fsMod;
    const ref = doc(f.db, 'customerInvites', phone);
    try {
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error('not-invited');
        if (snap.data().uid !== cred.user.uid) {
            await updateDoc(ref, { claimed: true, uid: cred.user.uid, claimedAt: serverTimestamp() });
        }
    } catch (err) {
        await f.authMod.signOut(f.auth);
        throw err;
    }
    return cred;
}

// The customer's saved details: { name, phone, address, delivery, deliverySub }
export async function loadCustomerProfile(uid) {
    const f = await load();
    const snap = await f.fsMod.getDoc(f.fsMod.doc(f.db, 'customers', uid));
    return snap.exists() ? snap.data() : null;
}

export async function saveCustomerProfile(uid, profile) {
    const f = await load();
    const { doc, setDoc, serverTimestamp } = f.fsMod;
    await setDoc(doc(f.db, 'customers', uid), { ...clean(profile), updatedAt: serverTimestamp() }, { merge: true });
}

// ---------- Orders ----------
const clean = data => JSON.parse(JSON.stringify(data));   // Firestore does not accept "undefined"

// onData(listOfOrders) runs now and on every change for a specific customer
export async function watchCustomerOrders(userId, onData, onError) {
    const f = await load();
    const { collection, query, where, orderBy, onSnapshot } = f.fsMod;
    try {
        const q = query(
            collection(f.db, 'orders'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        return onSnapshot(q,
            snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))),
            err => onError && onError(err));
    } catch (e) {
        // Fallback without compound index if needed
        const qSimple = query(collection(f.db, 'orders'), where('userId', '==', userId));
        return onSnapshot(qSimple,
            snap => {
                const list = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
                list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
                onData(list);
            },
            err => onError && onError(err));
    }
}

// onData(listOfOrders) runs now and on every change (newest order first)
export async function watchOrders(onData, onError) {
    const f = await load();
    const { collection, query, orderBy, onSnapshot } = f.fsMod;
    const q = query(collection(f.db, 'orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(q,
        snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))),
        err => onError && onError(err));
}

export async function fetchOrder(id) {
    const f = await load();
    const snap = await f.fsMod.getDoc(f.fsMod.doc(f.db, 'orders', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createOrder(data) {
    const f = await load();
    const { collection, addDoc, serverTimestamp } = f.fsMod;
    const ref = await addDoc(collection(f.db, 'orders'), { ...clean(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return ref.id;
}

export async function updateOrder(id, patch) {
    const f = await load();
    const { doc, updateDoc, serverTimestamp } = f.fsMod;
    await updateDoc(doc(f.db, 'orders', id), { ...clean(patch), updatedAt: serverTimestamp() });
}

export async function deleteOrder(id) {
    const f = await load();
    await f.fsMod.deleteDoc(f.fsMod.doc(f.db, 'orders', id));
}

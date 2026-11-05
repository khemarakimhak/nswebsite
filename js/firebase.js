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
        return { authMod, fsMod, auth: authMod.getAuth(app), db: fsMod.getFirestore(app) };
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

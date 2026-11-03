// js/print.js - Print the receipt on the Bluetooth thermal printer.
//
// THIS IS A SEPARATE, OPTIONAL FEATURE. To remove it completely:
//   1. delete this file (js/print.js)
//   2. delete the  <button id="print-btn"> ... </button>  in index.html
//   3. delete the line  import './print.js';  in js/app.js
//
// Two ways to print, chosen automatically:
//   A) Browser with Web Bluetooth (the Bluefy app on iPhone, Chrome on Android/Mac/PC):
//      connects straight to the printer over Bluetooth Low Energy and sends the receipt
//      as an ESC/POS raster image.
//   B) Normal iPhone Safari / Chrome (no Web Bluetooth): opens the iPhone share sheet with the receipt
//      as an image (or saves it), so it can be opened in the printer's own app (WePrint).
//
// The receipt is the same one as the PDF (always Khmer, riel), drawn at the printer's width.
// Speed / safety settings are in data/catalog.js  ->  SETTINGS.PRINT

import { isCartEmpty } from './cart.js';
import { buildReceiptModel, drawReceipt, ensureReceiptFonts } from './pdf.js';
import { t } from './i18n.js';
import { SETTINGS } from '../data/catalog.js';

// ---------- Settings ----------
const PRINTER_DOTS = SETTINGS.PRINTER_DOTS || 384;  // 384 = 58 mm paper, 576 = 80 mm paper
const DESIGN_WIDTH = 480;       // layout width in design units (smaller = bigger text)
const SIDE_PAD = 14;            // side margin in design units (Khmer marks can overhang the edge)
const BLACK_BELOW = 165;        // gray level (0-255) below which a dot is printed

const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const USER = SETTINGS.PRINT || {};
const DEBUG = USER.debug !== false;
const TEST_ONLY = !!USER.testOnly;
const KEEP_CONNECTED = !!USER.keepConnected;
const CONNECT_DELAY = USER.connectDelayMs ?? 600;
const PROFILE = { chunkBytes: 20, delayMs: 5, write: 'response', bandRows: 32, ...((IS_IOS ? USER.ios : USER.other) || {}) };
// If the first attempt loses the connection, the one automatic retry is slower and gentler still
const SAFEST = { chunkBytes: 20, delayMs: 15, write: 'response', bandRows: 16 };

// Bluetooth services that the printer maker's own SDK looks for (LPAPI): the one the printer uses is found automatically
const SERVICES = [
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '000018f0-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
];

// ---------- Small helpers ----------
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function notify(message) {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;
    toastText.innerText = message;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 2500);
}

// ---------- On-screen print log (for finding out why a printer does not print) ----------
let logLines = [];
let logBox = null;

function ensureLogBox() {
    if (!DEBUG || logBox) return;
    logBox = document.createElement('div');
    logBox.id = 'print-log';
    logBox.className = 'fixed left-2 right-2 bottom-2 z-[70] rounded-xl bg-black/90 text-green-300 shadow-xl';
    logBox.style.cssText = 'font: 10px/1.35 ui-monospace, Menlo, Consolas, monospace;';
    logBox.innerHTML = `
        <div class="flex items-center justify-between px-2 py-1 border-b border-white/20 text-white">
            <span class="font-bold">Print log</span>
            <span class="flex gap-1">
                <button type="button" data-log="copy" class="px-2 py-0.5 rounded bg-white/20" style="min-height:0">Copy</button>
                <button type="button" data-log="close" class="px-2 py-0.5 rounded bg-white/20" style="min-height:0">Close</button>
            </span>
        </div>
        <pre id="print-log-text" class="p-2 overflow-auto whitespace-pre-wrap" style="max-height: 11rem; margin: 0;"></pre>`;
    logBox.addEventListener('click', async (e) => {
        const action = e.target.closest('[data-log]')?.getAttribute('data-log');
        if (action === 'close') logBox.style.display = 'none';
        if (action === 'copy') {
            try { await navigator.clipboard.writeText(logLines.join('\n')); notify('Log copied'); } catch (err) { notify('Copy failed'); }
        }
    });
    document.body.appendChild(logBox);
}

function startLog() {
    logLines = [];
    if (!DEBUG) return;
    ensureLogBox();
    logBox.style.display = 'block';
    document.getElementById('print-log-text').textContent = '';
}

function log(message) {
    const stamp = new Date().toLocaleTimeString('en-GB');
    const line = `${stamp} ${message}`;
    logLines.push(line);
    console.log('[print]', message);
    if (!DEBUG || !logBox) return;
    const pre = document.getElementById('print-log-text');
    pre.textContent = logLines.join('\n');
    pre.scrollTop = pre.scrollHeight;
}

// ---------- 1. The receipt as black/white dots ----------
async function renderReceiptDots() {
    await ensureReceiptFonts();
    const canvas = drawReceipt(buildReceiptModel(), { outWidth: PRINTER_DOTS, widthUnits: DESIGN_WIDTH, padUnits: SIDE_PAD });
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const image = ctx.getImageData(0, 0, width, height);
    const px = image.data;

    const widthBytes = Math.ceil(width / 8);
    const bits = new Uint8Array(widthBytes * height);

    // Pure black or white (also rewritten into the canvas so the shared picture is exactly what prints)
    for (let yy = 0; yy < height; yy++) {
        for (let xx = 0; xx < width; xx++) {
            const i = (yy * width + xx) * 4;
            const gray = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
            const black = gray < BLACK_BELOW;
            if (black) bits[yy * widthBytes + (xx >> 3)] |= 0x80 >> (xx & 7);
            px[i] = px[i + 1] = px[i + 2] = black ? 0 : 255;
            px[i + 3] = 255;
        }
    }
    ctx.putImageData(image, 0, 0);
    return { canvas, bits, widthBytes, height };
}

// ---------- 2. ESC/POS bytes ----------
export function buildEscPos({ bits, widthBytes, height }, bandRows = 96) {
    const parts = [Uint8Array.of(0x1B, 0x40)];                       // ESC @  : reset the printer
    for (let y0 = 0; y0 < height; y0 += bandRows) {
        const rows = Math.min(bandRows, height - y0);
        // GS v 0 : print a raster image (normal density)
        parts.push(Uint8Array.of(0x1D, 0x76, 0x30, 0x00,
            widthBytes & 0xFF, widthBytes >> 8, rows & 0xFF, rows >> 8));
        parts.push(bits.subarray(y0 * widthBytes, (y0 + rows) * widthBytes));
    }
    parts.push(Uint8Array.of(0x1B, 0x64, 0x04));                     // ESC d 4 : feed 4 lines so the paper can be torn off
    return joinBytes(parts);
}

// A tiny text-only job, to find out whether the connection itself works (SETTINGS.PRINT.testOnly)
export function buildTestBytes() {
    const text = new TextEncoder().encode('Nimet Scout Shop\nPrint test OK\n');
    return joinBytes([Uint8Array.of(0x1B, 0x40), text, Uint8Array.of(0x1B, 0x64, 0x04)]);
}

function joinBytes(parts) {
    const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
    let pos = 0;
    parts.forEach(p => { out.set(p, pos); pos += p.length; });
    return out;
}

// ---------- 3. Way A: Bluetooth (Bluefy / Chrome) ----------
let device = null;

function describeProperties(props) {
    return ['write', 'writeWithoutResponse', 'notify', 'read'].filter(k => props[k]).join('+') || 'none';
}

async function pickDevice() {
    // The picker must open right after the tap, so this runs before anything slow
    if (device) return;
    log('opening the Bluetooth picker...');
    device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
    log(`chosen: "${device.name || 'unnamed'}"`);
    device.addEventListener('gattserverdisconnected', () => log('!! printer DISCONNECTED (reported by Bluetooth)'));
}

// Connect and find the Bluetooth characteristic that accepts the print data
async function openLink(connectDelayMs) {
    notify(t('print_connecting'));
    log('connecting...');
    const server = await device.gatt.connect();
    log(`connected. waiting ${connectDelayMs} ms before sending...`);
    await sleep(connectDelayMs);

    for (const uuid of SERVICES) {
        let service;
        try {
            service = await server.getPrimaryService(uuid);
        } catch (e) {
            log(`service ${uuid.slice(0, 8)}: not on this printer`);
            continue;
        }
        const characteristics = await service.getCharacteristics();
        characteristics.forEach(c => log(`service ${uuid.slice(0, 8)} -> characteristic ${c.uuid.slice(0, 8)} [${describeProperties(c.properties)}]`));
        const pick = characteristics.find(c => c.properties.writeWithoutResponse) || characteristics.find(c => c.properties.write);
        if (pick) {
            log(`using characteristic ${pick.uuid.slice(0, 8)} of service ${uuid.slice(0, 8)}`);
            return pick;
        }
    }
    throw new Error('printer not recognised (no writable Bluetooth service found)');
}

// One write, using the confirmed or the unconfirmed kind depending on the settings and what the printer supports
function pickWriteKind(characteristic, preferred) {
    const canResponse = !!characteristic.properties.write;
    const canNoResponse = !!characteristic.properties.writeWithoutResponse;
    if (preferred === 'response') return canResponse ? 'response' : 'noresponse';
    return canNoResponse ? 'noresponse' : 'response';
}

async function writeOnce(characteristic, chunk, kind) {
    if (kind === 'noresponse') return characteristic.writeValueWithoutResponse(chunk);
    if (characteristic.writeValueWithResponse) return characteristic.writeValueWithResponse(chunk);
    return characteristic.writeValue(chunk);
}

class PrinterLinkLost extends Error {
    constructor(sent, total, detail) {
        super(`printer disconnected after ${sent} of ${total} bytes${detail ? ` (${detail})` : ''}`);
        this.name = 'PrinterLinkLost';
        this.sent = sent;
        this.total = total;
    }
}

async function sendBytes(characteristic, bytes, cfg) {
    const kind = pickWriteKind(characteristic, cfg.write);
    const delay = kind === 'noresponse' ? Math.max(cfg.delayMs, 20) : cfg.delayMs;   // unconfirmed writes need a real pause
    log(`sending ${bytes.length} bytes: ${cfg.chunkBytes} per write, ${kind === 'response' ? 'confirmed' : 'unconfirmed'} writes, ${delay} ms pause`);

    const started = Date.now();
    let sent = 0;
    let nextReport = 10;
    while (sent < bytes.length) {
        if (!device.gatt.connected) throw new PrinterLinkLost(sent, bytes.length);
        const chunk = bytes.subarray(sent, sent + cfg.chunkBytes);
        try {
            await writeOnce(characteristic, chunk, kind);
        } catch (err) {
            throw new PrinterLinkLost(sent, bytes.length, `${err.name}: ${err.message}`);
        }
        sent += chunk.length;
        if (delay) await sleep(delay);

        const percent = Math.floor(sent * 100 / bytes.length);
        if (percent >= nextReport) {
            log(`sent ${sent} / ${bytes.length} bytes (${percent}%)`);
            notify(`${t('print_printing')} ${percent}%`);
            nextReport += 10;
        }
    }
    log(`all bytes sent in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    await sleep(500);   // let the last bytes reach the printer before anything else happens
}

async function printOverBluetooth() {
    startLog();
    log(`start | ${IS_IOS ? 'iPhone/iPad' : 'other device'} profile | ${navigator.userAgent.slice(0, 70)}`);
    log(`settings: ${JSON.stringify(PROFILE)} | connect delay ${CONNECT_DELAY} ms | test only: ${TEST_ONLY}`);

    await pickDevice();

    let bytes;
    if (TEST_ONLY) {
        bytes = buildTestBytes();
        log(`test job: ${bytes.length} bytes`);
    } else {
        const dots = await renderReceiptDots();
        bytes = buildEscPos(dots, PROFILE.bandRows);
        log(`receipt: ${dots.canvas.width} x ${dots.height} dots, ${bytes.length} bytes`);
    }

    try {
        let characteristic = await openLink(CONNECT_DELAY);
        try {
            await sendBytes(characteristic, bytes, PROFILE);
        } catch (err) {
            if (!(err instanceof PrinterLinkLost)) throw err;
            // Lost the printer part-way: wait, reconnect and try once more, gentler
            log(`!! ${err.message}`);
            log('retrying once with the slowest, gentlest settings...');
            await sleep(1500);
            characteristic = await openLink(CONNECT_DELAY + 900);
            await sendBytes(characteristic, bytes, SAFEST);
        }
        notify(t('print_done'));
        log('DONE');
    } finally {
        if (!KEEP_CONNECTED) {
            try { device.gatt.disconnect(); log('disconnected from the printer (so other apps can use it)'); } catch (e) { /* already gone */ }
        }
    }
}

// ---------- 4. Way B: iPhone share sheet -> WePrint ----------
async function shareReceiptImage() {
    const { canvas } = await renderReceiptDots();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'nimet-receipt.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
    }
    // No share sheet: save the picture so it can be opened in the printer app
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nimet-receipt.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    notify(t('print_image_saved'));
}

// ---------- 5. The Print button ----------
let busy = false;

async function onPrintClick() {
    if (busy) return;
    if (isCartEmpty()) { notify(t('toast_cart_empty')); return; }
    busy = true;
    try {
        if ('bluetooth' in navigator) await printOverBluetooth();
        else await shareReceiptImage();
    } catch (err) {
        if (err && (err.name === 'AbortError' || err.name === 'NotFoundError')) {
            // the person closed the share sheet or the Bluetooth picker
            if (err.name === 'NotFoundError') { log('no printer chosen'); notify(t('print_no_printer')); }
        } else {
            console.error('Print error:', err);
            log(`!! FAILED: ${(err && err.message) || err}`);
            notify(t('print_failed', { reason: (err && err.message) || 'unknown' }));
        }
    } finally {
        busy = false;
    }
}

document.getElementById('print-btn')?.addEventListener('click', onPrintClick);

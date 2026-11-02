// js/print.js - Print the receipt on the Bluetooth thermal printer.
//
// THIS IS A SEPARATE, OPTIONAL FEATURE. To remove it completely:
//   1. delete this file (js/print.js)
//   2. delete the  <button id="print-btn"> ... </button>  in index.html
//   3. delete the line  import './print.js';  in js/app.js
//
// Two ways to print, chosen automatically:
//   A) Browser with Web Bluetooth (the Bluefy app on iPhone, Chrome on Android/PC):
//      connects straight to the printer over Bluetooth Low Energy and sends the receipt
//      as an ESC/POS raster image.  Needs a printer that understands ESC/POS.
//   B) Normal iPhone Safari (no Web Bluetooth): opens the iPhone share sheet with the receipt
//      as an image, so it can be sent to the printer's own app (WePrint).
//
// The receipt is the same one as the PDF (always Khmer, riel), drawn at the printer's width.

import { isCartEmpty } from './cart.js';
import { buildReceiptModel, drawReceipt, ensureReceiptFonts } from './pdf.js';
import { t } from './i18n.js';
import { SETTINGS } from '../data/catalog.js';

// ---------- Settings ----------
const PRINTER_DOTS = SETTINGS.PRINTER_DOTS || 384;  // 384 = 58 mm paper, 576 = 80 mm paper
const DESIGN_WIDTH = 480;       // layout width in design units (smaller = bigger text)
const SIDE_PAD = 14;            // side margin in design units (Khmer marks can overhang the edge)
const BLACK_BELOW = 165;        // gray level (0-255) below which a dot is printed
const BAND_ROWS = 96;           // image rows per ESC/POS raster command
const CHUNK_BYTES = 100;        // Bluetooth write size
const CHUNK_DELAY_MS = 20;      // pause between Bluetooth writes (keeps cheap printers from overflowing)

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
export function buildEscPos({ bits, widthBytes, height }) {
    const parts = [Uint8Array.of(0x1B, 0x40)];                       // ESC @  : reset the printer
    for (let y0 = 0; y0 < height; y0 += BAND_ROWS) {
        const rows = Math.min(BAND_ROWS, height - y0);
        // GS v 0 : print a raster image (normal density)
        parts.push(Uint8Array.of(0x1D, 0x76, 0x30, 0x00,
            widthBytes & 0xFF, widthBytes >> 8, rows & 0xFF, rows >> 8));
        parts.push(bits.subarray(y0 * widthBytes, (y0 + rows) * widthBytes));
    }
    parts.push(Uint8Array.of(0x1B, 0x64, 0x04));                     // ESC d 4 : feed 4 lines so the paper can be torn off

    const total = parts.reduce((sum, p) => sum + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    parts.forEach(p => { out.set(p, pos); pos += p.length; });
    return out;
}

// ---------- 3. Way A: Bluetooth (Bluefy / Chrome) ----------
let device = null;
let writer = null;      // the Bluetooth characteristic we write to

async function findWriter(server) {
    for (const uuid of SERVICES) {
        let service;
        try { service = await server.getPrimaryService(uuid); } catch (e) { continue; }
        const characteristics = await service.getCharacteristics();
        const pick = characteristics.find(c => c.properties.writeWithoutResponse) || characteristics.find(c => c.properties.write);
        if (pick) return pick;
    }
    throw new Error('printer not recognised (no writable Bluetooth service)');
}

async function connectPrinter() {
    // The picker must open right after the tap, so this runs before anything slow
    if (!device) {
        device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
        device.addEventListener('gattserverdisconnected', () => { writer = null; });
    }
    if (!device.gatt.connected || !writer) {
        notify(t('print_connecting'));
        const server = await device.gatt.connect();
        writer = await findWriter(server);
    }
}

async function sendInChunks(bytes) {
    const noResponse = !!writer.properties.writeWithoutResponse;
    for (let i = 0; i < bytes.length; i += CHUNK_BYTES) {
        const chunk = bytes.subarray(i, i + CHUNK_BYTES);
        if (noResponse) await writer.writeValueWithoutResponse(chunk);
        else await writer.writeValue(chunk);
        await sleep(CHUNK_DELAY_MS);
    }
}

async function printOverBluetooth() {
    await connectPrinter();
    notify(t('print_printing'));
    const dots = await renderReceiptDots();
    await sendInChunks(buildEscPos(dots));
    notify(t('print_done'));
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
            if (err.name === 'NotFoundError') notify(t('print_no_printer'));
        } else {
            console.error('Print error:', err);
            writer = null;
            notify(t('print_failed', { reason: (err && err.message) || 'unknown' }));
        }
    } finally {
        busy = false;
    }
}

document.getElementById('print-btn')?.addEventListener('click', onPrintClick);

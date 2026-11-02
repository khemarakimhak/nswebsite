// js/pdf.js - Receipt PDF for a 55 mm thermal printer (width 55 mm, length follows the items)
//
// The receipt is drawn on a canvas first, because the browser shapes Khmer letters correctly
// there, then the picture is wrapped in a one-page PDF. No library needed.
// The PDF is ALWAYS in Khmer (and riel), whatever language the website is showing.

import { getReceiptItems, getCartTotal, getDeliveryRow, getReceiver, receiverDisplayName, receiverDeliveryText } from './cart.js';
import { formatPrice } from './currency.js';
import { t, inLang } from './i18n.js';
import { SETTINGS } from '../data/catalog.js';

const PAPER_MM = 55;
const DPI = 300;
const WIDTH_PX = Math.round(PAPER_MM / 25.4 * DPI);   // 650 px
const PAD = 26;                                        // side margin in px
const CONTENT_W = WIDTH_PX - PAD * 2;
const LINE_HEIGHT = 1.6;                               // Khmer needs tall lines
const FONT = `K5, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

// ---------- 1. What goes on the receipt (all text in Khmer) ----------
export function buildReceiptModel() {
    const dash = v => (v && String(v).trim()) ? String(v).trim() : '-';
    const receiver = getReceiver();

    return inLang('kh', () => ({
        title: inLang('en', () => t('app_name')),      // top line: Nimet Scout Shop
        shopKh: t('app_name'),                          // second line: Khmer shop name
        receiverName: receiverDisplayName(),
        info: [
            [t('pdf_sender_phone'), SETTINGS.SENDER_PHONE],
            [t('pdf_receiver_phone'), dash(receiver.phone)],
            [t('pdf_address'), dash(receiver.address)],
            [t('pdf_delivery'), dash(receiverDeliveryText())]
        ],
        items: getReceiptItems().map(r => ({
            label: r.label,
            detail: `${r.qty} x ${formatPrice(r.unit)} = ${formatPrice(r.subtotal)}`
        })),
        fee: (() => { const r = getDeliveryRow(); return r ? { label: r.label, amount: formatPrice(r.amount) } : null; })(),
        totalLabel: t('pdf_total'),
        total: formatPrice(getCartTotal()),
        footer: t('pdf_footer')
    }));
}

// ---------- 2. Text wrapping (Khmer has no spaces, so use the browser's word breaker) ----------
function pieces(text, granularity) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        try {
            return [...new Intl.Segmenter('km', { granularity }).segment(text)].map(s => s.segment);
        } catch (e) { /* fall through */ }
    }
    return granularity === 'word' ? text.split(/(\s+)/).filter(Boolean) : Array.from(text);
}

function wrapText(ctx, text, maxWidth) {
    const out = [];
    String(text).split('\n').forEach(paragraph => {
        let line = '';
        const push = () => { if (line.trim()) out.push(line.trimEnd()); line = ''; };

        pieces(paragraph, 'word').forEach(word => {
            if (ctx.measureText(line + word).width <= maxWidth) { line += word; return; }
            push();
            word = word.trimStart();
            if (ctx.measureText(word).width <= maxWidth) { line = word; return; }
            // one very long word: break it letter by letter
            pieces(word, 'grapheme').forEach(g => {
                if (line && ctx.measureText(line + g).width > maxWidth) push();
                line += g;
            });
        });
        push();
        if (!paragraph.trim()) out.push('');
    });
    return out.length ? out : [''];
}

// ---------- 3. Layout + drawing ----------
// Every size below is in "design units" (1 unit = 1 px of the 300 dpi PDF page).
// outWidth / widthUnits scales the whole design, so the same receipt can also be drawn
// narrower (for example 384 dots wide for the thermal printer) with proportionally smaller text.
export function drawReceipt(model, { outWidth = WIDTH_PX, widthUnits = WIDTH_PX, padUnits = PAD } = {}) {
    const S = outWidth / widthUnits;
    const pad = padUnits * S;
    const contentW = (widthUnits - padUnits * 2) * S;

    const probe = document.createElement('canvas').getContext('2d');
    const ops = [];
    let y = pad;

    const fontOf = (size, bold) => `${bold ? 'bold ' : ''}${size * S}px ${FONT}`;

    // One text block (wrapped). align: 'center' | 'left' | 'right'
    function text(str, size, { bold = false, align = 'left', gap = 0 } = {}) {
        probe.font = fontOf(size, bold);
        const lines = wrapText(probe, str, contentW);
        lines.forEach(line => {
            ops.push({ kind: 'text', str: line, font: fontOf(size, bold), align, y: y + size * S * 1.15 });
            y += size * S * LINE_HEIGHT;
        });
        y += gap * S;
    }

    // A row with text on the left and text on the right (same baseline)
    function row(left, right, size, bold = false) {
        ops.push({ kind: 'text', str: left, font: fontOf(size, bold), align: 'left', y: y + size * S * 1.15 });
        ops.push({ kind: 'text', str: right, font: fontOf(size, bold), align: 'right', y: y + size * S * 1.15 });
        y += size * S * LINE_HEIGHT;
    }

    function line(dashed = false, gap = 10) {
        y += gap * S;
        ops.push({ kind: 'line', y, dashed });
        y += (gap + 2) * S;
    }

    // Header
    text(model.title, 48, { bold: true, align: 'center' });
    text(model.shopKh, 32, { align: 'center' });
    text(model.receiverName, 36, { bold: true, align: 'center', gap: 4 });
    line();

    // Sender / receiver / delivery
    model.info.forEach(([label, value]) => text(`${label}: ${value}`, 28));
    line();

    // Items
    model.items.forEach(item => {
        text(item.label, 28);
        text(item.detail, 28, { align: 'right', gap: 6 });
    });

    // Delivery fee (only when it costs money)
    if (model.fee) {
        probe.font = fontOf(28, false);
        const feeLines = wrapText(probe, model.fee.label, contentW - 170 * S);
        feeLines.forEach((txt, i) => {
            ops.push({ kind: 'text', str: txt, font: fontOf(28, false), align: 'left', y: y + 28 * S * 1.15 });
            if (i === 0) ops.push({ kind: 'text', str: model.fee.amount, font: fontOf(28, false), align: 'right', y: y + 28 * S * 1.15 });
            y += 28 * S * LINE_HEIGHT;
        });
    }

    // Total
    line(true, 6);
    row(model.totalLabel, model.total, 34, true);

    // Footer
    y += 14 * S;
    text(model.footer, 28, { align: 'center' });

    // Draw it all on a canvas that is exactly as tall as needed
    const height = Math.ceil(y + pad);
    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outWidth, height);
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'alphabetic';

    ops.forEach(op => {
        if (op.kind === 'line') {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = Math.max(2, 2 * S);
            ctx.setLineDash(op.dashed ? [8 * S, 6 * S] : []);
            ctx.beginPath();
            ctx.moveTo(pad, op.y);
            ctx.lineTo(outWidth - pad, op.y);
            ctx.stroke();
        } else {
            ctx.font = op.font;
            ctx.textAlign = op.align;
            const x = op.align === 'center' ? outWidth / 2 : op.align === 'right' ? outWidth - pad : pad;
            ctx.fillText(op.str, x, op.y);
        }
    });
    return canvas;
}

// ---------- 4. Canvas -> one-page PDF ----------
async function deflate(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function canvasToPdf(canvas, { forceJpeg = false } = {}) {
    const w = canvas.width, h = canvas.height;
    const pageW = PAPER_MM / 25.4 * 72;           // PDF points
    const pageH = pageW * h / w;

    let imageBytes, imageDict;
    if (!forceJpeg && typeof CompressionStream !== 'undefined') {
        // Sharp black-and-white text: 8-bit gray, compressed
        const rgba = canvas.getContext('2d').getImageData(0, 0, w, h).data;
        const gray = new Uint8Array(w * h);
        for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
            gray[i] = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000;
        }
        imageBytes = await deflate(gray);
        imageDict = `/ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`;
    } else {
        // Older browsers: JPEG
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        imageBytes = new Uint8Array(await blob.arrayBuffer());
        imageDict = `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`;
    }

    const enc = new TextEncoder();
    const parts = [];
    const offsets = [];
    let length = 0;
    const add = data => {
        const bytes = typeof data === 'string' ? enc.encode(data) : data;
        parts.push(bytes);
        length += bytes.length;
    };
    const object = (num, dict, stream) => {
        offsets[num] = length;
        add(`${num} 0 obj\n<< ${dict}${stream ? ` /Length ${stream.length}` : ''} >>\n`);
        if (stream) { add('stream\n'); add(stream); add('\nendstream\n'); }
        add('endobj\n');
    };

    const content = enc.encode(`q ${pageW.toFixed(2)} 0 0 ${pageH.toFixed(2)} 0 0 cm /Im0 Do Q`);

    add('%PDF-1.4\n');
    object(1, '/Type /Catalog /Pages 2 0 R');
    object(2, '/Type /Pages /Kids [3 0 R] /Count 1');
    object(3, `/Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R`);
    object(4, `/Type /XObject /Subtype /Image /Width ${w} /Height ${h} ${imageDict}`, imageBytes);
    object(5, '', content);

    const xrefAt = length;
    let xref = `xref\n0 6\n0000000000 65535 f \n`;
    for (let n = 1; n <= 5; n++) xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
    add(xref);
    add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`);

    const out = new Uint8Array(length);
    let pos = 0;
    parts.forEach(p => { out.set(p, pos); pos += p.length; });
    return out;
}

// ---------- 5. Public: build the PDF file ----------
// Make sure the Khmer font is ready before drawing
export async function ensureReceiptFonts() {
    if (document.fonts && document.fonts.load) {
        try {
            await document.fonts.load(`28px K5`, 'ក');
            await document.fonts.load(`bold 28px K5`, 'ក');
        } catch (e) { /* use the fallback font */ }
    }
}

export async function createReceiptPdf() {
    await ensureReceiptFonts();
    const canvas = drawReceipt(buildReceiptModel());
    const bytes = await canvasToPdf(canvas);
    return new Blob([bytes], { type: 'application/pdf' });
}

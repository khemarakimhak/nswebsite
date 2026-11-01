// js/currency.js - Shows prices in USD (English) or Riel (Khmer)

import { SETTINGS } from '../data/catalog.js';
import { getLang } from './i18n.js';

// All prices are stored in US dollars; this converts for display only.
export function formatPrice(usd) {
    if (getLang() === 'kh') {
        return Math.round(usd * SETTINGS.USD_TO_KHR).toLocaleString('en-US') + '៛';
    }
    // Normal prices show 2 decimals ($1.25). A price like 1.625 keeps its 3rd decimal ($1.625).
    const two = usd.toFixed(2);
    if (Math.abs(parseFloat(two) - usd) < 1e-9) return '$' + two;
    return '$' + String(parseFloat(usd.toFixed(3)));
}

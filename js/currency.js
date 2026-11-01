// js/currency.js - Shows prices in USD (English) or Riel (Khmer)

import { SETTINGS } from '../data/catalog.js';
import { getLang } from './i18n.js';

// All prices are stored in US dollars; this converts for display only.
export function formatPrice(usd) {
    if (getLang() === 'kh') {
        return Math.round(usd * SETTINGS.USD_TO_KHR).toLocaleString('en-US') + '៛';
    }
    return '$' + usd.toFixed(2);
}

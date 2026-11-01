// js/i18n.js - Language handling (English / Khmer). Wording lives in data/translations.js

import { TRANSLATIONS, COLOR_TRANSLATIONS, OPTION_TRANSLATIONS } from '../data/translations.js';
import { WOGGLE_STYLES as STYLE_DATA } from '../data/catalog.js';

let lang = 'kh';

export function setLang(newLang) { lang = newLang; }
export function getLang() { return lang; }

// Run something in a fixed language, then go back (used by the PDF, which is always Khmer)
export function inLang(forcedLang, fn) {
    const previous = lang;
    lang = forcedLang;
    try { return fn(); } finally { lang = previous; }
}

// t('toast_added') or t('woggle_name_title', { style: 'Scout' })
export function t(key, vars = {}) {
    const entry = TRANSLATIONS[key];
    let text = key; // if a key is missing, show the key so it is easy to spot
    if (entry) text = (lang === 'kh' && entry.kh) ? entry.kh : entry.en;
    return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
}

export function styleLabel(englishName) {
    if (lang !== 'kh') return englishName;
    const s = STYLE_DATA.find(x => x.name === englishName);
    return (s && s.nameKh) || englishName;
}

export function colorLabel(englishName) {
    if (lang !== 'kh') return englishName;
    return COLOR_TRANSLATIONS[englishName] || englishName;
}

// Any option of a product: a color ("Red"), a two-color pair ("White-Red") or a name ("Star Class")
export function optionLabel(option) {
    if (lang !== 'kh') return option;
    if (OPTION_TRANSLATIONS[option]) return OPTION_TRANSLATIONS[option];
    if (COLOR_TRANSLATIONS[option]) return COLOR_TRANSLATIONS[option];
    const parts = option.split('-');
    if (parts.length > 1) return parts.map(colorLabel).join('-');
    return option;
}

// Translation key helpers for the option menu headings (falls back to the color wording)
export function optionTitleKey(product, prefix) {
    const key = `${prefix}_${product.optionsTitle || 'color'}`;
    return TRANSLATIONS[key] ? key : `${prefix}_color`;
}

// Name of a product card in the current language
export function productName(p) {
    if (p.titleKey) return t(p.titleKey, { style: styleLabel(p.styleName) });
    return (lang === 'kh' && p.nameKh) ? p.nameKh : p.name;
}

// Fills every element marked data-i18n="key" / data-i18n-placeholder="key" in index.html
export function applyStaticTranslations() {
    document.documentElement.lang = lang === 'kh' ? 'km' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
}
